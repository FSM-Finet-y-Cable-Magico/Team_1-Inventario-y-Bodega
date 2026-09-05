import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenesIngresoService } from './ordenes-ingreso.service';
import { OrdenesIngresoController } from './ordenes-ingreso.controller';
import { OrdenIngreso } from './entities/orden-ingreso.entity';
import { OrdenIngresoDetalle } from './entities/orden-ingreso-detalle.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrdenIngreso,
      OrdenIngresoDetalle,
      Proveedor,
      Bodega,
      TipoEquipo,
    ]),
    AuditoriaModule,
  ],
  controllers: [OrdenesIngresoController],
  providers: [OrdenesIngresoService],
  exports: [OrdenesIngresoService],
})
export class OrdenesIngresoModule {}
