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
import { RegistrarRetornoDto } from './dto/registrar-retorno.dto';
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

  // CU-83: tabla de préstamos, filtrable por estado y (solo superusuario) empresa
  @Get()
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  listar(
    @Query('estado') estado: string,
    @Query('id_empresa') idEmpresa: string,
    @CurrentUser() actor: ActorJwt,
  ) {
    return this.prestamosService.listar(
      { estado, id_empresa: idEmpresa ? +idEmpresa : undefined },
      actor,
    );
  }

  @Get(':id')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  detalle(@Param('id') id: string, @CurrentUser() actor: ActorJwt) {
    return this.prestamosService.obtenerDetalle(+id, actor);
  }

  // CU-82: retorno total o parcial del préstamo
  @Post(':id/retorno')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  registrarRetorno(
    @Param('id') id: string,
    @Body() dto: RegistrarRetornoDto,
    @CurrentUser() actor: ActorJwt,
  ) {
    return this.prestamosService.registrarRetorno(+id, dto, actor);
  }
}
