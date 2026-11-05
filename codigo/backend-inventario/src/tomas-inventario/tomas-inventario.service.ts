import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { MovimientoInventario } from '../transferencias/entities/movimiento-inventario.entity';
import { RegistrarConteoDto } from './dto/registrar-conteo.dto';
import {
  RESULTADO_COINCIDE,
  RESULTADO_FALTANTE,
  RESULTADO_NO_REGISTRADA,
  RESULTADO_OTRA_UBICACION,
  RESULTADO_SOBRANTE,
  TomaInventarioDetalle,
} from './entities/toma-inventario-detalle.entity';
import {
  TOMA_ABIERTA,
  TOMA_CANCELADA,
  TOMA_CONFIRMADA,
  TomaInventario,
} from './entities/toma-inventario.entity';

export const TIPO_MOVIMIENTO_AJUSTE = 'AJUSTE_INVENTARIO';
const ESTADO_EN_BODEGA = 'En bodega';

export interface ActorToma {
  id_usuario: number;
  id_empresa: number;
  roles?: string[];
}

// CU-97: Registrando toma de inventario físico y ajuste de diferencias.
@Injectable()
export class TomasInventarioService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  private esSuperusuario(actor: ActorToma): boolean {
    return (actor.roles ?? []).includes('SUPERUSUARIO');
  }

  // Aislamiento por empresa: fuera de la empresa la toma "no existe" (404 genérico)
  private async obtenerToma(
    id: number,
    actor: ActorToma,
    manager: EntityManager = this.dataSource.manager,
    bloquear = false,
  ): Promise<TomaInventario> {
    const toma = await manager.findOne(TomaInventario, {
      where: { id_toma: id },
      ...(bloquear ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (
      !toma ||
      (!this.esSuperusuario(actor) && toma.id_empresa !== actor.id_empresa)
    ) {
      throw new NotFoundException('Toma de inventario no encontrada.');
    }
    return toma;
  }

  private exigirAbierta(toma: TomaInventario): void {
    if (toma.estado !== TOMA_ABIERTA) {
      throw new ConflictException(
        `La toma de inventario ya está ${toma.estado.toLowerCase()}.`,
      );
    }
  }

  //CU-97: abre la toma y guarda la foto de lo que debería haber en la bodega
  async abrir(idBodega: number, actor: ActorToma) {
    const bodega = await this.dataSource.manager.findOne(Bodega, {
      where: { id_bodega: idBodega },
    });
    if (
      !bodega ||
      (!this.esSuperusuario(actor) && bodega.id_empresa !== actor.id_empresa)
    ) {
      throw new NotFoundException('Bodega no encontrada.');
    }
    if (!bodega.activa) {
      throw new BadRequestException(
        'No se puede abrir una toma en una bodega inactiva.',
      );
    }

    const idToma = await this.dataSource.transaction(async (manager) => {
      // Serializa aperturas concurrentes sobre la misma bodega
      await manager.findOne(Bodega, {
        where: { id_bodega: idBodega },
        lock: { mode: 'pessimistic_write' },
      });
      // CU-97 E1: solo una toma abierta por bodega
      const abierta = await manager.findOne(TomaInventario, {
        where: { id_bodega: idBodega, estado: TOMA_ABIERTA },
      });
      if (abierta) {
        throw new ConflictException(
          `La bodega ya tiene una toma abierta (#${abierta.id_toma}).`,
        );
      }

      const toma = await manager.save(
        manager.create(TomaInventario, {
          id_bodega: idBodega,
          id_empresa: bodega.id_empresa,
          estado: TOMA_ABIERTA,
          id_usuario_apertura: actor.id_usuario,
          fecha_apertura: new Date(),
        }),
      );

      const unidades = await manager.find(UnidadEquipo, {
        where: { id_bodega_actual: idBodega, estado: ESTADO_EN_BODEGA },
      });
      const stock = await manager.find(StockConsumible, {
        where: { id_bodega: idBodega },
      });
      // Consumibles activos del catálogo sin fila de stock: esperado 0, para
      // poder registrar lo que aparezca al contar.
      const catalogo = await manager.find(TipoEquipo, {
        where: [bodega.id_empresa, IsNull()].map((id_empresa) => ({
          id_empresa,
          requiereSerialNumber: false,
          activo: true,
        })),
      });
      const consumibles = new Map<number, number>();
      catalogo.forEach((t) => consumibles.set(t.id_tipo_equipo, 0));
      stock.forEach((s) =>
        consumibles.set(s.id_tipo_equipo, Number(s.cantidad_disponible)),
      );

      await manager.save(TomaInventarioDetalle, [
        ...unidades.map((u) => ({
          id_toma: toma.id_toma,
          id_tipo_equipo: u.id_tipo_equipo,
          id_unidad: u.id_unidad,
          numero_serie: u.serialNumber,
          es_esperada: true,
          cantidad_esperada: 1,
        })),
        ...[...consumibles].map(([idTipo, cantidad]) => ({
          id_toma: toma.id_toma,
          id_tipo_equipo: idTipo,
          es_esperada: true,
          cantidad_esperada: cantidad,
        })),
      ]);
      return toma.id_toma;
    });

    await this.auditoriaService.create({
      id_usuario: actor.id_usuario,
      accion: 'ABRIR_TOMA_INVENTARIO',
      entidad_afectada: 'toma_inventario',
      id_entidad_afectada: idToma,
      valor_anterior: null,
      valor_nuevo: { id_bodega: idBodega, bodega: bodega.nombre },
    });
    return this.obtener(idToma, actor);
  }

  async listar(actor: ActorToma, idBodega?: number) {
    const query = this.dataSource.manager
      .createQueryBuilder(TomaInventario, 't')
      .innerJoin(Bodega, 'b', 'b.id_bodega = t.id_bodega')
      .select([
        't.id_toma AS id_toma',
        't.id_bodega AS id_bodega',
        't.id_empresa AS id_empresa',
        't.estado AS estado',
        't.fecha_apertura AS fecha_apertura',
        't.fecha_cierre AS fecha_cierre',
        'b.nombre AS bodega_nombre',
      ])
      .orderBy('t.fecha_apertura', 'DESC');
    if (!this.esSuperusuario(actor)) {
      query.andWhere('t.id_empresa = :empresa', { empresa: actor.id_empresa });
    }
    if (idBodega) query.andWhere('t.id_bodega = :idBodega', { idBodega });
    return query.getRawMany();
  }

  //CU-97: detalle de la toma con las diferencias calculadas hasta el momento
  async obtener(id: number, actor: ActorToma) {
    const toma = await this.obtenerToma(id, actor);
    const manager = this.dataSource.manager;
    const [bodega, detalles] = await Promise.all([
      manager.findOne(Bodega, { where: { id_bodega: toma.id_bodega } }),
      manager.find(TomaInventarioDetalle, {
        where: { id_toma: id },
        order: { id_detalle: 'ASC' },
      }),
    ]);
    const idsTipo = [
      ...new Set(
        detalles.map((d) => d.id_tipo_equipo).filter((x) => x !== null),
      ),
    ];
    const tipos = idsTipo.length
      ? await manager.find(TipoEquipo, {
          where: { id_tipo_equipo: In(idsTipo) },
        })
      : [];
    const tipoPorId = new Map(tipos.map((t) => [t.id_tipo_equipo, t]));

    const lineas = detalles.map((d) => {
      const tipo =
        d.id_tipo_equipo !== null ? tipoPorId.get(d.id_tipo_equipo) : undefined;
      const esperada = Number(d.cantidad_esperada);
      const contada =
        d.cantidad_contada === null ? null : Number(d.cantidad_contada);
      return {
        id_detalle: d.id_detalle,
        id_tipo_equipo: d.id_tipo_equipo,
        tipo_equipo_nombre: tipo?.nombre ?? null,
        unidad_medida: tipo?.unidadMedida ?? null,
        id_unidad: d.id_unidad,
        numero_serie: d.numero_serie,
        es_esperada: d.es_esperada,
        cantidad_esperada: esperada,
        cantidad_contada: contada,
        diferencia: contada === null ? null : contada - esperada,
        resultado: d.resultado ?? this.resultadoProvisional(d),
      };
    });
    const series = lineas.filter((l) => l.numero_serie !== null);
    const consumibles = lineas.filter((l) => l.numero_serie === null);
    return {
      ...toma,
      bodega_nombre: bodega?.nombre ?? null,
      consumibles,
      series,
      resumen: {
        consumibles_sin_contar: consumibles.filter(
          (c) => c.cantidad_contada === null,
        ).length,
        consumibles_con_diferencia: consumibles.filter(
          (c) => c.diferencia !== null && c.diferencia !== 0,
        ).length,
        series_contadas: series.filter((s) => s.cantidad_contada === 1).length,
        series_faltantes: series.filter(
          (s) => s.es_esperada && s.cantidad_contada !== 1,
        ).length,
        series_fuera_de_lugar: series.filter((s) => !s.es_esperada).length,
      },
    };
  }

  // Mientras la toma está abierta el resultado se deriva; al confirmar se guarda.
  private resultadoProvisional(d: TomaInventarioDetalle): string | null {
    if (d.numero_serie !== null) {
      return d.es_esperada && Number(d.cantidad_contada) !== 1
        ? RESULTADO_FALTANTE
        : RESULTADO_COINCIDE;
    }
    if (d.cantidad_contada === null) return null;
    const dif = Number(d.cantidad_contada) - Number(d.cantidad_esperada);
    if (dif === 0) return RESULTADO_COINCIDE;
    return dif > 0 ? RESULTADO_SOBRANTE : RESULTADO_FALTANTE;
  }

  //CU-97: guarda el avance del conteo; se puede repetir hasta confirmar
  async registrarConteo(id: number, dto: RegistrarConteoDto, actor: ActorToma) {
    const series = (dto.series ?? []).map((s) => s.trim()).filter(Boolean);
    const vistas = new Set<string>();
    for (const serie of series) {
      const clave = serie.toUpperCase();
      if (vistas.has(clave)) {
        throw new BadRequestException(
          `La serie [${serie}] está repetida en el conteo.`,
        );
      }
      vistas.add(clave);
    }

    await this.dataSource.transaction(async (manager) => {
      const toma = await this.obtenerToma(id, actor, manager, true);
      this.exigirAbierta(toma);
      const detalles = await manager.find(TomaInventarioDetalle, {
        where: { id_toma: id },
      });

      for (const conteo of dto.consumibles ?? []) {
        const detalle = detalles.find(
          (d) => d.id_detalle === conteo.id_detalle && d.numero_serie === null,
        );
        if (!detalle) {
          throw new BadRequestException(
            `El detalle #${conteo.id_detalle} no es un consumible de esta toma.`,
          );
        }
        detalle.cantidad_contada = conteo.cantidad_contada;
        await manager.save(detalle);
      }

      if (dto.series !== undefined) {
        await this.registrarSeries(manager, toma, detalles, series);
      }
    });
    return this.obtener(id, actor);
  }

  private async registrarSeries(
    manager: EntityManager,
    toma: TomaInventario,
    detalles: TomaInventarioDetalle[],
    series: string[],
  ): Promise<void> {
    const contadas = new Set(series.map((s) => s.toUpperCase()));
    const conSerie = detalles.filter((d) => d.numero_serie !== null);

    // Las series fuera de lugar se recalculan completas en cada envío
    const fueraDeLugar = conSerie.filter((d) => !d.es_esperada);
    if (fueraDeLugar.length) await manager.remove(fueraDeLugar);

    const esperadas = conSerie.filter((d) => d.es_esperada);
    for (const detalle of esperadas) {
      detalle.cantidad_contada = contadas.has(
        (detalle.numero_serie as string).toUpperCase(),
      )
        ? 1
        : 0;
      await manager.save(detalle);
    }

    const conocidas = new Set(
      esperadas.map((d) => (d.numero_serie as string).toUpperCase()),
    );
    for (const serie of series) {
      if (conocidas.has(serie.toUpperCase())) continue;
      // CU-97 E2: serie que no estaba en esta bodega. Una serie de otra empresa
      // se informa igual que una inexistente, para no revelar datos ajenos.
      const unidad = await manager
        .createQueryBuilder(UnidadEquipo, 'u')
        .where('UPPER(u.serialNumber) = :serie', {
          serie: serie.toUpperCase(),
        })
        .andWhere('u.id_empresa = :empresa', { empresa: toma.id_empresa })
        .getOne();
      await manager.save(
        manager.create(TomaInventarioDetalle, {
          id_toma: toma.id_toma,
          id_tipo_equipo: unidad?.id_tipo_equipo ?? null,
          id_unidad: unidad?.id_unidad ?? null,
          numero_serie: unidad?.serialNumber ?? serie,
          es_esperada: false,
          cantidad_esperada: 0,
          cantidad_contada: 1,
          resultado: unidad
            ? RESULTADO_OTRA_UBICACION
            : RESULTADO_NO_REGISTRADA,
        }),
      );
    }
  }

  //CU-97: confirma en una transacción: ajusta consumibles y cierra la toma.
  // Las series faltantes solo se informan: no cambian de estado.
  async confirmar(id: number, forzarMovimientos: boolean, actor: ActorToma) {
    const resumenAjustes = await this.dataSource.transaction(
      async (manager) => {
        const toma = await this.obtenerToma(id, actor, manager, true);
        this.exigirAbierta(toma);
        const detalles = await manager.find(TomaInventarioDetalle, {
          where: { id_toma: id },
        });
        const consumibles = detalles.filter((d) => d.numero_serie === null);

        const sinContar = consumibles.filter(
          (d) => d.cantidad_contada === null,
        );
        if (sinContar.length) {
          throw new BadRequestException(
            `Faltan ${sinContar.length} consumible(s) por contar.`,
          );
        }

        const stocks = new Map<number, StockConsumible | null>();
        const cambiados: number[] = [];
        for (const d of consumibles) {
          const stock = await manager.findOne(StockConsumible, {
            where: {
              id_bodega: toma.id_bodega,
              id_tipo_equipo: d.id_tipo_equipo as number,
            },
            lock: { mode: 'pessimistic_write' },
          });
          stocks.set(d.id_detalle, stock);
          const actual = stock ? Number(stock.cantidad_disponible) : 0;
          if (actual !== Number(d.cantidad_esperada)) {
            cambiados.push(d.id_tipo_equipo as number);
          }
        }
        const unidadesMovidas = await this.unidadesMovidas(
          manager,
          toma,
          detalles,
        );

        // CU-97 E3: hubo movimientos durante el conteo; se avisa antes de ajustar
        if (
          !forzarMovimientos &&
          (cambiados.length || unidadesMovidas.length)
        ) {
          throw new ConflictException({
            codigo: 'MOVIMIENTOS_DURANTE_CONTEO',
            message:
              'Hubo movimientos en la bodega durante el conteo. Revise las diferencias antes de ajustar.',
            tipos_con_cambios: cambiados,
            series_movidas: unidadesMovidas,
          });
        }

        let ajustes = 0;
        for (const d of consumibles) {
          const diferencia =
            Number(d.cantidad_contada) - Number(d.cantidad_esperada);
          d.resultado = this.resultadoProvisional(d);
          await manager.save(d);
          if (diferencia === 0) continue;

          // Se aplica la diferencia sobre el stock actual para no pisar los
          // movimientos registrados mientras se contaba.
          const stock = stocks.get(d.id_detalle);
          const nuevo =
            (stock ? Number(stock.cantidad_disponible) : 0) + diferencia;
          if (nuevo < 0) {
            throw new BadRequestException(
              `El ajuste del tipo #${d.id_tipo_equipo} dejaría stock negativo.`,
            );
          }
          if (stock) {
            stock.cantidad_disponible = nuevo;
            await manager.save(stock);
          } else {
            await manager.save(
              manager.create(StockConsumible, {
                id_bodega: toma.id_bodega,
                id_tipo_equipo: d.id_tipo_equipo as number,
                cantidad_disponible: nuevo,
              }),
            );
          }
          await manager.save(
            manager.create(MovimientoInventario, {
              id_tipo_equipo: d.id_tipo_equipo as number,
              id_empresa_origen: toma.id_empresa,
              ...(diferencia > 0
                ? { id_bodega_destino: toma.id_bodega }
                : { id_bodega_origen: toma.id_bodega }),
              id_usuario: actor.id_usuario,
              tipo_movimiento: TIPO_MOVIMIENTO_AJUSTE,
              cantidad: Math.abs(diferencia),
              fecha: new Date(),
              referencia_id: toma.id_toma,
            }),
          );
          ajustes++;
        }

        for (const d of detalles.filter((x) => x.numero_serie !== null)) {
          if (d.es_esperada) {
            d.resultado = this.resultadoProvisional(d);
            await manager.save(d);
          }
        }

        toma.estado = TOMA_CONFIRMADA;
        toma.id_usuario_cierre = actor.id_usuario;
        toma.fecha_cierre = new Date();
        await manager.save(toma);
        return {
          ajustes,
          forzada: forzarMovimientos,
          tipos_con_cambios: cambiados,
          series_movidas: unidadesMovidas,
        };
      },
    );

    await this.auditoriaService.create({
      id_usuario: actor.id_usuario,
      accion: 'CONFIRMAR_TOMA_INVENTARIO',
      entidad_afectada: 'toma_inventario',
      id_entidad_afectada: id,
      valor_anterior: { estado: TOMA_ABIERTA },
      valor_nuevo: { estado: TOMA_CONFIRMADA, ...resumenAjustes },
    });
    return {
      ...(await this.obtener(id, actor)),
      ajustes_aplicados: resumenAjustes.ajustes,
    };
  }

  // Series de la foto inicial que ya no están en la bodega
  private async unidadesMovidas(
    manager: EntityManager,
    toma: TomaInventario,
    detalles: TomaInventarioDetalle[],
  ): Promise<string[]> {
    const esperadas = detalles.filter(
      (d) => d.es_esperada && d.id_unidad !== null,
    );
    if (!esperadas.length) return [];
    const unidades = await manager.find(UnidadEquipo, {
      where: { id_unidad: In(esperadas.map((d) => d.id_unidad as number)) },
    });
    return unidades
      .filter(
        (u) =>
          u.estado !== ESTADO_EN_BODEGA ||
          u.id_bodega_actual !== toma.id_bodega,
      )
      .map((u) => u.serialNumber);
  }

  //CU-97: cancelar libera la bodega para otra toma; no cambia el inventario
  async cancelar(id: number, actor: ActorToma) {
    await this.dataSource.transaction(async (manager) => {
      const toma = await this.obtenerToma(id, actor, manager, true);
      this.exigirAbierta(toma);
      toma.estado = TOMA_CANCELADA;
      toma.id_usuario_cierre = actor.id_usuario;
      toma.fecha_cierre = new Date();
      await manager.save(toma);
    });
    await this.auditoriaService.create({
      id_usuario: actor.id_usuario,
      accion: 'CANCELAR_TOMA_INVENTARIO',
      entidad_afectada: 'toma_inventario',
      id_entidad_afectada: id,
      valor_anterior: { estado: TOMA_ABIERTA },
      valor_nuevo: { estado: TOMA_CANCELADA },
    });
    return this.obtener(id, actor);
  }
}
