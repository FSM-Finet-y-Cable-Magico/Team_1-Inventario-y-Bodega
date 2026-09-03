import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { UnitsService } from "./units.service";
import { CompanyIsolationGuard } from "src/auth/guards/company-isolation.guard";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { EditarDatosUnidadDto } from "./dto/editar-datos-unidad.dto";

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
        return this.unitsService.listarUnidades({ estado, buscar }, actor.id_empresa);
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
        return this.unitsService.editarConsumible(parseInt(idStock), body, actor.id_empresa, actor.id_usuario);
    }

    @Get(':id/ficha')
    @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
    async verFichaDeSeguimiento(@Param('id') id: string, @CurrentUser() actor: any) {
        return this.unitsService.verFichaDetalle(parseInt(id), actor.id_empresa);
    }

    @Get(':serialNumber/historial')
    @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
    async verHistorialCompleto(@Param('serialNumber') serialNumber: string, @CurrentUser() actor: any) {
        return this.unitsService.verHistorialEstados(serialNumber, actor.id_empresa);
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
        @CurrentUser() actor: any
    ) {
        return this.unitsService.transicionarEstado(
            parseInt(id),
            nuevoEstado,
            actor,
            observacion,
            diagnostico,
            descripcionOtro,
            simularErrorHistorial,
            ubicacionFisica
        );
    }

    @Patch(':id')
    @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
    async editarDatosUnidad(
        @Param('id') id: string,
        @Body() body: EditarDatosUnidadDto,
        @CurrentUser() actor: any
    ) {
        return this.unitsService.editarDatos(parseInt(id), body, actor);
    }
}
