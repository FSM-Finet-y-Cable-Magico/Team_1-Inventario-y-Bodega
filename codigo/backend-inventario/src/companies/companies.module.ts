import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { Transferencia } from '../transferencias/entities/transferencia.entity';
import { MovimientoInventario } from '../transferencias/entities/movimiento-inventario.entity';
import { SolicitudBaja } from '../bajas/entities/solicitud-baja.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UnidadEquipo,
      Bodega,
      StockConsumible,
      Transferencia,
      MovimientoInventario,
      SolicitudBaja,
    ]),
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  // CU-94: el módulo de alertas reutiliza la regla de stock mínimo (CU-46)
  exports: [CompaniesService],
})
export class CompaniesModule {}
