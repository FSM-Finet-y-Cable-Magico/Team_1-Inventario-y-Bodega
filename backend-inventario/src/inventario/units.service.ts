import { Injectable, BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, Not } from "typeorm";
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
        private readonly dataSource: DataSource, // DataSource inyectado para abrir transacciones SQL
    ) {}

    async registrarUnidad(dto: any, empresaUsuario: string) {
        this.catalogService.validarFormatoSerialNumber(dto.serialNumber);

        const existeSns = await this.unitRepository.findOne({ where: { serialNumber: dto.serialNumber} });
        if (existeSns) {
            throw new ConflictException('El numero de serie [${dto.serialNumber}] ya se encuentra registrado en el sistema. [cite: 36]');
        }

        if (dto.macAdress) {
            const existeMac = await this.unitRepository.findOne({ where: {macAddress: dto.macAdress} });
            if (existeMac) throw new ConflictException('La direccion MAC ya existe en el sistema. [cite: 36]');
        }

        const nuevaUnidad = this.unitRepository.create({
            ...dto,
            empresa: empresaUsuario,
            estadoActual: 'En bodega', 
        });

        return await this.unitRepository.save(nuevaUnidad);
    }

    calcularVencimientoGarantia(fechaAdquisicion: Date, diasGarantia: number): string {
        if(diasGarantia === 0) return 'Sin garantia';

        const fecha = new Date(fechaAdquisicion);
        fecha.setDate(fecha.getDate() + diasGarantia);

        return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
    }

    verificarGarantiaVigente(fechaAdquisicion: Date, diasGarantia: number): { vigente: boolean; mensaje?: string } {
        if (diasGarantia === 0) return { vigente: false };

        const fechaAdq = new Date(fechaAdquisicion);
        const vencimiento = new Date(fechaAdq.setDate(fechaAdq.getDate() + diasGarantia));
        const hoy = new Date()

        if (hoy <= vencimiento) {
            const vencimientoFormato = `${String(vencimiento.getDate()).padStart(2, '0')}/${String(vencimiento.getMonth() + 1).padStart(2, '0')}/${vencimiento.getFullYear()}`;
            return {
                vigente: true,
                mensaje: `Aviso Este equipo tiene garantia vigente hasta [${vencimientoFormato}]. Considere su devolución al proveedor antes de proceder. `
            };
        }
        return {vigente: false};
    }

    async transicionarEstado(unitId: string, nuevoEstado: string, actor: any, observacion?: string, diagnostico?: string, ignorarAvisoGarantia: boolean = false) {
        const unidad = await this.unitRepository.findOne({ where: {id: unitId }, relations: {'tipoEquipo': true}});
        if (!unidad) throw new NotFoundException('Unidad de equipo no encontrada. [cite: 37]');

        const estadoOrigen = unidad.estadoActual;

        const transicionesValidas: Record<string, string[]> = {
            'En bodega': ['Asignado a técnico', 'En préstamo externo', 'Dado de baja'],
            'Asignado a técnico': ['Instalado en cliente', 'En bodega', 'En revisión'],
            'Instalado en cliente': ['En revisión'],
            'En revisión': ['En bodega', 'En préstamo externo', 'Dado de baja'],
            'En préstamo externo': ['En bodega'],
            'Dado de baja': [],
        };

        if (nuevoEstado === 'Dado de baja' || nuevoEstado === 'En revision'){
            const controlGarantia = this.verificarGarantiaVigente(unidad.fechaAdquisicion, unidad.tipoEquipo.duracionGarantiaDias);
            if (controlGarantia.vigente && !ignorarAvisoGarantia) {
                return {requiereConfirmacionGarantia: true, mensaje: controlGarantia.mensaje };
            }
        }

        if (nuevoEstado === 'En revision') {
            const diagnosticosPermitidos = ['No enciende', 'Se reinicia continuamente', 'Sin señal óptica', 'Copla o puerto dañado', 'Falla de configuración', 'Daño físico visible', 'Causa desconocida', 'Otro'];
            if (!diagnostico || !diagnosticosPermitidos.includes(diagnostico)) {
                throw new BadRequestException('Debe ingresar un diagnostico tecnico de las opciones predefinidas. [cite: 44]');
            }
            if (diagnostico === 'Otro' && (!observacion || observacion.length < 5 ||observacion.length >200)) {
                throw new BadRequestException('Debe ingresar una descripcion cuando selecciona Otro. [cite: 44]');
            }
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {

            unidad.estadoActual = nuevoEstado;
            if (estadoOrigen === 'En Bodega' && nuevoEstado !== 'En bodega') {
                unidad.ubicacionFisicaBodega = null;
            }
            await queryRunner.manager.save(unidad);

            const observacionLimpia = observacion === null ? undefined: observacion;
            const diagnosticoLimpio = nuevoEstado === 'En revision' ? (diagnostico ?? 'Causa desconocida'): undefined;

            const fechaChile = new Date(new Date().toLocaleString('en-US', {timeZone: 'America/Santiago'}));
            const nuevoHistorial = this.historyRepository.create({
                unidad: unidad,
                estadoAnterior: estadoOrigen,
                fechaHora: fechaChile,
                usernameResponsable: actor.username,
                empresaActiva: actor.empresa,
                observacion: observacionLimpia,
                diagnosticoTecnico: diagnosticoLimpio
            });
            await queryRunner.manager.save(nuevoHistorial);

            await queryRunner.commitTransaction();
            return { success: true, nuevoEstado: unidad.estadoActual };
        } catch(error){
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async verFichaDetalle(id: string){
        const unidad = await this.unitRepository.findOne({ where: {id}, relations: {'tipoEquipo': true}});
        if (!unidad) throw new NotFoundException('Numero de serie no encontrado. [cite: 37]');

        const garantiaVencimiento = this.calcularVencimientoGarantia(unidad.fechaAdquisicion, unidad.tipoEquipo.duracionGarantiaDias);
        const checkGarantia = this.verificarGarantiaVigente(unidad.fechaAdquisicion, unidad.tipoEquipo.duracionGarantiaDias);

        return {
            ...unidad,
            fechaVencimientoGarantia: garantiaVencimiento,
            indicadorGarantiavigente: checkGarantia.vigente,
        };
    }

    async verHistorialEstados(serialNumber: string) {
        const unidad = await this.unitRepository.findOne({ where: {serialNumber} });
        if(!unidad) throw new NotFoundException('Numero de serie no encontrado. [cite: 41]');

        return await this.historyRepository.createQueryBuilder('h')
        .where('h.unidadId = :unidadId', {unidadId: unidad.id})
        .orderBy('h.fechaHora', 'DESC')
        .getMany();
    }
}