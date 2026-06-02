import { Injectable, BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TipoEquipo } from "./entities/tipo-equipo.entity";

@Injectable()
export class CatalogService {
    constructor(
        @InjectRepository(TipoEquipo)
        private readonly catalogRepository: Repository<TipoEquipo>,
    ){}

    async crearTipo(dto: any) {
        if (!dto.requiereSerialNumber && !dto.unidadMedida) {
            throw new BadRequestException("El campo 'Requiere numero de serie' es No y no se selecciono unidad de medida.");
        }

        const existe = await this.catalogRepository.findOne({
            where: {nombre: dto.nombre, marca: dto.marca, modelo: dto.modelo}
        });
        
        if (existe) {
            throw new ConflictException('Ya existe un tipo de equipo con esa combinacion de nombre, marca y modelo.');
        }

        const nuevoTipo = this.catalogRepository.create(dto);
        return await this.catalogRepository.save(nuevoTipo);
    }

    async consultar(filtros: any) {
        const query = this.catalogRepository.createQueryBuilder('tipo');

        if (filtros.categoria) query.andWhere('tipo.categoria = :categoria', { categoria: filtros.categoria});
        if (filtros.estado) query.andWhere('tipo.estado = :estado', { estado: filtros.estado });
        if (filtros.buscar) {
            query.andWhere('(tipo.nombre ILIKE :b OR tipo.marca ILIKE :b OR tipo.modelo ILIKE :b)', {b: '%{filtros.buscar}%'});
        }

        const items = await query.getMany();

        if (items.length === 0) {
            throw new NotFoundException('No se encontraron tipos de equipo con los filtros seleccionados. [cite: 28]');
        }
        return items;
    }

    async editarTipo(id: string, dto: any) {
        const tipo = await this.catalogRepository.findOne({where: {id}, relations: {'unidades': true} });
        if (!tipo) throw new NotFoundException('Tipo de equipo no encontrado.');

        if (dto.requiereSerialNumber !== undefined && dto.requiereSerialNumber !== tipo.requiereSerialNumber) {
            if (tipo.unidades && tipo.unidades.length >0) {
                throw new BadRequestException('No es posible cambiar este campo porque existen ${tipo.unidades.length} unidades registradas para este tipo de equipo. [cite: 29]');
            }
        }

        if (dto.nombre || dto.marca || dto.modelo) {
            const nombre = dto.nombre || tipo.nombre;
            const marca = dto.marca || tipo.marca;
            const modelo = dto.modelo || tipo.modelo;

            const duplicado = await this.catalogRepository.findOne({
                where: {nombre, marca, modelo}
            });
            if (duplicado && duplicado.id !== id) {
                throw new ConflictException('Ya existe un tipo de equipo con esa combinacion de nombre, marca y modelo. [cite: 27, 29]');
            }
        }

        await this.catalogRepository.update(id, dto);
        return await this.catalogRepository.findOne({ where: {id} });
    }

    async desactivarTipo(id: string){
        const tipo = await this.catalogRepository.findOne({ where: {id}, relations: {'unidades': true} });
        if (!tipo) throw new NotFoundException('Tipo de equipo no encontrado');

        if (tipo.unidades && tipo.unidades.length > 0) {
            throw new BadRequestException('No es posible eliminar este tipo de equipo porque tiene unidades registradas. Solo se permite la desactivacion logica. [cite: 30]');
        }

        tipo.estado = 'Inactivo';
        return await this.catalogRepository.save(tipo);
    }

    validarFormatoSerialNumber(serial: string): boolean {
        const regex = /^[A-Z0-9-]{4,30}$/;
        if (!regex.test(serial)) {
            throw new BadRequestException('El formato del numero de serie es invalido. Debe contener entre 4 y 30 caracteres alfanuméricos y guiones. No se permiten espacios ni caracteres especiales. [cite: 31]');
        }
        return true;
    }

    async adjuntarPdfPath(id: string, path: string) {
        const tipo = await this.catalogRepository.findOne({ where: {id} });
        if (!tipo) throw new NotFoundException('Tipo de equipo no encontrado.');

        tipo.fichaTecnicaPdfPath = path;
        return await this.catalogRepository.save(tipo);
    }
}