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

@Controller('donaciones')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPERUSUARIO')
export class DonacionesController {
  constructor(private readonly donacionesService: DonacionesService) {}

  // CU-80: registrar la donación de equipos dados de baja
  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO')
  registrar(@Body() dto: CreateDonacionDto, @CurrentUser() actor: ActorJwt) {
    return this.donacionesService.registrar(dto, actor);
  }

  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO')
  listar(@CurrentUser() actor: ActorJwt) {
    return this.donacionesService.listar(actor);
  }

  // CU-80: unidades elegibles (dadas de baja con motivo 'Donación a institución')
  @Get('candidatas')
  @Roles('ADMIN', 'SUPERUSUARIO')
  listarCandidatas(@CurrentUser() actor: ActorJwt) {
    return this.donacionesService.listarCandidatas(actor);
  }

  // CU-80: resumen descargable de la donación
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
