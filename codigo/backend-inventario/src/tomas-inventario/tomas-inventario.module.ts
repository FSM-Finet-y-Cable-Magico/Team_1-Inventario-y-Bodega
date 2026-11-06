import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TomaInventario } from './entities/toma-inventario.entity';
import { TomaInventarioDetalle } from './entities/toma-inventario-detalle.entity';
import { TomasInventarioController } from './tomas-inventario.controller';
import { TomasInventarioService } from './tomas-inventario.service';

// CU-97: toma de inventario físico y ajuste de diferencias
@Module({
  imports: [TypeOrmModule.forFeature([TomaInventario, TomaInventarioDetalle])],
  controllers: [TomasInventarioController],
  providers: [TomasInventarioService],
})
export class TomasInventarioModule {}
