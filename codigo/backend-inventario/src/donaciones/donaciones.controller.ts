import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { DonacionesService } from './donaciones.service';
import type { ActorJwt } from './donaciones.service';
import { CreateDonacionDto } from './dto/create-donacion.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Donaciones · DonacionesController (controlador)
// CU-80 · Registrando donación de equipos dados de baja
@Controller('donaciones')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPERUSUARIO')
export class DonacionesController {
  constructor(private readonly donacionesService: DonacionesService) {}

  // CU-80 · Registrando donación de equipos dados de baja
  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO')
  registrar(@Body() dto: CreateDonacionDto, @CurrentUser() actor: ActorJwt) {
    return this.donacionesService.registrar(dto, actor);
  }

  // CU-80 · Registrando donación de equipos dados de baja
  @Post('validar')
  @Roles('ADMIN', 'SUPERUSUARIO')
  validar(@Body() dto: CreateDonacionDto) {
    return this.donacionesService.validarDatos(dto);
  }

  // CU-80 · Registrando donación de equipos dados de baja
  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO')
  listar(@CurrentUser() actor: ActorJwt) {
    return this.donacionesService.listar(actor);
  }

  // CU-80 · Registrando donación de equipos dados de baja
  @Get('candidatas')
  @Roles('ADMIN', 'SUPERUSUARIO')
  listarCandidatas(@CurrentUser() actor: ActorJwt) {
    return this.donacionesService.listarCandidatas(actor);
  }

  // CU-80 · Registrando donación de equipos dados de baja
  @Get(':id/pdf')
  @Roles('ADMIN', 'SUPERUSUARIO')
  async descargarPdf(
    @Param('id') id: string,
    @CurrentUser() actor: ActorJwt,
    @Res() res: Response,
  ) {
    const { nombreArchivo, contenido } =
      await this.donacionesService.generarPdf(+id, actor);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      'Content-Length': contenido.length.toString(),
    });
    res.end(contenido);
  }
}
