import { Injectable, BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { UnidadEquipo } from "./entities/unidad-equipo.entity";
import { CatalogService } from "./catalog.service";
import { HistorialEstado } from "./entities/historial-estado.entity";

@Injectable()
export class UnitsService {
    constructor(
        @InjectRepository(UnidadEquipo)
        private readonly unitRepository: Repository<UnidadEquipo>,
        @InjectRepository(HistorialEstado)
        private readonly historyRepository: Repository<HistorialEstado>,
        private readonly catalogService: CatalogService,
        private readonly dataSource: DataSource,
    ) {}

    async registrarUnidad(dto: { id_tipo_equipo: number; numero_serie: string; modelo?: string; id_bodega_actual: number; fecha_adquisicion?: string; fecha_venc_garantia?: string }, idEmpresaContexto: number) {

        if (!dto.id_tipo_equipo || !dto.numero_serie || !dto.id_bodega_actual) {
            throw new BadRequestException('El tipo de equipo, el número de serie y la bodega de destino son campos obligatorios.');
        }


        const naturaleza = await this.catalogService.determinarNaturalezaEquipo(dto.id_tipo_equipo, idEmpresaContexto);
        if (naturaleza.clasificacion === 'CONSUMIBLE / VOLUMEN') {
            throw new BadRequestException(
                `Restricción de Flujo (CU-32): El ítem [${naturaleza.nombre}] está clasificado como Consumible. ` +
                `No se puede registrar de manera individualizada en esta tabla.`
            );
        }


        this.catalogService.validarFormatoSerialNumber(dto.numero_serie.trim());

        const serieNormalizada = dto.numero_serie.trim();
        const existeUnidad = await this.unitRepository.findOne({
            where: { serialNumber: serieNormalizada }
        });

        if (existeUnidad) {
            throw new ConflictException(
                `Conflicto de Inventario: El número de serie [${serieNormalizada}] ya se encuentra registrado en el sistema ` +
                `en el estado [${existeUnidad.estado}]. No se permiten registros duplicados.`
            );
        }

        const fechaAdq = dto.fecha_adquisicion ? new Date(dto.fecha_adquisicion) : new Date();
        const fechaVencGarantia = dto.fecha_venc_garantia ? new Date(dto.fecha_venc_garantia) : null;

        const datosNuevaUnidad: Partial<UnidadEquipo> = {
            id_tipo_equipo: dto.id_tipo_equipo,
            id_empresa: idEmpresaContexto,
            serialNumber: serieNormalizada,
            modelo: dto.modelo ? dto.modelo.trim() : undefined,
            estado: 'En bodega',
            id_bodega_actual: dto.id_bodega_actual,
            fechaAdquisicion: fechaAdq,
            fechaVencGarantia: fechaVencGarantia,
        };

        const nuevaUnidad = this.unitRepository.create(datosNuevaUnidad);

        const unidadGuardada = await this.unitRepository.save(nuevaUnidad) as UnidadEquipo;


        return {
            success: true,
            id_unidad: unidadGuardada.id_unidad,
            numero_serie: unidadGuardada.serialNumber,
            estado: unidadGuardada.estado,
            id_empresa: unidadGuardada.id_empresa,
            message: 'La unidad física de equipo ha sido registrada en el inventario e ingresada a la bodega con éxito.'
        };
    }

    async transicionarEstado(unitId: number, nuevoEstado: string, actor: any, motivoPayload?: string, diagnosticoPayload?: string) {
    
        const unidad = await this.unitRepository.findOne({ 
            where: { id_unidad: unitId },
            relations: { tipoEquipo: true }
        });
        if (!unidad) throw new NotFoundException('El equipo solicitado no existe.');

        const estadoOrigen = unidad.estado;


        const transicionesPermitidas: Record<string, string[]> = {
            'En bodega': ['Asignado a técnico', 'En préstamo externo', 'Dado de baja'],
            'Asignado a técnico': ['Instalado en cliente', 'En bodega', 'En revisión'],
            'Instalado en cliente': ['En revisión'],
            'En revisión': ['En bodega', 'En préstamo externo', 'Dado de baja'],
            'En préstamo externo': ['En bodega'],
            'Dado de baja': [],
        };

        if (!transicionesPermitidas[estadoOrigen]?.includes(nuevoEstado)) {
            throw new BadRequestException(`Transición inválida. No se puede pasar de [${estadoOrigen}] a [${nuevoEstado}].`);
        }

        if (nuevoEstado === 'En revisión') {
            // CU-40 Excepción 1: diagnóstico técnico obligatorio al ingresar a revisión
            if (!diagnosticoPayload || diagnosticoPayload.trim() === '') {
                throw new BadRequestException(
                    'Debe seleccionar un diagnóstico técnico para enviar el equipo a revisión.',
                );
            }

            const DIAGNOSTICOS_PERMITIDOS = [
                'No enciende',
                'Se reinicia continuamente',
                'Sin señal óptica',
                'Copla o puerto dañado',
                'Falla de configuración',
                'Daño físico visible',
                'Causa desconocida',
                'Otro',
            ];

            const diagnosticoNormalizado = diagnosticoPayload.trim();

            if (!DIAGNOSTICOS_PERMITIDOS.includes(diagnosticoNormalizado)) {
                throw new BadRequestException(
                    `El diagnóstico seleccionado no es válido. Opciones permitidas: ${DIAGNOSTICOS_PERMITIDOS.join(', ')}.`,
                );
            }

            // CU-40 Excepción 1: si selecciona "Otro" debe incluir descripción en motivoPayload
            if (diagnosticoNormalizado === 'Otro') {
                const descripcion = motivoPayload?.trim() ?? '';
                if (descripcion.length < 5 || descripcion.length > 200) {
                    throw new BadRequestException(
                        'Debe ingresar una descripción cuando selecciona Otro (entre 5 y 200 caracteres).',
                    );
                }
                unidad.diagnosticoTecnico = `Otro: ${descripcion}`;
            } else {
                unidad.diagnosticoTecnico = diagnosticoNormalizado;
            }
        }

        if (estadoOrigen === 'En bodega' && nuevoEstado !== 'En bodega') {
            unidad.id_bodega_actual = undefined;
            unidad.numeroPoste = undefined;
        }

        // Apertura del QueryRunner transaccional (ACID)
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {

            unidad.estado = nuevoEstado;
            await queryRunner.manager.save(unidad);

            const fechaChile = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
            
            const nuevoHistorial = this.historyRepository.create({
                id_unidad: unidad.id_unidad,
                id_usuario: actor.id_usuario,
                estadoAnterior: estadoOrigen,
                estadoNuevo: nuevoEstado,
                motivo: nuevoEstado === 'En revisión' ? `Ingreso a taller técnico. Diagnóstico: ${unidad.diagnosticoTecnico}` : (motivoPayload ?? 'Cambio de estado ordinario'),
                fechaHora: fechaChile
            });
            
            await queryRunner.manager.save(nuevoHistorial);
            await queryRunner.commitTransaction();
            
            return { 
                success: true, 
                estadoActual: unidad.estado,
                diagnostico_registrado: unidad.diagnosticoTecnico ?? 'N/A'
            };

        } catch (error) {
                await queryRunner.rollbackTransaction();
                throw error;
            } finally {
                await queryRunner.release();
            }
    }

    async verFichaDetalle(idUnidad: number, idEmpresaContexto: number) {
        if (!idUnidad || isNaN(idUnidad)) {
            throw new BadRequestException('El identificador de la unidad proporcionado es inválido.');
        }

        const unidad = await this.unitRepository.findOne({
            where: { id_unidad: idUnidad, id_empresa: idEmpresaContexto },
            relations: { tipoEquipo: true }
        });

        if (!unidad) {
            throw new NotFoundException(`No se encontró ninguna unidad con el ID [${idUnidad}].`);
        }

        let alertaGarantia = {
            posee_garantia: false,
            garantia_vigente: false,
            dias_restantes: 0,
            mensaje_alerta: 'Este dispositivo fue registrado sin un contrato de garantía comercial asociado.'
        };

        if (unidad.fechaVencGarantia) {

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const fechaVencimiento = new Date(unidad.fechaVencGarantia);
        fechaVencimiento.setHours(0, 0, 0, 0);

        const diferenciaMilisegundos = fechaVencimiento.getTime() - hoy.getTime();
        const diasCalculados = Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24));

        if (diasCalculados >= 0) {
            alertaGarantia = {
                posee_garantia: true,
                garantia_vigente: true,
                dias_restantes: diasCalculados,
                mensaje_alerta: `¡ALERTA VIGENTE! El dispositivo cuenta con cobertura de soporte técnico de fábrica por ${diasCalculados} días más.`
            };
        } else {
                alertaGarantia = {
                    posee_garantia: true,
                    garantia_vigente: false,
                    dias_restantes: 0, // Ya expiró, el contador de días hábiles restantes cae a cero
                    mensaje_alerta: `COBERTURA EXPIRADA. La garantía comercial de este hardware venció hace ${Math.abs(diasCalculados)} días.`
                };
            }
        }

        return {
            success: true,
            datos_unidad: {
                id_unidad: unidad.id_unidad,
                numero_serie: unidad.serialNumber,
                modelo: unidad.modelo ?? 'No especificado',
                estado_actual: unidad.estado,
                fecha_adquisicion: unidad.fechaAdquisicion,
                fecha_vencimiento_garantia: unidad.fechaVencGarantia ?? 'Sin registrar'
            },
            alerta_visual_garantia: alertaGarantia,
            especificaciones_catalogo: {
                nombre_comercial: unidad.tipoEquipo.nombre,
                categoria_inventario: unidad.tipoEquipo.categoria,
                ficha_tecnica_pdf_url: unidad.tipoEquipo.fichaTecnicaPdfUrl ?? 'No disponible'
            }
        };
    }

    async editarDatos(
        idUnidad: number,
        dto: { observaciones?: string; id_bodega_actual?: number; numero_poste?: string; modelo?: string },
        actor: any
    ) {
        if (!idUnidad || isNaN(idUnidad)) {
            throw new BadRequestException('El ID de la unidad es inválido.');
        }

        const unidad = await this.unitRepository.findOne({
            where: { id_unidad: idUnidad, id_empresa: actor.id_empresa },
        });

        if (!unidad) {
            throw new NotFoundException(`No se encontró la unidad con ID [${idUnidad}] en su empresa.`);
        }

        if (dto.observaciones !== undefined) unidad.diagnosticoTecnico = dto.observaciones;
        if (dto.id_bodega_actual !== undefined) unidad.id_bodega_actual = dto.id_bodega_actual;
        if (dto.numero_poste !== undefined) unidad.numeroPoste = dto.numero_poste;
        if (dto.modelo !== undefined) unidad.modelo = dto.modelo;

        await this.unitRepository.save(unidad);

        return {
            success: true,
            id_unidad: unidad.id_unidad,
            message: 'Los datos de la unidad fueron actualizados correctamente.'
        };
    }

    async verHistorialEstados(serialNumber: string, idEmpresaContexto: number) {

        if (!serialNumber || serialNumber.trim() === '') {
            throw new BadRequestException('El número de serie es un parámetro obligatorio para realizar el rastreo.');}

        const serialNormalizado = serialNumber.trim();

        const historial = await this.historyRepository.createQueryBuilder('historial')
        .innerJoin(UnidadEquipo, 'unidad', 'unidad.id_unidad = historial.id_unidad')
        .where('unidad.numero_serie = :serial', { serial: serialNormalizado })
        .andWhere('unidad.id_empresa = :idEmpresa', { idEmpresa: idEmpresaContexto })
        .orderBy('historial.fecha_hora', 'DESC')
        .getMany();

        if (!historial || historial.length === 0) {

            const existeEquipo = await this.unitRepository.findOne({
                where: { serialNumber: serialNormalizado, id_empresa: idEmpresaContexto }
            });

            if (!existeEquipo) {
                throw new NotFoundException(
                    `Rastreo de Auditoría (CU-37): El número de serie [${serialNormalizado}] no corresponde a ningún dispositivo registrado en su empresa.`
                );
            }


            return {
                success: true,
                numero_serie: serialNormalizado,
                total_movimientos: 0,
                historial_transiciones: [],
                message: 'El dispositivo se encuentra en su estado inicial de fábrica de manera íntegra. No registra movimientos históricos aún.'
            };
        }


        return {
            success: true,
            numero_serie: serialNormalizado,
            total_movimientos: historial.length,
            historial_transiciones: historial.map(item => ({
                id_historial: item.id_historial,
                estado_anterior: item.estadoAnterior,
                estado_nuevo: item.estadoNuevo,
                fecha_movimiento: item.fechaHora,
                observacion_motivo: item.motivo
            }))
        };
    }
}
