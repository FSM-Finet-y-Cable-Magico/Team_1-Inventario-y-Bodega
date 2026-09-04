import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';

const ESTADOS_REPORTE = [
  'En bodega',
  'Asignado a técnico',
  'En revisión',
  'En préstamo externo',
] as const;

export interface FiltrosReporteStock {
  id_empresa?: number;
  id_bodega?: number;
  id_tipo_equipo?: number;
}

export interface FilaReporteStock {
  id_tipo_equipo: number;
  tipo_equipo: string;
  id_bodega: number;
  bodega: string;
  en_bodega: number;
  asignado_a_tecnico: number;
  en_revision: number;
  en_prestamo_externo: number;
  total_activo: number;
  umbral_minimo: number;
  bajo_umbral: boolean;
}

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
    @InjectRepository(StockConsumible)
    private readonly stockRepository: Repository<StockConsumible>,
    @InjectRepository(TipoEquipo)
    private readonly tipoRepository: Repository<TipoEquipo>,
    @InjectRepository(UnidadEquipo)
    private readonly unidadRepository: Repository<UnidadEquipo>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async generarReporteStock(
    filtros: FiltrosReporteStock,
    actorId: number,
  ): Promise<FilaReporteStock[]> {
    const bodegasQuery = this.bodegaRepository
      .createQueryBuilder('b')
      .where('b.activa = :activa', { activa: true });
    if (filtros.id_empresa !== undefined) {
      bodegasQuery.andWhere('b.id_empresa = :idEmpresa', {
        idEmpresa: filtros.id_empresa,
      });
    }
    if (filtros.id_bodega !== undefined) {
      bodegasQuery.andWhere('b.id_bodega = :idBodega', {
        idBodega: filtros.id_bodega,
      });
    }
    const bodegas = await bodegasQuery.getMany();
    const bodegaIds = new Set(bodegas.map((bodega) => bodega.id_bodega));

    const tiposQuery = this.tipoRepository
      .createQueryBuilder('t')
      .where('t.activo = :activo', { activo: true });
    if (filtros.id_empresa !== undefined) {
      tiposQuery.andWhere('t.id_empresa = :idEmpresa', {
        idEmpresa: filtros.id_empresa,
      });
    }
    if (filtros.id_tipo_equipo !== undefined) {
      tiposQuery.andWhere('t.id_tipo_equipo = :idTipoEquipo', {
        idTipoEquipo: filtros.id_tipo_equipo,
      });
    }
    const tipos = await tiposQuery.getMany();
    const tipoIds = new Set(tipos.map((tipo) => tipo.id_tipo_equipo));

    const unidades =
      bodegaIds.size && tipoIds.size
        ? await this.unidadRepository
            .createQueryBuilder('u')
            .where('u.id_bodega_actual IN (:...bodegaIds)', {
              bodegaIds: [...bodegaIds],
            })
            .andWhere('u.id_tipo_equipo IN (:...tipoIds)', {
              tipoIds: [...tipoIds],
            })
            .andWhere('u.estado IN (:...estados)', { estados: ESTADOS_REPORTE })
            .getMany()
        : [];

    const stocks =
      bodegaIds.size && tipoIds.size
        ? await this.stockRepository
            .createQueryBuilder('s')
            .where('s.id_bodega IN (:...bodegaIds)', {
              bodegaIds: [...bodegaIds],
            })
            .andWhere('s.id_tipo_equipo IN (:...tipoIds)', {
              tipoIds: [...tipoIds],
            })
            .getMany()
        : [];

    const tipoMap = new Map(tipos.map((tipo) => [tipo.id_tipo_equipo, tipo]));
    const bodegaMap = new Map(
      bodegas.map((bodega) => [bodega.id_bodega, bodega]),
    );
    const filas = new Map<string, FilaReporteStock>();

    const obtenerFila = (
      idTipo: number,
      idBodega: number,
    ): FilaReporteStock => {
      const key = `${idTipo}:${idBodega}`;
      const existente = filas.get(key);
      if (existente) return existente;

      const tipo = tipoMap.get(idTipo);
      const bodega = bodegaMap.get(idBodega);
      const fila: FilaReporteStock = {
        id_tipo_equipo: idTipo,
        tipo_equipo: tipo?.nombre ?? `Tipo ${idTipo}`,
        id_bodega: idBodega,
        bodega: bodega?.nombre ?? `Bodega ${idBodega}`,
        en_bodega: 0,
        asignado_a_tecnico: 0,
        en_revision: 0,
        en_prestamo_externo: 0,
        total_activo: 0,
        umbral_minimo: 0,
        bajo_umbral: false,
      };
      filas.set(key, fila);
      return fila;
    };

    for (const unidad of unidades) {
      if (
        unidad.id_bodega_actual === undefined ||
        unidad.id_tipo_equipo === undefined
      )
        continue;
      const fila = obtenerFila(unidad.id_tipo_equipo, unidad.id_bodega_actual);
      if (unidad.estado === 'En bodega') fila.en_bodega++;
      if (unidad.estado === 'Asignado a técnico') fila.asignado_a_tecnico++;
      if (unidad.estado === 'En revisión') fila.en_revision++;
      if (unidad.estado === 'En préstamo externo') fila.en_prestamo_externo++;
    }

    for (const stock of stocks) {
      const tipo = tipoMap.get(stock.id_tipo_equipo);
      const fila = obtenerFila(stock.id_tipo_equipo, stock.id_bodega);
      fila.umbral_minimo = Number(stock.umbral_minimo ?? 0);
      if (tipo?.requiereSerialNumber !== true) {
        fila.en_bodega = Number(stock.cantidad_disponible ?? 0);
      }
    }

    for (const fila of filas.values()) {
      fila.total_activo =
        fila.en_bodega +
        fila.asignado_a_tecnico +
        fila.en_revision +
        fila.en_prestamo_externo;
      fila.bajo_umbral = fila.total_activo < fila.umbral_minimo;
    }

    const resultado = [...filas.values()].sort(
      (a, b) =>
        a.tipo_equipo.localeCompare(b.tipo_equipo) ||
        a.bodega.localeCompare(b.bodega),
    );

    await this.auditoriaService.create({
      id_usuario: actorId,
      accion: 'GENERAR_REPORTE',
      entidad_afectada: 'reporte_stock',
      id_entidad_afectada: 0,
      valor_anterior: null,
      valor_nuevo: filtros,
    });

    return resultado;
  }
}
