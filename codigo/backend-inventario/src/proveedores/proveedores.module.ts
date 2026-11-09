import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProveedoresService } from './proveedores.service';
import { ProveedoresController } from './proveedores.controller';
import { Proveedor } from './entities/proveedor.entity';
import { ProveedorTipoEquipo } from './entities/proveedor-tipo-equipo.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { OrdenIngreso } from '../ordenes-ingreso/entities/orden-ingreso.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Proveedor,
      ProveedorTipoEquipo,
      TipoEquipo,
      OrdenIngreso,
    ]),
    AuditoriaModule,
  ],
  controllers: [ProveedoresController],
  providers: [ProveedoresService],
  exports: [ProveedoresService],
})
export class ProveedoresModule {}
