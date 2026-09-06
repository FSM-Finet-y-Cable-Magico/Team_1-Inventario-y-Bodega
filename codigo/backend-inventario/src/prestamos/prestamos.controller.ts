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
import { PrestamosService } from './prestamos.service';
import type { ActorJwt } from './prestamos.service';
import { CreatePrestamoDto } from './dto/create-prestamo.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('prestamos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PrestamosController {
  constructor(private readonly prestamosService: PrestamosService) {}

  // CU-81: registrar la salida temporal de equipos a un externo
  @Post()
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  registrar(@Body() dto: CreatePrestamoDto, @CurrentUser() actor: ActorJwt) {
    return this.prestamosService.registrar(dto, actor);
  }

  @Get()
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  listar(@Query('estado') estado: string, @CurrentUser() actor: ActorJwt) {
    return this.prestamosService.listar({ estado }, actor);
  }

  @Get(':id')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  detalle(@Param('id') id: string, @CurrentUser() actor: ActorJwt) {
    return this.prestamosService.obtenerDetalle(+id, actor);
  }
}
