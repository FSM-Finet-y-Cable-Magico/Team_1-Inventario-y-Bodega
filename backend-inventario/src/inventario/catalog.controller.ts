import { Controller, Post, Get, Patch, Delete, Body, Query, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CatalogService } from "./catalog.service";
import { CompanyIsolationGuard} from "../auth/guards/company-isolation.guard.ts";
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
    async buscarCatalogo(@Query() query: any) {
        return this.catalogService.consultar(query);
    }

    @Patch(':id')
    async editarTipoEquipo (@Param('id') id: string, @Body() body: any) {
        return this.catalogService.editarTipo(id, body);
    }

    @Delete(':id')
    async desactivarTipoEquipo(@Param('id') id: string) {
        return this.catalogService.desactivarTipo(id);
    }

    @Post(':id/adjuntar-pdf')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/fichas_tecnicas',
                filename: (req, file, cb) => {
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

    async subirFichaPdf(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('Archivo PDF no recibido.');
        return this.catalogService.adjuntarPdfPath(id, file.path);
    }
}