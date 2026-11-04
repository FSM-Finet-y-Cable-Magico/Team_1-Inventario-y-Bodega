import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IntegracionesService } from './integraciones.service';
import { ApiKeyGuard, IntegracionContexto } from './guards/api-key.guard';

// sc-113: rutas de integración server-to-server con G3 (FSM).
// sc-158: se suman las rutas del acuerdo con G8 (CRM): catálogo S2S,
// consulta de unidad ampliada y evento de activación.
// Sin JWT ni CompanyIsolationGuard: la autenticación es por X-API-KEY y el
// aislamiento de empresa se valida contra el scope de la key (id_empresa explícito).
@Controller('integraciones')
@UseGuards(ApiKeyGuard)
export class IntegracionesController {
  constructor(private readonly integracionesService: IntegracionesService) {}

  @Get('tipos-equipo')
  consultarTiposEquipo(
    @Query('id_empresa') idEmpresa: string,
    @Query('categoria') categoria: string,
    @Query('buscar') buscar: string,
    @Query('activo') activo: string,
    @Req() request: any,
  ) {
    const integracion = request.integracion as IntegracionContexto;
    const id = Number(idEmpresa);
    this.integracionesService.validarScope(integracion, id);
    return this.integracionesService.consultarTiposEquipo(id, {
      categoria,
      buscar,
      activo,
    });
  }

  @Get('equipos')
  consultarEquiposPorServicio(
    @Query('id_empresa') idEmpresa: string,
    @Query('id_servicio') idServicio: string,
    @Req() request: any,
  ) {
    const integracion = request.integracion as IntegracionContexto;
    const id = Number(idEmpresa);
    this.integracionesService.validarScope(integracion, id);
    return this.integracionesService.consultarEquiposPorServicio(id, idServicio);
  }

  @Get('stock')
  consultarStock(
    @Query('id_empresa') idEmpresa: string,
    @Query('id_tipo_equipo') idTipoEquipo: string,
    @Query('categoria') categoria: string,
    @Req() request: any,
  ) {
    const integracion = request.integracion as IntegracionContexto;
    const id = Number(idEmpresa);
    this.integracionesService.validarScope(integracion, id);
    return this.integracionesService.consultarStock(id, {
      id_tipo_equipo: idTipoEquipo,
      categoria,
    });
  }

  @Get('unidades/:numeroSerie')
  consultarUnidadPorSerie(
    @Param('numeroSerie') numeroSerie: string,
    @Query('id_empresa') idEmpresa: string,
    @Req() request: any,
  ) {
    const integracion = request.integracion as IntegracionContexto;
    const id = Number(idEmpresa);
    this.integracionesService.validarScope(integracion, id);
    return this.integracionesService.consultarUnidadPorSerie(numeroSerie, id);
  }

  @Post('activaciones')
  registrarActivacion(@Body() payload: any, @Req() request: any) {
    const integracion = request.integracion as IntegracionContexto;
    return this.integracionesService.registrarActivacion(payload, integracion);
  }

  // CU-64/CU-68/CU-69/CU-70: webhook del cierre de OT. El cierre lo ejecuta G3
  // (CU-63) y aquí se reciben sus efectos en inventario: instalación (CU-64),
  // saldo de consumibles (CU-68) y reparación (CU-69, con el borrador de CU-70).
  @Post('ordenes/:idOt/cierre')
  recibirCierreOt(
    @Param('idOt') idOt: string,
    @Body() payload: any,
    @Req() request: any,
  ) {
    const integracion = request.integracion as IntegracionContexto;
    return this.integracionesService.recibirCierreOt(
      parseInt(idOt, 10),
      payload,
      integracion,
    );
  }
}
