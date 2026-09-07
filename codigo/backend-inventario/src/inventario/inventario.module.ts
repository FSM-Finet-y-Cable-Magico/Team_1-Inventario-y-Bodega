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
  ],
  controllers: [CatalogController, UnitsController],
  providers: [CatalogService, UnitsService],
  exports: [CatalogService, UnitsService, TypeOrmModule],
})
export class InventarioModule {}
