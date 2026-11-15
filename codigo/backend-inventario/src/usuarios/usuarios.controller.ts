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

// Usuarios · UsuariosController (controlador)
// CU-04 · Creando cuenta de usuario
// CU-05 · Consultando listado de usuarios
// CU-06 · Editando cuenta de usuario
// CU-07 · Desactivando cuenta de usuario
@Controller('usuario')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // CU-04 · Creando cuenta de usuario
  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO')
  create(@Body() createUsuarioDto: CreateUsuarioDto, @Req() req) {
    return this.usuariosService.create(createUsuarioDto, req.user);
  }

  // CU-05 · Consultando listado de usuarios
  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO')
  findAll(
    @Query('activo') activo: string,
    @Query('buscar') buscar: string,
    @Query('rol') rol: string,
    @Req() req,
  ) {
    const filtros: { rol?: string; activo?: boolean; buscar?: string } = {};
    if (activo !== undefined) filtros.activo = activo === 'true';
    if (buscar) filtros.buscar = buscar;
    if (rol) filtros.rol = rol;
    return this.usuariosService.findAll(
      filtros,
      req.user.id_empresa,
      req.user.roles ?? [],
    );
  }

  // CU-06 · Editando cuenta de usuario
  @Get(':id')
  @Roles('ADMIN', 'SUPERUSUARIO')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(+id);
  }

  // CU-06 · Editando cuenta de usuario
  @Patch(':id')
  @Roles('ADMIN', 'SUPERUSUARIO')
  update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @Req() req,
  ) {
    // JwtStrategy expone id_usuario (no sub); con sub el actor llegaba undefined
    return this.usuariosService.update(
      +id,
      updateUsuarioDto,
      req.user.id_usuario,
      req.user.roles ?? [],
    );
  }

  // CU-07 · Desactivando cuenta de usuario
  @Delete(':id')
  @Roles('ADMIN', 'SUPERUSUARIO')
  remove(@Param('id') id: string, @Req() req) {
    return this.usuariosService.remove(
      +id,
      req.user.id_usuario,
      req.user.roles ?? [],
    );
  }
}
