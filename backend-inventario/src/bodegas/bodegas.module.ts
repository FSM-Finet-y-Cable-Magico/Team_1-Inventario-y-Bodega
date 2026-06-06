import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BodegasService } from './bodegas.service';
import { BodegasController } from './bodegas.controller';
import { Bodega } from './entities/bodega.entity';
import { StockConsumible } from './entities/stock-consumible.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { UnidadEquipo } from '../equipos/entities/unidad-equipo.entity';
import { TipoEquipo } from '../equipos/entities/tipo-equipo.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Bodega,
      StockConsumible,
      Usuario,
      UnidadEquipo,
      TipoEquipo,
    ]),
    AuditoriaModule,
  ],
  controllers: [BodegasController],
  providers: [BodegasService],
  exports: [BodegasService],
})
export class BodegasModule {}
