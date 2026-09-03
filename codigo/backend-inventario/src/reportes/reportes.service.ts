import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';

type FiltrosStock = {
  id_empresa?: number;
  id_bodega?: number;
  id_tipo_equipo?: number;
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
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
    @InjectRepository(StockConsumible)
    private readonly stockRepository: Repository<StockConsumible>,
    @InjectRepository(TipoEquipo)
    private readonly tipoEquipoRepository: Repository<TipoEquipo>,
    @InjectRepository(UnidadEquipo)
    private readonly unidadRepository: Repository<UnidadEquipo>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async getStockReport(filtros: FiltrosStock, actor: Actor): Promise<any[]> {
    const esSuperusuario = actor.roles?.includes('SUPERUSUARIO') ?? false;
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
          umbral_minimo: null,
          bajo_umbral: false,
        });
      }
      return filas.get(key);
    };

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
        stock.umbral_minimo == null ? null : Number(stock.umbral_minimo);
      if (stock.tipoEquipo?.requiereSerialNumber !== true) {
        fila.en_bodega = Number(stock.cantidad_disponible);
        fila.total_activo = fila.en_bodega;
      }
    }

    const resultado = [...filas.values()].map((fila) => {
      fila.bajo_umbral =
        fila.umbral_minimo !== null && fila.total_activo < fila.umbral_minimo;
      return fila;
    });
    await this.auditReport(actor, filtros, resultado.length);
    return resultado;
  }

  private async auditReport(
    actor: Actor,
    filtros: FiltrosStock,
    filas: number,
  ) {
    const actorId = actor.id_usuario ?? actor.sub;
    if (!actorId) return;
    await this.auditoriaService.create({
      id_usuario: actorId,
      accion: 'GENERAR_REPORTE_STOCK',
      entidad_afectada: 'reporte_stock',
      id_entidad_afectada: 0,
      valor_anterior: null,
      valor_nuevo: { filtros, filas },
    });
  }
}
