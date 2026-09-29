import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CierresTrabajoService } from './cierres-trabajo.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface Actor {
  id_usuario: number;
  id_empresa: number;
  roles?: string[];
}

// CU-70: catálogo codificado de tipos de trabajo y borrador de cierre del técnico.
// Rutas de la UI (JWT + roles), a diferencia del webhook de G3 (X-API-KEY).
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CierresTrabajoController {
  constructor(private readonly cierresTrabajoService: CierresTrabajoService) {}

  @Get('tipos-trabajo')
  @Roles('TECNICO_TERRENO', 'ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  listarTiposTrabajo(@Query('tipo_ot') tipoOt: string) {
    return this.cierresTrabajoService.listarTiposTrabajo(tipoOt);
  }

  @Get('cierres-trabajo/borradores/:idOt')
  @Roles('TECNICO_TERRENO', 'ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  obtenerBorrador(@Param('idOt') idOt: string, @CurrentUser() actor: Actor) {
    return this.cierresTrabajoService.obtenerBorrador(
      parseInt(idOt, 10),
      actor,
    );
  }

  @Patch('cierres-trabajo/borradores/:idOt')
  @Roles('TECNICO_TERRENO', 'ADMIN', 'SUPERUSUARIO')
  guardarBorrador(
    @Param('idOt') idOt: string,
    @Body() datos: Record<string, unknown>,
    @CurrentUser() actor: Actor,
  ) {
    return this.cierresTrabajoService.guardarBorrador(
      parseInt(idOt, 10),
      datos,
      actor,
    );
  }
}
