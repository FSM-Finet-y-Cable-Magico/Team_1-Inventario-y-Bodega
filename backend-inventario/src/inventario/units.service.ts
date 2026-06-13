import { Injectable, BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In } from "typeorm";
import { UnidadEquipo } from "./entities/unidad-equipo.entity";
import { TipoEquipo } from "./entities/tipo-equipo.entity";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { StockConsumible } from "../bodegas/entities/stock-consumible.entity";
import { Usuario } from "../usuarios/entities/usuario.entity";
import { EMPRESAS } from "../companies/companies.service";
import { CatalogService } from "./catalog.service";
import { HistorialEstado } from "./entities/historial-estado.entity";
import { EditarDatosUnidadDto } from "./dto/editar-datos-unidad.dto";

const MAC_REGEX = /^([0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}$/;

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

    async listarUnidades(filtros: { estado?: string; buscar?: string }, idEmpresaContexto: number) {
        const qb = this.unitRepository.createQueryBuilder('unidad')
            .leftJoinAndSelect('unidad.tipoEquipo', 'tipoEquipo')
            .where('unidad.id_empresa = :idEmpresa', { idEmpresa: idEmpresaContexto });

        if (filtros.estado) {
            qb.andWhere('unidad.estado = :estado', { estado: filtros.estado });
        }

        if (filtros.buscar) {
            qb.andWhere(
                '(unidad.serialNumber ILIKE :buscar OR unidad.modelo ILIKE :buscar OR tipoEquipo.nombre ILIKE :buscar)',
                { buscar: `%${filtros.buscar.trim()}%` },
            );
        }

        const unidades = await qb.orderBy('unidad.id_unidad', 'DESC').getMany();

        const resultado: any[] = unidades.map((u) => ({
            id_unidad: u.id_unidad,
            numero_serie: u.serialNumber,
            mac_address: u.macAddress ?? null,
            modelo: u.modelo ?? u.tipoEquipo?.modelo ?? null,
            estado: u.estado,
            proveedor: u.proveedor ?? null,
            fecha_adquisicion: u.fechaAdquisicion,
            fecha_venc_garantia: u.fechaVencGarantia,
            // CU-38 Excepción 1: sin fecha de adquisición o sin garantía configurada
            garantia_no_calculable: !u.fechaAdquisicion || u.tipoEquipo?.garantiaDias === null || u.tipoEquipo?.garantiaDias === undefined,
            id_bodega_actual: u.id_bodega_actual,
            es_consumible: false,
            tipo_equipo: u.tipoEquipo
                ? { nombre: u.tipoEquipo.nombre, categoria: u.tipoEquipo.categoria, marca: u.tipoEquipo.marca ?? null, modelo: u.tipoEquipo.modelo ?? null }
                : null,
        }));

        // CU-28/CU-31: los consumibles no son unidades individualizadas, pero deben
        // aparecer en el listado general junto al resto de unidades.
        // Solo se muestran si no hay filtro de estado o si se filtra por "En bodega"
        // (el stock consumible siempre está disponible en bodega).
        if (!filtros.estado || filtros.estado === 'En bodega') {
            const consumibleQb = this.dataSource.getRepository(StockConsumible)
                .createQueryBuilder('stock')
                .innerJoinAndSelect('stock.tipoEquipo', 'tipoEquipo')
                .innerJoin('stock.bodega', 'bodega')
                .where('bodega.id_empresa = :idEmpresa', { idEmpresa: idEmpresaContexto })
                .andWhere('stock.cantidad_disponible > 0');

            if (filtros.buscar) {
                consumibleQb.andWhere('tipoEquipo.nombre ILIKE :buscar', { buscar: `%${filtros.buscar.trim()}%` });
            }

            const consumibles = await consumibleQb.orderBy('stock.id_stock', 'DESC').getMany();

            for (const c of consumibles) {
                const cantidad = Number(c.cantidad_disponible);
                const unidadMedida = c.tipoEquipo?.unidadMedida ?? 'unidades';
                resultado.push({
                    // Usamos id negativo para distinguir del serializado y evitar colisiones visuales
                    id_unidad: -c.id_stock,
                    numero_serie: `${cantidad} ${unidadMedida}`,
                    mac_address: null,
                    modelo: null,
                    estado: 'En bodega',
                    proveedor: null,
                    fecha_adquisicion: null,
                    fecha_venc_garantia: null,
                    garantia_no_calculable: true,
                    id_bodega_actual: c.id_bodega,
                    es_consumible: true,
                    id_stock_consumible: c.id_stock,
                    cantidad_disponible: cantidad,
                    unidad_medida: unidadMedida,
                    tipo_equipo: c.tipoEquipo
                        ? { nombre: c.tipoEquipo.nombre, categoria: c.tipoEquipo.categoria, marca: c.tipoEquipo.marca ?? null, modelo: c.tipoEquipo.modelo ?? null }
                        : null,
                });
            }
        }

        // Ordenar por ID descendente (los consumibles con id negativo quedan junto
        // a los serializados según su id_stock de creación).
        return resultado.sort((a, b) => Math.abs(b.id_unidad) - Math.abs(a.id_unidad));
    }

    async registrarUnidad(dto: { id_tipo_equipo: number; numero_serie: string; modelo?: string; id_bodega_actual: number; fecha_adquisicion?: string; mac_address?: string; proveedor?: string; observaciones?: string }, idEmpresaContexto: number) {

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
                `El número de serie [${serieNormalizada}] ya se encuentra registrado en el sistema.`
            );
        }

        let macNormalizada: string | undefined;
        if (dto.mac_address) {
            macNormalizada = dto.mac_address.trim().toUpperCase();
            if (!MAC_REGEX.test(macNormalizada)) {
                throw new BadRequestException(
                    'El formato de la dirección MAC es inválido. Debe tener el formato XX:XX:XX:XX:XX:XX con dígitos hexadecimales.'
                );
            }
            const existeMac = await this.unitRepository.findOne({ where: { macAddress: macNormalizada } });
            if (existeMac) {
                throw new ConflictException(
                    `Conflicto de Inventario: La dirección MAC [${macNormalizada}] ya está registrada en otro equipo del sistema.`
                );
            }
        }

        // CU-38 Excepción 1: sin fecha de adquisición la garantía no es calculable
        // (la ficha mostrará 'Garantía no calculable'), por lo que no se inventa una fecha
        let fechaAdq: Date | null = null;
        if (dto.fecha_adquisicion) {
            fechaAdq = new Date(dto.fecha_adquisicion);
            if (isNaN(fechaAdq.getTime())) {
                throw new BadRequestException('La fecha de adquisición no tiene un formato válido (DD/MM/YYYY).');
            }
            // CU-32: la fecha de adquisición no puede ser futura
            const hoyFin = new Date();
            hoyFin.setHours(23, 59, 59, 999);
            if (fechaAdq > hoyFin) {
                throw new BadRequestException('La fecha de adquisición no puede ser una fecha futura.');
            }
        }

        // CU-38: vencimiento de garantía = fecha de adquisición + días del tipo de equipo
        const tipo = await this.dataSource.getRepository(TipoEquipo).findOne({
            where: { id_tipo_equipo: dto.id_tipo_equipo },
        });
        let fechaVencGarantia: Date | null = null;
        if (fechaAdq && tipo?.garantiaDias && tipo.garantiaDias > 0) {
            fechaVencGarantia = new Date(fechaAdq);
            fechaVencGarantia.setDate(fechaVencGarantia.getDate() + tipo.garantiaDias);
        }

        const datosNuevaUnidad: Partial<UnidadEquipo> = {
            id_tipo_equipo: dto.id_tipo_equipo,
            id_empresa: idEmpresaContexto,
            serialNumber: serieNormalizada,
            modelo: dto.modelo ? dto.modelo.trim() : undefined,
            estado: 'En bodega',
            id_bodega_actual: dto.id_bodega_actual,
            fechaAdquisicion: fechaAdq ?? undefined,
            fechaVencGarantia: fechaVencGarantia,
            macAddress: macNormalizada ?? null,
            proveedor: dto.proveedor?.trim() || null,
            observaciones: dto.observaciones?.trim().slice(0, 300) || null,
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

    // CU-28/CU-31: los consumibles (NS=No) se ingresan por cantidad y unidad de medida
    async ingresarConsumible(
        dto: { id_tipo_equipo: number; id_bodega: number; cantidad: number },
        idEmpresaContexto: number,
    ) {
        if (!dto.id_tipo_equipo || !dto.id_bodega) {
            throw new BadRequestException('El tipo de equipo y la bodega de destino son campos obligatorios.');
        }

        // CU-31 Excepción 1: si el tipo no tiene definido 'Requiere número de
        // serie individual', determinarNaturalezaEquipo lanza el error de configuración
        const naturaleza = await this.catalogService.determinarNaturalezaEquipo(dto.id_tipo_equipo, idEmpresaContexto);
        if (naturaleza.clasificacion !== 'CONSUMIBLE / VOLUMEN') {
            throw new BadRequestException(
                `El tipo [${naturaleza.nombre}] requiere número de serie individual. Debe registrarse como unidad de equipo, no por cantidad.`
            );
        }

        // CU-28 Excepción 2: la cantidad debe ser un entero positivo mayor a 0
        const cantidad = Number(dto.cantidad);
        if (!Number.isInteger(cantidad) || cantidad <= 0) {
            throw new BadRequestException('La cantidad debe ser un número entero positivo mayor a cero.');
        }

        const bodega = await this.dataSource.getRepository(Bodega).findOne({
            where: { id_bodega: dto.id_bodega, id_empresa: idEmpresaContexto },
        });
        if (!bodega || !bodega.activa) {
            throw new BadRequestException('La bodega de destino no existe o no está activa en su empresa.');
        }

        const tipo = await this.dataSource.getRepository(TipoEquipo).findOne({
            where: { id_tipo_equipo: dto.id_tipo_equipo },
        });

        const stockRepo = this.dataSource.getRepository(StockConsumible);
        let stock = await stockRepo.findOne({
            where: { id_tipo_equipo: dto.id_tipo_equipo, id_bodega: dto.id_bodega },
        });
        if (!stock) {
            stock = stockRepo.create({
                id_tipo_equipo: dto.id_tipo_equipo,
                id_bodega: dto.id_bodega,
                cantidad_disponible: 0,
            });
        }
        stock.cantidad_disponible = Number(stock.cantidad_disponible) + cantidad;
        await stockRepo.save(stock);

        return {
            success: true,
            id_tipo_equipo: dto.id_tipo_equipo,
            id_bodega: dto.id_bodega,
            cantidad_ingresada: cantidad,
            cantidad_disponible: stock.cantidad_disponible,
            unidad_medida: tipo?.unidadMedida ?? null,
            message: `Se ingresaron ${cantidad} ${tipo?.unidadMedida ?? 'unidades'} de [${naturaleza.nombre}] al stock de la bodega [${bodega.nombre}].`,
        };
    }

    async transicionarEstado(unitId: number, nuevoEstado: string, actor: any, motivoPayload?: string, diagnosticoPayload?: string, descripcionOtroPayload?: string, simularErrorHistorial?: boolean) {

        // CU-36: la observación es opcional, con máximo 300 caracteres
        const observacion = motivoPayload?.trim() || undefined;
        if (observacion && observacion.length > 300) {
            throw new BadRequestException('La observación no puede superar los 300 caracteres.');
        }

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

        // CU-35 Excepción 1: mensaje exacto del caso de uso
        if (!transicionesPermitidas[estadoOrigen]?.includes(nuevoEstado)) {
            throw new BadRequestException('Transición de estado no permitida para este equipo.');
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

            // CU-40 Excepción 1: si selecciona "Otro" debe incluir una descripción
            // obligatoria (entre 5 y 200 caracteres); mensaje exacto del caso de uso
            if (diagnosticoNormalizado === 'Otro') {
                const descripcion = (descripcionOtroPayload ?? motivoPayload)?.trim() ?? '';
                if (descripcion.length < 5 || descripcion.length > 200) {
                    throw new BadRequestException('Debe ingresar una descripción cuando selecciona Otro.');
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

        // CU-36: registro transaccional del cambio de estado con reintentos.
        // Si falla la escritura del historial se reintenta toda la transacción
        // hasta 3 veces. En modo QA/development se puede forzar el error con
        // el flag simularErrorHistorial para comprobar la Excepción 1.
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();

        const maxIntentos = 3;
        let ultimoError: Error | undefined;

        try {
            for (let intento = 0; intento < maxIntentos; intento++) {
                await queryRunner.startTransaction();
                try {
                    unidad.estado = nuevoEstado;
                    await queryRunner.manager.save(unidad);

                    const fechaChile = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));

                    // CU-36/CU-40: el historial registra la observación opcional y, al
                    // entrar a revisión, también el diagnóstico técnico
                    let motivoHistorial = observacion ?? 'Cambio de estado ordinario';
                    if (nuevoEstado === 'En revisión') {
                        motivoHistorial = `Ingreso a taller técnico. Diagnóstico: ${unidad.diagnosticoTecnico}`;
                        // si la descripción de "Otro" vino en el campo de observación
                        // (compatibilidad), no se duplica como observación general
                        const obsExtra = (!descripcionOtroPayload && unidad.diagnosticoTecnico?.startsWith('Otro:')) ? undefined : observacion;
                        if (obsExtra) motivoHistorial += `. Observación: ${obsExtra}`;
                    }

                    const nuevoHistorial = this.historyRepository.create({
                        id_unidad: unidad.id_unidad,
                        id_usuario: actor.id_usuario,
                        estadoAnterior: estadoOrigen,
                        estadoNuevo: nuevoEstado,
                        motivo: motivoHistorial,
                        fechaHora: fechaChile
                    });

                    if (simularErrorHistorial) {
                        throw new Error('Simulación de error al registrar el historial de estados.');
                    }

                    await queryRunner.manager.save(nuevoHistorial);
                    await queryRunner.commitTransaction();

                    return {
                        success: true,
                        estadoActual: unidad.estado,
                        diagnostico_registrado: unidad.diagnosticoTecnico ?? 'N/A'
                    };
                } catch (err) {
                    ultimoError = err instanceof Error ? err : new Error(String(err));
                    await queryRunner.rollbackTransaction().catch(() => {
                        /* la transacción ya puede estar abortada */
                    });
                    if (intento < maxIntentos - 1) {
                        await new Promise((resolve) => setTimeout(resolve, 100 * (intento + 1)));
                    }
                }
            }

            throw new BadRequestException(
                'Error al registrar el cambio en el historial. El sistema reintentó la escritura pero el error persiste.',
            );
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
            no_calculable: false,
            dias_restantes: 0,
            mensaje_alerta: 'Este dispositivo fue registrado sin un contrato de garantía comercial asociado.'
        };

        // CU-38 Excepción 1: sin fecha de adquisición o sin duración de garantía
        // configurada en el tipo, la garantía no es calculable
        const garantiaDiasTipo = unidad.tipoEquipo?.garantiaDias;
        if (!unidad.fechaAdquisicion || garantiaDiasTipo === null || garantiaDiasTipo === undefined) {
            alertaGarantia = {
                posee_garantia: false,
                garantia_vigente: false,
                no_calculable: true,
                dias_restantes: 0,
                mensaje_alerta: 'Garantía no calculable'
            };
        } else if (unidad.fechaVencGarantia) {

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
                no_calculable: false,
                dias_restantes: diasCalculados,
                mensaje_alerta: `¡ALERTA VIGENTE! El dispositivo cuenta con cobertura de soporte técnico de fábrica por ${diasCalculados} días más.`
            };
        } else {
                alertaGarantia = {
                    posee_garantia: true,
                    garantia_vigente: false,
                    no_calculable: false,
                    dias_restantes: 0, // Ya expiró, el contador de días hábiles restantes cae a cero
                    mensaje_alerta: `COBERTURA EXPIRADA. La garantía comercial de este hardware venció hace ${Math.abs(diasCalculados)} días.`
                };
            }
        }

        // CU-33: bodega actual (nombre) y empresa propietaria
        const bodega = unidad.id_bodega_actual
            ? await this.dataSource.getRepository(Bodega).findOne({ where: { id_bodega: unidad.id_bodega_actual } })
            : null;
        const empresa = EMPRESAS.find((e) => e.id === unidad.id_empresa) ?? null;

        // CU-33: ficha plana con todos los campos del caso de uso
        return {
            id_unidad: unidad.id_unidad,
            numero_serie: unidad.serialNumber,
            mac_address: unidad.macAddress ?? null,
            tipo_equipo: {
                nombre: unidad.tipoEquipo?.nombre ?? null,
                categoria: unidad.tipoEquipo?.categoria ?? null,
                marca: unidad.tipoEquipo?.marca ?? null,
                modelo: unidad.tipoEquipo?.modelo ?? null,
                ficha_tecnica_pdf_url: unidad.tipoEquipo?.fichaTecnicaPdfUrl ?? null,
            },
            marca: unidad.tipoEquipo?.marca ?? null,
            modelo: unidad.modelo ?? unidad.tipoEquipo?.modelo ?? null,
            empresa: empresa?.nombre ?? null,
            id_empresa: unidad.id_empresa,
            bodega: bodega?.nombre ?? null,
            id_bodega_actual: unidad.id_bodega_actual ?? null,
            estado: unidad.estado,
            proveedor: unidad.proveedor ?? null,
            fecha_adquisicion: unidad.fechaAdquisicion ?? null,
            fecha_venc_garantia: unidad.fechaVencGarantia ?? null,
            garantia: alertaGarantia,
            ubicacion_fisica: unidad.ubicacionFisica ?? null,
            observaciones: unidad.observaciones ?? null,
            numero_poste: unidad.numeroPoste ?? null,
            id_cliente_instalado: unidad.id_cliente_instalado ?? null,
            id_caja_nap: unidad.id_caja_nap ?? null,
        };
    }

    async editarDatos(
        idUnidad: number,
        dto: EditarDatosUnidadDto,
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

        // CU-34: las observaciones van a su propio campo (no al diagnóstico técnico)
        if (dto.observaciones !== undefined) unidad.observaciones = dto.observaciones;
        // CU-34: la ubicación física solo aplica con la unidad en bodega
        if (dto.ubicacion_fisica !== undefined) {
            if (unidad.estado !== 'En bodega') {
                throw new BadRequestException(
                    'La ubicación física en bodega solo puede editarse cuando la unidad está en estado [En bodega].',
                );
            }
            unidad.ubicacionFisica = dto.ubicacion_fisica;
        }
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

        // CU-36/CU-37: el historial incluye el nombre del usuario y la empresa
        const idsUsuarios = [...new Set(historial.map((h) => h.id_usuario).filter(Boolean))];
        const usuarios = idsUsuarios.length
            ? await this.dataSource.getRepository(Usuario).findBy({ id_usuario: In(idsUsuarios) as any })
            : [];
        const mapaUsuarios = new Map(usuarios.map((u) => [u.id_usuario, u.nombre_completo]));
        const nombreEmpresa = EMPRESAS.find((e) => e.id === idEmpresaContexto)?.nombre ?? null;

        if (!historial || historial.length === 0) {

            const existeEquipo = await this.unitRepository.findOne({
                where: { serialNumber: serialNormalizado, id_empresa: idEmpresaContexto }
            });

            if (!existeEquipo) {
                // CU-33/CU-37 Excepción 1: mensaje exacto del caso de uso
                throw new NotFoundException('Número de serie no encontrado.');
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
                observacion_motivo: item.motivo,
                // CU-36/CU-37: usuario responsable y empresa del movimiento
                usuario: mapaUsuarios.get(item.id_usuario) ?? null,
                empresa: nombreEmpresa
            }))
        };
    }
}
