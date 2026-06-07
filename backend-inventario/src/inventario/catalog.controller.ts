import { Controller, Post, Get, Patch, Delete, Body, Query, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CatalogService } from "./catalog.service";
import { CompanyIsolationGuard } from "src/auth/guards/company-isolation.guard";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { Usuario } from "src/usuarios/entities/usuario.entity";
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('catalogo')
@UseGuards(CompanyIsolationGuard)
export class CatalogController {
    constructor(private readonly catalogService: CatalogService){}

    @Post()
    async crearTipoEquipo(@Body() body: any) {
        return this.catalogService.crearTipo(body);
    }

    @Get()
    async buscarCatalogo(@Query() query: any, @CurrentUser() actor: Usuario) {
        // Pasamos los filtros de la URL junto con el id_empresa real extraído del token JWT del usuario
        return this.catalogService.consultar({
        categoria: query.categoria,
        activo: query.activo,
        buscar: query.buscar,
        id_empresa: actor.id_empresa
        });
    }

    @Get(':id/ficha-tecnica')
    async verFichaTecnica(@Param('id') id: string, @CurrentUser() actor: Usuario){
        return this.catalogService.obtenerFichaPdf(id,actor.id_empresa);
    }

    @Patch(':id')
    async editarTipoEquipo (@Param('id') id: string, @Body() body: any) {
        return this.catalogService.editarTipo(id, body);
    }

    @Delete(':id')
    async desactivarTipoEquipo(@Param('id') id: string, @CurrentUser() actor: Usuario) {
        return this.catalogService.desactivarTipo(id, actor.id_empresa);
    }

    @Post(':id/ficha-tecnica')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/fichas_tecnicas',
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    cb(null, `${req.params.id}${extname(file.originalname)}`);
                },
            }),
            limits: {fileSize: 5 * 1024 * 1024},
            fileFilter: (req, file, cb) => {
                if (file.mimetype !== 'application/pdf'){
                    return cb(new BadRequestException('El archivo debe estar en formato PDF y no superar los 5 MB.'), false);
                }
                cb(null,true);
            },
        }),
    )

    async subirFichaPdf(@Param('id') id: string, @UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException('Archivo PDF no recibido.')
        }
        const urlArchivo = file.path;
        return this.catalogService.adjuntarPdfPath(id, urlArchivo);
    }
}