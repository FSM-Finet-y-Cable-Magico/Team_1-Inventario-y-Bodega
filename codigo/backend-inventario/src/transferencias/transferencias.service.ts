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
import { Bodega } from '../bodegas/entities/bodega.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';
import { EMPRESAS } from '../companies/companies.service';

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

  async registrarTransferencia(
    dto: CreateTransferenciaDto,
    actor: any,
  ): Promise<any> {
    const idEmpresaOrigen = actor.id_empresa;

    if (idEmpresaOrigen === dto.id_empresa_destino) {
      throw new BadRequestException(
        'La empresa de origen y destino no pueden ser la misma.',
      );
    }

    if (!dto.ids_unidades || dto.ids_unidades.length === 0) {
      throw new BadRequestException(
        'Debe especificar al menos una unidad para transferir.',
      );
    }

    const unidades = await this.unidadRepository.findBy({
      id_unidad: In(dto.ids_unidades),
    });
    for (const u of unidades) {
      if (u.id_empresa !== idEmpresaOrigen) {
        throw new ForbiddenException(
          `La unidad [${u.serialNumber}] no pertenece a su empresa.`,
        );
      }
      if (u.estado !== 'En bodega') {
        throw new BadRequestException(
          `La unidad [${u.serialNumber}] debe estar en estado 'En bodega' para ser transferida. Estado actual: ${u.estado}.`,
        );
      }
      if (u.id_bodega_actual !== dto.id_bodega_origen) {
        throw new BadRequestException(
          `La unidad [${u.serialNumber}] no se encuentra en la bodega de origen indicada.`,
        );
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
      const transferenciaGuardada = await queryRunner.manager.save(
        Transferencia,
        transferencia,
      );

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
        valor_nuevo: {
          unidades: dto.ids_unidades,
          empresa_destino: dto.id_empresa_destino,
        },
      });

      return {
        success: true,
        id_transferencia: transferenciaGuardada.id_transferencia,
        estado: ESTADO_PENDIENTE,
        unidades_incluidas: unidades.length,
        message:
          'Solicitud de transferencia registrada. Pendiente de aprobación del Superusuario.',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async aprobarTransferencia(
    idTransferencia: number,
    actor: any,
  ): Promise<any> {
    const movimientos = await this.movimientoRepository.find({
      where: {
        referencia_id: idTransferencia,
        tipo_movimiento: ESTADO_PENDIENTE,
      },
    });

    if (!movimientos || movimientos.length === 0) {
      throw new NotFoundException(
        `No existe una transferencia pendiente con ID [${idTransferencia}].`,
      );
    }

    // CU-21 Excepción 1: verificar que ninguna unidad cambió de estado desde que se registró la solicitud
    const idsUnidades = movimientos.map((m) => m.id_unidad);
    const unidades = await this.unidadRepository.findBy({
      id_unidad: In(idsUnidades),
    });

    const unidadesInvalidas = unidades.filter((u) => u.estado !== 'En bodega');
    if (unidadesInvalidas.length > 0) {
      const seriales = unidadesInvalidas
        .map((u) => `${u.serialNumber} (${u.estado})`)
        .join(', ');
      throw new BadRequestException(
        `Las siguientes unidades cambiaron de estado desde que se registró la solicitud y no pueden transferirse: ${seriales}. ` +
          `Corríjalas o elimínelas del listado antes de aprobar.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const mov of movimientos) {
        await queryRunner.manager.update(
          MovimientoInventario,
          mov.id_movimiento,
          {
            tipo_movimiento: ESTADO_APROBADA,
          },
        );

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
        message:
          'Transferencia aprobada. Las unidades han cambiado de empresa y bodega.',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async rechazarTransferencia(
    idTransferencia: number,
    observaciones: string,
    actor: any,
  ): Promise<any> {
    // CU-22 Excepción 1: motivo de rechazo obligatorio
    if (!observaciones || observaciones.trim() === '') {
      throw new BadRequestException(
        'Debe ingresar un motivo de rechazo para continuar.',
      );
    }

    // CU-22 Excepción 2: motivo no puede superar 200 caracteres
    if (observaciones.trim().length > 200) {
      throw new BadRequestException(
        'El motivo de rechazo no puede superar los 200 caracteres.',
      );
    }

    const movimientos = await this.movimientoRepository.find({
      where: {
        referencia_id: idTransferencia,
        tipo_movimiento: ESTADO_PENDIENTE,
      },
    });

    if (!movimientos || movimientos.length === 0) {
      throw new NotFoundException(
        `No existe una transferencia pendiente con ID [${idTransferencia}].`,
      );
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

  // CU-21: detalle completo de una transferencia seleccionada
  async consultarDetalle(idTransferencia: number, actor: any): Promise<any> {
    const t = await this.transferenciaRepository.findOne({
      where: { id_transferencia: idTransferencia },
    });
    if (!t) throw new NotFoundException('Transferencia no encontrada');

    // Aislamiento: un Admin solo ve transferencias donde participa su empresa
    const isSuperusuario = actor.roles?.includes('SUPERUSUARIO');
    if (
      !isSuperusuario &&
      t.id_empresa_origen !== actor.id_empresa &&
      t.id_empresa_destino !== actor.id_empresa
    ) {
      throw new NotFoundException('Transferencia no encontrada');
    }

    const movimientos = await this.movimientoRepository.find({
      where: { referencia_id: idTransferencia },
    });

    const unidades = movimientos.length
      ? await this.unidadRepository.find({
          where: { id_unidad: In(movimientos.map((m) => m.id_unidad)) },
          relations: { tipoEquipo: true },
        })
      : [];

    const idsBodegas = [
      ...new Set(
        movimientos
          .flatMap((m) => [m.id_bodega_origen, m.id_bodega_destino])
          .filter(Boolean),
      ),
    ];
    const bodegas = idsBodegas.length
      ? await this.dataSource.getRepository(Bodega).find({
          where: { id_bodega: In(idsBodegas) },
        })
      : [];
    const mapaBodegas = new Map(
      bodegas.map((b: any) => [b.id_bodega, b.nombre]),
    );

    const solicitante = t.id_usuario_registro
      ? await this.dataSource.getRepository(Usuario).findOne({
          where: { id_usuario: t.id_usuario_registro },
        })
      : null;

    const mapaEmpresas = new Map(EMPRESAS.map((e) => [e.id, e.nombre]));
    const primerMov = movimientos[0];

    return {
      id_transferencia: t.id_transferencia,
      empresa_origen:
        mapaEmpresas.get(t.id_empresa_origen) ??
        `Empresa ${t.id_empresa_origen}`,
      empresa_destino:
        mapaEmpresas.get(t.id_empresa_destino) ??
        `Empresa ${t.id_empresa_destino}`,
      bodega_origen: primerMov
        ? (mapaBodegas.get(primerMov.id_bodega_origen) ?? null)
        : null,
      bodega_destino: primerMov
        ? (mapaBodegas.get(primerMov.id_bodega_destino) ?? null)
        : null,
      fecha: t.fecha_transferencia,
      estado: primerMov?.tipo_movimiento ?? 'SIN_MOVIMIENTOS',
      motivo: t.observaciones,
      solicitante: solicitante
        ? (solicitante.nombre_completo ?? solicitante.nombre_usuario)
        : null,
      unidades: unidades.map((u) => ({
        id_unidad: u.id_unidad,
        numero_serie: u.serialNumber,
        tipo_equipo: u.tipoEquipo?.nombre ?? null,
        estado: u.estado,
      })),
    };
  }

  // CU-23: listado con filtros por estado, rango de fechas o empresa
  async consultarTransferencias(
    filtros: {
      estado?: string;
      id_empresa?: number;
      fecha_inicio?: string;
      fecha_fin?: string;
    },
    actor: any,
  ): Promise<any[]> {
    const isSuperusuario = actor.roles?.includes('SUPERUSUARIO');

    const query = this.transferenciaRepository
      .createQueryBuilder('t')
      .orderBy('t.fecha_transferencia', 'DESC');

    if (!isSuperusuario) {
      query.andWhere(
        '(t.id_empresa_origen = :empresa OR t.id_empresa_destino = :empresa)',
        { empresa: actor.id_empresa },
      );
    }

    if (filtros.id_empresa) {
      query.andWhere(
        '(t.id_empresa_origen = :fe OR t.id_empresa_destino = :fe)',
        { fe: filtros.id_empresa },
      );
    }
    if (filtros.fecha_inicio) {
      query.andWhere('t.fecha_transferencia >= :fi', {
        fi: filtros.fecha_inicio,
      });
    }
    if (filtros.fecha_fin) {
      query.andWhere('t.fecha_transferencia <= :ff', { ff: filtros.fecha_fin });
    }

    const transferencias = await query.getMany();

    // El filtro acepta tanto 'PENDIENTE' como 'TRANSFERENCIA_PENDIENTE'
    const estadoFiltro = filtros.estado
      ? filtros.estado.startsWith('TRANSFERENCIA_')
        ? filtros.estado
        : `TRANSFERENCIA_${filtros.estado}`
      : undefined;

    // CU-23: nombre del usuario solicitante, resuelto en una sola query
    const idsSolicitantes = [
      ...new Set(
        transferencias.map((t) => t.id_usuario_registro).filter(Boolean),
      ),
    ];
    const solicitantes = idsSolicitantes.length
      ? await this.dataSource
          .getRepository(Usuario)
          .findBy({ id_usuario: In(idsSolicitantes) })
      : [];
    const mapaSolicitantes = new Map(
      solicitantes.map((u) => [
        u.id_usuario,
        u.nombre_usuario ?? u.nombre_completo,
      ]),
    );
    const mapaEmpresas = new Map(EMPRESAS.map((e) => [e.id, e.nombre]));

    const resultado: any[] = [];

    for (const t of transferencias) {
      const movimientos = await this.movimientoRepository.find({
        where: { referencia_id: t.id_transferencia },
      });

      const estadoActual =
        movimientos.length > 0
          ? movimientos[0].tipo_movimiento
          : 'SIN_MOVIMIENTOS';

      if (estadoFiltro && estadoActual !== estadoFiltro) continue;

      resultado.push({
        id_transferencia: t.id_transferencia,
        empresa_origen:
          mapaEmpresas.get(t.id_empresa_origen) ??
          `Empresa ${t.id_empresa_origen}`,
        empresa_destino:
          mapaEmpresas.get(t.id_empresa_destino) ??
          `Empresa ${t.id_empresa_destino}`,
        fecha: t.fecha_transferencia,
        estado: estadoActual,
        unidades: movimientos.length,
        solicitante: mapaSolicitantes.get(t.id_usuario_registro) ?? null,
        observaciones: t.observaciones,
      });
    }

    return resultado;
  }
}
