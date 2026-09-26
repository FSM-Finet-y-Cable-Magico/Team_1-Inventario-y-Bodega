import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegracionesController } from './integraciones.controller';
import { IntegracionesService } from './integraciones.service';
import { IntegracionCierre } from './entities/cierre-integracion.entity';
import { IntegracionActivacion } from './entities/integracion-activacion.entity';
import { AsignacionEquipoServicio } from './entities/asignacion-equipo-servicio.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { InventarioModule } from '../inventario/inventario.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntegracionCierre,
      IntegracionActivacion,
      AsignacionEquipoServicio,
      UnidadEquipo,
    ]),
    // sc-158: el catálogo S2S de G8 reutiliza CatalogService (no se duplica lógica).
    InventarioModule,
  ],
  controllers: [IntegracionesController],
  providers: [IntegracionesService],
})
export class IntegracionesModule {}
