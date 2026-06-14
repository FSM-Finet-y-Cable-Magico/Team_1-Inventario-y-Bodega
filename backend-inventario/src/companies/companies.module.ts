import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { Transferencia } from '../transferencias/entities/transferencia.entity';
import { MovimientoInventario } from '../transferencias/entities/movimiento-inventario.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            UnidadEquipo,
            Bodega,
            StockConsumible,
            Transferencia,
            MovimientoInventario,
        ]),
    ],
    controllers: [CompaniesController],
    providers: [CompaniesService],
})
export class CompaniesModule {}
