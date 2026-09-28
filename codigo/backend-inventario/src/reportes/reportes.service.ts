import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
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

type Actor = {
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
    private readonly auditoriaService: AuditoriaService,
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

  private async auditReport(
    actor: Actor,
    filtros:
      | FiltrosStock
      | FiltrosMovimientos
      | FiltrosGarantias
      | FiltrosInventarioTecnicos
      | FiltrosConsumo,
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
}
