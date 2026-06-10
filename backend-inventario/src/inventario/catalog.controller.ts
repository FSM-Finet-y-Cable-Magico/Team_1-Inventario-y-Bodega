import { Controller, Post, Get, Patch, Delete, Body, Query, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import { CatalogService } from "./catalog.service";
import { CompanyIsolationGuard } from "src/auth/guards/company-isolation.guard";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('catalogo')
@UseGuards(AuthGuard('jwt'), CompanyIsolationGuard, RolesGuard)
export class CatalogController {
    constructor(private readonly catalogService: CatalogService) {}

    @Post()
    @Roles('ADMIN', 'SUPERUSUARIO')
    async crearTipoEquipo(@Body() body: any, @CurrentUser() actor: any) {
        return this.catalogService.crearTipo({ ...body, id_empresa: actor.id_empresa });
    }

    @Get()
    @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA')
    async buscarCatalogo(@Query() query: any, @CurrentUser() actor: any) {
        return this.catalogService.consultar({
            categoria: query.categoria,
            activo: query.activo,
            buscar: query.buscar,
            id_empresa: actor.id_empresa
        });
    }

    @Get(':id/ficha-tecnica')
    @Roles('ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA', 'TECNICO_TERRENO')
    async verFichaTecnica(@Param('id') id: string, @CurrentUser() actor: any) {
        return this.catalogService.obtenerFichaPdf(id, actor.id_empresa);
    }

    @Patch(':id')
    @Roles('ADMIN', 'SUPERUSUARIO')
    async editarTipoEquipo(@Param('id') id: string, @Body() body: any, @CurrentUser() actor: any) {
        return this.catalogService.editarTipo(id, { ...body, id_empresa: actor.id_empresa }, actor.id_usuario);
    }

    @Delete(':id')
    @Roles('ADMIN', 'SUPERUSUARIO')
    async desactivarTipoEquipo(@Param('id') id: string, @CurrentUser() actor: any) {
        return this.catalogService.desactivarTipo(id, actor.id_empresa);
    }

    @Post(':id/ficha-tecnica')
    @Roles('ADMIN', 'SUPERUSUARIO')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/fichas_tecnicas',
                filename: (req, file, cb) => {
                    cb(null, `${req.params.id}${extname(file.originalname)}`);
                },
            }),
            limits: { fileSize: 5 * 1024 * 1024 },
            fileFilter: (req, file, cb) => {
                if (file.mimetype !== 'application/pdf') {
                    return cb(new BadRequestException('El archivo debe estar en formato PDF y no superar los 5 MB.'), false);
                }
                cb(null, true);
            },
        }),
    )
    async subirFichaPdf(@Param('id') id: string, @UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException('Archivo PDF no recibido.');
        }
        return this.catalogService.adjuntarPdfPath(id, file.path);
    }
}
