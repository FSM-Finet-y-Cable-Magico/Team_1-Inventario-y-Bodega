import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { Notificacion } from './entities/notificacion.entity';
import { CompaniesModule } from '../companies/companies.module';
import { PrestamosModule } from '../prestamos/prestamos.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

// CU-96: persiste notificaciones (préstamo vencido + stock bajo umbral),
// reutilizando la detección de CU-46/CU-94 vía CompaniesModule/PrestamosModule.
@Module({
  imports: [
    TypeOrmModule.forFeature([Notificacion]),
    CompaniesModule,
    PrestamosModule,
    AuditoriaModule,
  ],
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
})
export class NotificacionesModule {}
