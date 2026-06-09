import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';

const EMPRESAS = [
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

    async getDashboard(): Promise<any> {
        const resultado: any[] = [];

        for (const empresa of EMPRESAS) {
            const unidades = await this.unidadRepository.find({ where: { id_empresa: empresa.id } });

            const estadisticasEstado: Record<string, number> = {};
            for (const u of unidades) {
                estadisticasEstado[u.estado] = (estadisticasEstado[u.estado] ?? 0) + 1;
            }

            const bodegasActivas = await this.bodegaRepository.count({
                where: { id_empresa: empresa.id, activa: true },
            });

            const stockConsumible = await this.stockRepository
                .createQueryBuilder('s')
                .innerJoin('s.bodega', 'b', 'b.id_empresa = :empresa', { empresa: empresa.id })
                .select('SUM(s.cantidad_disponible)', 'total')
                .getRawOne();

            resultado.push({
                empresa: empresa.nombre,
                id_empresa: empresa.id,
                total_unidades: unidades.length,
                unidades_por_estado: estadisticasEstado,
                bodegas_activas: bodegasActivas,
                stock_consumible_total: Number(stockConsumible?.total ?? 0),
            });
        }

        return { dashboard_consolidado: resultado };
    }
}
