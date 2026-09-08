import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
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
      [idEmpresa, filtros.id_usuario],
    );

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
          const [unidades, saldos] = await Promise.all([
            this.dataSource.query(
              `SELECT u.numero_serie, t.nombre AS tipo_equipo,
                    COALESCE(h.fecha_hora, sb.fecha_hora) AS fecha_asignacion,
                    GREATEST(0, CURRENT_DATE - COALESCE(h.fecha_hora, sb.fecha_hora)::date)::int AS dias_transcurridos
             FROM unidad_equipo u
             INNER JOIN tipo_equipo t ON t.id_tipo_equipo = u.id_tipo_equipo
             LEFT JOIN LATERAL (
               SELECT he.fecha_hora
               FROM historial_estado_equipo he
               WHERE he.id_unidad = u.id_unidad
                 AND he.estado_nuevo = 'Asignado a técnico'
                 AND he.id_usuario = u.id_tecnico_asignado
               ORDER BY he.fecha_hora DESC, he.id_historial DESC
               LIMIT 1
             ) h ON true
             LEFT JOIN LATERAL (
               SELECT s.fecha_hora
               FROM salida_detalle sd
               INNER JOIN salida_bodega s ON s.id_salida = sd.id_salida
               WHERE sd.id_unidad = u.id_unidad
                 AND s.id_tecnico = u.id_tecnico_asignado
               ORDER BY s.fecha_hora DESC, s.id_salida DESC
               LIMIT 1
             ) sb ON true
             WHERE u.id_empresa = $1
               AND u.id_tecnico_asignado = $2
               AND u.estado = 'Asignado a técnico'
             ORDER BY u.numero_serie ASC`,
              [tecnico.id_empresa, tecnico.id_usuario],
            ),
            this.dataSource.query(
              `SELECT ip.id_tipo_equipo, t.nombre AS tipo_equipo,
                    ip.cantidad AS cantidad_disponible, t.unidad_medida
             FROM inventario_personal_tecnico ip
             INNER JOIN tipo_equipo t ON t.id_tipo_equipo = ip.id_tipo_equipo
             WHERE ip.id_tecnico = $1
               AND t.requiere_serial_number = false
               AND ip.cantidad > 0
             ORDER BY t.nombre ASC`,
              [tecnico.id_usuario],
            ),
          ]);

          return {
            tecnico: {
              id_usuario: tecnico.id_usuario,
              nombre_completo: tecnico.nombre_completo,
              empresa: this.nombreEmpresa(tecnico.id_empresa),
            },
            equipos_individualizables: unidades.map(
              (unidad: Record<string, unknown>) => ({
                numero_serie: unidad.numero_serie,
                tipo_equipo: unidad.tipo_equipo,
                fecha_asignacion: unidad.fecha_asignacion
                  ? new Date(unidad.fecha_asignacion as string)
                      .toISOString()
                      .slice(0, 10)
                  : null,
                dias_transcurridos: Number(unidad.dias_transcurridos ?? 0),
              }),
            ),
            consumibles: saldos.map((saldo: Record<string, unknown>) => ({
              id_tipo_equipo: saldo.id_tipo_equipo,
              tipo_equipo: saldo.tipo_equipo,
              cantidad_disponible: Number(saldo.cantidad_disponible),
              unidad_medida: saldo.unidad_medida ?? null,
            })),
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

    const [tieneIngresos, tieneRetornos] = await Promise.all([
      this.tableExists('orden_ingreso_detalle'),
      this.tableExists('prestamo_retorno'),
    ]);

    const resultado = await Promise.all(
      tipos.map(async (tipo) => {
        const [ingresado, entregado, devuelto] = await Promise.all([
          tieneIngresos
            ? this.dataSource
                .query(
                  `SELECT COALESCE(SUM(oid.cantidad), 0) AS cantidad
                 FROM orden_ingreso_detalle oid
                 INNER JOIN orden_ingreso oi ON oi.id_orden_ingreso = oid.id_orden_ingreso
                 WHERE oid.id_tipo_equipo = $1
                   AND ($2::int IS NULL OR oi.id_empresa = $2)
                   AND ($3::date IS NULL OR oi.fecha >= $3::date)
                   AND ($4::date IS NULL OR oi.fecha < ($4::date + INTERVAL '1 day'))`,
                  [
                    tipo.id_tipo_equipo,
                    idEmpresa,
                    filtros.fecha_desde ?? null,
                    filtros.fecha_hasta ?? null,
                  ],
                )
                .then((rows: Array<{ cantidad: string | number }>) =>
                  Number(rows[0]?.cantidad ?? 0),
                )
            : Promise.resolve(0),
          this.getConsumibleTotal(
            `SELECT COALESCE(SUM(sd.cantidad), 0) AS cantidad
             FROM salida_detalle sd
             INNER JOIN salida_bodega sb ON sb.id_salida = sd.id_salida
             WHERE sd.id_tipo_equipo = $1
               AND sd.id_unidad IS NULL
               AND ($2::int IS NULL OR sb.id_empresa = $2)
               AND ($3::date IS NULL OR sb.fecha_hora >= $3::date)
               AND ($4::date IS NULL OR sb.fecha_hora < ($4::date + INTERVAL '1 day'))`,
            tipo.id_tipo_equipo,
            idEmpresa,
            filtros.fecha_desde,
            filtros.fecha_hasta,
          ),
          tieneRetornos
            ? this.dataSource
                .query(
                  `SELECT COALESCE(SUM(pr.cantidad), 0) AS cantidad
                 FROM prestamo_retorno pr
                 WHERE pr.id_tipo_equipo = $1
                   AND ($2::int IS NULL OR pr.id_empresa = $2)
                   AND ($3::date IS NULL OR pr.fecha_hora >= $3::date)
                   AND ($4::date IS NULL OR pr.fecha_hora < ($4::date + INTERVAL '1 day'))`,
                  [
                    tipo.id_tipo_equipo,
                    idEmpresa,
                    filtros.fecha_desde ?? null,
                    filtros.fecha_hasta ?? null,
                  ],
                )
                .then((rows: Array<{ cantidad: string | number }>) =>
                  Number(rows[0]?.cantidad ?? 0),
                )
            : Promise.resolve(0),
        ]);

        // CU-64/CU-68 aún no están implementados: se deja la columna lista.
        const usadoEnCierres = 0;
        const diferencia = ingresado - entregado + devuelto;
        return {
          id_tipo_equipo: tipo.id_tipo_equipo,
          tipo_consumible: tipo.nombre,
          unidad_medida: tipo.unidadMedida ?? null,
          cantidad_ingresada: ingresado,
          cantidad_entregada: entregado,
          cantidad_usada_en_cierres: usadoEnCierres,
          cantidad_devuelta: devuelto,
          diferencia,
          desvio: ingresado > 0 && Math.abs(diferencia) > ingresado * 0.15,
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

  private async getConsumibleTotal(
    sql: string,
    idTipoEquipo: number,
    idEmpresa?: number,
    fechaDesde?: string,
    fechaHasta?: string,
  ): Promise<number> {
    const rows = await this.dataSource.query(sql, [
      idTipoEquipo,
      idEmpresa,
      fechaDesde ?? null,
      fechaHasta ?? null,
    ]);
    return Number(rows[0]?.cantidad ?? 0);
  }

  private async tableExists(tableName: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      'SELECT to_regclass($1) IS NOT NULL AS existe',
      [tableName],
    );
    return rows[0]?.existe === true;
  }

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
    const resultado = filas.map((fila) => {
      const fechaVencimiento = fila.fecha_vencimiento
        ? new Date(`${fila.fecha_vencimiento}T00:00:00Z`)
        : null;
      const dias = fechaVencimiento
        ? Math.round(
            (fechaVencimiento.getTime() -
              new Date(
                `${new Date().toISOString().slice(0, 10)}T00:00:00Z`,
              ).getTime()) /
              86_400_000,
          )
        : null;
      return {
        numero_serie: fila.numero_serie,
        tipo_equipo: fila.tipo_equipo,
        marca: fila.marca ?? null,
        modelo: fila.modelo ?? null,
        proveedor: fila.proveedor ?? null,
        fecha_adquisicion: fila.fecha_adquisicion
          ? new Date(`${fila.fecha_adquisicion}T00:00:00Z`)
              .toISOString()
              .slice(0, 10)
          : null,
        duracion_garantia_dias: Number(fila.duracion_garantia_dias ?? 0),
        fecha_vencimiento: fila.fecha_vencimiento
          ? new Date(`${fila.fecha_vencimiento}T00:00:00Z`)
              .toISOString()
              .slice(0, 10)
          : null,
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
