import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrdenIngreso } from './entities/orden-ingreso.entity';
import { OrdenIngresoDetalle } from './entities/orden-ingreso-detalle.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateOrdenIngresoDto } from './dto/create-orden-ingreso.dto';
import { EMPRESAS } from '../companies/companies.service';

// CU-52: clave del advisory lock que serializa la generación del correlativo OI-%04d.
// El prefijo OI- está reservado para G1 (docs/13, §1 "Correlativos"): ningún otro
// módulo debe emitirlo ni reutilizar esta clave.
const CORRELATIVO_LOCK_KEY = 52;

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

      const result = (await queryRunner.query(
        `SELECT correlativo FROM orden_ingreso ORDER BY id_orden DESC LIMIT 1`,
      )) as { correlativo: string }[];

      let siguiente = 1;
      if (result.length > 0) {
        const ultimo = result[0].correlativo; // OI-0001
        const num = parseInt(ultimo.replace('OI-', ''), 10);
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
        estado: 'Pendiente de recepción',
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

  // CU-52: listar órdenes de ingreso (filtradas por empresa del actor)
  async findAll(
    actor: { id_empresa: number; esSuperusuario: boolean },
    filtros?: { buscar?: string; estado?: string },
  ): Promise<any[]> {
    const query = this.ordenRepository.createQueryBuilder('o');

    // Aislamiento: no-superusuario solo ve órdenes de su empresa
    if (!actor.esSuperusuario) {
      query.andWhere('o.id_empresa_destino = :empresa', {
        empresa: actor.id_empresa,
      });
    }

    if (filtros?.estado) {
      query.andWhere('o.estado = :estado', { estado: filtros.estado });
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
