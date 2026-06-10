import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('usuario')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO')
  create(@Body() createUsuarioDto: CreateUsuarioDto, @Req() req) {
    return this.usuariosService.create(createUsuarioDto, req.user);
  }

  // CU-05: filtros por activo y buscar (nombre)
  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO')
  findAll(
    @Query('activo') activo: string,
    @Query('buscar') buscar: string,
    @Req() req,
  ) {
    const filtros: { activo?: boolean; buscar?: string } = {};
    if (activo !== undefined) filtros.activo = activo === 'true';
    if (buscar) filtros.buscar = buscar;
    return this.usuariosService.findAll(filtros, req.user.id_empresa);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERUSUARIO')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERUSUARIO')
  update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @Req() req,
  ) {
    return this.usuariosService.update(+id, updateUsuarioDto, req.user.sub, req.user.roles ?? []);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERUSUARIO')
  remove(@Param('id') id: string, @Req() req) {
    return this.usuariosService.remove(+id, req.user.sub);
  }
}
