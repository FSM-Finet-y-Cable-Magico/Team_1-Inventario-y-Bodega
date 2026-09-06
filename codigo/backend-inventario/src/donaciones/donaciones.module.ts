import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DonacionesService } from './donaciones.service';
import { DonacionesController } from './donaciones.controller';
import { Donacion } from './entities/donacion.entity';
import { DonacionDetalle } from './entities/donacion-detalle.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Donacion,
      DonacionDetalle,
      UnidadEquipo,
      Usuario,
    ]),
    AuditoriaModule,
  ],
  controllers: [DonacionesController],
  providers: [DonacionesService],
})
export class DonacionesModule {}
