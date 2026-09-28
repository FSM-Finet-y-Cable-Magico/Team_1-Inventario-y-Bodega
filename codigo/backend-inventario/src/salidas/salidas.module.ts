import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalidasController, TecnicosController } from './salidas.controller';
import { SalidasService } from './salidas.service';
import { InventarioPersonalService } from './inventario-personal.service';
import { JornadaService } from './jornada.service';
import { SalidaBodega } from './entities/salida-bodega.entity';
import { SalidaDetalle } from './entities/salida-detalle.entity';
import { InventarioPersonal } from './entities/inventario-personal.entity';
import { G3ClientModule } from '../integraciones/g3/g3-client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalidaBodega, SalidaDetalle, InventarioPersonal]),
    // CU-61: los trabajos del día vienen de G3 (GET /ordenes, X-API-KEY).
    G3ClientModule,
  ],
  controllers: [SalidasController, TecnicosController],
  providers: [SalidasService, InventarioPersonalService, JornadaService],
  exports: [InventarioPersonalService],
})
export class SalidasModule {}
