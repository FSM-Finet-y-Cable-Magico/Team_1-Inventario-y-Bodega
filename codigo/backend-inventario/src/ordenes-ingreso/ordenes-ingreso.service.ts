import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrdenIngreso } from './entities/orden-ingreso.entity';
import { OrdenIngresoDetalle } from './entities/orden-ingreso-detalle.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { CatalogService } from '../inventario/catalog.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateOrdenIngresoDto } from './dto/create-orden-ingreso.dto';
import { RegistrarRecepcionDto } from './dto/registrar-recepcion.dto';
import { EMPRESAS } from '../companies/companies.service';

// CU-52: clave del advisory lock que serializa la generación del correlativo OI-%04d.
// El prefijo OI- está reservado para G1 (docs/13, §1 "Correlativos"): ningún otro
// módulo debe emitirlo ni reutilizar esta clave.
const CORRELATIVO_LOCK_KEY = 52;

// CU-52/CU-54: estados de orden_ingreso. Literales exactos (con tildes), deben
// coincidir con el frontend y con lo declarado en la BD.
const ESTADO_PENDIENTE = 'Pendiente de recepción';
const ESTADO_PARCIAL = 'Recepción parcial';
const ESTADO_COMPLETADA = 'Completada';

@Injectable()
export class OrdenesIngresoService {
  constructor(
    @InjectRepository(OrdenIngreso)
    private readonly ordenRepository: Repository<OrdenIngreso>,
    @InjectRepository(OrdenIngresoDetalle)
    private readonly detalleRepository: Repository<OrdenIngresoDetalle>,
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
    @InjectRepository(TipoEquipo)
    private readonly tipoEquipoRepository: Repository<TipoEquipo>,
    // CU-55: unidades creadas al recibir equipos individualizables
    @InjectRepository(UnidadEquipo)
    private readonly unidadRepository: Repository<UnidadEquipo>,
    // CU-55: se reutiliza validarFormatoSerialNumber de CU-28 en vez de duplicar la regex
    private readonly catalogService: CatalogService,
    private readonly auditoriaService: AuditoriaService,
    private readonly dataSource: DataSource,
  ) {}

  // CU-52: crear orden de ingreso desde proveedor
  async create(
    dto: CreateOrdenIngresoDto,
    actor: { id_usuario: number; id_empresa: number; esSuperusuario: boolean },
  ): Promise<any> {
    // Aislamiento: no-superusuario fuerza id_empresa_destino = su empresa
    const idEmpresa = actor.esSuperusuario
      ? dto.id_empresa_destino
      : actor.id_empresa;

    // Solo el Superusuario indica la empresa destinataria; para el resto la fija el backend
    if (!idEmpresa) {
      throw new BadRequestException('La empresa destinataria es obligatoria.');
    }

    // Validar empresa destino
    const empresa = EMPRESAS.find((e) => e.id === idEmpresa);
    if (!empresa) {
      throw new BadRequestException('La empresa destinataria no es válida.');
    }

    // Validar proveedor existe
    const proveedor = await this.proveedorRepository.findOne({
      where: { id_proveedor: dto.id_proveedor },
    });
    if (!proveedor) {
      throw new NotFoundException('El proveedor seleccionado no existe.');
    }

    // Validar bodega activa y de la empresa destinataria
    const bodega = await this.bodegaRepository.findOne({
      where: { id_bodega: dto.id_bodega_destino },
    });
    if (!bodega) {
      throw new NotFoundException('La bodega de destino no existe.');
    }
    if (!bodega.activa) {
      throw new BadRequestException('La bodega de destino no está activa.');
    }
    if (bodega.id_empresa !== idEmpresa) {
      throw new BadRequestException(
        'La bodega de destino no pertenece a la empresa destinataria.',
      );
    }

    // Validar fecha no futura
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaDoc = new Date(dto.fecha_documento + 'T00:00:00');
    if (fechaDoc > hoy) {
      throw new BadRequestException(
        'La fecha del documento no puede ser una fecha futura.',
      );
    }

    // Validar tipos de equipo activos
    for (const item of dto.items) {
      const tipo = await this.tipoEquipoRepository.findOne({
        where: { id_tipo_equipo: item.id_tipo_equipo },
      });
      if (!tipo) {
        throw new BadRequestException(
          `El tipo de equipo con ID ${item.id_tipo_equipo} no existe.`,
        );
      }
      if (!tipo.activo) {
        throw new BadRequestException(
          `El tipo de equipo "${tipo.nombre}" no está activo.`,
        );
      }
    }

    // Transacción con QueryRunner para generar correlativo sin duplicados
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock de aplicación (se libera al COMMIT/ROLLBACK) para serializar la
      // generación del correlativo. Se usa advisory lock en vez de SELECT ... FOR
      // UPDATE porque este último no bloquea nada cuando la tabla aún está vacía
      // y dos órdenes simultáneas obtendrían el mismo OI-0001.
      await queryRunner.query(`SELECT pg_advisory_xact_lock($1)`, [
        CORRELATIVO_LOCK_KEY,
      ]);

      const ultima = await queryRunner.manager
        .createQueryBuilder(OrdenIngreso, 'o')
        .orderBy('o.id_orden', 'DESC')
        .getOne();

      let siguiente = 1;
      if (ultima?.correlativo) {
        const num = parseInt(ultima.correlativo.replace('OI-', ''), 10);
        siguiente = num + 1;
      }

      const correlativo = `OI-${String(siguiente).padStart(4, '0')}`;

      // Insertar la orden
      const orden = queryRunner.manager.create(OrdenIngreso, {
        correlativo,
        id_proveedor: dto.id_proveedor,
        numero_documento: dto.numero_documento,
        fecha_documento: dto.fecha_documento,
        id_empresa_destino: idEmpresa,
        id_bodega_destino: dto.id_bodega_destino,
        estado: ESTADO_PENDIENTE,
        id_usuario_registro: actor.id_usuario,
      });
      const ordenGuardada = await queryRunner.manager.save(orden);

      // Insertar los detalles
      const detalles = dto.items.map((item) =>
        queryRunner.manager.create(OrdenIngresoDetalle, {
          id_orden: ordenGuardada.id_orden,
          id_tipo_equipo: item.id_tipo_equipo,
          cantidad_esperada: item.cantidad_esperada,
          garantia_dias: item.garantia_dias,
          cantidad_recibida: 0,
        }),
      );
      await queryRunner.manager.save(detalles);

      await queryRunner.commitTransaction();

      // Auditoría
      await this.auditoriaService.create({
        id_usuario: actor.id_usuario,
        accion: 'CREAR',
        entidad_afectada: 'orden_ingreso',
        id_entidad_afectada: ordenGuardada.id_orden,
        valor_anterior: null,
        valor_nuevo: {
          correlativo,
          id_proveedor: dto.id_proveedor,
          numero_documento: dto.numero_documento,
          fecha_documento: dto.fecha_documento,
          id_empresa_destino: idEmpresa,
          id_bodega_destino: dto.id_bodega_destino,
          items: dto.items,
        },
      });

      return this.findOneConDetalles(ordenGuardada.id_orden);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // CU-52/CU-53: listar órdenes de ingreso (filtradas por empresa del actor)
  async findAll(
    actor: { id_empresa: number; esSuperusuario: boolean },
    filtros?: {
      buscar?: string;
      estado?: string;
      id_proveedor?: number;
      proveedor?: string;
      fecha_desde?: string;
      fecha_hasta?: string;
      id_empresa?: number;
    },
  ): Promise<any[]> {
    const query = this.ordenRepository.createQueryBuilder('o');

    // Aislamiento: el no-superusuario solo ve órdenes de su empresa y el filtro
    // de empresa se ignora; el superusuario ve todas y puede filtrar por una (CU-53)
    if (!actor.esSuperusuario) {
      query.andWhere('o.id_empresa_destino = :empresa', {
        empresa: actor.id_empresa,
      });
    } else if (filtros?.id_empresa) {
      query.andWhere('o.id_empresa_destino = :empresaFiltro', {
        empresaFiltro: filtros.id_empresa,
      });
    }

    // CU-53: filtro por estado (literales de orden_ingreso.estado)
    if (filtros?.estado) {
      query.andWhere('o.estado = :estado', { estado: filtros.estado });
    }

    // CU-53: filtro por proveedor, por id exacto o por nombre comercial
    if (filtros?.id_proveedor) {
      query.andWhere('o.id_proveedor = :idProveedor', {
        idProveedor: filtros.id_proveedor,
      });
    }
    if (filtros?.proveedor) {
      query.andWhere(
        `o.id_proveedor IN (
           SELECT p.id_proveedor FROM proveedor p
           WHERE p.nombre_comercial ILIKE :nombreProveedor
         )`,
        { nombreProveedor: `%${filtros.proveedor}%` },
      );
    }

    // CU-53: rango de fechas sobre la fecha del documento (ambos extremos inclusive)
    if (filtros?.fecha_desde) {
      query.andWhere('o.fecha_documento >= :fechaDesde', {
        fechaDesde: filtros.fecha_desde,
      });
    }
    if (filtros?.fecha_hasta) {
      query.andWhere('o.fecha_documento <= :fechaHasta', {
        fechaHasta: filtros.fecha_hasta,
      });
    }

    if (filtros?.buscar) {
      query.andWhere(
        '(o.correlativo ILIKE :buscar OR o.numero_documento ILIKE :buscar)',
        { buscar: `%${filtros.buscar}%` },
      );
    }

    const ordenes = await query.orderBy('o.id_orden', 'DESC').getMany();

    return Promise.all(ordenes.map((o) => this.findOneConDetalles(o.id_orden)));
  }

  // CU-53: detalle de una orden con sus ítems (cantidades esperadas y recibidas).
  // Aislamiento manual al estilo de `bodegas.verificarPertenencia`: si la orden no
  // es de la empresa del actor se devuelve un 404 genérico, para no revelar que existe.
  async findOne(
    idOrden: number,
    actor: { id_empresa: number; esSuperusuario: boolean },
  ): Promise<any> {
    // CU-53: un id no numérico llegaría como NaN a la consulta y reventaría en Postgres
    // (500). Se rechaza antes, igual que hace `unidades` con la ficha de detalle.
    if (!Number.isInteger(idOrden) || idOrden < 1) {
      throw new BadRequestException(
        'El identificador de la orden de ingreso proporcionado es inválido.',
      );
    }

    await this.verificarPertenencia(idOrden, actor);
    return this.findOneConDetalles(idOrden);
  }

  // CU-53/CU-54: devuelve la orden solo si el actor puede verla. Si no existe o es de otra
  // empresa lanza el MISMO 404, para no revelar la existencia de órdenes ajenas.
  private async verificarPertenencia(
    idOrden: number,
    actor: { id_empresa: number; esSuperusuario: boolean },
  ): Promise<OrdenIngreso> {
    const orden = await this.ordenRepository.findOne({
      where: { id_orden: idOrden },
    });
    if (!orden) {
      throw new NotFoundException('Orden de ingreso no encontrada');
    }
    if (
      !actor.esSuperusuario &&
      orden.id_empresa_destino !== actor.id_empresa
    ) {
      throw new NotFoundException('Orden de ingreso no encontrada');
    }
    return orden;
  }

  // CU-54: registrar la recepción total o parcial de una orden de ingreso
  async registrarRecepcion(
    idOrden: number,
    dto: RegistrarRecepcionDto,
    actor: { id_usuario: number; id_empresa: number; esSuperusuario: boolean },
  ): Promise<any> {
    // Mismo saneo del id que en el detalle: evita que un NaN llegue a la consulta
    if (!Number.isInteger(idOrden) || idOrden < 1) {
      throw new BadRequestException(
        'El identificador de la orden de ingreso proporcionado es inválido.',
      );
    }

    const orden = await this.verificarPertenencia(idOrden, actor);

    // CU-54 precondición: solo se recibe sobre 'Pendiente de recepción' o 'Recepción parcial'
    if (orden.estado === ESTADO_COMPLETADA) {
      throw new BadRequestException(
        'La orden de ingreso ya está completada y no admite nuevas recepciones.',
      );
    }

    const detalles = await this.detalleRepository.find({
      where: { id_orden: idOrden },
    });
    const porId = new Map(detalles.map((d) => [d.id_detalle, d]));

    // Se valida TODO antes de abrir la transacción: la Excepción 1 dice "no permite
    // continuar", así que ninguna cantidad debe escribirse si alguna es inválida.
    const recibidoPorDetalle = new Map<number, number>();
    // CU-55: NS por ítem, y el acumulado del envío para detectar repetidos entre ítems
    const seriesPorDetalle = new Map<number, string[]>();
    const seriesDelEnvio = new Set<string>();
    for (const item of dto.items) {
      if (recibidoPorDetalle.has(item.id_detalle)) {
        throw new BadRequestException(
          'La recepción no puede incluir el mismo ítem dos veces.',
        );
      }
      const detalle = porId.get(item.id_detalle);
      if (!detalle) {
        throw new BadRequestException(
          'El ítem indicado no pertenece a esta orden de ingreso.',
        );
      }
      const pendiente = detalle.cantidad_esperada - detalle.cantidad_recibida;
      // CU-54 Excepción 1
      if (item.cantidad_recibida > pendiente) {
        throw new BadRequestException(
          'La cantidad no puede superar la cantidad pendiente del ítem.',
        );
      }
      recibidoPorDetalle.set(item.id_detalle, item.cantidad_recibida);

      // CU-55: los ítems individualizables exigen un NS por unidad recibida
      const tipo = await this.tipoEquipoRepository.findOne({
        where: { id_tipo_equipo: detalle.id_tipo_equipo },
      });
      const series = (item.numeros_serie ?? []).map((s) => s.trim());

      if (!tipo?.requiereSerialNumber) {
        // Nota del CU: un consumible no pide NS, solo aumenta la cantidad (CU-54)
        if (series.length > 0) {
          throw new BadRequestException(
            `El tipo de equipo "${tipo?.nombre ?? detalle.id_tipo_equipo}" no es individualizable y no admite números de serie.`,
          );
        }
        continue;
      }

      // CU-55 Excepción 3: no se confirma mientras falten NS por ingresar
      if (series.length !== item.cantidad_recibida) {
        throw new BadRequestException(
          `Debe ingresar ${item.cantidad_recibida} número(s) de serie para el ítem "${tipo.nombre}". Ingresados: ${series.length}.`,
        );
      }

      for (const serie of series) {
        // CU-55 Excepción 1: se reutiliza la validación de formato de CU-28
        this.catalogService.validarFormatoSerialNumber(serie);

        // Duplicado dentro del mismo envío (aún no está en la BD)
        if (seriesDelEnvio.has(serie)) {
          throw new ConflictException(
            `El número de serie [${serie}] ya se encuentra registrado en el sistema.`,
          );
        }
        seriesDelEnvio.add(serie);

        // CU-55 Excepción 2: unicidad global contra unidad_equipo
        const existente = await this.unidadRepository.findOne({
          where: { serialNumber: serie },
        });
        if (existente) {
          throw new ConflictException(
            `El número de serie [${serie}] ya se encuentra registrado en el sistema.`,
          );
        }
      }
      seriesPorDetalle.set(item.id_detalle, series);
    }

    // Estado resultante: si algún ítem queda con pendiente → 'Recepción parcial';
    // si todos alcanzan lo esperado → 'Completada'. Si no se recibió nada en total,
    // la orden sigue 'Pendiente de recepción' (no hubo recepción que registrar).
    const totales = detalles.map((d) => ({
      id_detalle: d.id_detalle,
      esperada: d.cantidad_esperada,
      recibida:
        d.cantidad_recibida + (recibidoPorDetalle.get(d.id_detalle) ?? 0),
    }));
    const todosCompletos = totales.every((t) => t.recibida >= t.esperada);
    const algoRecibido = totales.some((t) => t.recibida > 0);
    const nuevoEstado = todosCompletos
      ? ESTADO_COMPLETADA
      : algoRecibido
        ? ESTADO_PARCIAL
        : ESTADO_PENDIENTE;

    const estadoAnterior = orden.estado;

    // CU-56: la fecha de recepción efectiva la indica el actor y es la que queda como
    // fecha_adquisicion de cada unidad. La fecha del documento del proveedor sigue viva
    // en orden_ingreso.fecha_documento y NO se sobreescribe: ambas quedan registradas.
    const fechaRecepcion = new Date(`${dto.fecha_recepcion}T00:00:00`);
    if (isNaN(fechaRecepcion.getTime())) {
      throw new BadRequestException(
        'La fecha de recepción debe tener formato válido (YYYY-MM-DD).',
      );
    }
    // CU-56 Excepción 2: se compara contra la fecha del servidor
    const hoyServidor = new Date();
    hoyServidor.setHours(23, 59, 59, 999);
    if (fechaRecepcion > hoyServidor) {
      throw new BadRequestException(
        'La fecha de recepción no puede ser futura.',
      );
    }
    // CU-55: el proveedor de la orden queda en la unidad (alimenta el reporte de CU-88)
    const proveedorOrden = await this.proveedorRepository.findOne({
      where: { id_proveedor: orden.id_proveedor },
    });
    const nombreProveedor = proveedorOrden?.nombre_comercial ?? null;
    const unidadesCreadas: {
      id_unidad: number;
      numero_serie: string;
      id_tipo_equipo: number;
      fecha_venc_garantia: string | null;
    }[] = [];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const [idDetalle, cantidad] of recibidoPorDetalle) {
        if (cantidad === 0) continue;
        await queryRunner.manager.increment(
          OrdenIngresoDetalle,
          { id_detalle: idDetalle },
          'cantidad_recibida',
          cantidad,
        );
      }

      // CU-55: cada NS se registra como una unidad nueva 'En bodega', en la MISMA
      // transacción que la recepción: o entran todas o no entra ninguna.
      for (const [idDetalle, series] of seriesPorDetalle) {
        if (series.length === 0) continue;
        const detalle = porId.get(idDetalle)!;
        // CU-38/CU-56: vencimiento = fecha de recepción efectiva + garantía del ítem,
        // de modo que el aviso de CU-39 y el reporte de CU-88 usen la fecha real
        const fechaVenc = new Date(fechaRecepcion);
        fechaVenc.setDate(fechaVenc.getDate() + (detalle.garantia_dias ?? 0));

        for (const serie of series) {
          const unidad = queryRunner.manager.create(UnidadEquipo, {
            id_tipo_equipo: detalle.id_tipo_equipo,
            id_empresa: orden.id_empresa_destino,
            serialNumber: serie,
            estado: 'En bodega',
            id_bodega_actual: orden.id_bodega_destino,
            fechaAdquisicion: fechaRecepcion,
            fechaVencGarantia: detalle.garantia_dias > 0 ? fechaVenc : null,
            proveedor: nombreProveedor,
          });
          const guardada = await queryRunner.manager.save(unidad);
          unidadesCreadas.push({
            id_unidad: guardada.id_unidad,
            numero_serie: serie,
            id_tipo_equipo: detalle.id_tipo_equipo,
            fecha_venc_garantia:
              detalle.garantia_dias > 0
                ? fechaVenc.toISOString().slice(0, 10)
                : null,
          });
        }
      }

      if (nuevoEstado !== estadoAnterior) {
        await queryRunner.manager.update(
          OrdenIngreso,
          { id_orden: idOrden },
          { estado: nuevoEstado },
        );
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // Auditoría de la recepción con lo recibido en ESTA instancia y el cambio de estado
    await this.auditoriaService.create({
      id_usuario: actor.id_usuario,
      accion: 'RECEPCION',
      entidad_afectada: 'orden_ingreso',
      id_entidad_afectada: idOrden,
      valor_anterior: { estado: estadoAnterior },
      valor_nuevo: {
        estado: nuevoEstado,
        // CU-56: queda registrada la fecha de recepción efectiva, distinta de la
        // fecha del documento que conserva la orden
        fecha_recepcion: dto.fecha_recepcion,
        fecha_documento_orden: orden.fecha_documento,
        items: dto.items,
      },
    });

    // CU-55: además, una entrada CREAR por cada unidad registrada
    for (const u of unidadesCreadas) {
      await this.auditoriaService.create({
        id_usuario: actor.id_usuario,
        accion: 'CREAR',
        entidad_afectada: 'unidad_equipo',
        id_entidad_afectada: u.id_unidad,
        valor_anterior: null,
        valor_nuevo: {
          numero_serie: u.numero_serie,
          id_tipo_equipo: u.id_tipo_equipo,
          estado: 'En bodega',
          id_empresa: orden.id_empresa_destino,
          id_bodega_actual: orden.id_bodega_destino,
          // CU-56: fecha de adquisición real de la unidad y garantía calculada sobre ella
          fecha_adquisicion: dto.fecha_recepcion,
          fecha_venc_garantia: u.fecha_venc_garantia,
          origen: `Recepción de la orden de ingreso ${orden.correlativo}`,
        },
      });
    }

    return this.findOneConDetalles(idOrden);
  }

  private async findOneConDetalles(idOrden: number): Promise<any> {
    const orden = await this.ordenRepository.findOne({
      where: { id_orden: idOrden },
    });
    if (!orden) return null;

    const detalles = await this.detalleRepository.find({
      where: { id_orden: idOrden },
    });

    // Enriquecer con nombre de proveedor
    const proveedor = await this.proveedorRepository.findOne({
      where: { id_proveedor: orden.id_proveedor },
    });

    // Enriquecer con nombre de bodega
    const bodega = await this.bodegaRepository.findOne({
      where: { id_bodega: orden.id_bodega_destino },
    });

    // Enriquecer detalles con nombre de tipo de equipo
    const detallesEnriquecidos = await Promise.all(
      detalles.map(async (d) => {
        const tipo = await this.tipoEquipoRepository.findOne({
          where: { id_tipo_equipo: d.id_tipo_equipo },
        });
        return {
          ...d,
          nombre_tipo_equipo: tipo?.nombre ?? null,
          // CU-55: el frontend pide NS solo para los ítems individualizables
          requiere_serie_individual: tipo?.requiereSerialNumber ?? false,
        };
      }),
    );

    const empresa = EMPRESAS.find((e) => e.id === orden.id_empresa_destino);

    return {
      ...orden,
      nombre_proveedor: proveedor?.nombre_comercial ?? null,
      nombre_bodega: bodega?.nombre ?? null,
      nombre_empresa: empresa?.nombre ?? null,
      detalles: detallesEnriquecidos,
    };
  }
}
