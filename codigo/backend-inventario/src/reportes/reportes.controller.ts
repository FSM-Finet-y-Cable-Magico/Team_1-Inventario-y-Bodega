import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReportesService } from './reportes.service';

interface AuthenticatedUser {
  id_usuario?: number;
  sub?: number;
  id_empresa?: number;
  roles?: string[];
}

@Controller('reportes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('stock')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  generarReporteStock(
    @Query('id_empresa') idEmpresa: string,
    @Query('id_bodega') idBodega: string,
    @Query('id_tipo_equipo') idTipoEquipo: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const isSuperuser = actor.roles?.includes('SUPERUSUARIO') === true;
    const parseOptionalId = (value: string | undefined): number | undefined => {
      if (!value) return undefined;
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
    };

    return this.reportesService.generarReporteStock(
      {
        id_empresa: isSuperuser ? parseOptionalId(idEmpresa) : actor.id_empresa,
        id_bodega: parseOptionalId(idBodega),
        id_tipo_equipo: parseOptionalId(idTipoEquipo),
      },
      actor.id_usuario ?? actor.sub ?? 0,
    );
  }
}
