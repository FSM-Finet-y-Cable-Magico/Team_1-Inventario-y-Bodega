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

// ======================================================================
// Inventario · UnitsController (controlador)
// CU-31 · Distinguiendo equipo individualizable de consumible
// CU-32 · Registrando unidad de equipo individualizable
// CU-33 · Consultando ficha de detalle de unidad de equipo
// CU-34 · Editando datos de unidad de equipo
// CU-35 · Gestionando transiciones de estado de equipo
// CU-37 · Consultando historial completo de estados de equipo
// CU-48 · Consultando ubicación externa de equipo fuera de bodega
// CU-59 · Validando número de serie en salida de bodega
// CU-71 · Registrando devolución de equipo desde cliente
// CU-72 · Registrando resultado de revisión de equipo
// CU-73 · Mostrando información de equipo en devolución
// CU-74 · Reacondicionando equipo operativo desde revisión a bodega
// CU-75 · Enviando equipo a reparación externa
// CU-76 · Reingresando equipo desde reparación externa
// CU-77 · Consultando listado de equipos en revisión
// CU-95 · Mostrando aviso de garantía vigente al cambiar estado
// ======================================================================
@Controller('unidades')
@UseGuards(AuthGuard('jwt'), CompanyIsolationGuard, RolesGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  // CU-33 · Consultando ficha de detalle de unidad de equipo
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

  // CU-77 · Consultando listado de equipos en revisión
  @Get('en-revision')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async listarEnRevision(@CurrentUser() actor: any) {
    return this.unitsService.listarEnRevision(actor);
  }

  // CU-32 · Registrando unidad de equipo individualizable
  @Post()
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  async registrarNuevaUnidad(@Body() body: any, @CurrentUser() actor: any) {
    return this.unitsService.registrarUnidad(body, actor.id_empresa);
  }

  // CU-31 · Distinguiendo equipo individualizable de consumible
  @Post('consumibles')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
  async ingresarConsumible(@Body() body: any, @CurrentUser() actor: any) {
    return this.unitsService.ingresarConsumible(body, actor.id_empresa);
  }

  // CU-31 · Distinguiendo equipo individualizable de consumible
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

  // CU-59 · Validando número de serie en salida de bodega
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

  // CU-73 · Mostrando información de equipo en devolución
  @Get('devolucion/:numeroSerie')
  @Roles('TECNICO_TERRENO', 'ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async consultarParaDevolucion(
    @Param('numeroSerie') numeroSerie: string,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.consultarParaDevolucion(numeroSerie, actor);
  }

  // CU-71 · Registrando devolución de equipo desde cliente
  @Post(':id/devolucion')
  @Roles('TECNICO_TERRENO', 'ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async registrarDevolucion(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.registrarDevolucion(parseInt(id), body, actor);
  }

  // CU-33 · Consultando ficha de detalle de unidad de equipo
  // CU-48 · Consultando ubicación externa de equipo fuera de bodega
  @Get(':id/ficha')
  @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
  async verFichaDeSeguimiento(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.verFichaDetalle(parseInt(id), actor.id_empresa);
  }

  // CU-37 · Consultando historial completo de estados de equipo
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

  // CU-35 · Gestionando transiciones de estado de equipo
  // CU-95 · Mostrando aviso de garantía vigente al cambiar estado
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
    @Body('forzar_aviso_garantia') forzarAvisoGarantia: boolean,
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
      undefined,
      // CU-95: aviso de garantía vigente (confirmación explícita para continuar)
      { forzar: forzarAvisoGarantia === true },
    );
  }

  // CU-72 · Registrando resultado de revisión de equipo
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

  // CU-74 · Reacondicionando equipo operativo desde revisión a bodega
  @Post(':id/reacondicionar')
  @Roles('ADMIN_BODEGA', 'ADMIN', 'SUPERUSUARIO')
  async reacondicionarEquipo(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    return this.unitsService.reacondicionarEquipo(parseInt(id), body, actor);
  }

  // CU-75 · Enviando equipo a reparación externa
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

  // CU-76 · Reingresando equipo desde reparación externa
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

  // CU-34 · Editando datos de unidad de equipo
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
