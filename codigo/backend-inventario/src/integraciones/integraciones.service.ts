import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { IntegracionCierre } from './entities/cierre-integracion.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { HistorialEstado } from '../inventario/entities/historial-estado.entity';
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

// Pendiente la respuesta de G3 sobre el dato de diagnóstico del técnico.
// Mientras tanto, el ingreso a revisión queda con este valor (CU-40 exige diagnóstico).
const DIAGNOSTICO_PENDIENTE_G3 = 'Causa desconocida';

@Injectable()
export class IntegracionesService {
  constructor(
    @InjectRepository(IntegracionCierre)
    private readonly cierreRepository: Repository<IntegracionCierre>,
    @InjectRepository(UnidadEquipo)
    private readonly unitRepository: Repository<UnidadEquipo>,
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

  // GET /integraciones/unidades/:numeroSerie — G3 valida la serie ANTES de que el técnico cierre la OT.
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

    return {
      success: true,
      data: {
        numero_serie: unidad.serialNumber,
        estado: unidad.estado,
        id_empresa: unidad.id_empresa,
        tipo_equipo: unidad.tipoEquipo?.nombre ?? null,
      },
    };
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

      for (const item of equipos) {
        const resultado = await this.procesarEquipo(
          queryRunner,
          item,
          idOt,
          idEmpresa,
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
      // CU-40 exige diagnóstico: mientras G3 no envíe el dato, queda el placeholder acordado.
      unidad.diagnosticoTecnico = DIAGNOSTICO_PENDIENTE_G3;
    }

    await queryRunner.manager.save(unidad);

    const motivo = [
      `Cierre OT #${idOt} (integración G3). Acción: ${item.accion}.`,
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
