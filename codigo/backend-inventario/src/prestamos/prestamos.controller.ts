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

// ======================================================================
// Préstamos externos · PrestamosController (controlador)
// CU-81 · Registrando préstamo externo de equipos
// CU-82 · Registrando retorno de préstamo externo
// CU-83 · Consultando tabla de préstamos externos activos
// CU-84 · Validando trazabilidad de devolución de préstamo externo
// ======================================================================
@Controller('prestamos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PrestamosController {
  constructor(private readonly prestamosService: PrestamosService) {}

  // CU-81 · Registrando préstamo externo de equipos
  @Post()
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  registrar(@Body() dto: CreatePrestamoDto, @CurrentUser() actor: ActorJwt) {
    return this.prestamosService.registrar(dto, actor);
  }

  // CU-83 · Consultando tabla de préstamos externos activos
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

  // CU-83 · Consultando tabla de préstamos externos activos
  @Get(':id')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  detalle(@Param('id') id: string, @CurrentUser() actor: ActorJwt) {
    return this.prestamosService.obtenerDetalle(+id, actor);
  }

  // CU-82 · Registrando retorno de préstamo externo
  // CU-84 · Validando trazabilidad de devolución de préstamo externo
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
