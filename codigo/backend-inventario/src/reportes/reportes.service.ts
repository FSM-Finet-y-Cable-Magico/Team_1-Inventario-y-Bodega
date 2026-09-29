import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  RequestTimeoutException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { HistorialEstado } from '../inventario/entities/historial-estado.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { InventarioPersonal } from '../salidas/entities/inventario-personal.entity';
import { SalidaBodega } from '../salidas/entities/salida-bodega.entity';
import { SalidaDetalle } from '../salidas/entities/salida-detalle.entity';
import { OrdenIngreso } from '../ordenes-ingreso/entities/orden-ingreso.entity';
import { OrdenIngresoDetalle } from '../ordenes-ingreso/entities/orden-ingreso-detalle.entity';
import { PrestamoDetalle } from '../prestamos/entities/prestamo-detalle.entity';
import { PrestamoExterno } from '../inventario/entities/prestamo-externo.entity';
import { PrestamoRetorno } from '../prestamos/entities/prestamo-retorno.entity';
import { MovimientoInventario } from '../transferencias/entities/movimiento-inventario.entity';
import { G3ClientService } from '../integraciones/g3/g3-client.service';
import { ExcelExportService, ExcelColumn } from './excel-export.service';

type FiltrosStock = {
  id_empresa?: number;
  id_bodega?: number;
  id_tipo_equipo?: number;
};

type FiltrosMovimientos = {
  id_empresa?: number;
  id_bodega?: number;
  id_tipo_equipo?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo_movimiento?: string;
  id_usuario?: number;
};

type FiltrosGarantias = {
  id_empresa?: number;
  id_tipo_equipo?: number;
  periodo?: string;
};

type FiltrosInventarioTecnicos = {
  id_empresa?: number;
  id_usuario?: number;
};

type FiltrosConsumo = {
  id_empresa?: number;
  id_tipo_equipo?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
};

export type FiltrosEquiposInstalados = {
  id_empresa?: number;
  rut?: string;
  nombre?: string;
  numero_serie?: string;
  ns?: string;
};

export type ReporteEquipoInstaladoFila = {
  id_unidad: number;
  numero_servicio: string;
  rut_cliente: string;
  nombre_cliente: string;
  direccion_instalacion: string;
  tipo_equipo: string;
  numero_serie: string;
  fecha_instalacion: string;
  tecnico_instalacion: string;
  id_empresa: number;
};

export type FiltrosProductividadTecnicos = {
  id_empresa?: number;
  id_tecnico?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
};

export type ConsumibleAgrupado = {
  tipo_consumible: string;
  cantidad: number;
  unidad_medida: string;
};

export type ReporteProductividadTecnicoFila = {
  id_tecnico: number;
  nombre_completo: string;
  id_empresa: number;
  empresa: string;
  instalaciones_cerradas: number;
  reparaciones_cerradas: number;
  metros_fibra_optica: number;
  unidades_conectores: number;
  otros_consumibles: ConsumibleAgrupado[];
  otros_consumibles_resumen: string;
};

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function cleanRut(rut?: string | null): string {
  if (!rut) return '';
  return rut
    .replace(/[^0-9kK]/g, '')
    .toLowerCase()
    .trim();
}

function formatDateDDMMYYYY(
  dateInput: Date | string | null | undefined,
): string {
  if (!dateInput) return '-';
  const d =
    typeof dateInput === 'string'
      ? new Date(dateInput.includes('T') ? dateInput : `${dateInput}T00:00:00`)
      : dateInput;
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export type Actor = {
  id_usuario?: number;
  sub?: number;
  id_empresa?: number;
  roles?: string[];
};

const ESTADOS_REPORTE = [
  'En bodega',
  'Asignado a técnico',
  'En revisión',
  'En préstamo externo',
];

@Injectable()
export class ReportesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
    @InjectRepository(StockConsumible)
    private readonly stockRepository: Repository<StockConsumible>,
    @InjectRepository(TipoEquipo)
    private readonly tipoEquipoRepository: Repository<TipoEquipo>,
    @InjectRepository(UnidadEquipo)
    private readonly unidadRepository: Repository<UnidadEquipo>,
    @InjectRepository(MovimientoInventario)
    private readonly movimientoRepository: Repository<MovimientoInventario>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly auditoriaService: AuditoriaService,
    private readonly g3ClientService: G3ClientService,
    private readonly excelExportService: ExcelExportService,
  ) {}

  //CU-89
  async getInventarioTecnicosReport(
    filtros: FiltrosInventarioTecnicos,
    actor: Actor,
  ): Promise<any[]> {
    const esSuperusuario = actor.roles?.includes('SUPERUSUARIO') ?? false;
    if (
      !esSuperusuario &&
      filtros.id_empresa !== undefined &&
      filtros.id_empresa !== actor.id_empresa
    ) {
      throw new ForbiddenException(
        'No tiene permisos para consultar esta empresa.',
      );
    }

    const idEmpresa = esSuperusuario ? filtros.id_empresa : actor.id_empresa;
    if (!esSuperusuario && !idEmpresa) {
      throw new BadRequestException(
        'El usuario no tiene una empresa asignada.',
      );
    }

    const tecnicosQb = this.dataSource
      .getRepository(Usuario)
      .createQueryBuilder('u')
      .innerJoin('u.usuarioRoles', 'ur')
      .innerJoin('ur.rol', 'r')
      .where('u.activo = true')
      .andWhere('r.nombre_rol = :rol', { rol: 'TECNICO_TERRENO' });
    if (idEmpresa !== undefined && idEmpresa !== null) {
      tecnicosQb.andWhere('u.id_empresa = :idEmpresa', { idEmpresa });
    }
    if (filtros.id_usuario !== undefined) {
      tecnicosQb.andWhere('u.id_usuario = :idUsuario', {
        idUsuario: filtros.id_usuario,
      });
    }
    const tecnicos = (
      await tecnicosQb
        .orderBy('u.nombre_completo', 'ASC')
        .addOrderBy('u.id_usuario', 'ASC')
        .getMany()
    ).map((u) => ({
      id_usuario: u.id_usuario,
      nombre_completo: u.nombre_completo,
      id_empresa: u.id_empresa,
    }));

    if (filtros.id_usuario !== undefined && tecnicos.length === 0) {
      throw new NotFoundException('Técnico no encontrado.');
    }

    const resultado = await Promise.all(
      tecnicos.map(
        async (tecnico: {
          id_usuario: number;
          nombre_completo: string;
          id_empresa: number;
        }) => {
          // CU-89: unidades asignadas al técnico. La fecha de asignación es el
          // último historial 'Asignado a técnico' de ese técnico; como respaldo,
          // la última salida de bodega que incluyó la unidad (equivalente a los
          // LEFT JOIN LATERAL de la versión anterior, en TypeORM).
          const unidades = await this.dataSource
            .getRepository(UnidadEquipo)
            .find({
              where: {
                id_empresa: tecnico.id_empresa,
                idTecnicoAsignado: tecnico.id_usuario,
                estado: 'Asignado a técnico',
              },
              relations: { tipoEquipo: true },
              order: { serialNumber: 'ASC' },
            });

          const historialRepository =
            this.dataSource.getRepository(HistorialEstado);
          const salidaDetalleRepository =
            this.dataSource.getRepository(SalidaDetalle);

          const equipos_individualizables = await Promise.all(
            unidades.map(async (unidad) => {
              const [ultimoAsignado, ultimaSalida] = await Promise.all([
                historialRepository
                  .createQueryBuilder('he')
                  .where('he.id_unidad = :idUnidad', {
                    idUnidad: unidad.id_unidad,
                  })
                  .andWhere('he.estado_nuevo = :estado', {
                    estado: 'Asignado a técnico',
                  })
                  .andWhere('he.id_usuario = :idUsuario', {
                    idUsuario: tecnico.id_usuario,
                  })
                  .orderBy('he.fecha_hora', 'DESC')
                  .addOrderBy('he.id_historial', 'DESC')
                  .getOne(),
                salidaDetalleRepository
                  .createQueryBuilder('sd')
                  .innerJoinAndSelect('sd.salida', 's')
                  .where('sd.id_unidad = :idUnidad', {
                    idUnidad: unidad.id_unidad,
                  })
                  .andWhere('s.id_tecnico = :idTecnico', {
                    idTecnico: tecnico.id_usuario,
                  })
                  .orderBy('s.fecha_hora', 'DESC')
                  .addOrderBy('s.id_salida', 'DESC')
                  .getOne(),
              ]);

              const fechaAsignacion =
                ultimoAsignado?.fechaHora ??
                ultimaSalida?.salida?.fecha_hora ??
                null;
              const diasTranscurridos = fechaAsignacion
                ? Math.max(
                    0,
                    Math.floor(
                      (Date.now() - new Date(fechaAsignacion).getTime()) /
                        (1000 * 60 * 60 * 24),
                    ),
                  )
                : 0;

              return {
                numero_serie: unidad.serialNumber,
                tipo_equipo: unidad.tipoEquipo?.nombre ?? null,
                fecha_asignacion: fechaAsignacion
                  ? new Date(fechaAsignacion).toISOString().slice(0, 10)
                  : null,
                dias_transcurridos: diasTranscurridos,
              };
            }),
          );

          // CU-58: saldos de consumibles del técnico (solo tipos no individualizables)
          const filasSaldos = await this.dataSource
            .getRepository(InventarioPersonal)
            .find({ where: { id_tecnico: tecnico.id_usuario } });
          const idsTipos = [
            ...new Set(filasSaldos.map((s) => s.id_tipo_equipo)),
          ];
          const tiposSaldos = idsTipos.length
            ? await this.dataSource
                .getRepository(TipoEquipo)
                .findBy({ id_tipo_equipo: In(idsTipos) })
            : [];
          const mapaTiposSaldos = new Map(
            tiposSaldos.map((t) => [t.id_tipo_equipo, t]),
          );
          const consumibles = filasSaldos
            .filter((s) => {
              const tipo = mapaTiposSaldos.get(s.id_tipo_equipo);
              return (
                tipo?.requiereSerialNumber === false && Number(s.cantidad) > 0
              );
            })
            .sort((a, b) => {
              const nombreA =
                mapaTiposSaldos.get(a.id_tipo_equipo)?.nombre ?? '';
              const nombreB =
                mapaTiposSaldos.get(b.id_tipo_equipo)?.nombre ?? '';
              return nombreA.localeCompare(nombreB);
            })
            .map((s) => {
              const tipo = mapaTiposSaldos.get(s.id_tipo_equipo);
              return {
                id_tipo_equipo: s.id_tipo_equipo,
                tipo_equipo: tipo?.nombre ?? null,
                cantidad_disponible: Number(s.cantidad),
                unidad_medida: tipo?.unidadMedida ?? null,
              };
            });

          return {
            tecnico: {
              id_usuario: tecnico.id_usuario,
              nombre_completo: tecnico.nombre_completo,
              empresa: this.nombreEmpresa(tecnico.id_empresa),
            },
            equipos_individualizables,
            consumibles,
          };
        },
      ),
    );

    await this.auditReport(
      actor,
      filtros,
      resultado.length,
      'reporte_inventario_tecnicos',
    );
    return resultado;
  }

  //CU-91
  async getConsumoReport(
    filtros: FiltrosConsumo,
    actor: Actor,
  ): Promise<any[]> {
    this.validateDateRange(filtros.fecha_desde, filtros.fecha_hasta);
    const esSuperusuario = actor.roles?.includes('SUPERUSUARIO') ?? false;
    if (
      !esSuperusuario &&
      filtros.id_empresa !== undefined &&
      filtros.id_empresa !== actor.id_empresa
    ) {
      throw new ForbiddenException(
        'No tiene permisos para consultar esta empresa.',
      );
    }

    const idEmpresa = esSuperusuario ? filtros.id_empresa : actor.id_empresa;
    if (!esSuperusuario && !idEmpresa) {
      throw new BadRequestException(
        'El usuario no tiene una empresa asignada.',
      );
    }

    const tipos = await this.tipoEquipoRepository.find({
      where: {
        ...(idEmpresa !== undefined ? { id_empresa: idEmpresa } : {}),
        ...(filtros.id_tipo_equipo !== undefined
          ? { id_tipo_equipo: filtros.id_tipo_equipo }
          : {}),
        requiereSerialNumber: false,
        activo: true,
      },
      order: { nombre: 'ASC' },
    });

    // Las tablas orden_ingreso_detalle y prestamo_retorno las crea migrar.ts en
    // cada arranque (CREATE TABLE IF NOT EXISTS), no hace falta introspección.
    // Filtros de período/empresa compartidos por las tres sumas del reporte.
    const tieneDesde =
      filtros.fecha_desde != null && filtros.fecha_desde !== '';
    const tieneHasta =
      filtros.fecha_hasta != null && filtros.fecha_hasta !== '';

    const resultado = await Promise.all(
      tipos.map(async (tipo) => {
        // Ingresado: cantidad recibida de órdenes de ingreso (CU-52..56)
        const ingresadoQb = this.dataSource
          .getRepository(OrdenIngresoDetalle)
          .createQueryBuilder('oid')
          .select('COALESCE(SUM(oid.cantidad_recibida), 0)', 'cantidad')
          .innerJoin(OrdenIngreso, 'oi', 'oi.id_orden = oid.id_orden')
          .where('oid.id_tipo_equipo = :idTipo', {
            idTipo: tipo.id_tipo_equipo,
          });
        if (idEmpresa !== undefined) {
          ingresadoQb.andWhere('oi.id_empresa_destino = :idEmpresa', {
            idEmpresa,
          });
        }
        if (tieneDesde) {
          ingresadoQb.andWhere('oi.fecha_creacion >= :desde', {
            desde: filtros.fecha_desde,
          });
        }
        if (tieneHasta) {
          ingresadoQb.andWhere(
            "oi.fecha_creacion < (:hasta::date + INTERVAL '1 day')",
            {
              hasta: filtros.fecha_hasta,
            },
          );
        }

        // Entregado: consumibles salidos de bodega a técnico (CU-57/60)
        const entregadoQb = this.dataSource
          .getRepository(SalidaDetalle)
          .createQueryBuilder('sd')
          .select('COALESCE(SUM(sd.cantidad), 0)', 'cantidad')
          .innerJoin(SalidaBodega, 'sb', 'sb.id_salida = sd.id_salida')
          .where('sd.id_tipo_equipo = :idTipo', { idTipo: tipo.id_tipo_equipo })
          .andWhere('sd.id_unidad IS NULL');
        if (idEmpresa !== undefined) {
          entregadoQb.andWhere('sb.id_empresa = :idEmpresa', { idEmpresa });
        }
        if (tieneDesde) {
          entregadoQb.andWhere('sb.fecha_hora >= :desde', {
            desde: filtros.fecha_desde,
          });
        }
        if (tieneHasta) {
          entregadoQb.andWhere(
            "sb.fecha_hora < (:hasta::date + INTERVAL '1 day')",
            {
              hasta: filtros.fecha_hasta,
            },
          );
        }

        // Devuelto: consumibles retornados de préstamos externos (CU-82)
        const devueltoQb = this.dataSource
          .getRepository(PrestamoRetorno)
          .createQueryBuilder('pr')
          .select('COALESCE(SUM(pr.cantidad), 0)', 'cantidad')
          .innerJoin(PrestamoDetalle, 'pd', 'pd.id_detalle = pr.id_detalle')
          .innerJoin(PrestamoExterno, 'pe', 'pe.id_prestamo = pd.id_prestamo')
          .where('pd.id_tipo_equipo = :idTipo', { idTipo: tipo.id_tipo_equipo })
          .andWhere('pd.id_unidad IS NULL');
        if (idEmpresa !== undefined) {
          devueltoQb.andWhere('pe.id_empresa = :idEmpresa', { idEmpresa });
        }
        if (tieneDesde) {
          devueltoQb.andWhere('pr.fecha_retorno >= :desde', {
            desde: filtros.fecha_desde,
          });
        }
        if (tieneHasta) {
          devueltoQb.andWhere(
            "pr.fecha_retorno < (:hasta::date + INTERVAL '1 day')",
            {
              hasta: filtros.fecha_hasta,
            },
          );
        }

        const [ingresado, entregado, devuelto] = await Promise.all([
          ingresadoQb.getRawOne<{ cantidad: string | number }>(),
          entregadoQb.getRawOne<{ cantidad: string | number }>(),
          devueltoQb.getRawOne<{ cantidad: string | number }>(),
        ]);

        const ingresadoNum = Number(ingresado?.cantidad ?? 0);
        const entregadoNum = Number(entregado?.cantidad ?? 0);
        const devueltoNum = Number(devuelto?.cantidad ?? 0);

        // CU-64/CU-68 aún no están implementados: se deja la columna lista.
        const usadoEnCierres = 0;
        const diferencia = ingresadoNum - entregadoNum + devueltoNum;
        return {
          id_tipo_equipo: tipo.id_tipo_equipo,
          tipo_consumible: tipo.nombre,
          unidad_medida: tipo.unidadMedida ?? null,
          cantidad_ingresada: ingresadoNum,
          cantidad_entregada: entregadoNum,
          cantidad_usada_en_cierres: usadoEnCierres,
          cantidad_devuelta: devueltoNum,
          diferencia,
          desvio:
            ingresadoNum > 0 && Math.abs(diferencia) > ingresadoNum * 0.15,
        };
      }),
    );

    const filas = resultado.filter(
      (fila) =>
        fila.cantidad_ingresada > 0 ||
        fila.cantidad_entregada > 0 ||
        fila.cantidad_devuelta > 0,
    );
    await this.auditReport(actor, filtros, filas.length, 'reporte_consumo');
    return filas;
  }

  //CU-85
  async getStockReport(filtros: FiltrosStock, actor: Actor): Promise<any[]> {
    const esSuperusuario = actor.roles?.includes('SUPERUSUARIO') ?? false;

    if (
      !esSuperusuario &&
      filtros.id_empresa !== undefined &&
      filtros.id_empresa !== actor.id_empresa
    ) {
      throw new ForbiddenException(
        'No tiene permisos para consultar esta empresa.',
      );
    }

    const idEmpresa = esSuperusuario ? filtros.id_empresa : actor.id_empresa;

    if (!esSuperusuario && !idEmpresa) {
      throw new BadRequestException(
        'El usuario no tiene una empresa asignada.',
      );
    }

    if (filtros.id_bodega) {
      const bodega = await this.bodegaRepository.findOne({
        where: { id_bodega: filtros.id_bodega },
      });
      if (
        !bodega ||
        (idEmpresa !== undefined && bodega.id_empresa !== idEmpresa)
      ) {
        throw new NotFoundException('Bodega no encontrada');
      }
    }

    const bodegas = await this.bodegaRepository.find({
      where: {
        ...(idEmpresa !== undefined ? { id_empresa: idEmpresa } : {}),
        ...(filtros.id_bodega !== undefined
          ? { id_bodega: filtros.id_bodega }
          : {}),
      },
      order: { nombre: 'ASC' },
    });
    const tipos = await this.tipoEquipoRepository.find({
      where: {
        ...(idEmpresa !== undefined ? { id_empresa: idEmpresa } : {}),
        ...(filtros.id_tipo_equipo !== undefined
          ? { id_tipo_equipo: filtros.id_tipo_equipo }
          : {}),
        activo: true,
      },
    });

    const bodegaIds = bodegas.map((bodega) => bodega.id_bodega);
    const tipoIds = tipos.map((tipo) => tipo.id_tipo_equipo);
    if (bodegaIds.length === 0 || tipoIds.length === 0) {
      await this.auditReport(actor, filtros, 0);
      return [];
    }

    const [unidades, stocks] = await Promise.all([
      this.unidadRepository
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.tipoEquipo', 't')
        .where('u.id_bodega_actual IN (:...bodegaIds)', { bodegaIds })
        .andWhere('u.id_tipo_equipo IN (:...tipoIds)', { tipoIds })
        .getMany(),
      this.stockRepository.find({
        where: bodegaIds.flatMap((id_bodega) =>
          tipoIds.map((id_tipo_equipo) => ({ id_bodega, id_tipo_equipo })),
        ),
        relations: { tipoEquipo: true },
      }),
    ]);

    const bodegaMap = new Map(
      bodegas.map((bodega) => [bodega.id_bodega, bodega]),
    );
    const tipoMap = new Map(tipos.map((tipo) => [tipo.id_tipo_equipo, tipo]));
    const filas = new Map<string, any>();
    const crearFila = (idBodega: number, idTipo: number) => {
      const bodega = bodegaMap.get(idBodega);
      const tipo = tipoMap.get(idTipo);
      if (!bodega || !tipo) return null;
      const key = `${idBodega}-${idTipo}`;
      if (!filas.has(key)) {
        filas.set(key, {
          id_empresa: bodega.id_empresa,
          empresa: bodega.id_empresa === 1 ? 'Finet' : 'Cable Mágico',
          id_bodega: idBodega,
          bodega: bodega.nombre,
          id_tipo_equipo: idTipo,
          tipo_equipo: tipo.nombre,
          unidad_medida: tipo.unidadMedida ?? null,
          en_bodega: 0,
          asignado_a_tecnico: 0,
          en_revision: 0,
          en_prestamo_externo: 0,
          total_activo: 0,
          umbral_minimo: 0,
          bajo_umbral: false,
        });
      }
      return filas.get(key);
    };

    for (const bodega of bodegas) {
      for (const tipo of tipos) {
        crearFila(bodega.id_bodega, tipo.id_tipo_equipo);
      }
    }

    for (const unidad of unidades) {
      const fila = crearFila(unidad.id_bodega_actual!, unidad.id_tipo_equipo);
      if (!fila || !ESTADOS_REPORTE.includes(unidad.estado)) continue;
      if (unidad.estado === 'En bodega') fila.en_bodega++;
      if (unidad.estado === 'Asignado a técnico') fila.asignado_a_tecnico++;
      if (unidad.estado === 'En revisión') fila.en_revision++;
      if (unidad.estado === 'En préstamo externo') fila.en_prestamo_externo++;
      fila.total_activo++;
    }

    for (const stock of stocks) {
      const fila = crearFila(stock.id_bodega, stock.id_tipo_equipo);
      if (!fila) continue;
      fila.umbral_minimo =
        stock.umbral_minimo == null ? 0 : Number(stock.umbral_minimo);
      if (stock.tipoEquipo?.requiereSerialNumber !== true) {
        fila.en_bodega = Number(stock.cantidad_disponible);
        fila.total_activo = fila.en_bodega;
      }
    }

    const resultado = [...filas.values()].map((fila) => {
      fila.bajo_umbral = fila.total_activo < fila.umbral_minimo;
      return fila;
    });
    await this.auditReport(actor, filtros, resultado.length);
    return resultado;
  }

  //CU-86
  async getMovementsReport(
    filtros: FiltrosMovimientos,
    actor: Actor,
  ): Promise<any[]> {
    this.validateDateRange(filtros.fecha_desde, filtros.fecha_hasta);
    const esSuperusuario = actor.roles?.includes('SUPERUSUARIO') ?? false;
    if (
      !esSuperusuario &&
      filtros.id_empresa !== undefined &&
      filtros.id_empresa !== actor.id_empresa
    ) {
      throw new ForbiddenException(
        'No tiene permisos para consultar esta empresa.',
      );
    }
    const idEmpresa = esSuperusuario ? filtros.id_empresa : actor.id_empresa;
    if (!esSuperusuario && !idEmpresa)
      throw new BadRequestException(
        'El usuario no tiene una empresa asignada.',
      );

    const query = this.movimientoRepository
      .createQueryBuilder('m')
      .leftJoin('tipo_equipo', 't', 't.id_tipo_equipo = m.id_tipo_equipo')
      .leftJoin('unidad_equipo', 'u', 'u.id_unidad = m.id_unidad')
      .leftJoin('bodega', 'bo', 'bo.id_bodega = m.id_bodega_origen')
      .leftJoin('bodega', 'bd', 'bd.id_bodega = m.id_bodega_destino')
      .leftJoin('usuario', 'usr', 'usr.id_usuario = m.id_usuario')
      .select([
        'm.id_movimiento AS id_movimiento',
        'm.fecha AS fecha',
        'm.tipo_movimiento AS tipo_movimiento',
        'm.cantidad AS cantidad',
        'm.referencia_id AS referencia_id',
        'm.id_tipo_equipo AS id_tipo_equipo',
        'm.id_unidad AS id_unidad',
        'm.id_usuario AS id_usuario',
        'COALESCE(u.numero_serie, t.nombre) AS item',
        't.nombre AS tipo_equipo',
        'COALESCE(bd.id_bodega, bo.id_bodega) AS id_bodega',
        'COALESCE(bd.nombre, bo.nombre) AS bodega',
        'COALESCE(m.id_empresa_destino, m.id_empresa_origen) AS id_empresa',
        'usr.nombre_completo AS usuario',
      ])
      .orderBy('m.fecha', 'DESC')
      .addOrderBy('m.id_movimiento', 'DESC');

    if (idEmpresa !== undefined)
      query.andWhere(
        '(m.id_empresa_origen = :idEmpresa OR m.id_empresa_destino = :idEmpresa)',
        { idEmpresa },
      );
    if (filtros.id_bodega !== undefined)
      query.andWhere(
        '(m.id_bodega_origen = :idBodega OR m.id_bodega_destino = :idBodega)',
        { idBodega: filtros.id_bodega },
      );
    if (filtros.id_tipo_equipo !== undefined)
      query.andWhere('m.id_tipo_equipo = :idTipoEquipo', {
        idTipoEquipo: filtros.id_tipo_equipo,
      });
    if (filtros.fecha_desde)
      query.andWhere('m.fecha >= :fechaDesde::date', {
        fechaDesde: filtros.fecha_desde,
      });
    if (filtros.fecha_hasta)
      query.andWhere("m.fecha < (:fechaHasta::date + INTERVAL '1 day')", {
        fechaHasta: filtros.fecha_hasta,
      });
    if (filtros.tipo_movimiento)
      query.andWhere('m.tipo_movimiento = :tipoMovimiento', {
        tipoMovimiento: filtros.tipo_movimiento,
      });
    if (filtros.id_usuario !== undefined)
      query.andWhere('m.id_usuario = :idUsuario', {
        idUsuario: filtros.id_usuario,
      });

    const movimientos = await query.getRawMany();
    const resultado = movimientos.map((movimiento) => ({
      ...movimiento,
      cantidad: Number(movimiento.cantidad),
      empresa: this.nombreEmpresa(movimiento.id_empresa),
      referencia_tipo: movimiento.referencia_id
        ? this.referenciaTipo(movimiento.tipo_movimiento)
        : null,
    }));
    await this.auditReport(
      actor,
      filtros,
      resultado.length,
      'reporte_movimientos',
    );
    return resultado;
  }

  //CU-88
  async getGarantiasReport(
    filtros: FiltrosGarantias,
    actor: Actor,
  ): Promise<any[]> {
    const esSuperusuario = actor.roles?.includes('SUPERUSUARIO') ?? false;
    if (
      !esSuperusuario &&
      filtros.id_empresa !== undefined &&
      filtros.id_empresa !== actor.id_empresa
    ) {
      throw new ForbiddenException(
        'No tiene permisos para consultar esta empresa.',
      );
    }

    const idEmpresa = esSuperusuario ? filtros.id_empresa : actor.id_empresa;
    if (!esSuperusuario && !idEmpresa) {
      throw new BadRequestException(
        'El usuario no tiene una empresa asignada.',
      );
    }

    const periodo = this.normalizePeriodo(filtros.periodo ?? 'TODAS');
    const query = this.unidadRepository
      .createQueryBuilder('u')
      .leftJoin('tipo_equipo', 't', 't.id_tipo_equipo = u.id_tipo_equipo')
      .select([
        'u.numero_serie AS numero_serie',
        'u.estado AS estado',
        'u.id_empresa AS id_empresa',
        't.nombre AS tipo_equipo',
        't.marca AS marca',
        'u.modelo AS modelo',
        'u.proveedor AS proveedor',
        'u.fecha_adquisicion AS fecha_adquisicion',
        'COALESCE(t.garantia_dias, 0) AS duracion_garantia_dias',
        "CASE WHEN u.fecha_adquisicion IS NOT NULL AND t.garantia_dias IS NOT NULL AND t.garantia_dias > 0 THEN (u.fecha_adquisicion + (t.garantia_dias * INTERVAL '1 day'))::date ELSE NULL END AS fecha_vencimiento",
      ])
      .where('u.fecha_adquisicion IS NOT NULL')
      .andWhere('t.garantia_dias IS NOT NULL')
      .andWhere('t.garantia_dias > 0');

    if (idEmpresa !== undefined) {
      query.andWhere('u.id_empresa = :idEmpresa', { idEmpresa });
    }
    if (filtros.id_tipo_equipo !== undefined) {
      query.andWhere('u.id_tipo_equipo = :idTipoEquipo', {
        idTipoEquipo: filtros.id_tipo_equipo,
      });
    }

    const fechaVencimientoExpr =
      "(u.fecha_adquisicion + (t.garantia_dias * INTERVAL '1 day'))::date";
    switch (periodo) {
      case 'VENCIDAS':
        query.andWhere(`${fechaVencimientoExpr} < CURRENT_DATE`);
        break;
      case '30':
        query.andWhere(`${fechaVencimientoExpr} >= CURRENT_DATE`);
        query.andWhere(
          `${fechaVencimientoExpr} <= CURRENT_DATE + INTERVAL '30 days'`,
        );
        break;
      case '60':
        query.andWhere(
          `${fechaVencimientoExpr} > CURRENT_DATE + INTERVAL '30 days'`,
        );
        query.andWhere(
          `${fechaVencimientoExpr} <= CURRENT_DATE + INTERVAL '60 days'`,
        );
        break;
      case '90':
        query.andWhere(
          `${fechaVencimientoExpr} > CURRENT_DATE + INTERVAL '60 days'`,
        );
        query.andWhere(
          `${fechaVencimientoExpr} <= CURRENT_DATE + INTERVAL '90 days'`,
        );
        break;
      case 'TODAS':
      default:
        break;
    }

    const filas = await query
      .orderBy('fecha_vencimiento', 'ASC')
      .addOrderBy('u.numero_serie', 'ASC')
      .getRawMany();
    // El driver de pg puede entregar las columnas DATE como objeto Date o como
    // string según el contexto; normalizar antes de armar el resultado.
    const aFechaISO = (valor: unknown): string | null => {
      if (valor === null || valor === undefined) return null;
      const d =
        valor instanceof Date
          ? valor
          : new Date(
              String(valor).includes('T')
                ? String(valor)
                : `${String(valor)}T00:00:00Z`,
            );
      return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    };
    const resultado = filas.map((fila) => {
      const fechaVencimiento = aFechaISO(fila.fecha_vencimiento);
      const hoyISO = new Date().toISOString().slice(0, 10);
      const dias = fechaVencimiento
        ? Math.round(
            (new Date(`${fechaVencimiento}T00:00:00Z`).getTime() -
              new Date(`${hoyISO}T00:00:00Z`).getTime()) /
              86_400_000,
          )
        : null;
      return {
        numero_serie: fila.numero_serie,
        tipo_equipo: fila.tipo_equipo,
        marca: fila.marca ?? null,
        modelo: fila.modelo ?? null,
        proveedor: fila.proveedor ?? null,
        fecha_adquisicion: aFechaISO(fila.fecha_adquisicion),
        duracion_garantia_dias: Number(fila.duracion_garantia_dias ?? 0),
        fecha_vencimiento: fechaVencimiento,
        dias,
        dias_restantes: dias !== null && dias >= 0 ? dias : null,
        dias_vencidos: dias !== null && dias < 0 ? Math.abs(dias) : null,
        estado: fila.estado,
        empresa: this.nombreEmpresa(fila.id_empresa),
      };
    });

    await this.auditReport(
      actor,
      filtros,
      resultado.length,
      'reporte_garantias',
    );
    return resultado;
  }

  private normalizePeriodo(
    periodo?: string,
  ): 'VENCIDAS' | '30' | '60' | '90' | 'TODAS' {
    const valor = (periodo ?? 'TODAS').trim().toUpperCase();
    if (
      valor === 'VENCIDAS' ||
      valor === '30' ||
      valor === '60' ||
      valor === '90' ||
      valor === 'TODAS'
    ) {
      return valor;
    }
    throw new BadRequestException(
      'El período del reporte de garantías no es válido.',
    );
  }

  private validateDateRange(fechaDesde?: string, fechaHasta?: string) {
    if (!fechaDesde && !fechaHasta) return;
    if (
      !fechaDesde ||
      !fechaHasta ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fechaDesde) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fechaHasta)
    ) {
      throw new BadRequestException('Las fechas del reporte no son válidas.');
    }
    const inicio = new Date(`${fechaDesde}T00:00:00Z`);
    const fin = new Date(`${fechaHasta}T00:00:00Z`);
    if (
      Number.isNaN(inicio.getTime()) ||
      Number.isNaN(fin.getTime()) ||
      inicio > fin
    ) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior o igual a la fecha de fin.',
      );
    }
    if ((fin.getTime() - inicio.getTime()) / 86_400_000 > 365) {
      throw new BadRequestException(
        'El rango de fechas no puede superar los 365 días.',
      );
    }
  }

  private nombreEmpresa(idEmpresa: number | null): string | null {
    if (idEmpresa === 1) return 'Finet';
    if (idEmpresa === 2) return 'Cable Mágico';
    return null;
  }

  private referenciaTipo(tipoMovimiento: string): string {
    if (tipoMovimiento.startsWith('TRANSFERENCIA')) return 'transferencia';
    if (tipoMovimiento.startsWith('INGRESO')) return 'orden_ingreso';
    if (tipoMovimiento.startsWith('PRESTAMO')) return 'prestamo';
    return 'documento';
  }

  async getEquiposInstaladosReport(
    filtros: FiltrosEquiposInstalados,
    actor: Actor,
  ): Promise<ReporteEquipoInstaladoFila[]> {
    const esSuperusuario = actor.roles?.includes('SUPERUSUARIO') ?? false;
    if (
      !esSuperusuario &&
      filtros.id_empresa !== undefined &&
      filtros.id_empresa !== actor.id_empresa
    ) {
      throw new ForbiddenException(
        'No tiene permisos para consultar esta empresa.',
      );
    }

    const idEmpresa = esSuperusuario ? filtros.id_empresa : actor.id_empresa;
    if (!esSuperusuario && !idEmpresa) {
      throw new BadRequestException(
        'El usuario no tiene una empresa asignada.',
      );
    }

    const rut = filtros.rut?.trim();
    const nombre = filtros.nombre?.trim();
    const ns = (filtros.numero_serie ?? filtros.ns)?.trim();

    if (!rut && !nombre && !ns) {
      throw new BadRequestException(
        'Debe ingresar al menos un criterio de búsqueda (RUT, nombre o número de serie).',
      );
    }

    if (nombre && nombre.length < 3) {
      throw new BadRequestException(
        'El nombre del cliente debe tener al menos 3 caracteres.',
      );
    }

    if (rut && !/^[0-9]{7,8}-[0-9kK]$/.test(rut)) {
      throw new BadRequestException('El formato de RUT debe ser XXXXXXXX-X.');
    }

    // 1. Intentar enriquecer o buscar clientes en G3 (CU-48/CU-87)
    let clienteG3PorRut: any = null;
    let clientesG3PorNombre: any[] = [];

    if (rut) {
      clienteG3PorRut = await this.g3ClientService.consultarClientePorRut(
        rut,
        idEmpresa,
      );
    }
    if (nombre) {
      clientesG3PorNombre = await this.g3ClientService.buscarClientes(
        nombre,
        idEmpresa,
      );
    }

    const g3IdsPorNombre = new Set<number>(
      clientesG3PorNombre
        .map((c) => Number(c.id_cliente || c.id || 0))
        .filter((id) => id > 0),
    );
    const g3RutsPorNombre = new Set<string>(
      clientesG3PorNombre.map((c) => cleanRut(c.rut)).filter((r) => Boolean(r)),
    );

    // 2. Consultar unidades en estado 'Instalado en cliente'
    const qb = this.unidadRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.tipoEquipo', 'tipo')
      .where('u.estado = :estado', { estado: 'Instalado en cliente' });

    if (idEmpresa) {
      qb.andWhere('u.id_empresa = :idEmpresa', { idEmpresa });
    }

    if (ns) {
      qb.andWhere('LOWER(TRIM(u.serialNumber)) = LOWER(TRIM(:ns))', { ns });
    }

    const unidades = await qb.getMany();

    // 3. Filtrar por RUT o Nombre en memoria (canónico y con fallback G3)
    const unidadesCoincidentes: UnidadEquipo[] = [];
    for (const u of unidades) {
      let coincideRut = true;
      let coincideNombre = true;

      // Validación por RUT (insensible a formato de puntos y guión)
      if (rut) {
        const uRutClean = cleanRut(u.clienteRut);
        const busqRutClean = cleanRut(rut);
        const coincideG3 =
          clienteG3PorRut &&
          ((u.id_cliente_instalado &&
            u.id_cliente_instalado ===
              Number(clienteG3PorRut.id_cliente || clienteG3PorRut.id)) ||
            (u.clienteRut &&
              cleanRut(u.clienteRut) === cleanRut(clienteG3PorRut.rut)));

        coincideRut =
          (uRutClean !== '' && uRutClean === busqRutClean) ||
          Boolean(coincideG3);
      }

      // Validación por Nombre (insensible a mayúsculas y tildes)
      if (nombre) {
        const nombreLocalNorm = normalizeText(u.clienteNombre || '');
        const busqNorm = normalizeText(nombre);

        const coincideLocal = nombreLocalNorm.includes(busqNorm);
        const coincideG3 =
          (u.id_cliente_instalado &&
            g3IdsPorNombre.has(u.id_cliente_instalado)) ||
          (u.clienteRut && g3RutsPorNombre.has(cleanRut(u.clienteRut)));

        coincideNombre = coincideLocal || Boolean(coincideG3);
      }

      if (coincideRut && coincideNombre) {
        unidadesCoincidentes.push(u);
      }
    }

    if (unidadesCoincidentes.length === 0) {
      await this.auditReport(
        actor,
        {
          id_empresa: idEmpresa,
          rut: rut || undefined,
          nombre: nombre || undefined,
          numero_serie: ns || undefined,
        },
        0,
        'reporte_equipos_instalados',
      );
      return [];
    }

    // 4. Cruzar con integracion_cierre (por u.srv) e historial_estado_equipo para fecha y técnico
    const srvList = Array.from(
      new Set(
        unidadesCoincidentes
          .map((u) => u.srv)
          .filter((s): s is string => Boolean(s && s.trim())),
      ),
    );
    const idUnidadesList = unidadesCoincidentes.map((u) => u.id_unidad);

    const cierresMap = new Map<
      string,
      { srv: string; id_tecnico?: number; fecha_proceso?: Date; payload?: any }
    >();
    if (srvList.length > 0) {
      const cierres = await this.dataSource
        .query(
          `SELECT srv, id_tecnico, fecha_proceso, payload
           FROM integracion_cierre
           WHERE srv = ANY($1)`,
          [srvList],
        )
        .catch(() => []);
      for (const c of cierres) {
        if (c.srv && !cierresMap.has(c.srv)) {
          cierresMap.set(c.srv, c);
        }
      }
    }

    const historialMap = new Map<
      number,
      { id_usuario?: number; fecha_hora?: Date }
    >();
    if (idUnidadesList.length > 0) {
      const historiales = await this.dataSource
        .query(
          `SELECT id_unidad, id_usuario, fecha_hora
           FROM historial_estado_equipo
           WHERE id_unidad = ANY($1)
             AND estado_nuevo = 'Instalado en cliente'
           ORDER BY fecha_hora DESC`,
          [idUnidadesList],
        )
        .catch(() => []);
      for (const h of historiales) {
        if (!historialMap.has(h.id_unidad)) {
          historialMap.set(h.id_unidad, h);
        }
      }
    }

    // Recolectar técnicos
    const idTecnicosSet = new Set<number>();
    for (const c of cierresMap.values()) {
      const tid = Number(c.id_tecnico || c.payload?.id_tecnico || 0);
      if (tid > 0) idTecnicosSet.add(tid);
    }
    for (const h of historialMap.values()) {
      const uid = Number(h.id_usuario || 0);
      if (uid > 0) idTecnicosSet.add(uid);
    }
    for (const u of unidadesCoincidentes) {
      if (u.idTecnicoAsignado) idTecnicosSet.add(u.idTecnicoAsignado);
    }

    const tecnicosMap = new Map<number, string>();
    if (idTecnicosSet.size > 0) {
      const usuarios = await this.usuarioRepository.find({
        where: { id_usuario: In(Array.from(idTecnicosSet)) },
      });
      for (const usr of usuarios) {
        tecnicosMap.set(usr.id_usuario, usr.nombre_completo);
      }
    }

    // 5. Construir filas finales del reporte
    const filas: ReporteEquipoInstaladoFila[] = [];

    for (const u of unidadesCoincidentes) {
      const cierre = u.srv ? cierresMap.get(u.srv) : undefined;
      const historial = historialMap.get(u.id_unidad);

      let rutFinal = u.clienteRut || '-';
      let nombreFinal = u.clienteNombre || 'Cliente no especificado';
      let direccionFinal = u.direccionInstalacion || 'Sin dirección registrada';
      if (
        u.comunaInstalacion &&
        u.direccionInstalacion &&
        !u.direccionInstalacion
          .toLowerCase()
          .includes(u.comunaInstalacion.toLowerCase())
      ) {
        direccionFinal = `${u.direccionInstalacion}, ${u.comunaInstalacion}`;
      }

      // Enriquecimiento adicional con G3 si clienteRut coincide
      if (
        clienteG3PorRut &&
        (cleanRut(u.clienteRut) === cleanRut(clienteG3PorRut.rut) ||
          (u.id_cliente_instalado &&
            u.id_cliente_instalado ===
              Number(clienteG3PorRut.id_cliente || clienteG3PorRut.id)))
      ) {
        rutFinal = clienteG3PorRut.rut || rutFinal;
        nombreFinal = clienteG3PorRut.nombre_completo || nombreFinal;
        if (!u.direccionInstalacion && clienteG3PorRut.direccion) {
          direccionFinal = clienteG3PorRut.direccion;
        }
      } else if (clientesG3PorNombre.length > 0) {
        const cG3 = clientesG3PorNombre.find(
          (c) =>
            (u.id_cliente_instalado &&
              c.id_cliente === u.id_cliente_instalado) ||
            (u.clienteRut && cleanRut(c.rut) === cleanRut(u.clienteRut)) ||
            (u.clienteNombre &&
              normalizeText(c.nombre_completo) ===
                normalizeText(u.clienteNombre)),
        );
        if (cG3) {
          rutFinal = cG3.rut || rutFinal;
          nombreFinal = cG3.nombre_completo || nombreFinal;
          if (!u.direccionInstalacion && cG3.direccion) {
            direccionFinal = cG3.direccion;
          }
        }
      }

      const idTecnicoCierre = Number(
        cierre?.id_tecnico || cierre?.payload?.id_tecnico || 0,
      );
      const idUsuarioHist = Number(historial?.id_usuario || 0);
      const idTecnicoAsign = Number(u.idTecnicoAsignado || 0);

      const tecnicoFinal =
        (idTecnicoCierre > 0 ? tecnicosMap.get(idTecnicoCierre) : null) ||
        (cierre?.payload?.tecnico_instalador_nombre as string) ||
        (cierre?.payload?.nombre_tecnico as string) ||
        (idUsuarioHist > 0 ? tecnicosMap.get(idUsuarioHist) : null) ||
        (idTecnicoAsign > 0 ? tecnicosMap.get(idTecnicoAsign) : null) ||
        'No registrado';

      const srvFinal = u.srv || cierre?.srv || '-';
      const fechaInst =
        cierre?.fecha_proceso || historial?.fecha_hora || u.fechaAdquisicion;

      filas.push({
        id_unidad: u.id_unidad,
        numero_servicio: srvFinal,
        rut_cliente: rutFinal,
        nombre_cliente: nombreFinal,
        direccion_instalacion: direccionFinal,
        tipo_equipo: u.tipoEquipo?.nombre || 'Equipo',
        numero_serie: u.serialNumber,
        fecha_instalacion: formatDateDDMMYYYY(fechaInst),
        tecnico_instalacion: tecnicoFinal,
        id_empresa: u.id_empresa,
      });
    }

    // 6. Auditoría
    await this.auditReport(
      actor,
      {
        id_empresa: idEmpresa,
        rut: rut || undefined,
        nombre: nombre || undefined,
        numero_serie: ns || undefined,
      },
      filas.length,
      'reporte_equipos_instalados',
    );

    return filas;
  }

  async getTecnicosProductividadReport(
    filtros: FiltrosProductividadTecnicos,
    actor: Actor,
  ): Promise<ReporteProductividadTecnicoFila[]> {
    const esSuperusuario = actor.roles?.includes('SUPERUSUARIO') ?? false;
    if (
      !esSuperusuario &&
      filtros.id_empresa !== undefined &&
      filtros.id_empresa !== actor.id_empresa
    ) {
      throw new ForbiddenException(
        'No tiene permisos para consultar esta empresa.',
      );
    }

    const idEmpresa = esSuperusuario ? filtros.id_empresa : actor.id_empresa;
    if (!esSuperusuario && !idEmpresa) {
      throw new BadRequestException(
        'El usuario no tiene una empresa asignada.',
      );
    }

    // Validación del rango de fechas (E1: máximo 90 días)
    const fechaDesde = filtros.fecha_desde?.trim();
    const fechaHasta = filtros.fecha_hasta?.trim();

    if (!fechaDesde || !fechaHasta) {
      throw new BadRequestException(
        'Debe especificar fecha de inicio y fecha de fin para el reporte.',
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fechaDesde) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fechaHasta)
    ) {
      throw new BadRequestException('Las fechas del reporte no son válidas.');
    }

    const inicio = new Date(`${fechaDesde}T00:00:00Z`);
    const fin = new Date(`${fechaHasta}T00:00:00Z`);

    if (
      Number.isNaN(inicio.getTime()) ||
      Number.isNaN(fin.getTime()) ||
      inicio > fin
    ) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior o igual a la fecha de fin.',
      );
    }

    const diffMs = fin.getTime() - inicio.getTime();
    const diffDias = Math.round(diffMs / 86_400_000);
    if (diffDias > 90) {
      throw new BadRequestException(
        'El rango de fechas para este reporte no puede superar los 90 días.',
      );
    }

    // 1. Obtener técnicos según filtros
    const tecnicos = await this.dataSource.query(
      `SELECT u.id_usuario, u.nombre_completo, u.id_empresa
       FROM usuario u
       INNER JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
       INNER JOIN rol r ON r.id_rol = ur.id_rol
       WHERE u.activo = true
         AND r.nombre_rol = 'TECNICO_TERRENO'
         AND ($1::int IS NULL OR u.id_empresa = $1)
         AND ($2::int IS NULL OR u.id_usuario = $2)
       ORDER BY u.nombre_completo ASC, u.id_usuario ASC`,
      [idEmpresa ?? null, filtros.id_tecnico ?? null],
    );

    if (filtros.id_tecnico !== undefined && tecnicos.length === 0) {
      throw new NotFoundException('Técnico no encontrado.');
    }

    if (tecnicos.length === 0) {
      return [];
    }

    // 2. Consultar órdenes cerradas en G3 y en registros locales (integracion_cierre)
    const [ordenesG3, cierresLocales, catalogoConsumibles] = await Promise.all([
      this.g3ClientService.consultarOrdenesCerradas({
        id_tecnico: filtros.id_tecnico,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        id_empresa: idEmpresa,
      }),
      this.dataSource
        .query(
          `SELECT id_ot, id_empresa, tipo_ot, id_tecnico, payload, fecha_proceso
         FROM integracion_cierre
         WHERE ($1::int IS NULL OR id_empresa = $1)
           AND fecha_proceso >= $2::date
           AND fecha_proceso < ($3::date + INTERVAL '1 day')`,
          [idEmpresa ?? null, fechaDesde, fechaHasta],
        )
        .catch(() => [] as unknown[]),
      this.tipoEquipoRepository.find({
        where: { requiereSerialNumber: false, activo: true },
      }),
    ]);

    // Mapeo del catálogo de consumibles para categorización rápida
    const mapaTipoEquipo = new Map<number, TipoEquipo>();
    for (const t of catalogoConsumibles) {
      mapaTipoEquipo.set(t.id_tipo_equipo, t);
    }

    // 3. Unificar órdenes de trabajo cerradas por id_ot
    type OrdenConsolidada = {
      id_ot: number;
      tipo_ot: string;
      id_tecnico: number;
      materiales: Array<{
        id_tipo_equipo?: number;
        nombre?: string;
        cantidad: number;
        unidad_medida?: string;
      }>;
    };

    const ordenesMap = new Map<number, OrdenConsolidada>();

    // Primero incorporar cierres locales de integracion_cierre
    for (const cl of cierresLocales as Array<Record<string, unknown>>) {
      const idOt = Number(cl.id_ot);
      if (!idOt) continue;
      const payload = (cl.payload as Record<string, unknown>) || {};
      const idTecnico = Number(cl.id_tecnico ?? payload.id_tecnico ?? 0);
      const tipoOt = String(
        cl.tipo_ot || payload.tipo_ot || 'INSTALACION',
      ).toUpperCase();

      const rawMats = Array.isArray(payload.materiales)
        ? payload.materiales
        : [];
      const materiales: OrdenConsolidada['materiales'] = [];
      for (const rm of rawMats) {
        if (!rm || typeof rm !== 'object') continue;
        const m = rm as Record<string, unknown>;
        const cant = Number(m.cantidad || 0);
        if (cant > 0) {
          materiales.push({
            id_tipo_equipo: m.id_tipo_equipo
              ? Number(m.id_tipo_equipo)
              : undefined,
            nombre: typeof m.nombre === 'string' ? m.nombre : undefined,
            cantidad: cant,
            unidad_medida:
              typeof m.unidad_medida === 'string' ? m.unidad_medida : undefined,
          });
        }
      }

      ordenesMap.set(idOt, {
        id_ot: idOt,
        tipo_ot: tipoOt,
        id_tecnico: idTecnico,
        materiales,
      });
    }

    // Luego incorporar o complementar con G3
    for (const og of ordenesG3) {
      const existente = ordenesMap.get(og.id_ot);
      if (!existente) {
        ordenesMap.set(og.id_ot, {
          id_ot: og.id_ot,
          tipo_ot: og.tipo_ot,
          id_tecnico: og.id_tecnico,
          materiales: og.materiales,
        });
      } else if (
        existente.materiales.length === 0 &&
        og.materiales.length > 0
      ) {
        existente.materiales = og.materiales;
      }
    }

    // 4. Calcular métricas por cada técnico
    const filas: ReporteProductividadTecnicoFila[] = [];

    for (const tecnico of tecnicos) {
      let instalacionesCerradas = 0;
      let reparacionesCerradas = 0;
      let metrosFibra = 0;
      let unidadesConectores = 0;
      const otrosConsumiblesMap = new Map<
        string,
        { cantidad: number; unidad: string }
      >();

      // Filtrar órdenes cerradas correspondientes a este técnico
      const ordenesDelTecnico = Array.from(ordenesMap.values()).filter(
        (o) => o.id_tecnico === tecnico.id_usuario,
      );

      for (const ord of ordenesDelTecnico) {
        const tOt = ord.tipo_ot.toUpperCase();
        if (tOt.includes('INSTAL')) {
          instalacionesCerradas += 1;
        } else if (tOt.includes('REPAR') || tOt.includes('MANTEN')) {
          reparacionesCerradas += 1;
        } else {
          instalacionesCerradas += 1;
        }

        for (const mat of ord.materiales) {
          const tipoObj = mat.id_tipo_equipo
            ? mapaTipoEquipo.get(mat.id_tipo_equipo)
            : undefined;

          const cat = tipoObj?.categoria || '';
          const nom = (tipoObj?.nombre || mat.nombre || '').toLowerCase();
          const unidad = tipoObj?.unidadMedida || mat.unidad_medida || 'Unidad';

          if (cat === 'Consumible fibra óptica' || nom.includes('fibra')) {
            metrosFibra += mat.cantidad;
          } else if (
            cat === 'Consumible conector' ||
            nom.includes('conector')
          ) {
            unidadesConectores += mat.cantidad;
          } else {
            const nombreTipo =
              tipoObj?.nombre || mat.nombre || 'Consumible general';
            const actual = otrosConsumiblesMap.get(nombreTipo) || {
              cantidad: 0,
              unidad,
            };
            actual.cantidad += mat.cantidad;
            otrosConsumiblesMap.set(nombreTipo, actual);
          }
        }
      }

      const otrosConsumibles: ConsumibleAgrupado[] = Array.from(
        otrosConsumiblesMap.entries(),
      ).map(([tipo_consumible, data]) => ({
        tipo_consumible,
        cantidad: data.cantidad,
        unidad_medida: data.unidad,
      }));

      const otrosConsumiblesResumen =
        otrosConsumibles.length > 0
          ? otrosConsumibles
              .map(
                (c) =>
                  `${c.tipo_consumible} (${c.cantidad} ${c.unidad_medida})`,
              )
              .join(', ')
          : '-';

      filas.push({
        id_tecnico: tecnico.id_usuario,
        nombre_completo: tecnico.nombre_completo,
        id_empresa: tecnico.id_empresa,
        empresa:
          this.nombreEmpresa(tecnico.id_empresa) ??
          `Empresa ${tecnico.id_empresa}`,
        instalaciones_cerradas: instalacionesCerradas,
        reparaciones_cerradas: reparacionesCerradas,
        metros_fibra_optica: metrosFibra,
        unidades_conectores: unidadesConectores,
        otros_consumibles: otrosConsumibles,
        otros_consumibles_resumen: otrosConsumiblesResumen,
      });
    }

    // 5. Auditoría
    await this.auditReport(
      actor,
      {
        id_empresa: idEmpresa,
        id_tecnico: filtros.id_tecnico,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
      },
      filas.length,
      'reporte_productividad_tecnicos',
    );

    return filas;
  }

  private async auditReport(
    actor: Actor,
    filtros:
      | FiltrosStock
      | FiltrosMovimientos
      | FiltrosGarantias
      | FiltrosInventarioTecnicos
      | FiltrosConsumo
      | FiltrosEquiposInstalados
      | FiltrosProductividadTecnicos,
    filas: number,
    entidad = 'reporte_stock',
  ) {
    const actorId = actor.id_usuario ?? actor.sub;
    if (!actorId) return;
    await this.auditoriaService.create({
      id_usuario: actorId,
      accion: 'GENERAR_REPORTE',
      entidad_afectada: entidad,
      id_entidad_afectada: 0,
      valor_anterior: null,
      valor_nuevo: { filtros, filas },
    });
  }

  async exportarReporteExcel(
    query: {
      tipo: string;
      id_empresa?: number;
      id_bodega?: number;
      id_tipo_equipo?: number;
      fecha_desde?: string;
      fecha_hasta?: string;
      tipo_movimiento?: string;
      id_usuario?: number;
      id_tecnico?: number;
      periodo?: string;
      rut?: string;
      nombre?: string;
      numero_serie?: string;
      ns?: string;
    },
    actor: Actor,
  ): Promise<{ buffer: Buffer; filename: string; sheetName: string }> {
    const TIMEOUT_MS = 15000;
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new RequestTimeoutException(
            'La generación del archivo superó los 15 segundos sin completarse. Por favor intente nuevamente.',
          ),
        );
      }, TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([
        this.procesarExportacionExcel(query, actor),
        timeoutPromise,
      ]);
      return result;
    } finally {
      clearTimeout(timer!);
    }
  }

  private async procesarExportacionExcel(
    query: {
      tipo: string;
      id_empresa?: number;
      id_bodega?: number;
      id_tipo_equipo?: number;
      fecha_desde?: string;
      fecha_hasta?: string;
      tipo_movimiento?: string;
      id_usuario?: number;
      id_tecnico?: number;
      periodo?: string;
      rut?: string;
      nombre?: string;
      numero_serie?: string;
      ns?: string;
    },
    actor: Actor,
  ): Promise<{ buffer: Buffer; filename: string; sheetName: string }> {
    const fechaYYYYMMDD = this.getFechaYYYYMMDD();
    const tipo = (query.tipo || '').toLowerCase().trim();

    let sheetName = '';
    let filename = '';
    let auditEntity = '';
    let columns: ExcelColumn[] = [];
    let rows: Record<string, any>[] = [];

    switch (tipo) {
      case 'stock': {
        sheetName = `Stock${fechaYYYYMMDD}`;
        filename = `reporte-stock-${fechaYYYYMMDD}.xlsx`;
        auditEntity = 'reporte_stock';
        columns = [
          { header: 'Empresa', key: 'empresa' },
          { header: 'Bodega', key: 'bodega' },
          { header: 'Tipo de Equipo', key: 'tipo_equipo' },
          { header: 'Categoría', key: 'categoria' },
          { header: 'En Bodega', key: 'en_bodega' },
          { header: 'Asignado a Técnico', key: 'asignado_a_tecnico' },
          { header: 'En Tránsito', key: 'en_transito' },
          { header: 'Dañado', key: 'danado' },
          { header: 'Total Activo', key: 'total_activo' },
          { header: 'Umbral Mínimo', key: 'umbral_minimo' },
          { header: 'Estado Stock', key: 'estado_stock' },
        ];
        const data = (await this.getStockReport(
          {
            id_empresa: query.id_empresa,
            id_bodega: query.id_bodega,
            id_tipo_equipo: query.id_tipo_equipo,
          },
          actor,
        )) as Array<{
          empresa: string;
          bodega: string;
          tipo_equipo: string;
          categoria: string;
          en_bodega: number;
          asignado_a_tecnico: number;
          en_transito: number;
          danado: number;
          total_activo: number;
          umbral_minimo: number;
          bajo_umbral: boolean;
        }>;
        rows = data.map((fila) => ({
          empresa: fila.empresa,
          bodega: fila.bodega,
          tipo_equipo: fila.tipo_equipo,
          categoria: fila.categoria,
          en_bodega: fila.en_bodega,
          asignado_a_tecnico: fila.asignado_a_tecnico,
          en_transito: fila.en_transito,
          danado: fila.danado,
          total_activo: fila.total_activo,
          umbral_minimo: fila.umbral_minimo,
          estado_stock: fila.bajo_umbral ? 'Bajo umbral' : 'Normal',
        }));
        break;
      }

      case 'movimientos': {
        sheetName = `Movimientos${fechaYYYYMMDD}`;
        filename = `reporte-movimientos-${fechaYYYYMMDD}.xlsx`;
        auditEntity = 'reporte_movimientos';
        columns = [
          { header: 'Fecha y Hora', key: 'fecha_hora' },
          { header: 'Tipo Movimiento', key: 'tipo_movimiento' },
          { header: 'Tipo de Equipo', key: 'tipo_equipo' },
          { header: 'Cantidad / N° Serie', key: 'cantidad_o_serie' },
          { header: 'Origen', key: 'origen' },
          { header: 'Destino', key: 'destino' },
          { header: 'Usuario', key: 'usuario' },
          { header: 'Motivo / Observaciones', key: 'motivo' },
        ];
        const data = (await this.getMovementsReport(
          {
            id_empresa: query.id_empresa,
            id_bodega: query.id_bodega,
            id_tipo_equipo: query.id_tipo_equipo,
            fecha_desde: query.fecha_desde,
            fecha_hasta: query.fecha_hasta,
            tipo_movimiento: query.tipo_movimiento,
            id_usuario: query.id_usuario,
          },
          actor,
        )) as Array<{
          fecha_hora: string;
          tipo_movimiento: string;
          tipo_equipo: string;
          es_serializado: boolean;
          numero_serie?: string;
          cantidad: number;
          bodega_origen?: string;
          bodega_destino?: string;
          usuario?: string;
          motivo?: string;
          observaciones?: string;
        }>;
        rows = data.map((fila) => ({
          fecha_hora: this.formatDateDDMMYYYYHHmm(fila.fecha_hora),
          tipo_movimiento: fila.tipo_movimiento,
          tipo_equipo: fila.tipo_equipo,
          cantidad_o_serie: fila.es_serializado
            ? fila.numero_serie || '-'
            : fila.cantidad,
          origen: fila.bodega_origen || '-',
          destino: fila.bodega_destino || '-',
          usuario: fila.usuario || '-',
          motivo: fila.motivo || fila.observaciones || '-',
        }));
        break;
      }

      case 'garantias': {
        sheetName = `Garantias${fechaYYYYMMDD}`;
        filename = `reporte-garantias-${fechaYYYYMMDD}.xlsx`;
        auditEntity = 'reporte_garantias';
        columns = [
          { header: 'Tipo de Equipo', key: 'tipo_equipo' },
          { header: 'N° Serie', key: 'numero_serie' },
          { header: 'Empresa', key: 'empresa' },
          { header: 'Bodega Actual', key: 'bodega_actual' },
          { header: 'Proveedor', key: 'proveedor' },
          { header: 'Fecha Vencimiento', key: 'fecha_vencimiento' },
          { header: 'Estado Garantía', key: 'estado_garantia' },
          { header: 'Días Restantes', key: 'dias_restantes' },
        ];
        const data = (await this.getGarantiasReport(
          {
            id_empresa: query.id_empresa,
            id_tipo_equipo: query.id_tipo_equipo,
            periodo: query.periodo,
          },
          actor,
        )) as Array<{
          tipo_equipo: string;
          numero_serie: string;
          empresa: string;
          bodega_actual: string;
          proveedor?: string;
          fecha_vencimiento_garantia?: string;
          estado_garantia: string;
          dias_restantes?: number | null;
        }>;
        rows = data.map((fila) => ({
          tipo_equipo: fila.tipo_equipo,
          numero_serie: fila.numero_serie,
          empresa: fila.empresa,
          bodega_actual: fila.bodega_actual,
          proveedor: fila.proveedor || '-',
          fecha_vencimiento: formatDateDDMMYYYY(
            fila.fecha_vencimiento_garantia,
          ),
          estado_garantia: fila.estado_garantia,
          dias_restantes:
            fila.dias_restantes !== null && fila.dias_restantes !== undefined
              ? fila.dias_restantes
              : '-',
        }));
        break;
      }

      case 'inventario-tecnicos':
      case 'tecnicos-inventario': {
        sheetName = `InventarioTecnicos${fechaYYYYMMDD}`;
        filename = `reporte-inventario-tecnicos-${fechaYYYYMMDD}.xlsx`;
        auditEntity = 'reporte_inventario_tecnicos';
        columns = [
          { header: 'Técnico', key: 'tecnico' },
          { header: 'Empresa', key: 'empresa' },
          { header: 'Tipo de Ítem', key: 'tipo_item' },
          { header: 'Tipo de Equipo', key: 'tipo_equipo' },
          { header: 'N° Serie', key: 'numero_serie' },
          { header: 'Cantidad', key: 'cantidad' },
          { header: 'Unidad de Medida', key: 'unidad_medida' },
          { header: 'Fecha Asignación', key: 'fecha_asignacion' },
          { header: 'Días Transcurridos', key: 'dias_transcurridos' },
        ];
        const data = (await this.getInventarioTecnicosReport(
          {
            id_empresa: query.id_empresa,
            id_usuario: query.id_usuario,
          },
          actor,
        )) as Array<{
          nombre_completo: string;
          empresa: string;
          items_individuales?: Array<{
            tipo_equipo: string;
            numero_serie: string;
            fecha_asignacion?: string | Date | null;
            dias_transcurridos?: number | null;
          }>;
          consumibles?: Array<{
            tipo_equipo: string;
            cantidad: number;
            unidad_medida?: string;
          }>;
        }>;
        rows = [];
        for (const tec of data) {
          const tieneItems =
            (tec.items_individuales && tec.items_individuales.length > 0) ||
            (tec.consumibles && tec.consumibles.length > 0);

          if (!tieneItems) {
            rows.push({
              tecnico: tec.nombre_completo,
              empresa: tec.empresa,
              tipo_item: '-',
              tipo_equipo: 'Sin ítems en inventario personal',
              numero_serie: '-',
              cantidad: 0,
              unidad_medida: '-',
              fecha_asignacion: '-',
              dias_transcurridos: '-',
            });
            continue;
          }

          if (tec.items_individuales) {
            for (const item of tec.items_individuales) {
              rows.push({
                tecnico: tec.nombre_completo,
                empresa: tec.empresa,
                tipo_item: 'Serializado',
                tipo_equipo: item.tipo_equipo,
                numero_serie: item.numero_serie,
                cantidad: 1,
                unidad_medida: 'UNIDAD',
                fecha_asignacion: formatDateDDMMYYYY(item.fecha_asignacion),
                dias_transcurridos:
                  item.dias_transcurridos !== null &&
                  item.dias_transcurridos !== undefined
                    ? item.dias_transcurridos
                    : '-',
              });
            }
          }

          if (tec.consumibles) {
            for (const c of tec.consumibles) {
              rows.push({
                tecnico: tec.nombre_completo,
                empresa: tec.empresa,
                tipo_item: 'Consumible',
                tipo_equipo: c.tipo_equipo,
                numero_serie: '-',
                cantidad: c.cantidad,
                unidad_medida: c.unidad_medida || 'UNIDAD',
                fecha_asignacion: '-',
                dias_transcurridos: '-',
              });
            }
          }
        }
        break;
      }

      case 'consumo': {
        sheetName = `Consumo${fechaYYYYMMDD}`;
        filename = `reporte-consumo-${fechaYYYYMMDD}.xlsx`;
        auditEntity = 'reporte_consumo';
        columns = [
          { header: 'Tipo de Consumible', key: 'tipo_consumible' },
          { header: 'Cantidad Ingresada', key: 'cantidad_ingresada' },
          {
            header: 'Cantidad Entregada a Técnicos',
            key: 'cantidad_entregada',
          },
          {
            header: 'Cantidad Usada en Cierres',
            key: 'cantidad_usada_en_cierres',
          },
          { header: 'Cantidad Devuelta a Bodega', key: 'cantidad_devuelta' },
          { header: 'Diferencia', key: 'diferencia' },
          { header: 'Indicador', key: 'indicador' },
        ];
        const data = (await this.getConsumoReport(
          {
            id_empresa: query.id_empresa,
            id_tipo_equipo: query.id_tipo_equipo,
            fecha_desde: query.fecha_desde,
            fecha_hasta: query.fecha_hasta,
          },
          actor,
        )) as Array<{
          tipo_consumible: string;
          cantidad_ingresada: number;
          cantidad_entregada: number;
          cantidad_usada_en_cierres: number;
          cantidad_devuelta: number;
          diferencia: number;
          desvio: boolean;
        }>;
        rows = data.map((fila) => ({
          tipo_consumible: fila.tipo_consumible,
          cantidad_ingresada: fila.cantidad_ingresada,
          cantidad_entregada: fila.cantidad_entregada,
          cantidad_usada_en_cierres: fila.cantidad_usada_en_cierres,
          cantidad_devuelta: fila.cantidad_devuelta,
          diferencia: fila.diferencia,
          indicador: fila.desvio ? 'Desvío significativo' : 'Normal',
        }));
        break;
      }

      case 'equipos-instalados':
      case 'equipos-cliente': {
        sheetName = `EquiposInstalados${fechaYYYYMMDD}`;
        filename = `reporte-equipos-instalados-${fechaYYYYMMDD}.xlsx`;
        auditEntity = 'reporte_equipos_instalados';
        columns = [
          { header: 'N° Servicio', key: 'numero_servicio' },
          { header: 'RUT Cliente', key: 'rut_cliente' },
          { header: 'Nombre Cliente', key: 'nombre_cliente' },
          { header: 'Dirección Instalación', key: 'direccion_instalacion' },
          { header: 'Tipo de Equipo', key: 'tipo_equipo' },
          { header: 'N° Serie', key: 'numero_serie' },
          { header: 'Fecha Instalación', key: 'fecha_instalacion' },
          { header: 'Técnico Instalador', key: 'tecnico_instalador' },
        ];
        const data = await this.getEquiposInstaladosReport(
          {
            rut: query.rut,
            nombre: query.nombre,
            numero_serie: query.numero_serie || query.ns,
            id_empresa: query.id_empresa,
          },
          actor,
        );
        rows = data.map((fila) => ({
          numero_servicio: fila.numero_servicio,
          rut_cliente: fila.rut_cliente,
          nombre_cliente: fila.nombre_cliente,
          direccion_instalacion: fila.direccion_instalacion,
          tipo_equipo: fila.tipo_equipo,
          numero_serie: fila.numero_serie,
          fecha_instalacion: fila.fecha_instalacion,
          tecnico_instalador: fila.tecnico_instalacion || '-',
        }));
        break;
      }

      case 'productividad':
      case 'tecnicos-productividad': {
        sheetName = `Productividad${fechaYYYYMMDD}`;
        filename = `reporte-productividad-${fechaYYYYMMDD}.xlsx`;
        auditEntity = 'reporte_productividad_tecnicos';

        const roles = actor.roles ?? [];
        const puedeVerProductividad =
          roles.includes('SUPERUSUARIO') || roles.includes('ADMIN');
        if (!puedeVerProductividad) {
          throw new ForbiddenException(
            'No tiene permisos para acceder al reporte de productividad de técnicos.',
          );
        }

        columns = [
          { header: 'Técnico', key: 'nombre_completo' },
          { header: 'Empresa', key: 'empresa' },
          { header: 'Instalaciones Cerradas', key: 'instalaciones_cerradas' },
          { header: 'Reparaciones Cerradas', key: 'reparaciones_cerradas' },
          { header: 'Metros Fibra Óptica', key: 'metros_fibra_optica' },
          { header: 'Unidades Conectores', key: 'unidades_conectores' },
          { header: 'Otros Consumibles', key: 'otros_consumibles' },
        ];
        const data = await this.getTecnicosProductividadReport(
          {
            id_empresa: query.id_empresa,
            id_tecnico: query.id_tecnico,
            fecha_desde: query.fecha_desde,
            fecha_hasta: query.fecha_hasta,
          },
          actor,
        );
        rows = data.map((fila) => ({
          nombre_completo: fila.nombre_completo,
          empresa: fila.empresa,
          instalaciones_cerradas: fila.instalaciones_cerradas,
          reparaciones_cerradas: fila.reparaciones_cerradas,
          metros_fibra_optica: fila.metros_fibra_optica,
          unidades_conectores: fila.unidades_conectores,
          otros_consumibles: fila.otros_consumibles_resumen || '-',
        }));
        break;
      }

      default:
        throw new BadRequestException(
          `Tipo de reporte '${query.tipo}' no soportado para exportación a Excel.`,
        );
    }

    const buffer = this.excelExportService.generateXlsx({
      sheetName,
      columns,
      rows,
    });

    const actorId = actor.id_usuario ?? actor.sub;
    if (actorId) {
      await this.auditoriaService.create({
        id_usuario: actorId,
        accion: 'EXPORTAR_REPORTE_EXCEL',
        entidad_afectada: auditEntity,
        id_entidad_afectada: 0,
        valor_anterior: null,
        valor_nuevo: {
          tipo,
          filtros: query,
          filas: rows.length,
          nombre_hoja: sheetName,
          archivo: filename,
        },
      });
    }

    return { buffer, filename, sheetName };
  }

  private getFechaYYYYMMDD(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private formatDateDDMMYYYYHHmm(
    dateInput: Date | string | null | undefined,
  ): string {
    if (!dateInput) return '-';
    const d =
      typeof dateInput === 'string'
        ? new Date(
            dateInput.includes('T') ? dateInput : `${dateInput}T00:00:00`,
          )
        : dateInput;
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
}
