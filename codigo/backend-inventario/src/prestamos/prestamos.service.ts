import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, QueryRunner } from 'typeorm';
import { PrestamoExterno } from './entities/prestamo-externo.entity';
import { PrestamoDetalle } from './entities/prestamo-detalle.entity';
import { PrestamoRetorno } from './entities/prestamo-retorno.entity';
import { CreatePrestamoDto } from './dto/create-prestamo.dto';
import { RegistrarRetornoDto } from './dto/registrar-retorno.dto';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { HistorialEstado } from '../inventario/entities/historial-estado.entity';
import { TRANSICIONES_PERMITIDAS } from '../inventario/units.service';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EMPRESAS } from '../companies/companies.service';

const ESTADO_EN_BODEGA = 'En bodega';
const ESTADO_PRESTAMO = 'En préstamo externo';
// CU-82: destino de las unidades retornadas (transición ampliada y ratificada)
const ESTADO_REVISION = 'En revisión';
export const PRESTAMO_ACTIVO = 'Activo';
export const PRESTAMO_CERRADO = 'Cerrado';
// CU-75 (Grupo 3) usará la variante 'REPARACION_EXTERNA' sobre la misma tabla
export const TIPO_PRESTAMO = 'PRESTAMO';

const RUT_REGEX = /^\d{7,8}-[\dkK]$/;

export interface ActorJwt {
  id_usuario: number;
  id_empresa: number;
  roles?: string[];
}

@Injectable()
export class PrestamosService {
  constructor(
    @InjectRepository(PrestamoExterno)
    private readonly prestamoRepository: Repository<PrestamoExterno>,
    @InjectRepository(PrestamoDetalle)
    private readonly detalleRepository: Repository<PrestamoDetalle>,
    @InjectRepository(PrestamoRetorno)
    private readonly retornoRepository: Repository<PrestamoRetorno>,
    @InjectRepository(UnidadEquipo)
    private readonly unidadRepository: Repository<UnidadEquipo>,
    @InjectRepository(StockConsumible)
    private readonly stockRepository: Repository<StockConsumible>,
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
    @InjectRepository(TipoEquipo)
    private readonly tipoRepository: Repository<TipoEquipo>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly auditoriaService: AuditoriaService,
    private readonly dataSource: DataSource,
  ) {}

  private esSuperusuario(actor: ActorJwt): boolean {
    return actor.roles?.includes('SUPERUSUARIO') === true;
  }

  // CU-81: validaciones del formulario con mensajes acumulados
  private validarFormulario(dto: CreatePrestamoDto): {
    nombre: string;
    rut: string | null;
    fechaEstimada: string;
    motivo: string;
  } {
    const errores: string[] = [];

    const nombre = dto.nombre_receptor?.trim() ?? '';
    if (nombre.length < 3 || nombre.length > 80) {
      errores.push(
        'El nombre del receptor debe tener entre 3 y 80 caracteres.',
      );
    }

    // El RUT del receptor es opcional, pero si viene debe tener el formato correcto
    const rut = dto.rut_receptor?.trim() ?? '';
    if (rut && !RUT_REGEX.test(rut)) {
      errores.push('El RUT del receptor debe tener el formato XXXXXXXX-X.');
    }

    const fechaEstimada = dto.fecha_estimada_retorno?.trim() ?? '';
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fechaEstimada) ||
      isNaN(new Date(fechaEstimada).getTime())
    ) {
      errores.push(
        'La fecha estimada de retorno es obligatoria y debe tener el formato DD/MM/YYYY.',
      );
    } else if (
      fechaEstimada <=
      new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    ) {
      // La fecha de salida es "ahora", así que la estimada debe ser posterior
      errores.push(
        'La fecha estimada de retorno debe ser posterior a la fecha de salida.',
      );
    }

    const motivo = dto.motivo?.trim() ?? '';
    if (motivo.length < 5 || motivo.length > 200) {
      errores.push(
        'El motivo del préstamo debe tener entre 5 y 200 caracteres.',
      );
    }

    const tieneUnidades = (dto.numeros_serie?.length ?? 0) > 0;
    const tieneConsumibles = (dto.consumibles?.length ?? 0) > 0;
    if (!tieneUnidades && !tieneConsumibles) {
      errores.push('Debe agregar al menos un ítem al préstamo.');
    }

    if (errores.length > 0) throw new BadRequestException(errores.join(' '));

    return {
      nombre,
      rut: rut ? rut.toUpperCase() : null,
      fechaEstimada,
      motivo,
    };
  }

  // CU-81 Excepción 1: un error específico por cada NS inválido (mensajes de CU-59)
  private async validarNumerosSerie(
    numerosSerie: string[],
    idBodega: number,
    actor: ActorJwt,
  ): Promise<UnidadEquipo[]> {
    const seriales = [
      ...new Set(numerosSerie.map((ns) => ns.trim()).filter(Boolean)),
    ];
    if (seriales.length === 0) return [];

    const unidades = await this.unidadRepository.find({
      where: { serialNumber: In(seriales) },
      relations: { tipoEquipo: true },
    });

    const errores: string[] = [];
    for (const ns of seriales) {
      const unidad = unidades.find((u) => u.serialNumber === ns);
      if (
        !unidad ||
        (!this.esSuperusuario(actor) && unidad.id_empresa !== actor.id_empresa)
      ) {
        errores.push(`${ns}: Número de serie no encontrado.`);
        continue;
      }
      if (unidad.estado !== ESTADO_EN_BODEGA) {
        errores.push(
          `El equipo [${ns}] no está disponible en esta bodega. Estado actual: [${unidad.estado}].`,
        );
        continue;
      }
      if (unidad.id_bodega_actual !== idBodega) {
        errores.push(
          `El equipo [${ns}] no está disponible en esta bodega. Estado actual: [${unidad.estado}].`,
        );
      }
    }

    if (errores.length > 0) throw new BadRequestException(errores.join(' '));
    return unidades;
  }

  // CU-81: el stock de cada consumible debe alcanzar en la bodega de origen
  private async validarStockConsumibles(
    consumibles: { id_tipo_equipo: number; cantidad: number }[],
    idBodega: number,
  ): Promise<
    { stock: StockConsumible; cantidad: number; tipo: TipoEquipo | null }[]
  > {
    if (consumibles.length === 0) return [];

    const tipos = await this.tipoRepository.findBy({
      id_tipo_equipo: In(consumibles.map((c) => c.id_tipo_equipo)),
    });
    const stocks = await this.stockRepository.find({
      where: {
        id_bodega: idBodega,
        id_tipo_equipo: In(consumibles.map((c) => c.id_tipo_equipo)),
      },
    });

    const errores: string[] = [];
    const resultado: {
      stock: StockConsumible;
      cantidad: number;
      tipo: TipoEquipo | null;
    }[] = [];

    for (const item of consumibles) {
      const tipo =
        tipos.find((t) => t.id_tipo_equipo === item.id_tipo_equipo) ?? null;
      const nombre = tipo?.nombre ?? `tipo #${item.id_tipo_equipo}`;
      const cantidad = Number(item.cantidad);

      if (!tipo) {
        errores.push(`El consumible [${nombre}] no existe en el catálogo.`);
        continue;
      }
      if (tipo.requiereSerialNumber === true) {
        errores.push(
          `El tipo [${nombre}] es individualizable: debe agregarse por número de serie.`,
        );
        continue;
      }
      if (isNaN(cantidad) || cantidad <= 0) {
        errores.push(
          `La cantidad de [${nombre}] debe ser un número mayor que cero.`,
        );
        continue;
      }

      const stock = stocks.find(
        (s) => s.id_tipo_equipo === item.id_tipo_equipo,
      );
      const disponible = Number(stock?.cantidad_disponible ?? 0);
      if (!stock || disponible < cantidad) {
        errores.push(
          `Stock insuficiente de [${nombre}] en la bodega de origen: disponible ${disponible}, solicitado ${cantidad}.`,
        );
        continue;
      }
      resultado.push({ stock, cantidad, tipo });
    }

    if (errores.length > 0) throw new BadRequestException(errores.join(' '));
    return resultado;
  }

  // CU-81: correlativo PE-XXXXX. El lock de transacción serializa la generación
  // para que dos préstamos simultáneos no reciban el mismo número (la columna
  // además es UNIQUE como red de seguridad).
  private async siguienteCorrelativo(
    queryRunner: QueryRunner,
  ): Promise<string> {
    await queryRunner.query(
      `SELECT pg_advisory_xact_lock(hashtext('prestamo_externo_correlativo'))`,
    );
    const filas = (await queryRunner.query(
      `SELECT correlativo FROM prestamo_externo ORDER BY id_prestamo DESC LIMIT 1`,
    )) as { correlativo: string }[];
    const ultimo =
      filas.length > 0 ? Number(filas[0].correlativo.replace('PE-', '')) : 0;
    return `PE-${String(ultimo + 1).padStart(5, '0')}`;
  }

  async registrar(
    dto: CreatePrestamoDto,
    actor: ActorJwt,
  ): Promise<Record<string, unknown>> {
    const { nombre, rut, fechaEstimada, motivo } = this.validarFormulario(dto);

    const bodega = await this.bodegaRepository.findOne({
      where: { id_bodega: dto.id_bodega_origen },
    });
    if (!bodega) throw new NotFoundException('Bodega no encontrada');
    if (!this.esSuperusuario(actor) && bodega.id_empresa !== actor.id_empresa) {
      throw new NotFoundException('Bodega no encontrada');
    }

    const unidades = await this.validarNumerosSerie(
      dto.numeros_serie ?? [],
      bodega.id_bodega,
      actor,
    );
    const consumibles = await this.validarStockConsumibles(
      dto.consumibles ?? [],
      bodega.id_bodega,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const correlativo = await this.siguienteCorrelativo(queryRunner);
      const fechaSalida = new Date();

      const prestamo = await queryRunner.manager.save(
        this.prestamoRepository.create({
          correlativo,
          tipo: TIPO_PRESTAMO,
          nombre_receptor: nombre,
          rut_receptor: rut,
          fecha_salida: fechaSalida,
          fecha_estimada_retorno: fechaEstimada,
          motivo,
          descripcion_falla: null,
          estado: PRESTAMO_ACTIVO,
          id_empresa: bodega.id_empresa,
          id_bodega_origen: bodega.id_bodega,
          id_usuario: actor.id_usuario,
          fecha_retorno_real: null,
          resultado_retorno: null,
        }),
      );

      // CU-81: las unidades salen de bodega a 'En préstamo externo' (misma
      // máquina de estados que UnitsService, dentro de esta transacción).
      // Se releen con bloqueo de escritura: la validación previa usa datos que
      // pueden haber cambiado si otro préstamo tomó la misma unidad en paralelo.
      const unidadesBloqueadas = unidades.length
        ? await queryRunner.manager.find(UnidadEquipo, {
            where: { id_unidad: In(unidades.map((u) => u.id_unidad)) },
            // sin relaciones eager: Postgres no admite FOR UPDATE sobre el lado
            // nullable de un outer join (el LEFT JOIN a tipo_equipo)
            loadEagerRelations: false,
            lock: { mode: 'pessimistic_write' },
          })
        : [];

      for (const unidad of unidadesBloqueadas) {
        if (
          !TRANSICIONES_PERMITIDAS[unidad.estado]?.includes(ESTADO_PRESTAMO)
        ) {
          throw new BadRequestException(
            `El equipo [${unidad.serialNumber}] no está disponible en esta bodega. Estado actual: [${unidad.estado}].`,
          );
        }
        const estadoOrigen = unidad.estado;
        unidad.estado = ESTADO_PRESTAMO;
        unidad.id_bodega_actual = null;
        unidad.numeroPoste = null;
        unidad.ubicacionFisica = null;
        await queryRunner.manager.save(unidad);

        await queryRunner.manager.save(
          queryRunner.manager.create(HistorialEstado, {
            id_unidad: unidad.id_unidad,
            id_usuario: actor.id_usuario,
            estadoAnterior: estadoOrigen,
            estadoNuevo: ESTADO_PRESTAMO,
            motivo: `Salida por préstamo externo ${correlativo}. Receptor: ${nombre}`,
            fechaHora: new Date(
              new Date().toLocaleString('en-US', {
                timeZone: 'America/Santiago',
              }),
            ),
          }),
        );

        await queryRunner.manager.save(
          this.detalleRepository.create({
            id_prestamo: prestamo.id_prestamo,
            id_unidad: unidad.id_unidad,
            id_tipo_equipo: unidad.id_tipo_equipo,
            cantidad: null,
            cantidad_retornada: 0,
          }),
        );
      }

      // CU-81: los consumibles se descuentan con un UPDATE condicional: si otra
      // transacción consumió el saldo mientras tanto, no afecta filas y el
      // préstamo completo se revierte (evita el lost update de leer y escribir).
      for (const item of consumibles) {
        const filas = (await queryRunner.query(
          `UPDATE stock_consumible SET cantidad_disponible = cantidad_disponible - $1
           WHERE id_stock = $2 AND cantidad_disponible >= $1 RETURNING id_stock`,
          [item.cantidad, item.stock.id_stock],
        )) as unknown[];
        if (filas.length === 0) {
          throw new BadRequestException(
            `Stock insuficiente de [${item.tipo?.nombre ?? 'consumible'}] en la bodega de origen: el saldo cambió mientras se registraba el préstamo.`,
          );
        }

        await queryRunner.manager.save(
          this.detalleRepository.create({
            id_prestamo: prestamo.id_prestamo,
            id_unidad: null,
            id_tipo_equipo: item.stock.id_tipo_equipo,
            cantidad: item.cantidad,
            cantidad_retornada: 0,
          }),
        );
      }

      await queryRunner.commitTransaction();

      await this.auditoriaService.create({
        id_usuario: actor.id_usuario,
        accion: 'PRESTAMO_EXTERNO',
        entidad_afectada: 'prestamo_externo',
        id_entidad_afectada: prestamo.id_prestamo,
        valor_anterior: null,
        valor_nuevo: {
          correlativo,
          receptor: nombre,
          rut_receptor: rut,
          fecha_estimada_retorno: fechaEstimada,
          unidades: unidadesBloqueadas.map((u) => u.serialNumber),
          consumibles: consumibles.map((c) => ({
            tipo: c.tipo?.nombre,
            cantidad: c.cantidad,
          })),
        },
      });

      return {
        success: true,
        id_prestamo: prestamo.id_prestamo,
        correlativo,
        equipos: unidadesBloqueadas.length,
        consumibles: consumibles.length,
        message: `Préstamo externo ${correlativo} registrado con ${unidades.length} equipo(s) y ${consumibles.length} consumible(s).`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // CU-83: tabla de préstamos con días restantes y filtros por estado y empresa
  async listar(
    filtros: { estado?: string; id_empresa?: number },
    actor: ActorJwt,
  ): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = {};
    if (filtros.estado) where.estado = filtros.estado;
    // Aislamiento: solo el Superusuario puede filtrar por otra empresa
    if (!this.esSuperusuario(actor)) {
      where.id_empresa = actor.id_empresa;
    } else if (filtros.id_empresa) {
      where.id_empresa = filtros.id_empresa;
    }

    const prestamos = await this.prestamoRepository.find({
      where,
      order: { id_prestamo: 'DESC' },
    });
    if (prestamos.length === 0) return [];

    const detalles = await this.detalleRepository.findBy({
      id_prestamo: In(prestamos.map((p) => p.id_prestamo)),
    });
    const usuarios = await this.usuarioRepository.findBy({
      id_usuario: In([...new Set(prestamos.map((p) => p.id_usuario))]),
    });
    const mapaUsuarios = new Map(
      usuarios.map((u) => [u.id_usuario, u.nombre_completo]),
    );
    const mapaEmpresas = new Map(EMPRESAS.map((e) => [e.id, e.nombre]));

    // CU-83: días restantes calculados en el servidor (zona America/Santiago)
    const hoy = new Date(
      new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }),
    );
    const tiposEquipo = await this.tipoRepository.findBy({
      id_tipo_equipo: In([
        ...new Set(
          detalles
            .map((d) => d.id_tipo_equipo)
            .filter((id): id is number => id !== null),
        ),
      ]),
    });
    const mapaTipos = new Map(
      tiposEquipo.map((t) => [t.id_tipo_equipo, t.nombre]),
    );

    return prestamos.map((p) => {
      const propios = detalles.filter((d) => d.id_prestamo === p.id_prestamo);
      const vencimiento = new Date(
        `${String(p.fecha_estimada_retorno).slice(0, 10)}T00:00:00`,
      );
      const diasRestantes = Math.round(
        (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        id_prestamo: p.id_prestamo,
        correlativo: p.correlativo,
        tipo: p.tipo,
        nombre_receptor: p.nombre_receptor,
        rut_receptor: p.rut_receptor,
        fecha_salida: p.fecha_salida,
        fecha_estimada_retorno: p.fecha_estimada_retorno,
        motivo: p.motivo,
        estado: p.estado,
        empresa: mapaEmpresas.get(p.id_empresa) ?? null,
        registrado_por: mapaUsuarios.get(p.id_usuario) ?? null,
        equipos: propios.filter((d) => d.id_unidad !== null).length,
        consumibles: propios.filter((d) => d.id_unidad === null).length,
        // CU-83: negativo cuando ya pasó la fecha estimada de retorno.
        // Solo tiene sentido mientras el préstamo sigue activo.
        dias_restantes: p.estado === PRESTAMO_ACTIVO ? diasRestantes : null,
        // CU-83: resumen de ítems para la fila de la tabla
        items_resumen: propios.map((d) =>
          d.id_unidad !== null
            ? {
                tipo: 'Equipo',
                descripcion: mapaTipos.get(d.id_tipo_equipo ?? 0) ?? null,
                cantidad: 1,
              }
            : {
                tipo: 'Consumible',
                descripcion: mapaTipos.get(d.id_tipo_equipo ?? 0) ?? null,
                cantidad: Number(d.cantidad ?? 0),
              },
        ),
      };
    });
  }

  // CU-82: retorno total o parcial de un préstamo externo
  async registrarRetorno(
    idPrestamo: number,
    dto: RegistrarRetornoDto,
    actor: ActorJwt,
  ): Promise<Record<string, unknown>> {
    const prestamo = await this.prestamoRepository.findOne({
      where: { id_prestamo: idPrestamo },
    });
    if (!prestamo)
      throw new NotFoundException(
        `No existe el préstamo con ID [${idPrestamo}].`,
      );
    if (
      !this.esSuperusuario(actor) &&
      prestamo.id_empresa !== actor.id_empresa
    ) {
      throw new NotFoundException(
        `No existe el préstamo con ID [${idPrestamo}].`,
      );
    }
    if (prestamo.estado !== PRESTAMO_ACTIVO) {
      throw new BadRequestException(
        `El préstamo ${prestamo.correlativo} ya está cerrado: no admite nuevos retornos.`,
      );
    }

    // CU-82 Excepción 1: mensaje exacto del caso de uso
    const fechaRetorno = dto.fecha_retorno?.trim() ?? '';
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fechaRetorno) ||
      isNaN(new Date(fechaRetorno).getTime())
    ) {
      throw new BadRequestException(
        'La fecha de retorno es obligatoria y debe tener el formato DD/MM/YYYY.',
      );
    }
    if (
      fechaRetorno >
      new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    ) {
      throw new BadRequestException('La fecha de retorno no puede ser futura.');
    }

    const observacion = dto.observacion?.trim() ?? '';
    if (observacion.length > 300) {
      throw new BadRequestException(
        'La observación no puede superar los 300 caracteres.',
      );
    }

    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('Debe indicar al menos un ítem retornado.');
    }

    // CU-84: trazabilidad — cada ítem debe pertenecer a este préstamo y no estar
    // ya retornado; las cantidades no pueden superar lo prestado
    const detalles = await this.detalleRepository.findBy({
      id_prestamo: idPrestamo,
    });
    const errores: string[] = [];
    const aRetornar: { detalle: PrestamoDetalle; cantidad: number }[] = [];

    for (const item of dto.items) {
      const detalle = detalles.find((d) => d.id_detalle === item.id_detalle);
      if (!detalle) {
        errores.push(
          `El ítem #${item.id_detalle} no pertenece al préstamo ${prestamo.correlativo}.`,
        );
        continue;
      }
      if (detalle.id_unidad !== null) {
        // Individualizable: un detalle por unidad, retorno completo o nada
        if (Number(detalle.cantidad_retornada) > 0) {
          errores.push(`El ítem #${item.id_detalle} ya fue retornado.`);
          continue;
        }
        aRetornar.push({ detalle, cantidad: 1 });
      } else {
        const pendiente =
          Number(detalle.cantidad ?? 0) -
          Number(detalle.cantidad_retornada ?? 0);
        const cantidad = Number(item.cantidad ?? 0);
        if (isNaN(cantidad) || cantidad <= 0) {
          errores.push(
            `La cantidad retornada del ítem #${item.id_detalle} debe ser mayor que cero.`,
          );
          continue;
        }
        if (cantidad > pendiente) {
          errores.push(
            `La cantidad retornada del ítem #${item.id_detalle} (${cantidad}) supera lo pendiente (${pendiente}).`,
          );
          continue;
        }
        aRetornar.push({ detalle, cantidad });
      }
    }

    if (errores.length > 0) throw new BadRequestException(errores.join(' '));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const unidadesRetornadas: string[] = [];
      const consumiblesRetornados: { tipo: number | null; cantidad: number }[] =
        [];
      const fechaHoraRetorno = new Date(`${fechaRetorno}T12:00:00`);

      for (const { detalle, cantidad } of aRetornar) {
        if (detalle.id_unidad !== null) {
          // CU-82: la unidad retornada pasa a 'En revisión' (transición ratificada)
          const unidades = await queryRunner.manager.find(UnidadEquipo, {
            where: { id_unidad: detalle.id_unidad },
            loadEagerRelations: false,
            lock: { mode: 'pessimistic_write' },
          });
          const unidad = unidades[0];
          if (!unidad)
            throw new NotFoundException('El equipo solicitado no existe.');
          if (unidad.estado !== ESTADO_PRESTAMO) {
            throw new BadRequestException(
              `El equipo [${unidad.serialNumber}] no está en préstamo externo. Estado actual: [${unidad.estado}].`,
            );
          }
          if (
            !TRANSICIONES_PERMITIDAS[unidad.estado]?.includes(ESTADO_REVISION)
          ) {
            throw new BadRequestException(
              'Transición de estado no permitida para este equipo.',
            );
          }

          unidad.estado = ESTADO_REVISION;
          await queryRunner.manager.save(unidad);

          await queryRunner.manager.save(
            queryRunner.manager.create(HistorialEstado, {
              id_unidad: unidad.id_unidad,
              id_usuario: actor.id_usuario,
              estadoAnterior: ESTADO_PRESTAMO,
              estadoNuevo: ESTADO_REVISION,
              motivo:
                `Retorno de préstamo externo ${prestamo.correlativo}` +
                (observacion ? `. Observación: ${observacion}` : ''),
              fechaHora: new Date(
                new Date().toLocaleString('en-US', {
                  timeZone: 'America/Santiago',
                }),
              ),
            }),
          );
          unidadesRetornadas.push(unidad.serialNumber);
        } else {
          // CU-82: el consumible vuelve al stock de la bodega de origen del préstamo
          const filas = (await queryRunner.query(
            `UPDATE stock_consumible SET cantidad_disponible = cantidad_disponible + $1
             WHERE id_bodega = $2 AND id_tipo_equipo = $3 RETURNING id_stock`,
            [cantidad, prestamo.id_bodega_origen, detalle.id_tipo_equipo],
          )) as unknown[];
          if (filas.length === 0) {
            // La fila de stock puede no existir si se eliminó tras el préstamo
            await queryRunner.query(
              `INSERT INTO stock_consumible (id_tipo_equipo, id_bodega, cantidad_disponible)
               VALUES ($1, $2, $3)`,
              [detalle.id_tipo_equipo, prestamo.id_bodega_origen, cantidad],
            );
          }
          consumiblesRetornados.push({
            tipo: detalle.id_tipo_equipo,
            cantidad,
          });
        }

        detalle.cantidad_retornada =
          Number(detalle.cantidad_retornada ?? 0) + cantidad;
        await queryRunner.manager.save(detalle);

        await queryRunner.manager.save(
          this.retornoRepository.create({
            id_detalle: detalle.id_detalle,
            cantidad,
            fecha_retorno: fechaHoraRetorno,
            observacion: observacion || null,
            id_usuario: actor.id_usuario,
          }),
        );
      }

      // CU-82: el préstamo se cierra solo cuando no queda nada pendiente
      const detallesActualizados = await queryRunner.manager.find(
        PrestamoDetalle,
        {
          where: { id_prestamo: idPrestamo },
        },
      );
      const pendiente = detallesActualizados.some((d) =>
        d.id_unidad !== null
          ? Number(d.cantidad_retornada) === 0
          : Number(d.cantidad_retornada) < Number(d.cantidad ?? 0),
      );

      if (!pendiente) {
        prestamo.estado = PRESTAMO_CERRADO;
        prestamo.fecha_retorno_real = fechaHoraRetorno;
        prestamo.resultado_retorno = observacion || null;
        await queryRunner.manager.save(prestamo);
      }

      await queryRunner.commitTransaction();

      await this.auditoriaService.create({
        id_usuario: actor.id_usuario,
        accion: 'RETORNO_PRESTAMO',
        entidad_afectada: 'prestamo_externo',
        id_entidad_afectada: prestamo.id_prestamo,
        valor_anterior: { estado: PRESTAMO_ACTIVO },
        valor_nuevo: {
          correlativo: prestamo.correlativo,
          fecha_retorno: fechaRetorno,
          unidades: unidadesRetornadas,
          consumibles: consumiblesRetornados,
          observacion: observacion || null,
          estado: pendiente ? PRESTAMO_ACTIVO : PRESTAMO_CERRADO,
        },
      });

      return {
        success: true,
        correlativo: prestamo.correlativo,
        estado: pendiente ? PRESTAMO_ACTIVO : PRESTAMO_CERRADO,
        unidades_retornadas: unidadesRetornadas.length,
        consumibles_retornados: consumiblesRetornados.length,
        message: pendiente
          ? `Retorno parcial registrado en el préstamo ${prestamo.correlativo}. Quedan ítems pendientes de devolución.`
          : `Retorno completo registrado: el préstamo ${prestamo.correlativo} quedó cerrado.`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async obtenerDetalle(
    idPrestamo: number,
    actor: ActorJwt,
  ): Promise<Record<string, unknown>> {
    const prestamo = await this.prestamoRepository.findOne({
      where: { id_prestamo: idPrestamo },
    });
    if (!prestamo)
      throw new NotFoundException(
        `No existe el préstamo con ID [${idPrestamo}].`,
      );
    if (
      !this.esSuperusuario(actor) &&
      prestamo.id_empresa !== actor.id_empresa
    ) {
      throw new NotFoundException(
        `No existe el préstamo con ID [${idPrestamo}].`,
      );
    }

    const detalles = await this.detalleRepository.findBy({
      id_prestamo: idPrestamo,
    });
    const idsUnidades = detalles
      .map((d) => d.id_unidad)
      .filter((id): id is number => id !== null);
    const unidades = idsUnidades.length
      ? await this.unidadRepository.find({
          where: { id_unidad: In(idsUnidades) },
          relations: { tipoEquipo: true },
        })
      : [];
    const idsTipos = detalles
      .filter((d) => d.id_unidad === null)
      .map((d) => d.id_tipo_equipo)
      .filter((id): id is number => id !== null);
    const tipos = idsTipos.length
      ? await this.tipoRepository.findBy({ id_tipo_equipo: In(idsTipos) })
      : [];
    // CU-82: retornos previos de cada ítem
    const retornos = detalles.length
      ? await this.retornoRepository.find({
          where: { id_detalle: In(detalles.map((d) => d.id_detalle)) },
          order: { fecha_retorno: 'ASC' },
        })
      : [];
    const bodega = await this.bodegaRepository.findOne({
      where: { id_bodega: prestamo.id_bodega_origen },
    });
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usuario: prestamo.id_usuario },
    });

    return {
      id_prestamo: prestamo.id_prestamo,
      correlativo: prestamo.correlativo,
      tipo: prestamo.tipo,
      nombre_receptor: prestamo.nombre_receptor,
      rut_receptor: prestamo.rut_receptor,
      fecha_salida: prestamo.fecha_salida,
      fecha_estimada_retorno: prestamo.fecha_estimada_retorno,
      motivo: prestamo.motivo,
      estado: prestamo.estado,
      bodega_origen: bodega?.nombre ?? null,
      empresa:
        EMPRESAS.find((e) => e.id === prestamo.id_empresa)?.nombre ?? null,
      registrado_por: usuario?.nombre_completo ?? null,
      items: detalles.map((d) => {
        const unidad = unidades.find((u) => u.id_unidad === d.id_unidad);
        const tipo = tipos.find((t) => t.id_tipo_equipo === d.id_tipo_equipo);
        return {
          id_detalle: d.id_detalle,
          es_consumible: d.id_unidad === null,
          numero_serie: unidad?.serialNumber ?? null,
          tipo_equipo: unidad?.tipoEquipo?.nombre ?? tipo?.nombre ?? null,
          marca: unidad?.tipoEquipo?.marca ?? tipo?.marca ?? null,
          modelo:
            unidad?.modelo ??
            unidad?.tipoEquipo?.modelo ??
            tipo?.modelo ??
            null,
          unidad_medida: tipo?.unidadMedida ?? null,
          cantidad: d.cantidad === null ? null : Number(d.cantidad),
          cantidad_retornada: Number(d.cantidad_retornada ?? 0),
          estado_unidad: unidad?.estado ?? null,
          // CU-82: historial de retornos de este ítem
          retornos_previos: retornos
            .filter((r) => r.id_detalle === d.id_detalle)
            .map((r) => ({
              fecha_retorno: r.fecha_retorno,
              cantidad: r.cantidad === null ? null : Number(r.cantidad),
              observacion: r.observacion,
            })),
        };
      }),
    };
  }
}
