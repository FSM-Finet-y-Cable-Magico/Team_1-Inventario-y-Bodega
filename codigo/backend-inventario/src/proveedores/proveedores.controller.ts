import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';

@Controller('proveedores')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  // CU-49: registrar proveedor
  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO')
  create(@Body() dto: CreateProveedorDto, @Req() req) {
    const actorId = req.user.id_usuario ?? req.user.sub;
    return this.proveedoresService.create(dto, actorId);
  }

  // CU-49: listado de proveedores
  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO')
  findAll(@Query('buscar') buscar?: string, @Query('activa') activa?: string) {
    const activaFlag =
      activa === 'true' ? true : activa === 'false' ? false : undefined;
    return this.proveedoresService.findAll({ buscar, activa: activaFlag });
  }
}
