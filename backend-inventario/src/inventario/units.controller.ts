import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { UnitsService } from "./units.service";
import { CompanyIsolationGuard } from "src/auth/guards/company-isolation.guard";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { Usuario } from '../usuarios/entities/usuario.entity'

@Controller('unidades')
@UseGuards(CompanyIsolationGuard)
export class UnitsController {
    constructor(private readonly unitsService: UnitsService) {}

    @Post()
    async registrarNuevaUnidad(@Body() body: any, @CurrentUser() actor: any) {
        return this.unitsService.registrarUnidad(body, actor.empresa);
    }

    @Get(':id/ficha')
    async verFichaDeSeguimiento(@Param('id') id: string, @CurrentUser() actor: Usuario) {
        return this.unitsService.verFichaDetalle(parseInt(id), actor.id_empresa);
    }

    @Get(':serialNumber/historial')
    async verHistorialCompleto(@Param('serialNumber') serialNumber: string, @CurrentUser() actor: Usuario) {
        return this.unitsService.verHistorialEstados(serialNumber, actor.id_empresa);
    }

    @Patch(':id/cambiar-estado')
    async transicionarEstadoEquipo(
        @Param('id') id: string,
        @Body('nuevoEstado') nuevoEstado: string,
        @Body('observacion') observacion: string,
        @Body('diagnostico') diagnostico: string,
        @CurrentUser() actor: Usuario
    ) {
        return this.unitsService.transicionarEstado(
            parseInt(id),
            nuevoEstado,
            actor,
            observacion,
            diagnostico
        );
    }
}