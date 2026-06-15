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
import { BodegasService } from './bodegas.service';
import { CreateBodegaDto } from './dto/create-bodega.dto';
import { UpdateBodegaDto } from './dto/update-bodega.dto';
import { ConfigurarUmbralDto } from './dto/configurar-umbral.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('bodegas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BodegasController {
  constructor(private readonly bodegasService: BodegasService) {}

  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO')
  create(@Body() dto: CreateBodegaDto, @Req() req) {
    const actorId = req.user.id_usuario ?? req.user.sub;
    // CU-17/CU-41: la bodega pertenece a la empresa del actor;
    // solo un Superusuario puede crearla en otra empresa
    const isSuperuser = req.user.roles?.includes('SUPERUSUARIO');
    const idEmpresa = isSuperuser && dto.id_empresa ? dto.id_empresa : req.user.id_empresa;
    return this.bodegasService.create({ ...dto, id_empresa: idEmpresa }, actorId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERUSUARIO')
  update(@Param('id') id: string, @Body() dto: UpdateBodegaDto, @Req() req) {
    const actorId = req.user.id_usuario ?? req.user.sub;
    // CU-18: solo se editan bodegas de la propia empresa
    const isSuperuser = req.user.roles?.includes('SUPERUSUARIO');
    return this.bodegasService.update(+id, dto, actorId, req.user.id_empresa, isSuperuser);
  }

  @Delete(':id/desactivar')
  @Roles('ADMIN', 'SUPERUSUARIO')
  deactivate(@Param('id') id: string, @Req() req) {
    const actorId = req.user.id_usuario ?? req.user.sub;
    // CU-19: solo se desactivan bodegas de la propia empresa
    const isSuperuser = req.user.roles?.includes('SUPERUSUARIO');
    return this.bodegasService.deactivate(+id, actorId, req.user.id_empresa, isSuperuser);
  }

  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  findAll(
    @Query('activa') activa: string,
    @Query('activo') activo: string,
    @Query('nombre') nombre: string,
    @Req() req,
  ) {
    const userEmpresaId = req.user.id_empresa ?? 1;
    const isSuperuser = req.user.roles?.includes('SUPERUSUARIO');
    const valor = activa ?? activo;
    const parseActiva =
      valor === 'true' ? true : valor === 'false' ? false : undefined;
    return this.bodegasService.findAll(
      { activa: parseActiva, nombre },
      userEmpresaId,
      isSuperuser,
    );
  }

  // CU-20: bodegas activas de la empresa destino, para elegir el destino
  // de una transferencia inter-empresa (lista mínima, sin stock ni metadatos)
  @Get('empresa/:idEmpresa')
  @Roles('ADMIN', 'SUPERUSUARIO')
  findActivasByEmpresa(@Param('idEmpresa') idEmpresa: string) {
    return this.bodegasService.findActivasByEmpresa(+idEmpresa);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  findOne(@Param('id') id: string, @Req() req) {
    const userEmpresaId = req.user.id_empresa ?? 1;
    const isSuperuser = req.user.roles?.includes('SUPERUSUARIO');
    const actorId = req.user.id_usuario ?? req.user.sub;
    return this.bodegasService.findOne(+id, userEmpresaId, isSuperuser, actorId);
  }

  @Get(':id/stock')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  getStock(@Param('id') id: string, @Req() req) {
    const userEmpresaId = req.user.id_empresa ?? 1;
    const isSuperuser = req.user.roles?.includes('SUPERUSUARIO');
    const actorId = req.user.id_usuario ?? req.user.sub;
    return this.bodegasService.getStock(+id, userEmpresaId, isSuperuser, actorId);
  }

  @Post(':id/umbral')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  configurarUmbral(
    @Param('id') id: string,
    @Body() dto: ConfigurarUmbralDto,
    @Req() req,
  ) {
    const actorId = req.user.id_usuario ?? req.user.sub;
    // CU-18: el umbral solo se configura en bodegas de la propia empresa
    const isSuperuser = req.user.roles?.includes('SUPERUSUARIO');
    return this.bodegasService.configurarUmbral(+id, dto, actorId, req.user.id_empresa, isSuperuser);
  }
}
