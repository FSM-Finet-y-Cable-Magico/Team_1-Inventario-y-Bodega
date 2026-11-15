import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { FiltrarAuditoriaDto } from './dto/filtrar-auditoria.dto';

// Auditoría · AuditoriaController (controlador)
// CU-08 · Registrando eventos en el log de auditoría
// CU-09 · Consultando el log de auditoría
@Controller('auditoria')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  // CU-08 · Registrando eventos en el log de auditoría
  @Post()
  @Roles('ADMIN') // ACLARACION = este guard esta solo para uso manual de la peticion, el create se usa desde otros servicios automaticamente
  create(@Body() createAuditoriaDto: CreateAuditoriaDto) {
    return this.auditoriaService.create(createAuditoriaDto);
  }

  // CU-09 · Consultando el log de auditoría
  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO')
  findAll(@Query() filtros: FiltrarAuditoriaDto) {
    return this.auditoriaService.findAll(filtros);
  }
}
