import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { UnitsService } from "./units.service";
import { CompanyIsolationGuard} from '../auth/guards/company-isolation.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('unidades')
@UseGuards(CompanyIsolationGuard)
export class UnitsController {
    constructor(private readonly unitsService: UnitsService) {}

    @Post()
    async registrarNuevaUnidad(@Body() body: any, @CurrentUser() actor: any) {
        return this.unitsService.registrarUnidad(body, actor.empresa);
    }

    @Get(':id/ficha')
    async verFichaDeSeguimiento(@Param('id') id: string) {
        return this.unitsService.verFichaDetalle(id);
    }

    @Get(':serialNumber/historial')
    async verHistorialCompleto(@Param('serialNumber') serialNumber: string) {
        return this.unitsService.verHistorialEstados(serialNumber);
    }

    @Patch(':id/cambiar-estado')
    async transicionarEstadoEquipo(
        @Param('id') id: string,
        @Body('nuevoEstado') nuevoEstado: string,
        @Body('observacion') observacion: string,
        @Body('diagnostico') diagnostico: string,
        @Body('ignorarAvisoGarantia') ignorarAvisoGarantia: boolean,
        @CurrentUser() actor: any
    ) {
        return this.unitsService.transicionarEstado(id, nuevoEstado, actor, observacion, diagnostico, ignorarAvisoGarantia);
    }
}