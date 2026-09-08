import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { Transferencia } from '../transferencias/entities/transferencia.entity';
import { MovimientoInventario } from '../transferencias/entities/movimiento-inventario.entity';
import { SolicitudBaja } from '../bajas/entities/solicitud-baja.entity';

const ESTADO_TRANSFERENCIA_PENDIENTE = 'TRANSFERENCIA_PENDIENTE';
// CU-78: solicitudes de baja que esperan la decisión de un Administrador/Superusuario
const ESTADO_BAJA_PENDIENTE = 'Pendiente de aprobación';
// CU-79: estado terminal cuyas unidades quedan fuera del inventario activo
const ESTADO_DADO_DE_BAJA = 'Dado de baja';

export const EMPRESAS = [
  { id: 1, nombre: 'Finet' },
  { id: 2, nombre: 'Cable Mágico' },
];

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(UnidadEquipo)
    private readonly unidadRepository: Repository<UnidadEquipo>,
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
    @InjectRepository(StockConsumible)
    private readonly stockRepository: Repository<StockConsumible>,
    @InjectRepository(Transferencia)
    private readonly transferenciaRepository: Repository<Transferencia>,
    @InjectRepository(MovimientoInventario)
    private readonly movimientoRepository: Repository<MovimientoInventario>,
    @InjectRepository(SolicitudBaja)
    private readonly solicitudBajaRepository: Repository<SolicitudBaja>,
  ) {}

  // CU-06: listado de empresas para el selector de edición de usuarios
  findAll() {
    return EMPRESAS;
  }

  async getDashboard(): Promise<any> {
    const resultado: any[] = [];

    for (const empresa of EMPRESAS) {
      resultado.push(
        await this.getEstadisticasEmpresa(empresa.id, empresa.nombre),
      );
    }

    return { dashboard_consolidado: resultado };
  }

  // Dashboard de la propia empresa del actor (cualquier rol autenticado)
  async getMiDashboard(actor: {
    id_empresa: number;
    roles?: string[];
  }): Promise<any> {
    const empresa = EMPRESAS.find((e) => e.id === actor.id_empresa);
    const estadisticas = await this.getEstadisticasEmpresa(
      actor.id_empresa,
      empresa?.nombre ?? `Empresa ${actor.id_empresa}`,
    );

    return {
      ...estadisticas,
      // CU-20: notificación de transferencias pendientes de aprobación
      transferencias_pendientes: await this.getTransferenciasPendientes(actor),
      // CU-78: notificación de solicitudes de baja pendientes de aprobación
      bajas_pendientes: await this.getBajasPendientes(actor),
    };
  }

  // CU-20: transferencias que quedaron en estado pendiente al registrarse y
  // todavía esperan la decisión del Superusuario. Se exponen en la campana de
  // notificaciones igual que las alertas de stock (CU-46). Aislamiento por rol:
  // el Superusuario ve todas las pendientes (es quien aprueba/rechaza); un Admin
  // solo las de su empresa (origen o destino).
  private async getTransferenciasPendientes(actor: {
    id_empresa: number;
    roles?: string[];
  }): Promise<any[]> {
    const movimientosPendientes = await this.movimientoRepository.find({
      where: { tipo_movimiento: ESTADO_TRANSFERENCIA_PENDIENTE },
    });
    if (movimientosPendientes.length === 0) return [];

    const unidadesPorTransferencia = new Map<number, number>();
    for (const mov of movimientosPendientes) {
      if (!mov.referencia_id) continue;
      unidadesPorTransferencia.set(
        mov.referencia_id,
        (unidadesPorTransferencia.get(mov.referencia_id) ?? 0) + 1,
      );
    }

    const idsTransferencias = [...unidadesPorTransferencia.keys()];
    if (idsTransferencias.length === 0) return [];

    const transferencias = await this.transferenciaRepository.findBy({
      id_transferencia: In(idsTransferencias),
    });

    const isSuperusuario = actor.roles?.includes('SUPERUSUARIO');
    const mapaEmpresas = new Map(EMPRESAS.map((e) => [e.id, e.nombre]));

    return transferencias
      .filter(
        (t) =>
          isSuperusuario ||
          t.id_empresa_origen === actor.id_empresa ||
          t.id_empresa_destino === actor.id_empresa,
      )
      .map((t) => ({
        id_transferencia: t.id_transferencia,
        empresa_origen:
          mapaEmpresas.get(t.id_empresa_origen) ??
          `Empresa ${t.id_empresa_origen}`,
        empresa_destino:
          mapaEmpresas.get(t.id_empresa_destino) ??
          `Empresa ${t.id_empresa_destino}`,
        unidades: unidadesPorTransferencia.get(t.id_transferencia) ?? 0,
        fecha: t.fecha_transferencia,
      }))
      .sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      );
  }

  // CU-78: solicitudes de baja generadas por técnicos que esperan aprobación.
  // Solo se notifican a quienes pueden resolverlas (Administrador/Superusuario);
  // el Superusuario ve las de ambas empresas y el Administrador solo las suyas.
  private async getBajasPendientes(actor: {
    id_empresa: number;
    roles?: string[];
  }): Promise<any[]> {
    const puedeAprobar = ['ADMIN', 'SUPERUSUARIO'].some((r) =>
      actor.roles?.includes(r),
    );
    if (!puedeAprobar) return [];

    const esSuperusuario = actor.roles?.includes('SUPERUSUARIO');
    const solicitudes = await this.solicitudBajaRepository.find({
      where: esSuperusuario
        ? { estado: ESTADO_BAJA_PENDIENTE }
        : { estado: ESTADO_BAJA_PENDIENTE, id_empresa: actor.id_empresa },
      order: { fecha_solicitud: 'DESC' },
    });
    if (solicitudes.length === 0) return [];

    const unidades = await this.unidadRepository.findBy({
      id_unidad: In(solicitudes.map((s) => s.id_unidad)),
    });
    const mapaUnidades = new Map(
      unidades.map((u) => [u.id_unidad, u.serialNumber]),
    );

    return solicitudes.map((s) => ({
      id_solicitud: s.id_solicitud,
      numero_serie: mapaUnidades.get(s.id_unidad) ?? null,
      motivo: s.motivo,
      fecha: s.fecha_solicitud,
    }));
  }

  private async getEstadisticasEmpresa(
    id: number,
    nombre: string,
  ): Promise<any> {
    const unidades = await this.unidadRepository.find({
      where: { id_empresa: id },
    });

    // CU-79 (B/C): el desglose por estado conserva las unidades dadas de baja
    // (su historial sigue accesible), pero el total del inventario activo las excluye
    const estadisticasEstado: Record<string, number> = {};
    for (const u of unidades) {
      estadisticasEstado[u.estado] = (estadisticasEstado[u.estado] ?? 0) + 1;
    }
    const unidadesDadasDeBaja = estadisticasEstado[ESTADO_DADO_DE_BAJA] ?? 0;

    const bodegasActivas = await this.bodegaRepository.count({
      where: { id_empresa: id, activa: true },
    });

    const stockConsumible = await this.stockRepository
      .createQueryBuilder('s')
      .innerJoin('s.bodega', 'b', 'b.id_empresa = :empresa', { empresa: id })
      .select('SUM(s.cantidad_disponible)', 'total')
      .getRawOne();

    // CU-46: alertas de stock bajo el umbral mínimo configurado.
    // Para consumibles el stock es la cantidad disponible; para tipos
    // serializados es el conteo de unidades en estado 'En bodega'.
    const umbralesConfigurados = await this.stockRepository
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.bodega', 'b', 'b.id_empresa = :empresa', {
        empresa: id,
      })
      .innerJoinAndSelect('s.tipoEquipo', 't')
      .where('s.umbral_minimo IS NOT NULL')
      .andWhere('s.umbral_minimo > 0')
      .getMany();

    const alertas: any[] = [];
    for (const r of umbralesConfigurados) {
      const stockActual =
        r.tipoEquipo?.requiereSerialNumber === true
          ? await this.unidadRepository.count({
              where: {
                id_bodega_actual: r.id_bodega,
                id_tipo_equipo: r.id_tipo_equipo,
                estado: 'En bodega',
              },
            })
          : Number(r.cantidad_disponible);
      if (stockActual < Number(r.umbral_minimo)) {
        alertas.push({
          bodega: r.bodega?.nombre ?? `Bodega ${r.id_bodega}`,
          tipo_equipo: r.tipoEquipo?.nombre ?? `Tipo ${r.id_tipo_equipo}`,
          cantidad_disponible: stockActual,
          umbral_minimo: Number(r.umbral_minimo),
          unidad_medida: r.tipoEquipo?.unidadMedida ?? null,
        });
      }
    }

    return {
      empresa: nombre,
      id_empresa: id,
      // CU-79 (B): inventario activo, sin las unidades dadas de baja
      total_unidades: unidades.length - unidadesDadasDeBaja,
      unidades_dadas_de_baja: unidadesDadasDeBaja,
      unidades_por_estado: estadisticasEstado,
      bodegas_activas: bodegasActivas,
      stock_consumible_total: Number(stockConsumible?.total ?? 0),
      alertas_stock_minimo: alertas,
    };
  }
}
