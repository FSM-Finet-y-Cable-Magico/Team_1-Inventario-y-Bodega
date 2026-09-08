import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BajasService } from './bajas.service';
import type { ActorJwt } from './bajas.service';
import { CreateBajaDto } from './dto/create-baja.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('bajas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BajasController {
  constructor(private readonly bajasService: BajasService) {}

  // CU-78: el Técnico de terreno genera una solicitud; ADMIN/SUPERUSUARIO/ADMIN_BODEGA
  // aplican la baja definitiva directamente
  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  registrar(@Body() dto: CreateBajaDto, @CurrentUser() actor: ActorJwt) {
    return this.bajasService.registrar(dto, actor);
  }

  // CU-78: bandeja de solicitudes de baja
  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  listar(@Query('estado') estado: string, @CurrentUser() actor: ActorJwt) {
    return this.bajasService.listar({ estado }, actor);
  }

  @Post(':id/aprobar')
  @Roles('ADMIN', 'SUPERUSUARIO')
  aprobar(@Param('id') id: string, @CurrentUser() actor: ActorJwt) {
    return this.bajasService.aprobar(+id, actor);
  }

  @Post(':id/rechazar')
  @Roles('ADMIN', 'SUPERUSUARIO')
  rechazar(
    @Param('id') id: string,
    @Body('motivo_rechazo') motivoRechazo: string,
    @CurrentUser() actor: ActorJwt,
  ) {
    return this.bajasService.rechazar(+id, motivoRechazo, actor);
  }
}
