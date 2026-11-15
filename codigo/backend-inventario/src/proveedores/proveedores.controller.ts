import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';

// Proveedores · ProveedoresController (controlador)
// CU-49 · Creando proveedor
// CU-50 · Editando proveedor
// CU-51 · Consultando listado de proveedores
// CU-98 · Desactivando proveedor
@Controller('proveedores')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  // CU-49 · Creando proveedor
  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO')
  create(@Body() dto: CreateProveedorDto, @Req() req) {
    const actorId = req.user.id_usuario ?? req.user.sub;
    return this.proveedoresService.create(dto, actorId);
  }

  // CU-50 · Editando proveedor
  @Patch(':id')
  @Roles('ADMIN', 'SUPERUSUARIO')
  update(@Param('id') id: string, @Body() body: any, @Req() req) {
    const actorId = req.user.id_usuario ?? req.user.sub;
    return this.proveedoresService.update(parseInt(id, 10), body, actorId);
  }

  // CU-51 · Consultando listado de proveedores
  @Get()
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  findAll(@Query('buscar') buscar?: string, @Query('activa') activa?: string) {
    const activaFlag =
      activa === 'true' ? true : activa === 'false' ? false : undefined;
    return this.proveedoresService.findAll({ buscar, activa: activaFlag });
  }

  // CU-98 · Desactivando proveedor
  @Patch(':id/desactivar')
  @Roles('ADMIN', 'SUPERUSUARIO')
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const actorId = req.user.id_usuario ?? req.user.sub;
    return this.proveedoresService.desactivar(id, actorId);
  }

  // CU-98 · Desactivando proveedor
  @Patch(':id/reactivar')
  @Roles('ADMIN', 'SUPERUSUARIO')
  reactivar(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const actorId = req.user.id_usuario ?? req.user.sub;
    return this.proveedoresService.reactivar(id, actorId);
  }
}
