import { Injectable, BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TipoEquipo } from "./entities/tipo-equipo.entity";
import { UnidadEquipo } from "./entities/unidad-equipo.entity";
import { AuditoriaService } from "src/auditoria/auditoria.service";

@Injectable()
export class CatalogService {
    constructor(
        @InjectRepository(TipoEquipo)
        private readonly catalogRepository: Repository<TipoEquipo>,

        @InjectRepository(UnidadEquipo)
        private readonly unitRepository: Repository<UnidadEquipo>,

        private readonly auditoriaService: AuditoriaService,
    ){}

    // CU-24: categorías y unidades de medida permitidas
    static readonly CATEGORIAS = [
        'ONT/ONU', 'Decodificador', 'Splitter', 'Herramienta',
        'Consumible fibra óptica', 'Consumible conector', 'Consumible otro', 'Otro',
    ];
    static readonly UNIDADES_MEDIDA = ['Unidad', 'Metro', 'Rollo'];

    async crearTipo(dto: {
        nombre: string;
        categoria: string;
        marca?: string;
        modelo?: string;
        descripcionTecnica?: string;
        requiereSerialNumber: boolean;
        unidadMedida?: string;
        garantiaDias?: number;
        id_empresa: number;
    }) {
        // CU-24 Excepción 1: validaciones de formato con errores específicos
        const errores: string[] = [];
        const nombre = dto.nombre?.trim() ?? '';
        const marca = dto.marca?.trim() ?? '';
        const modelo = dto.modelo?.trim() ?? '';
        const descripcion = dto.descripcionTecnica?.trim() ?? '';
        const garantia = dto.garantiaDias ?? 0;

        if (nombre.length < 3 || nombre.length > 80) {
            errores.push('El nombre del tipo debe tener entre 3 y 80 caracteres.');
        }
        if (!dto.categoria || !CatalogService.CATEGORIAS.includes(dto.categoria)) {
            errores.push(`La categoría es obligatoria y debe ser una de: ${CatalogService.CATEGORIAS.join(', ')}.`);
        }
        if (marca.length < 2 || marca.length > 50) {
            errores.push('La marca es obligatoria y debe tener entre 2 y 50 caracteres.');
        }
        if (modelo.length < 1 || modelo.length > 50) {
            errores.push('El modelo es obligatorio y debe tener entre 1 y 50 caracteres.');
        }
        if (descripcion.length > 500) {
            errores.push('La descripción técnica no puede superar los 500 caracteres.');
        }
        if (dto.requiereSerialNumber === undefined || dto.requiereSerialNumber === null) {
            errores.push("El campo 'Requiere número de serie individual' es obligatorio.");
        }
        if (!Number.isInteger(garantia) || garantia < 0 || garantia > 3650) {
            errores.push('La duración de garantía debe ser un entero entre 0 y 3650 días.');
        }
        // CU-24 Excepción 2: unidad de medida obligatoria solo si no requiere serie
        if (dto.requiereSerialNumber === false) {
            if (!dto.unidadMedida || !CatalogService.UNIDADES_MEDIDA.includes(dto.unidadMedida)) {
                errores.push(`Debe seleccionar la unidad de medida (${CatalogService.UNIDADES_MEDIDA.join(', ')}) cuando el tipo no requiere número de serie individual.`);
            }
        }
        if (errores.length) {
            throw new BadRequestException(errores.join(' '));
        }

        // CU-24 Excepción 3: unicidad de la combinación nombre+marca+modelo
        const existeDuplicado = await this.catalogRepository.findOne({
            where: { nombre, marca, modelo, activo: true },
        });
        if (existeDuplicado) {
            throw new ConflictException('Ya existe un tipo de equipo con esa combinación de nombre, marca y modelo.');
        }

        const nuevoTipo = this.catalogRepository.create({
            id_empresa: dto.id_empresa,
            nombre,
            categoria: dto.categoria,
            marca,
            modelo,
            descripcionTecnica: descripcion || null,
            unidadMedida: dto.requiereSerialNumber === false ? dto.unidadMedida : null,
            garantiaDias: garantia,
            requiereSerialNumber: dto.requiereSerialNumber,
            activo: true
        });

        return await this.catalogRepository.save(nuevoTipo);
    }

    async consultar(filtros: { categoria?: string; activo?: string; buscar?: string; id_empresa: number }) {

        const query = this.catalogRepository.createQueryBuilder('tipo');

        query.where('tipo.id_empresa = :id_empresa', { id_empresa: filtros.id_empresa });

        if (filtros.categoria && filtros.categoria.trim() !== '') {
        query.andWhere('tipo.categoria = :categoria', { categoria: filtros.categoria });
        }

        if (filtros.activo !== undefined && filtros.activo !== '') {
        const esActivo = filtros.activo === 'true';
        query.andWhere('tipo.activo = :activo', { activo: esActivo });
        }

        if (filtros.buscar && filtros.buscar.trim() !== '') {
        query.andWhere('tipo.nombre ILIKE :buscar', { buscar: `%${filtros.buscar}%` });
        }

        const resultados = await query.getMany();

        if (!resultados || resultados.length === 0) {
        throw new NotFoundException('No se encontraron tipos de equipos en el catálogo que coincidan con los filtros de búsqueda seleccionados.');
        }

        return resultados;
    }

    async editarTipo(id: string, dto: { nombre?: string; categoria?: string; requiereSerialNumber?: boolean; id_empresa: number }, actorId?: number) {
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            throw new BadRequestException('El ID del tipo de equipo proporcionado debe ser un número válido.');
        }

        const tipo = await this.catalogRepository.findOne({
            where: { id_tipo_equipo: idNum, id_empresa: dto.id_empresa }
        });

        if (!tipo) {
            await this.auditoriaService.create({
                id_usuario: actorId ?? 0,
                accion: 'ACCESO_DENEGADO',
                entidad_afectada: 'tipo_equipo',
                id_entidad_afectada: idNum,
                valor_anterior: null,
                valor_nuevo: { motivo: 'Intento de modificar registro de otra empresa', id_empresa_actor: dto.id_empresa },
            });
            throw new NotFoundException('El tipo de equipo que intenta modificar no existe o no pertenece a su empresa.');
        }

        if (dto.requiereSerialNumber !== undefined && dto.requiereSerialNumber !== tipo.requiereSerialNumber) {

            const totalUnidadesAsociadas = await this.unitRepository.count({
                where: { id_tipo_equipo: idNum }
            });

            if (totalUnidadesAsociadas > 0) {
                throw new BadRequestException(`Regla de Negocio: No es posible cambiar la configuración de 'Serie Individual' porque existen ${totalUnidadesAsociadas} unidades físicas registradas en el inventario para este tipo de equipo.`);
            }
        }

        if (dto.nombre && dto.nombre.trim() !== tipo.nombre) {
            const duplicado = await this.catalogRepository.findOne({
                where: { 
                nombre: dto.nombre.trim(), 
                id_empresa: dto.id_empresa,
                activo: true 
                }
            });
            if (duplicado && duplicado.id_tipo_equipo !== idNum) {
                throw new ConflictException(`Ya existe otro tipo de equipo activo registrado con el nombre [${dto.nombre}] para su empresa.`);
            }
        }

        const datosActualizar: Partial<TipoEquipo> = {};
        if (dto.nombre) datosActualizar.nombre = dto.nombre.trim();
        if (dto.categoria) datosActualizar.categoria = dto.categoria.trim();
        if (dto.requiereSerialNumber !== undefined) datosActualizar.requiereSerialNumber = dto.requiereSerialNumber;

        await this.catalogRepository.update(idNum, datosActualizar);

        return await this.catalogRepository.findOne({ where: { id_tipo_equipo: idNum } });
    }


    async desactivarTipo(id: string, idEmpresaContexto: number) {
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            throw new BadRequestException('El ID proporcionado debe ser un número válido.');
        }

        const tipo = await this.catalogRepository.findOne({ 
            where: { id_tipo_equipo: idNum, id_empresa: idEmpresaContexto } 
        });
        
        if (!tipo) {
            throw new NotFoundException('El tipo de equipo que intenta desactivar no existe o no pertenece a su empresa.');
        }

        const totalUnidades = await this.unitRepository.count({
            where: { id_tipo_equipo: idNum }
        });

        if (totalUnidades > 0) {
            tipo.activo = false;
            await this.catalogRepository.save(tipo);
        
            return {
                success: true,
                tipoDesactivacion: 'LÓGICA',
                message: `El tipo de equipo contiene ${totalUnidades} unidades en el inventario. Se ha procedido con una desactivación lógica de forma exitosa para preservar los registros históricos.`
            };
        }

        tipo.activo = false;
        await this.catalogRepository.save(tipo);

        return {
            success: true,
            tipoDesactivacion: 'ORDINARIA',
            message: 'El tipo de equipo ha sido desactivado del catálogo correctamente.'
        };
    }

    validarFormatoSerialNumber(serial: string): boolean {

        if (!serial || serial.trim() === '') {
            throw new BadRequestException('El número de serie es un campo obligatorio y no puede estar vacío.');
        }
        const regex = /^[A-Z0-9-]{4,30}$/;
        if (!regex.test(serial)) {
            throw new BadRequestException('El formato del numero de serie es invalido. Debe contener entre 4 y 30 caracteres alfanuméricos y guiones. No se permiten espacios ni caracteres especiales.');
        }
        return true;
    }

    async adjuntarPdfPath(id: string, path: string) {
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            throw new BadRequestException('El ID provisto no es válido.');
        }

        const tipo = await this.catalogRepository.findOne({ where: { id_tipo_equipo: idNum } });
        if (!tipo) {
            throw new NotFoundException('El tipo de equipo especificado no existe en el sistema.');
        }

        tipo.fichaTecnicaPdfUrl = path;
        
        await this.catalogRepository.save(tipo);

        return {
            success: true,
            id_tipo_equipo: tipo.id_tipo_equipo,
            ficha_tecnica_pdf_url: tipo.fichaTecnicaPdfUrl,
            message: 'La ficha técnica en formato PDF ha sido adjuntada y asociada al catálogo de manera exitosa.'
        };
    }

    async obtenerFichaPdf(id: string, idEmpresaContexto: number) {
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            throw new BadRequestException('El ID del tipo de equipo debe ser un número válido.');
        }

        const tipo = await this.catalogRepository.findOne({
            where: { id_tipo_equipo: idNum, id_empresa: idEmpresaContexto }
        });

        if (!tipo) {
            throw new NotFoundException('El tipo de equipo consultado no existe o no pertenece a su empresa.');
        }

        if (!tipo.fichaTecnicaPdfUrl || tipo.fichaTecnicaPdfUrl.trim() === '') {
        return {
            tieneFicha: false,
            ficha_tecnica_pdf_url: null,
            message: `El tipo de equipo [${tipo.nombre}] no posee una ficha técnica en PDF adjunta en el catálogo actualmente.`
        };
        }

        return {
            tieneFicha: true,
            id_tipo_equipo: tipo.id_tipo_equipo,
            nombre_equipo: tipo.nombre,
            ficha_tecnica_pdf_url: tipo.fichaTecnicaPdfUrl
        };
    }
    
    async determinarNaturalezaEquipo(idTipoEquipo: number, idEmpresaContexto: number) {
        const tipo = await this.catalogRepository.findOne({
        where: { id_tipo_equipo: idTipoEquipo, id_empresa: idEmpresaContexto }
        });

        if (!tipo) {
            throw new NotFoundException('El tipo de equipo consultado no existe en el catálogo de su empresa.');
        }

        if (tipo.requiereSerialNumber === null || tipo.requiereSerialNumber === undefined) {
            throw new BadRequestException(
                `Error de configuración: el tipo de equipo [${tipo.nombre}] no tiene definida la propiedad 'requiereSerialNumber'. Contacte al administrador.`
            );
        }

        if (tipo.requiereSerialNumber === true) {
            return {
                id_tipo_equipo: tipo.id_tipo_equipo,
                nombre: tipo.nombre,
                clasificacion: 'INDIVIDUALIZABLE',
                tablaDestino: 'unidad_equipo',
                obligaSerialNumber: true,
                obligaUbicacionBodega: true
            };
        } else {
            return {
                id_tipo_equipo: tipo.id_tipo_equipo,
                nombre: tipo.nombre,
                clasificacion: 'CONSUMIBLE / VOLUMEN',
                tablaDestino: 'stock_consumible',
                obligaSerialNumber: false,
                obligaUbicacionBodega: false
            };
        }
    }
}