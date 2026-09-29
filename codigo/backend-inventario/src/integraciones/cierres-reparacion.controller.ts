import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IntegracionesService } from './integraciones.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// CU-69: consulta de los cierres de reparación registrados desde el cierre de OT de G3.
// A diferencia del webhook (X-API-KEY), esta ruta es para la UI: JWT + roles, y el
// aislamiento por empresa lo aplica el service salvo para el Superusuario.
@Controller('cierres-reparacion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CierresReparacionController {
  constructor(private readonly integracionesService: IntegracionesService) {}

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
