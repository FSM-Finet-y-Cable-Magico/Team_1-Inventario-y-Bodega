import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';

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
    ) {}

    // CU-06: listado de empresas para el selector de edición de usuarios
    findAll() {
        return EMPRESAS;
    }

    async getDashboard(): Promise<any> {
        const resultado: any[] = [];

        for (const empresa of EMPRESAS) {
            resultado.push(await this.getEstadisticasEmpresa(empresa.id, empresa.nombre));
        }

        return { dashboard_consolidado: resultado };
    }

    // Dashboard de la propia empresa del actor (cualquier rol autenticado)
    async getMiDashboard(idEmpresa: number): Promise<any> {
        const empresa = EMPRESAS.find((e) => e.id === idEmpresa);
        return this.getEstadisticasEmpresa(idEmpresa, empresa?.nombre ?? `Empresa ${idEmpresa}`);
    }

    private async getEstadisticasEmpresa(id: number, nombre: string): Promise<any> {
        const unidades = await this.unidadRepository.find({ where: { id_empresa: id } });

        const estadisticasEstado: Record<string, number> = {};
        for (const u of unidades) {
            estadisticasEstado[u.estado] = (estadisticasEstado[u.estado] ?? 0) + 1;
        }

        const bodegasActivas = await this.bodegaRepository.count({
            where: { id_empresa: id, activa: true },
        });

        const stockConsumible = await this.stockRepository
            .createQueryBuilder('s')
            .innerJoin('s.bodega', 'b', 'b.id_empresa = :empresa', { empresa: id })
            .select('SUM(s.cantidad_disponible)', 'total')
            .getRawOne();

        // CU-46: alertas de stock bajo el umbral mínimo configurado
        const bajoUmbral = await this.stockRepository
            .createQueryBuilder('s')
            .innerJoinAndSelect('s.bodega', 'b', 'b.id_empresa = :empresa', { empresa: id })
            .innerJoinAndSelect('s.tipoEquipo', 't')
            .where('s.umbral_minimo IS NOT NULL')
            .andWhere('s.umbral_minimo > 0')
            .andWhere('s.cantidad_disponible < s.umbral_minimo')
            .getMany();

        return {
            empresa: nombre,
            id_empresa: id,
            total_unidades: unidades.length,
            unidades_por_estado: estadisticasEstado,
            bodegas_activas: bodegasActivas,
            stock_consumible_total: Number(stockConsumible?.total ?? 0),
            alertas_stock_minimo: bajoUmbral.map((r: any) => ({
                bodega: r.bodega?.nombre ?? `Bodega ${r.id_bodega}`,
                tipo_equipo: r.tipoEquipo?.nombre ?? `Tipo ${r.id_tipo_equipo}`,
                cantidad_disponible: Number(r.cantidad_disponible),
                umbral_minimo: Number(r.umbral_minimo),
            })),
        };
    }
}
