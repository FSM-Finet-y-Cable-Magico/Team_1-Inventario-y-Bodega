import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenesIngresoService } from './ordenes-ingreso.service';
import { OrdenesIngresoController } from './ordenes-ingreso.controller';
import { OrdenIngreso } from './entities/orden-ingreso.entity';
import { OrdenIngresoDetalle } from './entities/orden-ingreso-detalle.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { InventarioModule } from '../inventario/inventario.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrdenIngreso,
      OrdenIngresoDetalle,
      Proveedor,
      Bodega,
      TipoEquipo,
      // CU-55: se crean unidades al recibir equipos individualizables
      UnidadEquipo,
    ]),
    AuditoriaModule,
    // CU-55: aporta CatalogService (validarFormatoSerialNumber de CU-28)
    InventarioModule,
  ],
  controllers: [OrdenesIngresoController],
  providers: [OrdenesIngresoService],
  exports: [OrdenesIngresoService],
})
export class OrdenesIngresoModule {}
