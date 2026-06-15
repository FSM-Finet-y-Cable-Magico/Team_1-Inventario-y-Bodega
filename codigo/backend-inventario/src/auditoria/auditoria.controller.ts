import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { FiltrarAuditoriaDto } from './dto/filtrar-auditoria.dto';

@Controller('auditoria')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Post()
  @Roles('ADMIN') // ACLARACION = este guard esta solo para uso manual de la peticion, el create se usa desde otros servicios automaticamente
  create(@Body() createAuditoriaDto: CreateAuditoriaDto) {
    return this.auditoriaService.create(createAuditoriaDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO')
  findAll(@Query() filtros: FiltrarAuditoriaDto) {
    return this.auditoriaService.findAll(filtros);
  }
}
