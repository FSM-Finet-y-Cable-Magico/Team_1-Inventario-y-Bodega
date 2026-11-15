import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransferenciasService } from './transferencias.service';
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// ======================================================================
// Transferencias · TransferenciasController (controlador)
// CU-20 · Registrando solicitud de transferencia inter-empresa
// CU-21 · Aprobando transferencia inter-empresa
// CU-22 · Rechazando transferencia inter-empresa
// CU-23 · Consultando transferencias inter-empresa
// ======================================================================
@Controller('transferencias')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TransferenciasController {
  constructor(private readonly transferenciasService: TransferenciasService) {}

  // CU-20 · Registrando solicitud de transferencia inter-empresa
  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO')
  registrar(@Body() dto: CreateTransferenciaDto, @Req() req) {
    return this.transferenciasService.registrarTransferencia(dto, req.user);
  }

  // CU-21 · Aprobando transferencia inter-empresa
  @Patch(':id/aprobar')
  @Roles('SUPERUSUARIO')
  aprobar(@Param('id') id: string, @Req() req) {
    return this.transferenciasService.aprobarTransferencia(+id, req.user);
  }

  // CU-22 · Rechazando transferencia inter-empresa
  @Patch(':id/rechazar')
  @Roles('SUPERUSUARIO')
  rechazar(
    @Param('id') id: string,
    @Body('observaciones') observaciones: string,
    @Req() req,
  ) {
    return this.transferenciasService.rechazarTransferencia(
      +id,
      observaciones,
      req.user,
    );
  }

  // CU-21 · Aprobando transferencia inter-empresa
  @Get(':id')
  @Roles('ADMIN', 'SUPERUSUARIO')
  consultarDetalle(@Param('id') id: string, @Req() req) {
    return this.transferenciasService.consultarDetalle(+id, req.user);
  }

  // CU-23 · Consultando transferencias inter-empresa
  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO')
  consultar(
    @Query('estado') estado: string,
    @Query('id_empresa') id_empresa: string,
    @Query('fecha_inicio') fecha_inicio: string,
    @Query('fecha_fin') fecha_fin: string,
    @Req() req,
  ) {
    return this.transferenciasService.consultarTransferencias(
      {
        estado,
        id_empresa: id_empresa ? +id_empresa : undefined,
        fecha_inicio,
        fecha_fin,
      },
      req.user,
    );
  }
}
