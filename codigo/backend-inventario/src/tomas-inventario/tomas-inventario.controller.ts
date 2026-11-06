import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AbrirTomaDto } from './dto/abrir-toma.dto';
import { ConfirmarTomaDto } from './dto/confirmar-toma.dto';
import { RegistrarConteoDto } from './dto/registrar-conteo.dto';
import type { ActorToma } from './tomas-inventario.service';
import { TomasInventarioService } from './tomas-inventario.service';

// CU-97: toma de inventario físico. El aislamiento por empresa está en el service.
@Controller('tomas-inventario')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TomasInventarioController {
  constructor(private readonly service: TomasInventarioService) {}

  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  abrir(@Body() dto: AbrirTomaDto, @CurrentUser() actor: ActorToma) {
    return this.service.abrir(dto.id_bodega, actor);
  }

  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  listar(
    @CurrentUser() actor: ActorToma,
    @Query('id_bodega') idBodega?: string,
  ) {
    return this.service.listar(actor, idBodega ? Number(idBodega) : undefined);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: ActorToma,
  ) {
    return this.service.obtener(id, actor);
  }

  @Patch(':id/conteo')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  registrarConteo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarConteoDto,
    @CurrentUser() actor: ActorToma,
  ) {
    return this.service.registrarConteo(id, dto, actor);
  }

  @Post(':id/confirmar')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  confirmar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmarTomaDto,
    @CurrentUser() actor: ActorToma,
  ) {
    return this.service.confirmar(id, dto.forzar_movimientos === true, actor);
  }

  @Post(':id/cancelar')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: ActorToma,
  ) {
    return this.service.cancelar(id, actor);
  }
}
