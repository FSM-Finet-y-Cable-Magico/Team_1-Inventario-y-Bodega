import { Module } from '@nestjs/common';
import { AlertasController } from './alertas.controller';
import { AlertasService } from './alertas.service';
import { CompaniesModule } from '../companies/companies.module';
import { PrestamosModule } from '../prestamos/prestamos.module';
import { InventarioModule } from '../inventario/inventario.module';

// CU-94: sin entidades propias; las alertas se calculan al vuelo con los
// servicios de sus CU de origen (CU-46, CU-77 y CU-83)
@Module({
  imports: [CompaniesModule, PrestamosModule, InventarioModule],
  controllers: [AlertasController],
  providers: [AlertasService],
})
export class AlertasModule {}
