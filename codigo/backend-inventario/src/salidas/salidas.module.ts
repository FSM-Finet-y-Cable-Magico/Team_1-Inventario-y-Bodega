import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalidasController, TecnicosController } from './salidas.controller';
import { SalidasService } from './salidas.service';
import { InventarioPersonalService } from './inventario-personal.service';
import { SalidaBodega } from './entities/salida-bodega.entity';
import { SalidaDetalle } from './entities/salida-detalle.entity';
import { InventarioPersonal } from './entities/inventario-personal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalidaBodega, SalidaDetalle, InventarioPersonal]),
  ],
  controllers: [SalidasController, TecnicosController],
  providers: [SalidasService, InventarioPersonalService],
  exports: [InventarioPersonalService],
})
export class SalidasModule {}
