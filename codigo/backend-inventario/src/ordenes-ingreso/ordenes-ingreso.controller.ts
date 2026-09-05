import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrdenesIngresoService } from './ordenes-ingreso.service';
import { CreateOrdenIngresoDto } from './dto/create-orden-ingreso.dto';
import { RegistrarRecepcionDto } from './dto/registrar-recepcion.dto';

// CU-53: convierte un query param a id numérico; descarta lo que no sea un entero > 0
function aIdOpcional(valor?: string): number | undefined {
  if (!valor) return undefined;
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

// CU-53: acepta solo fechas YYYY-MM-DD reales. Un texto cualquiera llegaría tal cual a la
// comparación contra la columna DATE y Postgres abortaría la consulta (500).
function aFechaOpcional(valor?: string): string | undefined {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return undefined;
  const d = new Date(`${valor}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : valor;
}

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

  // CU-52/CU-53: listar órdenes de ingreso con filtros
  @Get()
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  findAll(
    @Req() req,
    @Query('buscar') buscar?: string,
    @Query('estado') estado?: string,
    @Query('id_proveedor') idProveedor?: string,
    @Query('proveedor') proveedor?: string,
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
    @Query('id_empresa') idEmpresa?: string,
  ) {
    const actor = {
      id_empresa: req.user.id_empresa,
      esSuperusuario: (req.user.roles ?? []).includes('SUPERUSUARIO'),
    };
    // Los query params llegan como texto: el ValidationPipe global no transforma.
    // Un valor no numérico se descarta en vez de llegar como NaN a la consulta.
    return this.ordenesIngresoService.findAll(actor, {
      buscar,
      estado,
      id_proveedor: aIdOpcional(idProveedor),
      proveedor,
      fecha_desde: aFechaOpcional(fechaDesde),
      fecha_hasta: aFechaOpcional(fechaHasta),
      id_empresa: aIdOpcional(idEmpresa),
    });
  }

  // CU-53: detalle de una orden de ingreso con sus ítems
  @Get(':id')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  findOne(@Param('id') id: string, @Req() req) {
    const actor = {
      id_empresa: req.user.id_empresa,
      esSuperusuario: (req.user.roles ?? []).includes('SUPERUSUARIO'),
    };
    return this.ordenesIngresoService.findOne(Number(id), actor);
  }

  // CU-54: registrar la recepción total o parcial de una orden de ingreso
  @Post(':id/recepcion')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  registrarRecepcion(
    @Param('id') id: string,
    @Body() dto: RegistrarRecepcionDto,
    @Req() req,
  ) {
    const actor = {
      id_usuario: req.user.id_usuario ?? req.user.sub,
      id_empresa: req.user.id_empresa,
      esSuperusuario: (req.user.roles ?? []).includes('SUPERUSUARIO'),
    };
    return this.ordenesIngresoService.registrarRecepcion(
      Number(id),
      dto,
      actor,
    );
  }
}
