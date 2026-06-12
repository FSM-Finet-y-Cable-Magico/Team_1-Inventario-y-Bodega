import { Injectable, BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { existsSync, unlinkSync } from "fs";
import { TipoEquipo } from "./entities/tipo-equipo.entity";
import { UnidadEquipo } from "./entities/unidad-equipo.entity";
import { StockConsumible } from "../bodegas/entities/stock-consumible.entity";
import { AuditoriaService } from "src/auditoria/auditoria.service";

@Injectable()
export class CatalogService {
    constructor(
        @InjectRepository(TipoEquipo)
        private readonly catalogRepository: Repository<TipoEquipo>,

        @InjectRepository(UnidadEquipo)
        private readonly unitRepository: Repository<UnidadEquipo>,

        private readonly auditoriaService: AuditoriaService,

        private readonly dataSource: DataSource,
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

        // CU-25: la búsqueda aplica sobre nombre, marca o modelo
        if (filtros.buscar && filtros.buscar.trim() !== '') {
        query.andWhere(
            '(tipo.nombre ILIKE :buscar OR tipo.marca ILIKE :buscar OR tipo.modelo ILIKE :buscar)',
            { buscar: `%${filtros.buscar}%` },
        );
        }

        // CU-25 Excepción 1: sin coincidencias se retorna el listado vacío;
        // el frontend muestra el mensaje correspondiente
        return await query.getMany();
    }

    async editarTipo(
        id: string,
        dto: {
            nombre?: string;
            categoria?: string;
            marca?: string;
            modelo?: string;
            descripcionTecnica?: string;
            unidadMedida?: string;
            garantiaDias?: number;
            requiereSerialNumber?: boolean;
            id_empresa: number;
        },
        actorId?: number,
    ) {
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

        // CU-26 Excepción 1: el campo 'Requiere número de serie individual' no
        // puede cambiar si ya existen unidades registradas para este tipo
        if (dto.requiereSerialNumber !== undefined && dto.requiereSerialNumber !== tipo.requiereSerialNumber) {
            const totalUnidadesAsociadas = await this.unitRepository.count({
                where: { id_tipo_equipo: idNum }
            });

            if (totalUnidadesAsociadas > 0) {
                throw new BadRequestException(`No es posible cambiar este campo porque existen ${totalUnidadesAsociadas} unidades registradas para este tipo de equipo.`);
            }
        }

        // CU-26: mismas validaciones de formato que CU-24, solo sobre los campos enviados
        const errores: string[] = [];
        if (dto.nombre !== undefined) {
            const nombre = dto.nombre.trim();
            if (nombre.length < 3 || nombre.length > 80) {
                errores.push('El nombre del tipo debe tener entre 3 y 80 caracteres.');
            }
        }
        if (dto.categoria !== undefined && !CatalogService.CATEGORIAS.includes(dto.categoria)) {
            errores.push(`La categoría debe ser una de: ${CatalogService.CATEGORIAS.join(', ')}.`);
        }
        if (dto.marca !== undefined) {
            const marca = dto.marca.trim();
            if (marca.length < 2 || marca.length > 50) {
                errores.push('La marca es obligatoria y debe tener entre 2 y 50 caracteres.');
            }
        }
        if (dto.modelo !== undefined) {
            const modelo = dto.modelo.trim();
            if (modelo.length < 1 || modelo.length > 50) {
                errores.push('El modelo es obligatorio y debe tener entre 1 y 50 caracteres.');
            }
        }
        if (dto.descripcionTecnica !== undefined && dto.descripcionTecnica.trim().length > 500) {
            errores.push('La descripción técnica no puede superar los 500 caracteres.');
        }
        if (dto.garantiaDias !== undefined && (!Number.isInteger(dto.garantiaDias) || dto.garantiaDias < 0 || dto.garantiaDias > 3650)) {
            errores.push('La duración de garantía debe ser un entero entre 0 y 3650 días.');
        }
        const requiereFinal = dto.requiereSerialNumber ?? tipo.requiereSerialNumber;
        if (requiereFinal === false) {
            const unidadFinal = dto.unidadMedida ?? tipo.unidadMedida;
            if (!unidadFinal || !CatalogService.UNIDADES_MEDIDA.includes(unidadFinal)) {
                errores.push(`Debe seleccionar la unidad de medida (${CatalogService.UNIDADES_MEDIDA.join(', ')}) cuando el tipo no requiere número de serie individual.`);
            }
        }
        if (errores.length) {
            throw new BadRequestException(errores.join(' '));
        }

        // CU-26 Excepción 2: la nueva combinación nombre+marca+modelo no debe existir
        const nombreFinal = dto.nombre?.trim() ?? tipo.nombre;
        const marcaFinal = dto.marca?.trim() ?? tipo.marca ?? '';
        const modeloFinal = dto.modelo?.trim() ?? tipo.modelo ?? '';
        const duplicado = await this.catalogRepository.findOne({
            where: { nombre: nombreFinal, marca: marcaFinal, modelo: modeloFinal, activo: true }
        });
        if (duplicado && duplicado.id_tipo_equipo !== idNum) {
            throw new ConflictException('Ya existe un tipo de equipo con esa combinación de nombre, marca y modelo.');
        }

        const datosActualizar: Partial<TipoEquipo> = {};
        if (dto.nombre !== undefined) datosActualizar.nombre = dto.nombre.trim();
        if (dto.categoria !== undefined) datosActualizar.categoria = dto.categoria.trim();
        if (dto.marca !== undefined) datosActualizar.marca = dto.marca.trim();
        if (dto.modelo !== undefined) datosActualizar.modelo = dto.modelo.trim();
        if (dto.descripcionTecnica !== undefined) datosActualizar.descripcionTecnica = dto.descripcionTecnica.trim() || null;
        if (dto.garantiaDias !== undefined) datosActualizar.garantiaDias = dto.garantiaDias;
        if (dto.requiereSerialNumber !== undefined) datosActualizar.requiereSerialNumber = dto.requiereSerialNumber;
        // la unidad de medida solo aplica a consumibles
        if (requiereFinal === false) {
            if (dto.unidadMedida !== undefined) datosActualizar.unidadMedida = dto.unidadMedida;
        } else if (dto.requiereSerialNumber === true) {
            datosActualizar.unidadMedida = null;
        }

        const valorAnterior = {
            nombre: tipo.nombre, categoria: tipo.categoria, marca: tipo.marca, modelo: tipo.modelo,
            descripcionTecnica: tipo.descripcionTecnica, unidadMedida: tipo.unidadMedida,
            garantiaDias: tipo.garantiaDias, requiereSerialNumber: tipo.requiereSerialNumber,
        };

        await this.catalogRepository.update(idNum, datosActualizar);

        // CU-26: la edición queda registrada en el log de auditoría
        await this.auditoriaService.create({
            id_usuario: actorId ?? 0,
            accion: 'EDITAR',
            entidad_afectada: 'tipo_equipo',
            id_entidad_afectada: idNum,
            valor_anterior: valorAnterior,
            valor_nuevo: datosActualizar,
        });

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

    // CU-27: eliminación física, solo permitida si el tipo no tiene registros asociados
    async eliminarTipoFisico(id: string, idEmpresaContexto: number, actorId?: number) {
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            throw new BadRequestException('El ID proporcionado debe ser un número válido.');
        }

        const tipo = await this.catalogRepository.findOne({
            where: { id_tipo_equipo: idNum, id_empresa: idEmpresaContexto }
        });

        if (!tipo) {
            throw new NotFoundException('El tipo de equipo que intenta eliminar no existe o no pertenece a su empresa.');
        }

        // CU-27 Excepción 1: con al menos una unidad registrada (en cualquier
        // estado) solo se permite la desactivación lógica
        const totalUnidades = await this.unitRepository.count({
            where: { id_tipo_equipo: idNum }
        });
        const totalStockConsumible = await this.dataSource.getRepository(StockConsumible).count({
            where: { id_tipo_equipo: idNum }
        });

        if (totalUnidades > 0 || totalStockConsumible > 0) {
            throw new ConflictException('No es posible eliminar este tipo de equipo porque tiene unidades registradas. Solo se permite la desactivación lógica.');
        }

        // se elimina también la ficha técnica adjunta del servidor, si existe
        if (tipo.fichaTecnicaPdfUrl && existsSync(tipo.fichaTecnicaPdfUrl)) {
            unlinkSync(tipo.fichaTecnicaPdfUrl);
        }

        await this.catalogRepository.remove(tipo);

        await this.auditoriaService.create({
            id_usuario: actorId ?? 0,
            accion: 'ELIMINAR',
            entidad_afectada: 'tipo_equipo',
            id_entidad_afectada: idNum,
            valor_anterior: { nombre: tipo.nombre, marca: tipo.marca, modelo: tipo.modelo },
            valor_nuevo: null,
        });

        return {
            success: true,
            message: 'El tipo de equipo fue eliminado definitivamente del catálogo.'
        };
    }

    validarFormatoSerialNumber(serial: string): boolean {

        if (!serial || serial.trim() === '') {
            throw new BadRequestException('El número de serie es un campo obligatorio y no puede estar vacío.');
        }
        const regex = /^[A-Z0-9-]{4,30}$/;
        if (!regex.test(serial)) {
            // CU-28 Excepción 1: mensaje exacto del caso de uso
            throw new BadRequestException('El formato del número de serie es inválido. Debe contener entre 4 y 30 caracteres alfanuméricos y guiones. No se permiten espacios ni caracteres especiales.');
        }
        return true;
    }

    async adjuntarPdfPath(id: string, path: string, nombreOriginal?: string) {
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            throw new BadRequestException('El ID provisto no es válido.');
        }

        const tipo = await this.catalogRepository.findOne({ where: { id_tipo_equipo: idNum } });
        if (!tipo) {
            throw new NotFoundException('El tipo de equipo especificado no existe en el sistema.');
        }

        // CU-29: un nuevo archivo reemplaza al anterior (solo 1 PDF por tipo)
        if (tipo.fichaTecnicaPdfUrl && tipo.fichaTecnicaPdfUrl !== path && existsSync(tipo.fichaTecnicaPdfUrl)) {
            unlinkSync(tipo.fichaTecnicaPdfUrl);
        }

        tipo.fichaTecnicaPdfUrl = path;
        tipo.fichaTecnicaNombre = nombreOriginal ?? null;

        await this.catalogRepository.save(tipo);

        return {
            success: true,
            id_tipo_equipo: tipo.id_tipo_equipo,
            ficha_tecnica_pdf_url: tipo.fichaTecnicaPdfUrl,
            ficha_tecnica_nombre: tipo.fichaTecnicaNombre,
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
            ficha_tecnica_nombre: null,
            message: `El tipo de equipo [${tipo.nombre}] no posee una ficha técnica en PDF adjunta en el catálogo actualmente.`
        };
        }

        return {
            tieneFicha: true,
            id_tipo_equipo: tipo.id_tipo_equipo,
            nombre_equipo: tipo.nombre,
            ficha_tecnica_pdf_url: tipo.fichaTecnicaPdfUrl,
            ficha_tecnica_nombre: tipo.fichaTecnicaNombre ?? null
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