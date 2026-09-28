import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AlertasService } from './alertas.service';
import type { ActorJwt } from '../prestamos/prestamos.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// CU-94: alertas activas del dashboard (stock bajo umbral, garantía con
// defecto, préstamo vencido y revisión prolongada)
@Controller('alertas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  // Es una consulta: no audita (mismo criterio que CU-77/CU-83)
  @Get()
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  listarAlertasActivas(@CurrentUser() actor: ActorJwt) {
    return this.alertasService.listarAlertasActivas(actor);
  }
}
