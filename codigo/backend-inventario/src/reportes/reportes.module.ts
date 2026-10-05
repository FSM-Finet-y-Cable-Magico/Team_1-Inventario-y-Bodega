import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { MovimientoInventario } from '../transferencias/entities/movimiento-inventario.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { G3ClientModule } from '../integraciones/g3/g3-client.module';
import { ExcelExportService } from './excel-export.service';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { ExportacionService } from './exportacion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Bodega,
      StockConsumible,
      TipoEquipo,
      UnidadEquipo,
      MovimientoInventario,
      // CU-93: nombre completo de quien exporta, para el encabezado del PDF.
      Usuario,
    ]),
    AuditoriaModule,
    G3ClientModule,
  ],
  controllers: [ReportesController],
  providers: [ReportesService, ExcelExportService, ExportacionService],
})
export class ReportesModule {}
