import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';
import { TipoEquipo } from './entities/tipo-equipo.entity';
import { UnidadEquipo } from './entities/unidad-equipo.entity';
import { HistorialEstado } from './entities/historial-estado.entity';
import { PrestamoExterno } from './entities/prestamo-externo.entity';
import { AuditoriaModule } from 'src/auditoria/auditoria.module';
import { ProveedoresModule } from 'src/proveedores/proveedores.module';
import { G3ClientModule } from '../integraciones/g3/g3-client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipoEquipo,
      UnidadEquipo,
      HistorialEstado,
      PrestamoExterno,
    ]),
    AuditoriaModule,
    ProveedoresModule,
    // CU-48: enriquecimiento opcional del cliente por RUT contra G3.
    G3ClientModule,
  ],
  controllers: [CatalogController, UnitsController],
  providers: [CatalogService, UnitsService],
  exports: [CatalogService, UnitsService, TypeOrmModule],
})
export class InventarioModule {}
