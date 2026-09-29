import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegracionesController } from './integraciones.controller';
import { CierresReparacionController } from './cierres-reparacion.controller';
import { CierresTrabajoController } from './cierres-trabajo.controller';
import { IntegracionesService } from './integraciones.service';
import { CierresTrabajoService } from './cierres-trabajo.service';
import { IntegracionCierre } from './entities/cierre-integracion.entity';
import { IntegracionActivacion } from './entities/integracion-activacion.entity';
import { AsignacionEquipoServicio } from './entities/asignacion-equipo-servicio.entity';
import { CierreReparacion } from './entities/cierre-reparacion.entity';
import { BorradorCierre } from './entities/borrador-cierre.entity';
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
      // CU-69: cierre de trabajo de reparación registrado desde el webhook de G3.
      CierreReparacion,
      // CU-70: borrador del cierre preparado por el técnico.
      BorradorCierre,
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
  controllers: [
    IntegracionesController,
    CierresReparacionController,
    CierresTrabajoController,
  ],
  providers: [IntegracionesService, CierresTrabajoService],
})
export class IntegracionesModule {}
