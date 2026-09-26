import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UnitsService } from './units.service';
import { CompanyIsolationGuard } from 'src/auth/guards/company-isolation.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { EditarDatosUnidadDto } from './dto/editar-datos-unidad.dto';

@Controller('unidades')
@UseGuards(AuthGuard('jwt'), CompanyIsolationGuard, RolesGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  async listarUnidades(
    @Query('estado') estado: string,
    @Query('buscar') buscar: string,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.listarUnidades(
      { estado, buscar },
      actor.id_empresa,
    );
  }

  // CU-77: listado de equipos en revisión (solo consulta, sin auditoría)
  @Get('en-revision')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async listarEnRevision(@CurrentUser() actor: any) {
    return this.unitsService.listarEnRevision(actor);
  }

  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  async registrarNuevaUnidad(@Body() body: any, @CurrentUser() actor: any) {
    return this.unitsService.registrarUnidad(body, actor.id_empresa);
  }

  // CU-28/CU-31: ingreso de consumibles por cantidad y unidad de medida
  @Post('consumibles')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  async ingresarConsumible(@Body() body: any, @CurrentUser() actor: any) {
    return this.unitsService.ingresarConsumible(body, actor.id_empresa);
  }

  // CU-28/CU-31: edición del stock de un consumible (cantidad y umbral)
  @Patch('consumibles/:id_stock')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  async editarConsumible(
    @Param('id_stock') idStock: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.editarConsumible(
      parseInt(idStock),
      body,
      actor.id_empresa,
      actor.id_usuario,
    );
  }

  // CU-59: validación en vivo de número de serie para salida de bodega
  @Get('serie/:numeroSerie')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  async verificarSerieParaSalida(
    @Param('numeroSerie') numeroSerie: string,
    @Query('id_bodega') idBodega: string,
    @CurrentUser() actor: any,
  ) {
    // CU-59: validación en vivo para el formulario de salida de bodega.
    // La validación de verdad la re-ejecuta SalidasService en la transacción.
    return this.unitsService.verificarSerie(
      numeroSerie,
      actor.id_empresa,
      idBodega ? parseInt(idBodega, 10) : undefined,
    );
  }

  // CU-71: búsqueda por NS para la devolución (valida 'Instalado en cliente')
  @Get('devolucion/:numeroSerie')
  @Roles('TECNICO_TERRENO', 'ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async consultarParaDevolucion(
    @Param('numeroSerie') numeroSerie: string,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.consultarParaDevolucion(numeroSerie, actor);
  }

  // CU-71: registrar devolución de equipo desde cliente → 'En revisión'
  @Post(':id/devolucion')
  @Roles('TECNICO_TERRENO', 'ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async registrarDevolucion(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.registrarDevolucion(parseInt(id), body, actor);
  }

  @Get(':id/ficha')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  async verFichaDeSeguimiento(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.verFichaDetalle(parseInt(id), actor.id_empresa);
  }

  @Get(':serialNumber/historial')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  async verHistorialCompleto(
    @Param('serialNumber') serialNumber: string,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.verHistorialEstados(
      serialNumber,
      actor.id_empresa,
    );
  }

  @Patch(':id/cambiar-estado')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  async transicionarEstadoEquipo(
    @Param('id') id: string,
    @Body('nuevoEstado') nuevoEstado: string,
    @Body('observacion') observacion: string,
    @Body('diagnostico') diagnostico: string,
    @Body('descripcionOtro') descripcionOtro: string,
    @Body('simularErrorHistorial') simularErrorHistorial: boolean,
    @Body('ubicacion_fisica') ubicacionFisica: string,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.transicionarEstado(
      parseInt(id),
      nuevoEstado,
      actor,
      observacion,
      diagnostico,
      descripcionOtro,
      simularErrorHistorial,
      ubicacionFisica,
    );
  }

  // CU-72: registrar el resultado de la revisión (Operativo / Reparación externa / Baja)
  @Post(':id/resultado-revision')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async registrarResultadoRevision(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.registrarResultadoRevision(
      parseInt(id),
      body,
      actor,
    );
  }

  // CU-74: reacondicionar equipo "En revisión" directo a "En bodega" (Operativo)
  @Post(':id/reacondicionar')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async reacondicionarEquipo(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.reacondicionarEquipo(parseInt(id), body, actor);
  }

  // CU-75: enviar equipo "En revisión" a reparación externa
  @Post(':id/reparacion-externa')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async enviarAReparacionExterna(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.enviarAReparacionExterna(
      parseInt(id),
      body,
      actor,
    );
  }

  // CU-76: registrar retorno de reparación externa (equipo → "En revisión")
  @Post(':id/retorno-reparacion')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async registrarRetornoReparacion(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.registrarRetornoReparacion(
      parseInt(id),
      body,
      actor,
    );
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  async editarDatosUnidad(
    @Param('id') id: string,
    @Body() body: EditarDatosUnidadDto,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.editarDatos(parseInt(id), body, actor);
  }
}
