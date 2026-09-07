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

@Controller('transferencias')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TransferenciasController {
  constructor(private readonly transferenciasService: TransferenciasService) {}

  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO')
  registrar(@Body() dto: CreateTransferenciaDto, @Req() req) {
    return this.transferenciasService.registrarTransferencia(dto, req.user);
  }

  @Patch(':id/aprobar')
  @Roles('SUPERUSUARIO')
  aprobar(@Param('id') id: string, @Req() req) {
    return this.transferenciasService.aprobarTransferencia(+id, req.user);
  }

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

  // CU-21: detalle completo de una transferencia (empresas, bodegas,
  // unidades con número de serie y tipo, fecha, motivo y solicitante)
  @Get(':id')
  @Roles('ADMIN', 'SUPERUSUARIO')
  consultarDetalle(@Param('id') id: string, @Req() req) {
    return this.transferenciasService.consultarDetalle(+id, req.user);
  }

  // CU-23: filtros por estado, rango de fechas o empresa
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
