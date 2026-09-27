import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegracionesController } from './integraciones.controller';
import { IntegracionesService } from './integraciones.service';
import { IntegracionCierre } from './entities/cierre-integracion.entity';
import { IntegracionActivacion } from './entities/integracion-activacion.entity';
import { AsignacionEquipoServicio } from './entities/asignacion-equipo-servicio.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { InventarioModule } from '../inventario/inventario.module';
import { SalidasModule } from '../salidas/salidas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntegracionCierre,
      IntegracionActivacion,
      AsignacionEquipoServicio,
      UnidadEquipo,
      // sc-159 (G8 P1): stock informativo y equipos por servicio.
      TipoEquipo,
      StockConsumible,
    ]),
    // sc-158: el catálogo S2S de G8 reutiliza CatalogService (no se duplica lógica).
    InventarioModule,
    // CU-64/CU-68: el descuento de materiales reutiliza el inventario personal (CU-58).
    SalidasModule,
  ],
  controllers: [IntegracionesController],
  providers: [IntegracionesService],
})
export class IntegracionesModule {}
