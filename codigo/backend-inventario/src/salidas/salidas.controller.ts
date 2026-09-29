import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SalidasService } from './salidas.service';
import { InventarioPersonalService } from './inventario-personal.service';
import { JornadaService } from './jornada.service';
import { CompanyIsolationGuard } from 'src/auth/guards/company-isolation.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CrearSalidaDto } from './dto/crear-salida.dto';

// CU-57/60: salidas de bodega a técnico (equipos y/o consumibles)
@Controller('salidas')
@UseGuards(AuthGuard('jwt'), CompanyIsolationGuard, RolesGuard)
export class SalidasController {
  constructor(
    private readonly salidasService: SalidasService,
    private readonly inventarioPersonalService: InventarioPersonalService,
  ) {}

  // CU-57 + CU-60: un solo endpoint; los ítems deciden si es de equipos, de
  // consumibles o mixta. La transacción es atómica.
  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  async registrarSalida(
    @Body() dto: CrearSalidaDto,
    @CurrentUser() actor: any,
  ) {
    return this.salidasService.registrarSalida(dto, actor.id_empresa, actor);
  }

  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  async listarSalidas(@CurrentUser() actor: any) {
    const esSuperusuario = (actor.roles ?? []).includes('SUPERUSUARIO');
    return this.salidasService.listarSalidas(actor.id_empresa, esSuperusuario);
  }
}

// CU-58: consulta del inventario personal de un técnico
// (GET /api/tecnicos/:id/inventario — también será el wrapper G1-5 para G3)
@Controller('tecnicos')
@UseGuards(AuthGuard('jwt'), CompanyIsolationGuard, RolesGuard)
export class TecnicosController {
  constructor(
    private readonly inventarioPersonalService: InventarioPersonalService,
    private readonly jornadaService: JornadaService,
  ) {}

  // CU-61: jornada del técnico autenticado (trabajos del día desde G3 +
  // inventario personal de CU-58). Sin trabajos → 200 con lista vacía.
  @Get('me/jornada')
  @Roles('TECNICO_TERRENO', 'ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  async obtenerJornada(@CurrentUser() actor: any) {
    return this.jornadaService.obtenerJornada(actor);
  }

  @Get(':id/inventario')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  async consultarInventarioPersonal(
    @Param('id') id: string,
    @Query('empresa') empresa: string,
    @CurrentUser() actor: any,
  ) {
    // El superusuario puede consultar técnicos de otra empresa (mismo patrón
    // manual del resto de módulos); los demás, solo de su contexto.
    const roles: string[] = actor.roles ?? [];
    const idTecnico = parseInt(id, 10);
    const idEmpresa =
      roles.includes('SUPERUSUARIO') && empresa
        ? parseInt(empresa, 10)
        : actor.id_empresa;
    return this.inventarioPersonalService.consultar(
      idTecnico,
      idEmpresa,
      actor,
    );
  }
}
