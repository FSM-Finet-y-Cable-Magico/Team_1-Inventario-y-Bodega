import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificacionesService } from './notificaciones.service';
import type { ActorJwt } from '../prestamos/prestamos.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// CU-96: campana de notificaciones (préstamo vencido + stock bajo umbral),
// persistidas con lectura/no-lectura. Reutiliza la detección de CU-94.
@Controller('notificaciones')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  // CU-96: genera las pendientes (dedupe diario) y devuelve contador + no leídas
  @Get()
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  listarNoLeidas(@CurrentUser() actor: ActorJwt) {
    return this.notificacionesService.listarNoLeidas(actor);
  }

  // CU-96: marcar una notificación como leída
  @Patch(':id/leer')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  marcarLeida(@Param('id') id: string, @CurrentUser() actor: ActorJwt) {
    return this.notificacionesService.marcarLeida(Number(id), actor);
  }

  // CU-96: marcar todas las notificaciones como leídas
  @Patch('leer-todas')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  marcarTodasLeidas(@CurrentUser() actor: ActorJwt) {
    return this.notificacionesService.marcarTodasLeidas(actor);
  }
}
