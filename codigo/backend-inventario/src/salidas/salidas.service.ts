import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { SalidaBodega } from './entities/salida-bodega.entity';
import { SalidaDetalle } from './entities/salida-detalle.entity';
import { InventarioPersonalService } from './inventario-personal.service';
import { CrearSalidaDto, ItemSalidaDto } from './dto/crear-salida.dto';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { HistorialEstado } from '../inventario/entities/historial-estado.entity';
import { MovimientoInventario } from '../transferencias/entities/movimiento-inventario.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';

// CU-57: salida de bodega a técnico (equipos individualizables y/o consumibles).
// CU-59: las validaciones de NS se aplican en dos momentos (en vivo vía
// UnitsService.verificarSerie y de verdad aquí, dentro de la transacción).
// CU-62: el stock de consumibles se valida con bloqueo de fila y nunca queda negativo.
// CU-60: es el mismo flujo con solo ítems consumibles (endpoint compartido).
export const TIPO_MOVIMIENTO_SALIDA = 'SALIDA_A_TECNICO';

@Injectable()
export class SalidasService {
  constructor(
    @InjectRepository(SalidaBodega)
    private readonly salidaRepository: Repository<SalidaBodega>,
    private readonly dataSource: DataSource,
    private readonly inventarioPersonalService: InventarioPersonalService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  // CU-62: validación con bloqueo de fila, reutilizable (CU-57/60/81). Si no
  // existe fila de stock para (bodega, tipo), el disponible se trata como 0.
  async verificarStockDisponible(
    manager: EntityManager,
    idBodega: number,
    idTipoEquipo: number,
    cantidad: number,
  ): Promise<void> {
    const stock = await manager.findOne(StockConsumible, {
      where: { id_bodega: idBodega, id_tipo_equipo: idTipoEquipo },
      lock: { mode: 'pessimistic_write' },
    });
    const disponible = stock ? Number(stock.cantidad_disponible) : 0;
    if (disponible < cantidad) {
      const tipo = await manager.findOne(TipoEquipo, {
        where: { id_tipo_equipo: idTipoEquipo },
      });
      const bodega = await manager.findOne(Bodega, {
        where: { id_bodega: idBodega },
      });
      throw new BadRequestException(
        `Stock insuficiente de [${tipo?.nombre ?? idTipoEquipo}] en [${bodega?.nombre ?? idBodega}]. ` +
          `Disponible: ${disponible} ${tipo?.unidadMedida ?? 'unidades'}.`,
      );
    }
  }

  async registrarSalida(
    dto: CrearSalidaDto,
    idEmpresaContexto: number,
    actor: any,
  ) {
    // Precondición: técnicos activos con rol TECNICO_TERRENO de la empresa
    const tecnico = await this.dataSource.getRepository(Usuario).findOne({
      where: { id_usuario: dto.id_tecnico, activo: true },
      relations: { usuarioRoles: { rol: true } },
    });
    const rolesTecnico = (tecnico?.usuarioRoles ?? []).map(
      (ur) => ur.rol?.nombre_rol,
    );
    if (!tecnico || !rolesTecnico.includes('TECNICO_TERRENO')) {
      throw new BadRequestException(
        'El técnico destinatario no existe o no está activo en su empresa.',
      );
    }
    if (tecnico.id_empresa !== idEmpresaContexto) {
      throw new BadRequestException(
        'El técnico destinatario no pertenece a su empresa.',
      );
    }

    // Precondición: bodega activa de la empresa (superusuario opera en su contexto)
    const bodega = await this.dataSource.getRepository(Bodega).findOne({
      where: { id_bodega: dto.id_bodega_origen, id_empresa: idEmpresaContexto },
    });
    if (!bodega || !bodega.activa) {
      throw new BadRequestException(
        'La bodega de origen no existe o no está activa en su empresa.',
      );
    }

    // CU-59: duplicados dentro del mismo envío (el segundo fallaría de todos modos,
    // pero se detecta antes para un mensaje claro)
    const seriesVistas = new Set<string>();
    for (const item of dto.items) {
      if (item.tipo === 'UNIDAD') {
        const serie = (item.numero_serie ?? '').trim();
        if (serie === '') {
          throw new BadRequestException(
            'El número de serie es obligatorio para los equipos individualizables.',
          );
        }
        if (seriesVistas.has(serie.toUpperCase())) {
          throw new BadRequestException(
            `El equipo [${serie}] está repetido en la salida.`,
          );
        }
        seriesVistas.add(serie.toUpperCase());
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let salidaGuardada: SalidaBodega;
    try {
      const manager = queryRunner.manager;

      // Fecha/hora automática del sistema
      salidaGuardada = await manager.save(SalidaBodega, {
        id_tecnico: dto.id_tecnico,
        id_bodega_origen: dto.id_bodega_origen,
        id_empresa: idEmpresaContexto,
        id_usuario_registro: actor.id_usuario,
      } as SalidaBodega);

      let unidadesSalidas = 0;
      let consumiblesSalidos = 0;

      for (const item of dto.items) {
        if (item.tipo === 'UNIDAD') {
          await this.procesarItemUnidad(
            manager,
            item,
            salidaGuardada,
            dto.id_tecnico,
            idEmpresaContexto,
            actor,
          );
          unidadesSalidas++;
        } else {
          await this.procesarItemConsumible(
            manager,
            item,
            salidaGuardada,
            dto.id_tecnico,
            bodega,
            actor,
          );
          consumiblesSalidos++;
        }
      }

      salidaGuardada = await manager.save(SalidaBodega, salidaGuardada);
      await queryRunner.commitTransaction();

      // Auditoría de la mutación (después del commit, patrón transferencias)
      await this.auditoriaService.create({
        id_usuario: actor.id_usuario,
        accion: 'SALIDA_BODEGA',
        entidad_afectada: 'salida_bodega',
        id_entidad_afectada: salidaGuardada.id_salida,
        valor_anterior: null,
        valor_nuevo: {
          id_tecnico: dto.id_tecnico,
          tecnico: tecnico.nombre_completo,
          bodega: bodega.nombre,
          unidades_salidas: unidadesSalidas,
          consumibles_salidos: consumiblesSalidos,
          items: dto.items,
        },
      });

      return {
        success: true,
        id_salida: salidaGuardada.id_salida,
        id_tecnico: dto.id_tecnico,
        unidades_salidas: unidadesSalidas,
        consumibles_salidos: consumiblesSalidos,
        message: `Salida registrada: ${unidadesSalidas} equipo(s) y ${consumiblesSalidos} ítem(s) de consumible asignados al técnico.`,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction().catch(() => {
        /* la transacción ya puede estar abortada */
      });
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // CU-57/CU-59: validación real del NS dentro de la transacción + transición
  private async procesarItemUnidad(
    manager: EntityManager,
    item: ItemSalidaDto,
    salida: SalidaBodega,
    idTecnico: number,
    idEmpresaContexto: number,
    actor: any,
  ): Promise<void> {
    const serie = (item.numero_serie ?? '').trim();
    const unidad = await manager.findOne(UnidadEquipo, {
      where: { serialNumber: serie, id_empresa: idEmpresaContexto },
    });

    // CU-59 Excepción 1 (404 genérico cross-empresa, estilo verHistorialEstados)
    if (!unidad) {
      throw new NotFoundException('Número de serie no encontrado.');
    }

    // CU-59 Excepción 2: mensaje exacto con el estado real
    if (
      unidad.estado !== 'En bodega' ||
      unidad.id_bodega_actual !== salida.id_bodega_origen
    ) {
      throw new BadRequestException(
        `El equipo [${serie}] no está disponible en esta bodega. Estado actual: [${unidad.estado}].`,
      );
    }

    // Transición 'En bodega' → 'Asignado a técnico' (válida según la máquina de estados)
    unidad.estado = 'Asignado a técnico';
    unidad.idTecnicoAsignado = idTecnico;
    unidad.id_bodega_actual = null;
    unidad.ubicacionFisica = null; // CU-47: al salir de bodega se vacía la ubicación
    await manager.save(unidad);

    const historial = manager.create(HistorialEstado, {
      id_unidad: unidad.id_unidad,
      id_usuario: actor.id_usuario,
      estadoAnterior: 'En bodega',
      estadoNuevo: 'Asignado a técnico',
      motivo: `Salida de bodega a técnico. Salida #${salida.id_salida}.`,
      fechaHora: new Date(
        new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }),
      ),
    });
    await manager.save(historial);

    await manager.save(SalidaDetalle, {
      id_salida: salida.id_salida,
      id_unidad: unidad.id_unidad,
      id_tipo_equipo: unidad.id_tipo_equipo,
    });

    await manager.save(MovimientoInventario, {
      id_tipo_equipo: unidad.id_tipo_equipo,
      id_unidad: unidad.id_unidad,
      id_empresa_origen: idEmpresaContexto,
      id_bodega_origen: salida.id_bodega_origen,
      id_usuario: actor.id_usuario,
      tipo_movimiento: TIPO_MOVIMIENTO_SALIDA,
      cantidad: 1,
      fecha: new Date(),
      referencia_id: salida.id_salida,
    });
  }

  // CU-60: consumibles → validar cantidad, stock (CU-62), descontar y sumar al técnico (CU-58)
  private async procesarItemConsumible(
    manager: EntityManager,
    item: ItemSalidaDto,
    salida: SalidaBodega,
    idTecnico: number,
    bodega: Bodega,
    actor: any,
  ): Promise<void> {
    // CU-60 Excepción 1 (también validada en el DTO, pero el service es la fuente de verdad)
    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero.');
    }
    // Máximo 2 decimales (numeric(10,2))
    if (Math.round(cantidad * 100) !== cantidad * 100) {
      throw new BadRequestException(
        'La cantidad admite como máximo 2 decimales.',
      );
    }

    const tipo = await manager.findOne(TipoEquipo, {
      where: { id_tipo_equipo: item.id_tipo_equipo },
    });
    if (!tipo || tipo.requiereSerialNumber === true) {
      throw new BadRequestException(
        'El tipo de equipo indicado no existe o no es un consumible del catálogo.',
      );
    }

    // CU-62: validación con bloqueo de fila y mensaje exacto con valores interpolados
    await this.verificarStockDisponible(
      manager,
      salida.id_bodega_origen,
      tipo.id_tipo_equipo,
      cantidad,
    );

    const stock = await manager.findOne(StockConsumible, {
      where: {
        id_bodega: salida.id_bodega_origen,
        id_tipo_equipo: tipo.id_tipo_equipo,
      },
      lock: { mode: 'pessimistic_write' },
    });
    stock!.cantidad_disponible = Number(stock!.cantidad_disponible) - cantidad;
    await manager.save(stock!);

    // CU-58: el consumible entra al inventario personal del técnico
    await this.inventarioPersonalService.sumar(
      manager,
      idTecnico,
      tipo.id_tipo_equipo,
      cantidad,
    );

    await manager.save(SalidaDetalle, {
      id_salida: salida.id_salida,
      id_tipo_equipo: tipo.id_tipo_equipo,
      cantidad: String(cantidad),
    });

    await manager.save(MovimientoInventario, {
      id_tipo_equipo: tipo.id_tipo_equipo,
      id_empresa_origen: bodega.id_empresa,
      id_bodega_origen: salida.id_bodega_origen,
      id_usuario: actor.id_usuario,
      tipo_movimiento: TIPO_MOVIMIENTO_SALIDA,
      cantidad: cantidad,
      fecha: new Date(),
      referencia_id: salida.id_salida,
    });
  }

  // Listado de salidas con aislamiento manual por empresa (patrón bodegas)
  async listarSalidas(idEmpresaContexto: number, esSuperusuario: boolean) {
    const qb = this.salidaRepository
      .createQueryBuilder('salida')
      .leftJoinAndSelect('salida.detalles', 'detalle');

    if (!esSuperusuario) {
      qb.where('salida.id_empresa = :idEmpresa', {
        idEmpresa: idEmpresaContexto,
      });
    }

    const salidas = await qb
      .orderBy('salida.id_salida', 'DESC')
      .limit(100)
      .getMany();

    // Nombres de técnicos y bodegas en una sola query por tipo
    const idsTecnicos = [...new Set(salidas.map((s) => s.id_tecnico))];
    const idsBodegas = [...new Set(salidas.map((s) => s.id_bodega_origen))];
    const usuarios = idsTecnicos.length
      ? await this.dataSource
          .getRepository(Usuario)
          .findBy({ id_usuario: In(idsTecnicos) })
      : [];
    const bodegas = idsBodegas.length
      ? await this.dataSource
          .getRepository(Bodega)
          .findBy({ id_bodega: In(idsBodegas) })
      : [];
    const mapaUsuarios = new Map(
      usuarios.map((u) => [u.id_usuario, u.nombre_completo]),
    );
    const mapaBodegas = new Map(bodegas.map((b) => [b.id_bodega, b.nombre]));

    return salidas.map((s) => ({
      id_salida: s.id_salida,
      tecnico: mapaUsuarios.get(s.id_tecnico) ?? `Técnico #${s.id_tecnico}`,
      bodega:
        mapaBodegas.get(s.id_bodega_origen) ?? `Bodega #${s.id_bodega_origen}`,
      fecha_hora: s.fecha_hora,
      items: (s.detalles ?? []).map((d) => ({
        id_detalle: d.id_detalle,
        id_unidad: d.id_unidad,
        id_tipo_equipo: d.id_tipo_equipo,
        cantidad:
          d.cantidad === null || d.cantidad === undefined
            ? null
            : Number(d.cantidad),
      })),
    }));
  }
}
