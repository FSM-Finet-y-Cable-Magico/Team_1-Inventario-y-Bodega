import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  Not,
  Repository,
} from 'typeorm';
import { IntegracionCierre } from './entities/cierre-integracion.entity';
import { IntegracionActivacion } from './entities/integracion-activacion.entity';
import { AsignacionEquipoServicio } from './entities/asignacion-equipo-servicio.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { HistorialEstado } from '../inventario/entities/historial-estado.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { CatalogService } from '../inventario/catalog.service';
import { InventarioPersonalService } from '../salidas/inventario-personal.service';
import { CierreReparacion } from './entities/cierre-reparacion.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CierresTrabajoService } from './cierres-trabajo.service';
import { IntegracionContexto } from './guards/api-key.guard';

// sc-113: mapeo de las acciones semánticas que emite G3 en el cierre de OT
// hacia los literales exactos de nuestra máquina de estados (con tildes).
// Acordado con G3 el 04-09-2026 y expuesto por ellos en GET /estados-equipo.
const ACCIONES_G3: Record<string, { estado: string; origenes: string[] }> = {
  INSTALADO_EN_CLIENTE: {
    estado: 'Instalado en cliente',
    origenes: ['Asignado a técnico'],
  },
  RETIRADO_A_BODEGA: {
    estado: 'En bodega',
    origenes: ['Asignado a técnico', 'En revisión', 'En préstamo externo'],
  },
  RETIRADO_PARA_DIAGNOSTICO: {
    estado: 'En revisión',
    origenes: ['Asignado a técnico', 'Instalado en cliente'],
  },
  BAJA_EN_TERRENO: {
    estado: 'Dado de baja',
    origenes: ['En bodega', 'En revisión'],
  },
};

// CU-69: respaldo para un cierre que llegue sin `accion` por ítem. G3 la envía en su
// CerrarOtDto (verificado el 26-sept-2026, docs/11 §5) y esa siempre manda; si falta,
// la define el arreglo de origen: lo retirado va a revisión (CU-71) y lo instalado en
// reemplazo queda en el cliente.
const ACCION_POR_CAMPO: Record<string, string> = {
  equipos_instalados: 'INSTALADO_EN_CLIENTE',
  equipos_retirados: 'RETIRADO_PARA_DIAGNOSTICO',
};

// CU-69: resultado de la reparación declarado por G3 → literal de pantalla del CU.
const RESULTADOS_G3: Record<string, string> = {
  RESUELTO: 'Resuelto',
  PARCIAL: 'Resuelto parcialmente',
  SIN_SOLUCION: 'Sin solución',
};

// Acuerdo con G3 (08-sept-2026): el diagnóstico del retiro para revisión es la
// categoria_falla declarada en el cierre; si no viene, queda este valor.
const DIAGNOSTICO_FALLBACK_G3 = 'Causa desconocida';

// sc-158 (acuerdo G8 v1): estados del registro de correlación cierre ↔ activación.
const ESTADO_ACTIVACION = {
  PENDIENTE_CIERRE: 'PENDIENTE_CIERRE',
  PENDIENTE_ACTIVACION: 'PENDIENTE_ACTIVACION',
  COMPLETO: 'COMPLETO',
  CON_DISCREPANCIAS: 'CON_DISCREPANCIAS',
};

// Origen con el que se registran las asignaciones creadas por el evento de G8.
const ORIGEN_ACTIVACION_G8 = 'ACTIVACION_G8';

// categoria_falla llega a nivel raíz como string o como {nombre}; si solo viene
// el bloque reparacion del contrato doc-12, usamos su categoria_falla_otro.
function extraerCategoriaFalla(payload: any): string | null {
  const candidatas = [
    payload.categoria_falla,
    payload.reparacion?.categoria_falla,
  ];
  for (const c of candidatas) {
    if (typeof c === 'string' && c.trim() !== '') return c.trim();
    if (
      c &&
      typeof c === 'object' &&
      typeof c.nombre === 'string' &&
      c.nombre.trim() !== ''
    )
      return c.nombre.trim();
  }
  const otro = payload.reparacion?.categoria_falla_otro;
  if (typeof otro === 'string' && otro.trim() !== '') return otro.trim();
  return null;
}

@Injectable()
export class IntegracionesService {
  constructor(
    @InjectRepository(IntegracionCierre)
    private readonly cierreRepository: Repository<IntegracionCierre>,
    @InjectRepository(IntegracionActivacion)
    private readonly activacionRepository: Repository<IntegracionActivacion>,
    @InjectRepository(AsignacionEquipoServicio)
    private readonly asignacionRepository: Repository<AsignacionEquipoServicio>,
    @InjectRepository(CierreReparacion)
    private readonly reparacionRepository: Repository<CierreReparacion>,
    private readonly auditoriaService: AuditoriaService,
    private readonly cierresTrabajoService: CierresTrabajoService,
        @InjectRepository(UnidadEquipo)
        private readonly unitRepository: Repository<UnidadEquipo>,
        @InjectRepository(TipoEquipo)
        private readonly tipoRepository: Repository<TipoEquipo>,
        @InjectRepository(StockConsumible)
        private readonly stockRepository: Repository<StockConsumible>,
        private readonly catalogService: CatalogService,
        private readonly inventarioPersonalService: InventarioPersonalService,
        private readonly dataSource: DataSource,
    ) {}

  // Todas las rutas de integración exigen id_empresa explícito, validado contra el scope de la key.
  validarScope(integracion: IntegracionContexto, idEmpresa: number): void {
    if (!Number.isInteger(idEmpresa)) {
      throw new BadRequestException(
        'Falta el parámetro id_empresa o no es numérico.',
      );
    }
    if (!integracion.empresas.includes(idEmpresa)) {
      throw new ForbiddenException('La API key no tiene acceso a esa empresa.');
    }
  }

  // GET /integraciones/tipos-equipo — catálogo S2S (G1-7): wrapper del catálogo
  // humano (`CatalogService.consultar`), con id_empresa validado contra el scope.
  async consultarTiposEquipo(
    idEmpresa: number,
    filtros: { categoria?: string; buscar?: string; activo?: string },
  ) {
    if (
      filtros.activo !== undefined &&
      filtros.activo !== '' &&
      filtros.activo !== 'true' &&
      filtros.activo !== 'false'
    ) {
      throw new BadRequestException(
        "El filtro activo debe ser 'true' o 'false'.",
      );
    }

    const tipos = await this.catalogService.consultar({
      categoria: filtros.categoria,
      activo: filtros.activo,
      buscar: filtros.buscar,
      id_empresa: idEmpresa,
    });

    return {
      success: true,
      data: tipos.map((tipo) => ({
        id_tipo_equipo: tipo.id_tipo_equipo,
        id_empresa: tipo.id_empresa ?? null,
        nombre: tipo.nombre,
        categoria: tipo.categoria ?? null,
        marca: tipo.marca ?? null,
        modelo: tipo.modelo ?? null,
        descripcion_tecnica: tipo.descripcionTecnica ?? null,
        unidad_medida: tipo.unidadMedida ?? null,
        garantia_dias: tipo.garantiaDias ?? null,
        requiere_serie_individual: tipo.requiereSerialNumber ?? null,
        activo: tipo.activo,
      })),
    };
  }

    // GET /integraciones/equipos — G1-9 (sc-159, P1): equipos de un servicio
    // desde `asignacion_equipo_servicio` (solo asignaciones activas).
    async consultarEquiposPorServicio(idEmpresa: number, idServicioRaw: string) {
        const idServicio = this.enteroPositivo(idServicioRaw);
        if (idServicio === null) {
            throw new BadRequestException(
                'Falta el parámetro id_servicio o no es numérico.',
            );
        }

        const asignaciones = await this.asignacionRepository.find({
            where: {
                id_empresa: idEmpresa,
                idServicioExterno: idServicio,
                activa: true,
            },
            order: { fechaInstalacion: 'DESC', id_asignacion: 'DESC' },
        });

        const idsUnidades = [...new Set(asignaciones.map((a) => a.id_unidad))];
        const unidades = idsUnidades.length
            ? await this.unitRepository.find({
                  where: { id_unidad: In(idsUnidades) },
              })
            : [];
        const mapaUnidades = new Map(unidades.map((u) => [u.id_unidad, u]));

        return {
            success: true,
            data: asignaciones.map((asignacion) => {
                const unidad = mapaUnidades.get(asignacion.id_unidad);
                return {
                    id_unidad: asignacion.id_unidad,
                    numero_serie: unidad?.serialNumber ?? null,
                    estado: unidad?.estado ?? null,
                    tipo_equipo: {
                        id_tipo_equipo: unidad?.id_tipo_equipo ?? null,
                        nombre: unidad?.tipoEquipo?.nombre ?? null,
                        categoria: unidad?.tipoEquipo?.categoria ?? null,
                    },
                    fecha_instalacion: asignacion.fechaInstalacion ?? null,
                    id_ot: asignacion.id_ot ?? null,
                };
            }),
        };
    }

    // GET /integraciones/stock — G1-4 extendido (sc-159, P1): disponibilidad
    // INFORMATIVA para factibilidad comercial; G8 no reserva ni descuenta.
    // Consumibles: suma de `stock_consumible.cantidad_disponible`.
    // Individualizables: unidades 'En bodega' (disponible) y 'Asignado a técnico' (reservado).
    async consultarStock(
        idEmpresa: number,
        filtros: { id_tipo_equipo?: string; categoria?: string },
    ) {
        const idTipo = this.enteroPositivo(filtros.id_tipo_equipo);
        if (
            filtros.id_tipo_equipo !== undefined &&
            filtros.id_tipo_equipo !== '' &&
            idTipo === null
        ) {
            throw new BadRequestException(
                'El parámetro id_tipo_equipo debe ser numérico.',
            );
        }

        const where: any = { id_empresa: idEmpresa, activo: true };
        if (idTipo !== null) where.id_tipo_equipo = idTipo;
        if (filtros.categoria?.trim()) where.categoria = filtros.categoria.trim();

        const tipos = await this.tipoRepository.find({ where });
        if (idTipo !== null && tipos.length === 0) {
            throw new NotFoundException(
                'El tipo de equipo no existe en esa empresa.',
            );
        }
        if (tipos.length === 0) {
            return { success: true, data: [] };
        }

        const idsTipos = tipos.map((t) => t.id_tipo_equipo);
        const [stocks, unidades] = await Promise.all([
            this.stockRepository.find({
                where: { id_tipo_equipo: In(idsTipos) },
            }),
            this.unitRepository.find({
                where: {
                    id_empresa: idEmpresa,
                    id_tipo_equipo: In(idsTipos),
                    estado: In(['En bodega', 'Asignado a técnico']),
                },
            }),
        ]);

        return {
            success: true,
            data: tipos.map((tipo) => {
                let disponible = 0;
                let reservado = 0;

                if (tipo.requiereSerialNumber === false) {
                    disponible = stocks
                        .filter((s) => s.id_tipo_equipo === tipo.id_tipo_equipo)
                        .reduce(
                            (total, s) => total + Number(s.cantidad_disponible ?? 0),
                            0,
                        );
                    // El modelo no reserva consumibles (G8 tampoco lo hace).
                    reservado = 0;
                } else {
                    const delTipo = unidades.filter(
                        (u) => u.id_tipo_equipo === tipo.id_tipo_equipo,
                    );
                    disponible = delTipo.filter((u) => u.estado === 'En bodega').length;
                    reservado = delTipo.filter(
                        (u) => u.estado === 'Asignado a técnico',
                    ).length;
                }

                disponible = Number(disponible.toFixed(2));
                return {
                    id_tipo_equipo: tipo.id_tipo_equipo,
                    id_empresa: tipo.id_empresa ?? null,
                    nombre: tipo.nombre,
                    categoria: tipo.categoria ?? null,
                    unidad_medida: tipo.unidadMedida ?? null,
                    requiere_serie_individual: tipo.requiereSerialNumber ?? null,
                    disponible,
                    reservado,
                    total: Number((disponible + reservado).toFixed(2)),
                };
            }),
        };
    }

    // GET /integraciones/unidades/:numeroSerie — G3 valida la serie ANTES de que el
  // técnico cierre la OT. sc-158 (G8): se amplía la respuesta sin quitar campos
  // existentes y con 404 genérico (una serie de otra empresa no se distingue).
  async consultarUnidadPorSerie(numeroSerie: string, idEmpresa: number) {
    const serie = (numeroSerie ?? '').trim();
    if (serie === '') {
      throw new BadRequestException('El número de serie es obligatorio.');
    }

    const unidad = await this.unitRepository.findOne({
      where: { serialNumber: serie, id_empresa: idEmpresa },
      relations: { tipoEquipo: true },
    });

    if (!unidad) {
      throw new NotFoundException('Número de serie no encontrado.');
    }

    // Asignación activa (G8): la última creada para la unidad, si existe.
    const asignacion = await this.asignacionRepository.findOne({
      where: { id_unidad: unidad.id_unidad, activa: true },
      order: { fechaInstalacion: 'DESC', id_asignacion: 'DESC' },
    });

    return {
      success: true,
      data: {
        id_unidad: unidad.id_unidad,
        numero_serie: unidad.serialNumber,
        estado: unidad.estado,
        id_empresa: unidad.id_empresa,
        id_tipo_equipo: unidad.id_tipo_equipo ?? null,
        tipo_equipo: {
          nombre: unidad.tipoEquipo?.nombre ?? null,
          categoria: unidad.tipoEquipo?.categoria ?? null,
          marca: unidad.tipoEquipo?.marca ?? null,
          modelo: unidad.tipoEquipo?.modelo ?? null,
        },
        mac_address: unidad.macAddress ?? null,
        id_bodega_actual: unidad.id_bodega_actual ?? null,
        fecha_adquisicion: this.formatearFecha(unidad.fechaAdquisicion),
        garantia: {
          fecha_vencimiento: this.formatearFecha(unidad.fechaVencGarantia),
          vigente: this.garantiaVigente(unidad.fechaVencGarantia),
        },
        asignacion_actual: asignacion
          ? {
              id_cliente_externo: asignacion.idClienteExterno ?? null,
              id_servicio_externo: asignacion.idServicioExterno,
              id_contrato_externo: asignacion.idContratoExterno ?? null,
              id_ot: asignacion.id_ot ?? null,
            }
          : null,
      },
    };
  }

  // POST /integraciones/activaciones — evento de activación de G8 (G1-8).
  // Idempotencia por event_id (UNIQUE en la cabecera) y UNIQUE(event_id, id_unidad)
  // en las filas. Tolera ambos órdenes cierre/activación: la asignación activa se
  // crea cuando están ambos eventos. El estado físico lo define SIEMPRE el cierre.
  async registrarActivacion(payload: any, integracion: IntegracionContexto) {
    if (
      payload === null ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw new BadRequestException(
        'El cuerpo de la activación debe ser un objeto JSON.',
      );
    }

    const eventId =
      typeof payload.event_id === 'string' ? payload.event_id.trim() : '';
    if (eventId === '') {
      throw new BadRequestException('Falta el event_id de la activación.');
    }
    if (eventId.length > 100) {
      throw new BadRequestException(
        'El event_id no puede superar los 100 caracteres.',
      );
    }

    const idEmpresa = Number(payload.id_empresa);
    this.validarScope(integracion, idEmpresa);

    const idOt = this.enteroPositivo(payload.id_ot);
    if (idOt === null) {
      throw new BadRequestException(
        'Falta el id_ot de la activación o no es numérico.',
      );
    }

    // Acuerdo v1: id_contrato es obligatorio en el flujo de activación de G8.
    const idContrato = this.enteroPositivo(payload.id_contrato);
    if (idContrato === null) {
      throw new BadRequestException(
        'Falta el id_contrato de la activación o no es numérico.',
      );
    }

    const idServicio = this.enteroPositivo(payload.id_servicio);
    if (idServicio === null) {
      throw new BadRequestException(
        'Falta el id_servicio de la activación o no es numérico.',
      );
    }

    let idCliente: number | null = null;
    if (
      payload.id_cliente !== undefined &&
      payload.id_cliente !== null &&
      payload.id_cliente !== ''
    ) {
      idCliente = this.enteroPositivo(payload.id_cliente);
      if (idCliente === null) {
        throw new BadRequestException(
          'El id_cliente debe ser un entero positivo.',
        );
      }
    }

    const rutCliente = this.textoOpcional(
      payload.rut_cliente,
      'El rut_cliente debe ser un texto.',
    );
    if (rutCliente !== null && rutCliente.length > 20) {
      throw new BadRequestException(
        'El rut_cliente no puede superar los 20 caracteres.',
      );
    }

    const traceId = this.textoOpcional(
      payload.trace_id,
      'El trace_id debe ser un texto.',
    );
    if (traceId !== null && traceId.length > 100) {
      throw new BadRequestException(
        'El trace_id no puede superar los 100 caracteres.',
      );
    }

    const equipos = this.extraerEquiposActivacion(payload);
    const series = equipos.map((e) => e.numero_serie);

    // Idempotencia: mismo evento con los mismos datos → resultado original.
    // Mismo event_id con otros datos → conflicto de idempotencia (409).
    const previa = await this.activacionRepository.findOne({
      where: { eventId },
    });
    if (previa) {
      if (
        !this.mismaActivacion(previa, {
          idEmpresa,
          idOt,
          idServicio,
          idContrato,
          series,
        })
      ) {
        throw new ConflictException(
          'El event_id ya fue utilizado con otros datos de activación.',
        );
      }
      return this.respuestaActivacion(previa, true);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let cabecera: IntegracionActivacion | null;
    try {
      // Si un cierre de la misma OT ya dejó un registro PENDIENTE_ACTIVACION,
      // esta activación lo completa (no se crea una cabecera nueva).
      cabecera = await queryRunner.manager.findOne(IntegracionActivacion, {
        where: {
          id_empresa: idEmpresa,
          id_ot: idOt,
          estadoProceso: ESTADO_ACTIVACION.PENDIENTE_ACTIVACION,
        },
        order: { id_activacion: 'DESC' },
      });

      if (!cabecera) {
        cabecera = queryRunner.manager.create(IntegracionActivacion, {
          eventId,
          traceId,
          id_empresa: idEmpresa,
          id_ot: idOt,
          idClienteExterno: idCliente,
          rutCliente,
          idServicioExterno: idServicio,
          idContratoExterno: idContrato,
          estadoProceso: ESTADO_ACTIVACION.PENDIENTE_CIERRE,
        });
      } else {
        cabecera.eventId = eventId;
        cabecera.traceId = traceId;
        cabecera.idClienteExterno = idCliente;
        cabecera.rutCliente = rutCliente;
        cabecera.idServicioExterno = idServicio;
        cabecera.idContratoExterno = idContrato;
      }
      cabecera.payload = payload;

      // ¿Llegó ya el cierre de esa OT? (ambos eventos → asignación activa)
      const cierre = await queryRunner.manager.findOne(IntegracionCierre, {
        where: { id_ot: idOt, id_empresa: idEmpresa },
        order: { id_cierre: 'DESC' },
      });

      if (cierre) {
        const resultado = await this.completarAsignaciones(
          queryRunner.manager,
          cabecera,
          this.fechaDelCierre(cierre),
        );
        cabecera.estadoProceso =
          resultado.discrepancias.length > 0
            ? ESTADO_ACTIVACION.CON_DISCREPANCIAS
            : ESTADO_ACTIVACION.COMPLETO;
        cabecera.equiposAsociados =
          resultado.asociados.length > 0 ? resultado.asociados : null;
        cabecera.discrepancias =
          resultado.discrepancias.length > 0 ? resultado.discrepancias : null;
      }

      await queryRunner.manager.save(IntegracionActivacion, cabecera);
      await queryRunner.commitTransaction();
      return this.respuestaActivacion(cabecera, false);
    } catch (err) {
      await queryRunner.rollbackTransaction().catch(() => {
        /* la transacción ya puede estar abortada */
      });

      // Carrera de idempotencia: otra petición insertó el mismo event_id primero.
      const codigo: string | undefined = err?.code;
      if (codigo === '23505') {
        const duplicado = await this.activacionRepository.findOne({
          where: { eventId },
        });
        if (duplicado) {
          return this.respuestaActivacion(duplicado, true);
        }
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // POST /integraciones/ordenes/:idOt/cierre — webhook receptor del cierre de OT de G3.
  // Contrato: payload válido → 2xx SIEMPRE, registrando discrepancias por ítem (un serial
  // mal tecleado nunca hace perder el cierre completo). 4xx solo para payloads mal formados.
  async recibirCierreOt(
    idOt: number,
    payload: any,
    integracion: IntegracionContexto,
  ) {
    if (!Number.isInteger(idOt) || idOt <= 0) {
      throw new BadRequestException('El identificador de la OT es inválido.');
    }
    if (
      payload === null ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw new BadRequestException(
        'El cuerpo del cierre debe ser un objeto JSON.',
      );
    }

    const clave =
      typeof payload.clave_idempotencia === 'string'
        ? payload.clave_idempotencia.trim()
        : '';
    if (clave === '') {
      throw new BadRequestException('Falta la clave_idempotencia del cierre.');
    }
    if (clave.length > 120) {
      throw new BadRequestException(
        'La clave_idempotencia no puede superar los 120 caracteres.',
      );
    }

    const idEmpresa = Number(payload.id_empresa);
    this.validarScope(integracion, idEmpresa);

    if (payload.id_ot !== undefined && Number(payload.id_ot) !== idOt) {
      throw new BadRequestException(
        'El id_ot del payload no coincide con el de la ruta.',
      );
    }

    const equipos = this.extraerEquipos(payload);
    // CU-64 (C)/CU-68: consumibles declarados en el cierre.
    const materiales = this.extraerMateriales(payload);
    // CU-64 (D): técnico del cierre (payload o inferido de las unidades).
    let idTecnico: number | null = this.enteroPositivo(payload.id_tecnico);

    // CU-64 (B): datos de cliente/dirección que se persisten al instalar.
    const datosInstalacion = this.extraerDatosInstalacion(payload);
    const tipoOt = typeof payload.tipo_ot === 'string' ? payload.tipo_ot : null;
    const fechaCompletada = this.parsearFecha(payload.fecha_completada) ?? new Date();
    // Idempotencia: si la clave ya fue procesada, devolvemos el resultado original (2xx).
    const previo = await this.cierreRepository.findOne({
      where: { claveIdempotencia: clave },
    });
    if (previo) {
      return this.respuestaDuplicado(previo);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let cierreGuardado: IntegracionCierre;
    try {
      // Se inserta primero el registro para reclamar la clave de forma atómica
      // (UNIQUE): si otro proceso la insertó, caemos por la excepción de duplicado.
      cierreGuardado = await queryRunner.manager.save(IntegracionCierre, {
        claveIdempotencia: clave,
        id_ot: idOt,
        id_empresa: idEmpresa,
        tipo_ot: tipoOt,
        payload: payload,
        estadoProceso: 'PROCESADO',
      });

      const accionesAplicadas: any[] = [];
      const discrepancias: any[] = [];

      // CU-64 (D): identificador de servicio SRV-YYYY-XXXXX para instalaciones
      // (secuencia por empresa/año; re-cierres de la misma OT conservan su SRV).
      // Se genera antes de procesar equipos para dejarlo en las unidades instaladas.
      const datosInstalacionConSrv = { ...datosInstalacion, srv: null as string | null };
      if (tipoOt === 'INSTALACION') {
        datosInstalacionConSrv.srv = await this.obtenerSrv(
          queryRunner.manager,
          idEmpresa,
          idOt,
          fechaCompletada,
        );
      }

      // Acuerdo G3: el diagnóstico del retiro para revisión es la categoria_falla
      // del cierre; si no viene, 'Causa desconocida'.
      const categoriaFalla = extraerCategoriaFalla(payload);

      for (const item of equipos) {
        const resultado = await this.procesarEquipo(
          queryRunner,
          item,
          idOt,
          idEmpresa,
          categoriaFalla,
          datosInstalacionConSrv,
        );
        if (resultado.id_tecnico && idTecnico === null) {
          idTecnico = resultado.id_tecnico;
        }
        if (resultado.discrepancia) {
          discrepancias.push(resultado.discrepancia);
        } else if (resultado.aplicada) {
          accionesAplicadas.push(resultado.aplicada);
        }
      }

      // CU-64 (C) + CU-68: descuento de los consumibles declarados del inventario
      // personal. Saldo insuficiente = ajuste registrado, nunca rechazo del cierre.
      const resultadoMateriales = await this.procesarMateriales(
        queryRunner.manager,
        materiales,
        idTecnico,
        idEmpresa,
      );
      discrepancias.push(...resultadoMateriales.discrepancias);
      accionesAplicadas.push(...resultadoMateriales.acciones);

      // CU-69: cierre de trabajo de reparación. Registra falla, solución, resultado,
      // equipos retirados/instalados y los consumibles ya descontados por CU-64/CU-68,
      // dentro de esta misma transacción.
      let reparacion: CierreReparacion | null = null;
      if (this.esCierreDeReparacion(payload)) {
        reparacion = await this.registrarCierreReparacion(
          queryRunner.manager,
          payload,
          idOt,
          idEmpresa,
          cierreGuardado.id_cierre,
          idTecnico,
          categoriaFalla,
          accionesAplicadas,
          discrepancias,
          resultadoMateriales.resumen,
        );
      }

      cierreGuardado.id_tecnico = idTecnico;
      cierreGuardado.srv = datosInstalacionConSrv.srv;
      cierreGuardado.materialesAplicados =
        materiales.length > 0 ? resultadoMateriales.resumen : null;
      cierreGuardado.estadoProceso =
        discrepancias.length > 0 ? 'PROCESADO_CON_DISCREPANCIAS' : 'PROCESADO';
      cierreGuardado.discrepancias =
        discrepancias.length > 0 ? discrepancias : null;
      cierreGuardado.accionesAplicadas =
        accionesAplicadas.length > 0 ? accionesAplicadas : null;
      await queryRunner.manager.save(IntegracionCierre, cierreGuardado);

      // sc-158 (acuerdo G8): el cierre es el otro evento que completa la
      // correlación por id_ot (activación→cierre y cierre→activación).
      await this.correlacionarActivacion(queryRunner.manager, cierreGuardado);

      await queryRunner.commitTransaction();

      // CU-69: auditoría tras el commit (patrón del resto de los módulos). El actor es el
      // técnico que cerró la OT; sin id_tecnico no hay a quién imputar el evento y la
      // trazabilidad queda en integracion_cierre y cierre_reparacion.
      if (reparacion && Number.isInteger(reparacion.id_tecnico)) {
        await this.auditoriaService.create({
          id_usuario: reparacion.id_tecnico as number,
          accion: 'CIERRE_REPARACION',
          entidad_afectada: 'cierre_reparacion',
          id_entidad_afectada: reparacion.id_cierre_reparacion,
          valor_anterior: null,
          valor_nuevo: {
            id_ot: idOt,
            id_empresa: idEmpresa,
            resultado: reparacion.resultado,
            // CU-70: el tipo de trabajo codificado queda en la auditoría del cierre.
            codigo_trabajo: reparacion.codigoTrabajo ?? null,
            equipos_retirados: reparacion.equiposRetirados ?? [],
            equipos_instalados: reparacion.equiposInstalados ?? [],
            consumibles: reparacion.consumibles ?? [],
          },
        });
      }

      return this.respuestaCierre(
        cierreGuardado,
        false,
        reparacion?.id_cierre_reparacion ?? null,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction().catch(() => {
        /* la transacción ya puede estar abortada */
      });

      // Carrera de idempotencia: otra petición insertó la misma clave primero.
      const codigo: string | undefined = err?.code;
      if (codigo === '23505') {
        const duplicado = await this.cierreRepository.findOne({
          where: { claveIdempotencia: clave },
        });
        if (duplicado) {
          return this.respuestaDuplicado(duplicado);
        }
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private extraerEquipos(payload: any): any[] {
    const listar = (campo: string): any[] => {
      const valor = payload[campo];
      if (valor === undefined || valor === null) return [];
      if (!Array.isArray(valor)) {
        throw new BadRequestException(`El campo ${campo} debe ser un arreglo.`);
      }
      return valor.map((item, index) => ({
        ...item,
        _campo: campo,
        _posicion: index,
      }));
    };

    const items = [
      ...listar('equipos_instalados'),
      ...listar('equipos_retirados'),
    ];
    for (const item of items) {
      if (
        typeof item.numero_serie !== 'string' ||
        item.numero_serie.trim() === ''
      ) {
        throw new BadRequestException(
          `Cada equipo de ${item._campo} debe incluir un numero_serie (posición ${item._posicion}).`,
        );
      }
      // CU-69: sin `accion` explícita, la acción la define el arreglo de origen.
      if (typeof item.accion !== 'string' || item.accion.trim() === '') {
        item.accion = ACCION_POR_CAMPO[item._campo];
      }
      if (!ACCIONES_G3[item.accion]) {
        throw new BadRequestException(
          `Acción no reconocida para la serie [${item.numero_serie.trim()}]: acciones permitidas: ${Object.keys(ACCIONES_G3).join(', ')}.`,
        );
      }
    }
    return items;
  }

  private async procesarEquipo(
    queryRunner: any,
    item: any,
    idOt: number,
    idEmpresa: number,
    categoriaFalla: string | null,
    datosInstalacion: {
      clienteRut: string | null;
      clienteNombre: string | null;
      direccionInstalacion: string | null;
      comunaInstalacion: string | null;
      srv: string | null;
    },
  ): Promise<{ aplicada?: any; discrepancia?: any; id_tecnico?: number | null }> {
    const serie = item.numero_serie.trim();
    const regla = ACCIONES_G3[item.accion];

    const unidad = await queryRunner.manager.findOne(UnidadEquipo, {
      where: { serialNumber: serie, id_empresa: idEmpresa },
    });

    if (!unidad) {
      return {
        discrepancia: {
          numero_serie: serie,
          accion: item.accion,
          codigo: 'SERIE_NO_EXISTE',
          detalle: `La serie no existe en la empresa ${idEmpresa}. Revisar manualmente.`,
        },
      };
    }

    if (!regla.origenes.includes(unidad.estado)) {
      return {
        discrepancia: {
          numero_serie: serie,
          accion: item.accion,
          codigo: 'TRANSICION_INVALIDA',
          detalle: `La unidad está en estado [${unidad.estado}] y la acción requiere origen en: ${regla.origenes.join(', ')}. Revisar manualmente.`,
        },
        id_tecnico: unidad.idTecnicoAsignado ?? null,
      };
    }

    const estadoOrigen = unidad.estado;
    const idTecnicoUnidad = unidad.idTecnicoAsignado ?? null;
    unidad.estado = regla.estado;

    // Reglas de la máquina de estados (consistente con UnitsService.transicionarEstado):
    // al salir de bodega se limpia la ubicación física y los datos de bodega;
    // al reingresar a bodega la ubicación física vuelve vacía (nadie la definió en terreno).
    if (estadoOrigen === 'En bodega' && regla.estado !== 'En bodega') {
      unidad.id_bodega_actual = undefined;
      unidad.numeroPoste = undefined;
      unidad.ubicacionFisica = null;
    }
    if (regla.estado === 'En bodega') {
      unidad.ubicacionFisica = null;
    }
    if (regla.estado === 'En revisión') {
      // Acuerdo G3: diagnóstico = categoria_falla del cierre; sin dato → fallback.
      unidad.diagnosticoTecnico = categoriaFalla ?? DIAGNOSTICO_FALLBACK_G3;
    }
    // CU-64 (B): al instalar se persisten cliente y dirección del cierre para
    // CU-48/71/73/87 (G3 identifica por RUT). El SRV se asigna al final del cierre.
    if (regla.estado === 'Instalado en cliente') {
      if (datosInstalacion.clienteRut !== null)
        unidad.clienteRut = datosInstalacion.clienteRut;
      if (datosInstalacion.clienteNombre !== null)
        unidad.clienteNombre = datosInstalacion.clienteNombre;
      if (datosInstalacion.direccionInstalacion !== null)
        unidad.direccionInstalacion = datosInstalacion.direccionInstalacion;
      if (datosInstalacion.comunaInstalacion !== null)
        unidad.comunaInstalacion = datosInstalacion.comunaInstalacion;
      if (datosInstalacion.srv) unidad.srv = datosInstalacion.srv;
    }

    await queryRunner.manager.save(unidad);

    const motivo = [
      `Cierre OT #${idOt} (integración G3). Acción: ${item.accion}.`,
      regla.estado === 'En revisión' && categoriaFalla
        ? `Categoría de falla: ${categoriaFalla}.`
        : null,
      item.motivo ? `Motivo: ${item.motivo}` : null,
      item.observacion_estado_fisico
        ? `Estado físico: ${item.observacion_estado_fisico}`
        : null,
    ]
      .filter(Boolean)
      .join(' ');

    const historial = queryRunner.manager.create(HistorialEstado, {
      id_unidad: unidad.id_unidad,
      id_usuario: null,
      estadoAnterior: estadoOrigen,
      estadoNuevo: regla.estado,
      motivo: motivo,
      fechaHora: new Date(
        new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }),
      ),
    });
    await queryRunner.manager.save(historial);

    return {
      aplicada: {
        numero_serie: serie,
        accion: item.accion,
        id_unidad: unidad.id_unidad,
        estado_anterior: estadoOrigen,
        estado_nuevo: regla.estado,
      },
      id_tecnico: idTecnicoUnidad,
    };
  }

  // --- CU-64/CU-68: acciones atómicas del cierre -----------------------------

  // CU-64 (B): cliente/dirección del payload de G3 (tolerante a los nombres del
  // contrato doc-12 §1.3: cliente{rut,nombre|nombre_completo} y direccion{...}).
  private extraerDatosInstalacion(payload: any): {
    clienteRut: string | null;
    clienteNombre: string | null;
    direccionInstalacion: string | null;
    comunaInstalacion: string | null;
  } {
    const cliente =
      payload.cliente && typeof payload.cliente === 'object' && !Array.isArray(payload.cliente)
        ? payload.cliente
        : null;
    const direccion =
      payload.direccion &&
      typeof payload.direccion === 'object' &&
      !Array.isArray(payload.direccion)
        ? payload.direccion
        : null;

    const texto = (valor: any): string | null =>
      typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null;

    return {
      clienteRut: texto(cliente?.rut),
      clienteNombre: texto(cliente?.nombre_completo) ?? texto(cliente?.nombre),
      direccionInstalacion:
        texto(direccion?.direccion_completa) ?? texto(direccion?.direccion),
      comunaInstalacion: texto(direccion?.comuna),
    };
  }

  // CU-64 (C): materiales[{id_tipo_equipo, cantidad}] del cierre. Cantidad 0 o
  // negativa = payload inválido (400); duplicados del mismo tipo se suman.
  private extraerMateriales(payload: any): { id_tipo_equipo: number; cantidad: number }[] {
    const valor = payload.materiales;
    if (valor === undefined || valor === null) return [];
    if (!Array.isArray(valor)) {
      throw new BadRequestException('El campo materiales debe ser un arreglo.');
    }

    const acumulado = new Map<number, number>();
    valor.forEach((item: any, index: number) => {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        throw new BadRequestException(
          `Cada material debe ser un objeto (posición ${index}).`,
        );
      }
      const idTipo = Number(item.id_tipo_equipo);
      if (!Number.isInteger(idTipo) || idTipo <= 0) {
        throw new BadRequestException(
          `Cada material debe incluir un id_tipo_equipo numérico (posición ${index}).`,
        );
      }
      const cantidad = Number(item.cantidad);
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new BadRequestException(
          `La cantidad del material [${idTipo}] debe ser mayor que cero (posición ${index}).`,
        );
      }
      acumulado.set(idTipo, (acumulado.get(idTipo) ?? 0) + cantidad);
    });

    return [...acumulado.entries()].map(([id_tipo_equipo, cantidad]) => ({
      id_tipo_equipo,
      cantidad: Number(cantidad.toFixed(2)),
    }));
  }

  // CU-64 (C)/CU-68: descuenta materiales del inventario personal del técnico.
  // Nunca rechaza el cierre: si el saldo no alcanza, descuenta lo disponible y
  // registra el faltante como ajuste + discrepancia (acuerdo Opción A con G3).
  private async procesarMateriales(
    manager: EntityManager,
    materiales: { id_tipo_equipo: number; cantidad: number }[],
    idTecnico: number | null,
    idEmpresa: number,
  ): Promise<{
    descontados: any[];
    ajustes: any[];
    discrepancias: any[];
    acciones: any[];
    resumen: { descontados: any[]; ajustes: any[] };
  }> {
    const descontados: any[] = [];
    const ajustes: any[] = [];
    const discrepancias: any[] = [];
    const acciones: any[] = [];

    if (materiales.length === 0) {
      return { descontados, ajustes, discrepancias, acciones, resumen: { descontados, ajustes } };
    }

    if (idTecnico === null) {
      // Sin técnico identificado no hay inventario personal que descontar: el
      // material igual queda registrado y se alerta para revisión manual.
      discrepancias.push({
        codigo: 'TECNICO_NO_IDENTIFICADO',
        detalle:
          'No fue posible identificar al técnico del cierre; los materiales declarados no se descontaron del inventario personal. Revisar manualmente.',
        materiales,
      });
      return { descontados, ajustes, discrepancias, acciones, resumen: { descontados, ajustes } };
    }

    for (const material of materiales) {
      const tipo = await manager.findOne(TipoEquipo, {
        where: {
          id_tipo_equipo: material.id_tipo_equipo,
          id_empresa: idEmpresa,
        },
      });
      const nombre = tipo?.nombre ?? String(material.id_tipo_equipo);
      const unidad = tipo?.unidadMedida ?? 'Unidad';

      const resultado = await this.inventarioPersonalService.descontarHasta(
        manager,
        idTecnico,
        material.id_tipo_equipo,
        material.cantidad,
      );

      if (resultado.faltante > 0) {
        const ajuste = {
          id_tipo_equipo: material.id_tipo_equipo,
          nombre,
          unidad_medida: unidad,
          disponible: resultado.saldoAnterior,
          declarado: material.cantidad,
          descontado: resultado.descontado,
          faltante: resultado.faltante,
        };
        ajustes.push(ajuste);
        discrepancias.push({
          codigo: 'SALDO_INSUFICIENTE_AJUSTADO',
          id_tipo_equipo: material.id_tipo_equipo,
          detalle: `Saldo insuficiente de [${nombre}]: disponible ${resultado.saldoAnterior} ${unidad}, declarado ${material.cantidad} ${unidad}. Se descontó lo disponible y el faltante quedó como ajuste.`,
        });
      }

      if (resultado.descontado > 0) {
        descontados.push({
          id_tipo_equipo: material.id_tipo_equipo,
          nombre,
          cantidad: resultado.descontado,
          saldo_anterior: resultado.saldoAnterior,
          saldo_nuevo: Number(
            (resultado.saldoAnterior - resultado.descontado).toFixed(2),
          ),
        });
      }
    }

    if (descontados.length > 0 || ajustes.length > 0) {
      acciones.push({
        tipo: 'MATERIALES',
        descontados,
        ajustes,
      });
    }

    return {
      descontados,
      ajustes,
      discrepancias,
      acciones,
      resumen: { descontados, ajustes },
    };
  }

  // --- CU-69: cierre de trabajo de reparación --------------------------------

  // Hay reparación cuando G3 marca tipo_ot REPARACION o adjunta el bloque.
  private esCierreDeReparacion(payload: any): boolean {
    const tipo =
      typeof payload.tipo_ot === 'string'
        ? payload.tipo_ot.trim().toUpperCase()
        : '';
    return (
      tipo === 'REPARACION' ||
      (payload.reparacion !== null &&
        typeof payload.reparacion === 'object' &&
        !Array.isArray(payload.reparacion))
    );
  }

  // CU-69: falla reportada y solución aplicada son obligatorias, de 5 a 300 caracteres.
  private textoObligatorio(valor: any): string | null {
    if (typeof valor !== 'string') return null;
    const limpio = valor.trim();
    return limpio.length >= 5 && limpio.length <= 300 ? limpio : null;
  }

  // CU-69: registra el cierre de reparación dentro de la transacción del webhook.
  // Los consumibles ya fueron descontados por procesarMateriales (CU-64/CU-68); aquí
  // solo se guarda su detalle junto al cierre para la trazabilidad y la vista.
  private async registrarCierreReparacion(
    manager: EntityManager,
    payload: any,
    idOt: number,
    idEmpresa: number,
    idCierre: number,
    idTecnico: number | null,
    categoriaFalla: string | null,
    accionesAplicadas: any[],
    discrepancias: any[],
    materiales: { descontados: any[]; ajustes: any[] },
  ): Promise<CierreReparacion | null> {
    const bloque = (payload.reparacion ?? {}) as any;

    // CU-70: lo que el técnico dejó preparado para esta OT (tipo de trabajo
    // codificado y sus campos) completa lo que G3 no envía en el cierre.
    const preparado = await this.cierresTrabajoService.completarDesdeBorrador(
      manager,
      idOt,
      idEmpresa,
      payload.codigo_trabajo ?? bloque.codigo_trabajo,
    );
    const predefinido = preparado?.campos ?? {};

    const falla =
      this.textoObligatorio(bloque.falla_reportada) ??
      this.textoObligatorio(predefinido.falla_reportada);
    const solucion =
      this.textoObligatorio(bloque.solucion_aplicada) ??
      this.textoObligatorio(predefinido.solucion_aplicada);
    const resultado =
      RESULTADOS_G3[String(bloque.resultado ?? '').trim().toUpperCase()] ??
      RESULTADOS_G3[String(predefinido.resultado ?? '').trim().toUpperCase()];

    const faltantes = [
      falla ? null : 'falla_reportada (5 a 300 caracteres)',
      solucion ? null : 'solucion_aplicada (5 a 300 caracteres)',
      resultado ? null : `resultado (${Object.keys(RESULTADOS_G3).join(' | ')})`,
    ].filter(Boolean);

    // Contrato con G3: el cierre nunca se rechaza; lo que falta queda como discrepancia.
    if (faltantes.length > 0) {
      discrepancias.push({
        codigo: 'DATOS_REPARACION_INCOMPLETOS',
        detalle: `El cierre de reparación no se registró: falta ${faltantes.join(', ')}. Revisar manualmente.`,
      });
      return null;
    }

    // Las acciones aplicadas se reparten por destino: lo instalado en el cliente es el
    // reemplazo y todo lo demás (revisión, bodega, baja) es retiro.
    const equipos = (instalados: boolean) =>
      accionesAplicadas
        .filter(
          (accion) =>
            (accion.accion === 'INSTALADO_EN_CLIENTE') === instalados &&
            accion.numero_serie !== undefined,
        )
        .map((accion) => ({
          numero_serie: accion.numero_serie,
          estado_anterior: accion.estado_anterior,
          estado_nuevo: accion.estado_nuevo,
        }));

    const consumibles = [
      ...materiales.descontados.map((d) => ({
        id_tipo_equipo: d.id_tipo_equipo,
        tipo_equipo: d.nombre,
        cantidad: d.cantidad,
        descontado: true,
        saldo_resultante: d.saldo_nuevo,
      })),
      ...materiales.ajustes.map((a) => ({
        id_tipo_equipo: a.id_tipo_equipo,
        tipo_equipo: a.nombre,
        cantidad: a.declarado,
        unidad_medida: a.unidad_medida,
        descontado: false,
        codigo: 'SALDO_INSUFICIENTE_AJUSTADO',
        detalle: `Disponible ${a.disponible} ${a.unidad_medida}, declarado ${a.declarado} ${a.unidad_medida}; faltante ${a.faltante}.`,
      })),
    ];

    const texto = (valor: any, largo: number): string | null =>
      typeof valor === 'string' && valor.trim() !== ''
        ? valor.trim().slice(0, largo)
        : null;
    const fecha = this.parsearFecha(payload.fecha_completada);

    return await manager.save(CierreReparacion, {
      id_cierre: idCierre,
      id_ot: idOt,
      id_empresa: idEmpresa,
      id_tecnico: idTecnico,
      rutCliente: texto(payload.cliente?.rut, 12),
      direccionServicio:
        texto(payload.direccion?.direccion_completa, 200) ??
        texto(payload.direccion?.direccion, 200),
      fallaReportada: falla as string,
      solucionAplicada: solucion as string,
      resultado,
      resueltoRemotamente: bloque.resuelto_remotamente === true,
      categoriaFalla: categoriaFalla ?? predefinido.categoria_falla ?? null,
      // CU-70: tipo de trabajo codificado con el que se cerró (null si el técnico
      // completó el cierre a mano, Excepción 1).
      codigoTrabajo: preparado?.codigo_trabajo ?? null,
      equiposRetirados: equipos(false),
      equiposInstalados: equipos(true),
      consumibles,
      fechaCierre: fecha,
    });
  }

  // CU-69 (vista): cierres de reparación para la UI autenticada, aislados por empresa.
  async listarCierresReparacion(
    filtros: { numero_serie?: string; id_ot?: number },
    actor: { id_empresa: number; roles?: string[] },
  ) {
    const esSuperusuario = (actor?.roles ?? []).includes('SUPERUSUARIO');
    const query = this.reparacionRepository
      .createQueryBuilder('c')
      .orderBy('c.fechaRegistro', 'DESC')
      .limit(200);

    if (!esSuperusuario) {
      query.andWhere('c.id_empresa = :idEmpresa', {
        idEmpresa: actor.id_empresa,
      });
    }
    if (Number.isInteger(filtros.id_ot)) {
      query.andWhere('c.id_ot = :idOt', { idOt: filtros.id_ot });
    }

    const serie = (filtros.numero_serie ?? '').trim();
    if (serie !== '') {
      const contiene = JSON.stringify([{ numero_serie: serie }]);
      query.andWhere(
        '(c.equipos_retirados @> :contiene::jsonb OR c.equipos_instalados @> :contiene::jsonb)',
        { contiene },
      );
    }

    return query.getMany();
  }

  // CU-64 (D): SRV-YYYY-XXXXX con secuencia atómica por empresa/año. Un re-cierre
  // de la misma OT conserva el SRV original.
  private async obtenerSrv(
    manager: EntityManager,
    idEmpresa: number,
    idOt: number,
    fecha: Date,
  ): Promise<string> {
    const previo = await manager.findOne(IntegracionCierre, {
      where: { id_ot: idOt, id_empresa: idEmpresa, srv: Not(IsNull()) },
      order: { id_cierre: 'DESC' },
    });
    if (previo?.srv) return previo.srv;

    const anio = fecha.getFullYear();
    const filas: any[] = await manager.query(
      `INSERT INTO secuencia_srv (id_empresa, anio, ultimo) VALUES ($1, $2, 1)
       ON CONFLICT (id_empresa, anio) DO UPDATE SET ultimo = secuencia_srv.ultimo + 1
       RETURNING ultimo`,
      [idEmpresa, anio],
    );
    const ultimo = Number(filas?.[0]?.ultimo ?? 1);
    return `SRV-${anio}-${String(ultimo).padStart(5, '0')}`;
  }

  // --- sc-158 (acuerdo G8): helpers de activaciones -------------------------

  private extraerEquiposActivacion(payload: any): { numero_serie: string }[] {
    const valor = payload.equipos;
    if (!Array.isArray(valor) || valor.length === 0) {
      throw new BadRequestException(
        'La activación debe incluir al menos un equipo en el campo equipos.',
      );
    }
    return valor.map((item, index) => {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        throw new BadRequestException(
          `Cada equipo de equipos debe ser un objeto (posición ${index}).`,
        );
      }
      const serie =
        typeof item.numero_serie === 'string' ? item.numero_serie.trim() : '';
      if (serie === '') {
        throw new BadRequestException(
          `Cada equipo de equipos debe incluir un numero_serie (posición ${index}).`,
        );
      }
      if (serie.length > 80) {
        throw new BadRequestException(
          `El numero_serie no puede superar los 80 caracteres (posición ${index}).`,
        );
      }
      return { numero_serie: serie };
    });
  }

  private enteroPositivo(valor: any): number | null {
    if (valor === undefined || valor === null || valor === '') return null;
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : null;
  }

  private textoOpcional(valor: any, mensaje: string): string | null {
    if (valor === undefined || valor === null) return null;
    if (typeof valor !== 'string') {
      throw new BadRequestException(mensaje);
    }
    const texto = valor.trim();
    return texto === '' ? null : texto;
  }

  // Mismo event_id (2xx idempotente) solo si los datos semánticos coinciden;
  // reutilizar el event_id con otros datos es un conflicto (409).
  private mismaActivacion(
    cabecera: IntegracionActivacion,
    datos: {
      idEmpresa: number;
      idOt: number;
      idServicio: number;
      idContrato: number;
      series: string[];
    },
  ): boolean {
    if (cabecera.id_empresa !== datos.idEmpresa) return false;
    if ((cabecera.id_ot ?? null) !== datos.idOt) return false;
    if ((cabecera.idServicioExterno ?? null) !== datos.idServicio) return false;
    if ((cabecera.idContratoExterno ?? null) !== datos.idContrato) return false;

    const equipos = Array.isArray(cabecera.payload?.equipos)
      ? cabecera.payload.equipos
      : [];
    const previas = equipos
      .map((e: any) => String(e?.numero_serie ?? '').trim())
      .sort();
    return JSON.stringify(previas) === JSON.stringify([...datos.series].sort());
  }

  // Crea las asignaciones activas del evento cuando ya están ambos eventos.
  // Reemplazos (acuerdo v1): las asignaciones activas previas del mismo servicio
  // pasan a activa=false + fecha_retiro; una unidad mantiene una sola asignación activa.
  private async completarAsignaciones(
    manager: EntityManager,
    cabecera: IntegracionActivacion,
    fechaInstalacion: Date,
  ): Promise<{ asociados: any[]; discrepancias: any[] }> {
    const asociados: any[] = [];
    const discrepancias: any[] = [];
    const vistas = new Set<string>();

    if (
      cabecera.idServicioExterno === null ||
      cabecera.idServicioExterno === undefined
    ) {
      discrepancias.push({
        codigo: 'SIN_SERVICIO',
        detalle: 'El evento de activación no tiene id_servicio asociado.',
      });
      return { asociados, discrepancias };
    }

    const equipos = Array.isArray(cabecera.payload?.equipos)
      ? cabecera.payload.equipos
      : [];
    if (equipos.length === 0) {
      discrepancias.push({
        codigo: 'SIN_EQUIPOS',
        detalle: 'El evento de activación no declaró equipos.',
      });
      return { asociados, discrepancias };
    }

    const fechaRetiro = new Date();

    // Reemplazo por servicio: se retiran las asignaciones activas anteriores.
    await manager.update(
      AsignacionEquipoServicio,
      {
        id_empresa: cabecera.id_empresa,
        idServicioExterno: cabecera.idServicioExterno,
        activa: true,
      },
      { activa: false, fechaRetiro },
    );

    for (const item of equipos) {
      const serie = String(item?.numero_serie ?? '').trim();
      if (serie === '') {
        discrepancias.push({
          numero_serie: null,
          codigo: 'SERIE_INVALIDA',
          detalle: 'El equipo no incluye numero_serie. Revisar manualmente.',
        });
        continue;
      }
      if (vistas.has(serie)) {
        discrepancias.push({
          numero_serie: serie,
          codigo: 'SERIE_DUPLICADA_EN_EVENTO',
          detalle:
            'La serie está repetida dentro del mismo evento. Revisar manualmente.',
        });
        continue;
      }
      vistas.add(serie);

      const unidad = await manager.findOne(UnidadEquipo, {
        where: { serialNumber: serie, id_empresa: cabecera.id_empresa },
      });
      if (!unidad) {
        discrepancias.push({
          numero_serie: serie,
          codigo: 'SERIE_NO_EXISTE',
          detalle: `La serie no existe en la empresa ${cabecera.id_empresa}. Revisar manualmente.`,
        });
        continue;
      }

      // Una unidad solo puede tener una asignación activa a la vez.
      await manager.update(
        AsignacionEquipoServicio,
        { id_unidad: unidad.id_unidad, activa: true },
        { activa: false, fechaRetiro },
      );

      const fila = manager.create(AsignacionEquipoServicio, {
        id_unidad: unidad.id_unidad,
        id_empresa: cabecera.id_empresa,
        eventId: cabecera.eventId ?? null,
        idClienteExterno: cabecera.idClienteExterno ?? null,
        rutCliente: cabecera.rutCliente ?? null,
        idServicioExterno: cabecera.idServicioExterno,
        idContratoExterno: cabecera.idContratoExterno ?? null,
        id_ot: cabecera.id_ot ?? null,
        fechaInstalacion,
        activa: true,
        origen: ORIGEN_ACTIVACION_G8,
        traceId: cabecera.traceId ?? null,
      });
      const guardada = await manager.save(AsignacionEquipoServicio, fila);

      // Compatibilidad con los flujos actuales: la asignación activa también
      // se refleja en unidad_equipo.id_cliente_instalado cuando G8 lo informa.
      if (
        cabecera.idClienteExterno !== null &&
        cabecera.idClienteExterno !== undefined &&
        unidad.id_cliente_instalado !== cabecera.idClienteExterno
      ) {
        unidad.id_cliente_instalado = cabecera.idClienteExterno;
        await manager.save(UnidadEquipo, unidad);
      }

      asociados.push({
        numero_serie: serie,
        id_unidad: unidad.id_unidad,
        id_asignacion: guardada.id_asignacion,
      });
    }

    return { asociados, discrepancias };
  }

  // Correlación por id_ot: completa las activaciones que esperaban el cierre y,
  // si el cierre declaró equipos instalados y no hay activación, deja el
  // registro PENDIENTE_ACTIVACION (nunca se inventa estado físico).
  private async correlacionarActivacion(
    manager: EntityManager,
    cierre: IntegracionCierre,
  ): Promise<void> {
    const pendientes = await manager.find(IntegracionActivacion, {
      where: {
        id_empresa: cierre.id_empresa,
        id_ot: cierre.id_ot,
        estadoProceso: ESTADO_ACTIVACION.PENDIENTE_CIERRE,
      },
    });

    if (pendientes.length > 0) {
      const fechaInstalacion = this.fechaDelCierre(cierre);
      for (const cabecera of pendientes) {
        const resultado = await this.completarAsignaciones(
          manager,
          cabecera,
          fechaInstalacion,
        );
        cabecera.estadoProceso =
          resultado.discrepancias.length > 0
            ? ESTADO_ACTIVACION.CON_DISCREPANCIAS
            : ESTADO_ACTIVACION.COMPLETO;
        cabecera.equiposAsociados =
          resultado.asociados.length > 0 ? resultado.asociados : null;
        cabecera.discrepancias =
          resultado.discrepancias.length > 0 ? resultado.discrepancias : null;
        await manager.save(IntegracionActivacion, cabecera);
      }
      return;
    }

    const instalados = Array.isArray(cierre.payload?.equipos_instalados)
      ? cierre.payload.equipos_instalados
      : [];
    const equipos = instalados
      .filter(
        (item: any) =>
          item &&
          typeof item.numero_serie === 'string' &&
          item.numero_serie.trim() !== '',
      )
      .map((item: any) => ({ numero_serie: item.numero_serie.trim() }));
    if (equipos.length === 0) return;

    const yaExiste = await manager.findOne(IntegracionActivacion, {
      where: {
        id_empresa: cierre.id_empresa,
        id_ot: cierre.id_ot,
        estadoProceso: ESTADO_ACTIVACION.PENDIENTE_ACTIVACION,
      },
    });
    if (yaExiste) return;

    await manager.save(
      IntegracionActivacion,
      manager.create(IntegracionActivacion, {
        eventId: null,
        id_empresa: cierre.id_empresa,
        id_ot: cierre.id_ot,
        // Referencia del cierre que espera su activación; la activación
        // reemplazará este payload por el suyo al completar.
        payload: {
          cierre: {
            clave_idempotencia: cierre.claveIdempotencia,
            fecha_completada: cierre.payload?.fecha_completada ?? null,
          },
          equipos,
        },
        estadoProceso: ESTADO_ACTIVACION.PENDIENTE_ACTIVACION,
      }),
    );
  }

  private fechaDelCierre(cierre: IntegracionCierre): Date {
    const fecha = this.parsearFecha(cierre.payload?.fecha_completada);
    return fecha ?? new Date();
  }

  private parsearFecha(valor: any): Date | null {
    if (typeof valor !== 'string' || valor.trim() === '') return null;
    const fecha = new Date(valor);
    return isNaN(fecha.getTime()) ? null : fecha;
  }

  private formatearFecha(
    valor: Date | string | null | undefined,
  ): string | null {
    if (valor === null || valor === undefined) return null;
    if (valor instanceof Date) {
      return isNaN(valor.getTime()) ? null : valor.toISOString().slice(0, 10);
    }
    return String(valor).slice(0, 10);
  }

  private garantiaVigente(
    fechaVencimiento: Date | string | null | undefined,
  ): boolean {
    if (!fechaVencimiento) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);
    return vencimiento.getTime() >= hoy.getTime();
  }

  private respuestaActivacion(
    cabecera: IntegracionActivacion,
    duplicado: boolean,
  ) {
    return {
      success: true,
      data: {
        event_id: cabecera.eventId ?? null,
        id_servicio: cabecera.idServicioExterno ?? null,
        equipos_asociados: Array.isArray(cabecera.equiposAsociados)
          ? cabecera.equiposAsociados.length
          : 0,
        duplicado,
      },
    };
  }

  // CU-69: en un reenvío del mismo cierre la respuesta conserva el id del cierre
  // de reparación ya registrado (no se vuelve a procesar nada).
  private async respuestaDuplicado(cierre: IntegracionCierre) {
    const reparacion = await this.reparacionRepository.findOne({
      where: { id_cierre: cierre.id_cierre },
    });
    return this.respuestaCierre(
      cierre,
      true,
      reparacion?.id_cierre_reparacion ?? null,
    );
  }

  private respuestaCierre(
    cierre: IntegracionCierre,
    duplicado: boolean,
    idCierreReparacion: number | null = null,
  ) {
    return {
      success: true,
      data: {
        duplicado,
        id_ot: cierre.id_ot,
        clave_idempotencia: cierre.claveIdempotencia,
        estado_proceso: cierre.estadoProceso,
        // CU-64 (D): SRV-YYYY-XXXXX de la instalación (G3 lo espera en data.srv).
        srv: cierre.srv ?? null,
        id_tecnico: cierre.id_tecnico ?? null,
        acciones_aplicadas: cierre.accionesAplicadas ?? [],
        discrepancias: cierre.discrepancias ?? [],
        // CU-64 (C)/CU-68: resultado del consumo de materiales declarados.
        materiales: cierre.materialesAplicados ?? {
          descontados: [],
          ajustes: [],
        },
        // CU-69: registro del cierre de reparación (null en cierres de instalación).
        id_cierre_reparacion: idCierreReparacion,
      },
    };
  }
}
