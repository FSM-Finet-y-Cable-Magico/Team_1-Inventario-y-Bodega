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
import { OrdenesIngresoService } from './ordenes-ingreso.service';
import { CreateOrdenIngresoDto } from './dto/create-orden-ingreso.dto';

@Controller('ordenes-ingreso')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OrdenesIngresoController {
  constructor(private readonly ordenesIngresoService: OrdenesIngresoService) {}

  // CU-52: registrar orden de ingreso desde proveedor
  @Post()
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  create(@Body() dto: CreateOrdenIngresoDto, @Req() req) {
    const actor = {
      id_usuario: req.user.id_usuario ?? req.user.sub,
      id_empresa: req.user.id_empresa,
      esSuperusuario: (req.user.roles ?? []).includes('SUPERUSUARIO'),
    };
    return this.ordenesIngresoService.create(dto, actor);
  }

  // CU-52: listar órdenes de ingreso
  @Get()
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  findAll(
    @Req() req,
    @Query('buscar') buscar?: string,
    @Query('estado') estado?: string,
  ) {
    const actor = {
      id_empresa: req.user.id_empresa,
      esSuperusuario: (req.user.roles ?? []).includes('SUPERUSUARIO'),
    };
    return this.ordenesIngresoService.findAll(actor, { buscar, estado });
  }
}
