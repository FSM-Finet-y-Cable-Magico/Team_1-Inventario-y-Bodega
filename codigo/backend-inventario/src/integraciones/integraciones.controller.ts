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

// ======================================================================
// Integraciones con G3 y G8 · IntegracionesController (controlador)
// CU-64 · Ejecutando acciones atómicas del cierre de instalación
// CU-68 · Verificando saldo de consumibles en cierre
// CU-69 · Registrando cierre de trabajo de reparación
// Integración G3/G8: catálogo de tipos de equipo
// Integración G8: equipos de un servicio
// Integración G3/G8: stock disponible
// Integración G3: unidad por número de serie
// Integración G8: recepción de equipos retirados (baja por morosidad)
// Integración G8: activación de servicio
// ======================================================================
@Controller('integraciones')
@UseGuards(ApiKeyGuard)
export class IntegracionesController {
  constructor(private readonly integracionesService: IntegracionesService) {}

  // Integración G3/G8: catálogo de tipos de equipo
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

  // Integración G8: equipos de un servicio
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

  // Integración G3/G8: stock disponible
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

  // Integración G3: unidad por número de serie
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

  // Integración G8: recepción de equipos retirados (baja por morosidad)
  @Get('recepciones')
  consultarRecepciones(
    @Query('id_empresa') idEmpresa: string,
    @Query('id_ot') idOt: string,
    @Query('request_id') requestId: string,
    @Req() request: any,
  ) {
    const integracion = request.integracion as IntegracionContexto;
    const id = Number(idEmpresa);
    this.integracionesService.validarScope(integracion, id);
    return this.integracionesService.consultarRecepciones(id, {
      id_ot: idOt,
      request_id: requestId,
    });
  }

  // Integración G8: activación de servicio
  @Post('activaciones')
  registrarActivacion(@Body() payload: any, @Req() request: any) {
    const integracion = request.integracion as IntegracionContexto;
    return this.integracionesService.registrarActivacion(payload, integracion);
  }

  // CU-64 · Ejecutando acciones atómicas del cierre de instalación
  // CU-68 · Verificando saldo de consumibles en cierre
  // CU-69 · Registrando cierre de trabajo de reparación
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
