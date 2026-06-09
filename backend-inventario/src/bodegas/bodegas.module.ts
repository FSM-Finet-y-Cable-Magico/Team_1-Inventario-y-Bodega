import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BodegasService } from './bodegas.service';
import { BodegasController } from './bodegas.controller';
import { Bodega } from './entities/bodega.entity';
import { StockConsumible } from './entities/stock-consumible.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { Auditoria } from '../auditoria/entities/auditoria.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bodega, StockConsumible, UnidadEquipo, TipoEquipo, Auditoria, Usuario]),
    AuditoriaModule,
  ],
  controllers: [BodegasController],
  providers: [BodegasService],
  exports: [BodegasService],
})
export class BodegasModule {}
