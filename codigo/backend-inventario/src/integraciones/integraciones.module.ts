import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegracionesController } from './integraciones.controller';
import { IntegracionesService } from './integraciones.service';
import { IntegracionCierre } from './entities/cierre-integracion.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IntegracionCierre, UnidadEquipo])],
  controllers: [IntegracionesController],
  providers: [IntegracionesService],
})
export class IntegracionesModule {}
