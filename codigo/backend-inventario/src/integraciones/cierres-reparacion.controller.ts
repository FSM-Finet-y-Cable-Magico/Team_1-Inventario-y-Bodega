import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IntegracionesService } from './integraciones.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Integraciones con G3 y G8 · CierresReparacionController (controlador)
// CU-69 · Registrando cierre de trabajo de reparación
@Controller('cierres-reparacion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CierresReparacionController {
  constructor(private readonly integracionesService: IntegracionesService) {}

  // CU-69 · Registrando cierre de trabajo de reparación
  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  listar(
    @Query('numero_serie') numeroSerie: string,
    @Query('id_ot') idOt: string,
    @CurrentUser() actor: any,
  ) {
    const ot = parseInt(idOt, 10);
    return this.integracionesService.listarCierresReparacion(
      {
        numero_serie: numeroSerie,
        id_ot: Number.isInteger(ot) ? ot : undefined,
      },
      actor,
    );
  }
}
