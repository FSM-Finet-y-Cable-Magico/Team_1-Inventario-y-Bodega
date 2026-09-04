import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferenciasService } from './transferencias.service';
import { TransferenciasController } from './transferencias.controller';
import { Transferencia } from './entities/transferencia.entity';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transferencia,
      MovimientoInventario,
      UnidadEquipo,
    ]),
    AuditoriaModule,
  ],
  controllers: [TransferenciasController],
  providers: [TransferenciasService],
})
export class TransferenciasModule {}
