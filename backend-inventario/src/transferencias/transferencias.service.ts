import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Transferencia } from './entities/transferencia.entity';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';

const ESTADO_PENDIENTE = 'TRANSFERENCIA_PENDIENTE';
const ESTADO_APROBADA = 'TRANSFERENCIA_APROBADA';
const ESTADO_RECHAZADA = 'TRANSFERENCIA_RECHAZADA';

@Injectable()
export class TransferenciasService {
    constructor(
        @InjectRepository(Transferencia)
        private readonly transferenciaRepository: Repository<Transferencia>,
        @InjectRepository(MovimientoInventario)
        private readonly movimientoRepository: Repository<MovimientoInventario>,
        @InjectRepository(UnidadEquipo)
        private readonly unidadRepository: Repository<UnidadEquipo>,
        private readonly auditoriaService: AuditoriaService,
        private readonly dataSource: DataSource,
    ) {}

    async registrarTransferencia(dto: CreateTransferenciaDto, actor: any): Promise<any> {
        const idEmpresaOrigen = actor.id_empresa;

        if (idEmpresaOrigen === dto.id_empresa_destino) {
            throw new BadRequestException('La empresa de origen y destino no pueden ser la misma.');
        }

        if (!dto.ids_unidades || dto.ids_unidades.length === 0) {
            throw new BadRequestException('Debe especificar al menos una unidad para transferir.');
        }

        const unidades = await this.unidadRepository.findBy({ id_unidad: In(dto.ids_unidades) });
        for (const u of unidades) {
            if (u.id_empresa !== idEmpresaOrigen) {
                throw new ForbiddenException(`La unidad [${u.serialNumber}] no pertenece a su empresa.`);
            }
            if (u.estado !== 'En bodega') {
                throw new BadRequestException(`La unidad [${u.serialNumber}] debe estar en estado 'En bodega' para ser transferida. Estado actual: ${u.estado}.`);
            }
            if (u.id_bodega_actual !== dto.id_bodega_origen) {
                throw new BadRequestException(`La unidad [${u.serialNumber}] no se encuentra en la bodega de origen indicada.`);
            }
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const transferencia = this.transferenciaRepository.create({
                id_empresa_origen: idEmpresaOrigen,
                id_empresa_destino: dto.id_empresa_destino,
                id_usuario_registro: actor.id_usuario,
                fecha_transferencia: new Date(),
                observaciones: dto.observaciones ?? null,
            });
            const transferenciaGuardada = await queryRunner.manager.save(Transferencia, transferencia);

            for (const u of unidades) {
                const movimiento = this.movimientoRepository.create({
                    id_tipo_equipo: u.id_tipo_equipo,
                    id_unidad: u.id_unidad,
                    id_empresa_origen: idEmpresaOrigen,
                    id_empresa_destino: dto.id_empresa_destino,
                    id_bodega_origen: dto.id_bodega_origen,
                    id_bodega_destino: dto.id_bodega_destino,
                    id_usuario: actor.id_usuario,
                    tipo_movimiento: ESTADO_PENDIENTE,
                    cantidad: 1,
                    fecha: new Date(),
                    referencia_id: transferenciaGuardada.id_transferencia,
                });
                await queryRunner.manager.save(movimiento);
            }

            await queryRunner.commitTransaction();

            await this.auditoriaService.create({
                id_usuario: actor.id_usuario,
                accion: 'SOLICITAR_TRANSFERENCIA',
                entidad_afectada: 'transferencia_equipo',
                id_entidad_afectada: transferenciaGuardada.id_transferencia,
                valor_anterior: null,
                valor_nuevo: { unidades: dto.ids_unidades, empresa_destino: dto.id_empresa_destino },
            });

            return {
                success: true,
                id_transferencia: transferenciaGuardada.id_transferencia,
                estado: ESTADO_PENDIENTE,
                unidades_incluidas: unidades.length,
                message: 'Solicitud de transferencia registrada. Pendiente de aprobación del Superusuario.',
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async aprobarTransferencia(idTransferencia: number, actor: any): Promise<any> {
        const movimientos = await this.movimientoRepository.find({
            where: { referencia_id: idTransferencia, tipo_movimiento: ESTADO_PENDIENTE },
        });

        if (!movimientos || movimientos.length === 0) {
            throw new NotFoundException(`No existe una transferencia pendiente con ID [${idTransferencia}].`);
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            for (const mov of movimientos) {
                await queryRunner.manager.update(MovimientoInventario, mov.id_movimiento, {
                    tipo_movimiento: ESTADO_APROBADA,
                });

                await queryRunner.manager.update(UnidadEquipo, mov.id_unidad, {
                    id_empresa: mov.id_empresa_destino,
                    id_bodega_actual: mov.id_bodega_destino,
                });
            }

            await queryRunner.commitTransaction();

            await this.auditoriaService.create({
                id_usuario: actor.id_usuario,
                accion: 'APROBAR_TRANSFERENCIA',
                entidad_afectada: 'transferencia_equipo',
                id_entidad_afectada: idTransferencia,
                valor_anterior: { estado: ESTADO_PENDIENTE },
                valor_nuevo: { estado: ESTADO_APROBADA },
            });

            return {
                success: true,
                id_transferencia: idTransferencia,
                estado: ESTADO_APROBADA,
                unidades_transferidas: movimientos.length,
                message: 'Transferencia aprobada. Las unidades han cambiado de empresa y bodega.',
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async rechazarTransferencia(idTransferencia: number, observaciones: string, actor: any): Promise<any> {
        const movimientos = await this.movimientoRepository.find({
            where: { referencia_id: idTransferencia, tipo_movimiento: ESTADO_PENDIENTE },
        });

        if (!movimientos || movimientos.length === 0) {
            throw new NotFoundException(`No existe una transferencia pendiente con ID [${idTransferencia}].`);
        }

        for (const mov of movimientos) {
            await this.movimientoRepository.update(mov.id_movimiento, {
                tipo_movimiento: ESTADO_RECHAZADA,
            });
        }

        await this.auditoriaService.create({
            id_usuario: actor.id_usuario,
            accion: 'RECHAZAR_TRANSFERENCIA',
            entidad_afectada: 'transferencia_equipo',
            id_entidad_afectada: idTransferencia,
            valor_anterior: { estado: ESTADO_PENDIENTE },
            valor_nuevo: { estado: ESTADO_RECHAZADA, observaciones },
        });

        return {
            success: true,
            id_transferencia: idTransferencia,
            estado: ESTADO_RECHAZADA,
            message: 'Transferencia rechazada. El inventario no fue modificado.',
        };
    }

    async consultarTransferencias(filtros: { estado?: string; id_empresa?: number }, actor: any): Promise<any[]> {
        const isSuperusuario = actor.roles?.includes('SUPERUSUARIO');

        const query = this.transferenciaRepository
            .createQueryBuilder('t')
            .orderBy('t.fecha_transferencia', 'DESC');

        if (!isSuperusuario) {
            query.andWhere(
                '(t.id_empresa_origen = :empresa OR t.id_empresa_destino = :empresa)',
                { empresa: actor.id_empresa }
            );
        }

        const transferencias = await query.getMany();

        const resultado: any[] = [];

        for (const t of transferencias) {
            const movimientos = await this.movimientoRepository.find({
                where: { referencia_id: t.id_transferencia },
            });

            const estadoActual = movimientos.length > 0 ? movimientos[0].tipo_movimiento : 'SIN_MOVIMIENTOS';

            if (filtros.estado && estadoActual !== filtros.estado) continue;

            resultado.push({
                id_transferencia: t.id_transferencia,
                empresa_origen: t.id_empresa_origen === 1 ? 'Finet' : 'Cable Mágico',
                empresa_destino: t.id_empresa_destino === 1 ? 'Finet' : 'Cable Mágico',
                fecha: t.fecha_transferencia,
                estado: estadoActual,
                unidades: movimientos.length,
                observaciones: t.observaciones,
            });
        }

        return resultado;
    }
}
