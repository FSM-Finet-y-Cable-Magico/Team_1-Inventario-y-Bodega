import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificacionesService } from './notificaciones.service';
import type { ActorJwt } from '../prestamos/prestamos.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// ======================================================================
// Notificaciones · NotificacionesController (controlador)
// CU-96 · Recibiendo notificaciones visuales en la campana del sistema
// ======================================================================
@Controller('notificaciones')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  // CU-96 · Recibiendo notificaciones visuales en la campana del sistema
  @Get()
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  listarNoLeidas(@CurrentUser() actor: ActorJwt) {
    return this.notificacionesService.listarNoLeidas(actor);
  }

  // CU-96 · Recibiendo notificaciones visuales en la campana del sistema
  @Patch(':id/leer')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  marcarLeida(@Param('id') id: string, @CurrentUser() actor: ActorJwt) {
    return this.notificacionesService.marcarLeida(Number(id), actor);
  }

  // CU-96 · Recibiendo notificaciones visuales en la campana del sistema
  @Patch('leer-todas')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  marcarTodasLeidas(@CurrentUser() actor: ActorJwt) {
    return this.notificacionesService.marcarTodasLeidas(actor);
  }
}
