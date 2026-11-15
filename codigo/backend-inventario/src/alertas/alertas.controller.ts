import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AlertasService } from './alertas.service';
import type { ActorJwt } from '../prestamos/prestamos.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// ======================================================================
// Alertas · AlertasController (controlador)
// CU-94 · Consultando alertas activas en el dashboard
// ======================================================================
@Controller('alertas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  // CU-94 · Consultando alertas activas en el dashboard
  @Get()
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  listarAlertasActivas(@CurrentUser() actor: ActorJwt) {
    return this.alertasService.listarAlertasActivas(actor);
  }
}
