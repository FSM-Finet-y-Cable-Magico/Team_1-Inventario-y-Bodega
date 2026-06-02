import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { UnitsController } from "./units.controller";
import { UnitsService } from "./units.service";
import { TipoEquipo } from "./entities/tipo-equipo.entity";
import { UnidadEquipo } from "./entities/unidad-equipo.entity";
import { HistorialEstado } from "./entities/historial-estado.entity";

@Module({
    imports: [
        TypeOrmModule.forFeature([TipoEquipo, UnidadEquipo, HistorialEstado])
    ],
    controllers: [
        CatalogController,
        UnitsController
    ],
    providers: [
        CatalogService,
        UnitsService
    ],
    exports: [CatalogService, UnitsService]
})
export class InventarioModule {}