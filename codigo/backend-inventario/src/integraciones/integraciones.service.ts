import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { IntegracionCierre } from './entities/cierre-integracion.entity';
import { IntegracionActivacion } from './entities/integracion-activacion.entity';
import { AsignacionEquipoServicio } from './entities/asignacion-equipo-servicio.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { HistorialEstado } from '../inventario/entities/historial-estado.entity';
import { CatalogService } from '../inventario/catalog.service';
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
    @InjectRepository(UnidadEquipo)
    private readonly unitRepository: Repository<UnidadEquipo>,
    private readonly catalogService: CatalogService,
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

    // Idempotencia: si la clave ya fue procesada, devolvemos el resultado original (2xx).
    const previo = await this.cierreRepository.findOne({
      where: { claveIdempotencia: clave },
    });
    if (previo) {
      return this.respuestaCierre(previo, true);
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
        tipo_ot: typeof payload.tipo_ot === 'string' ? payload.tipo_ot : null,
        payload: payload,
        estadoProceso: 'PROCESADO',
      });

      const accionesAplicadas: any[] = [];
      const discrepancias: any[] = [];

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
        );
        if (resultado.discrepancia) {
          discrepancias.push(resultado.discrepancia);
        } else if (resultado.aplicada) {
          accionesAplicadas.push(resultado.aplicada);
        }
      }

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
      return this.respuestaCierre(cierreGuardado, false);
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
          return this.respuestaCierre(duplicado, true);
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
  ): Promise<{ aplicada?: any; discrepancia?: any }> {
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
      };
    }

    const estadoOrigen = unidad.estado;
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
    };
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

  private respuestaCierre(cierre: IntegracionCierre, duplicado: boolean) {
    return {
      success: true,
      data: {
        duplicado,
        id_ot: cierre.id_ot,
        clave_idempotencia: cierre.claveIdempotencia,
        estado_proceso: cierre.estadoProceso,
        acciones_aplicadas: cierre.accionesAplicadas ?? [],
        discrepancias: cierre.discrepancias ?? [],
        // Los materiales declarados quedan registrados en el payload; el descuento
        // y la validación de saldo son de T1 vía CU-58/CU-68 (aún no implementados).
        materiales_pendientes_descuento: true,
      },
    };
  }
}
