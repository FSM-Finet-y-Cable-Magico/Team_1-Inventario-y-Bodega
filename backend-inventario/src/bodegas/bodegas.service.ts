import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Bodega } from './entities/bodega.entity';
import { StockConsumible } from './entities/stock-consumible.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { Auditoria } from '../auditoria/entities/auditoria.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CreateBodegaDto } from './dto/create-bodega.dto';
import { UpdateBodegaDto } from './dto/update-bodega.dto';
import { ConfigurarUmbralDto } from './dto/configurar-umbral.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class BodegasService {
  constructor(
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
    @InjectRepository(StockConsumible)
    private readonly stockConsumibleRepository: Repository<StockConsumible>,
    @InjectRepository(UnidadEquipo)
    private readonly unidadEquipoRepository: Repository<UnidadEquipo>,
    @InjectRepository(TipoEquipo)
    private readonly tipoEquipoRepository: Repository<TipoEquipo>,
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async create(dto: CreateBodegaDto, actorId: number): Promise<Bodega> {
    const existing = await this.bodegaRepository.findOne({
      where: { nombre: dto.nombre, id_empresa: dto.id_empresa },
    });
    if (existing) {
      throw new BadRequestException('Ya existe una bodega con ese nombre en esta empresa.');
    }

    const bodega = this.bodegaRepository.create({ ...dto, activa: true });
    const nuevaBodega = await this.bodegaRepository.save(bodega);

    if (actorId) {
      await this.auditoriaService.create({
        id_usuario: actorId,
        accion: 'CREAR',
        entidad_afectada: 'bodega',
        id_entidad_afectada: nuevaBodega.id_bodega,
        valor_anterior: null,
        valor_nuevo: nuevaBodega,
      });
    }

    return nuevaBodega;
  }

  // CU-16/CU-18/CU-19 Excepción 1: el acceso a una bodega de otra empresa se
  // rechaza con el mismo 404 que una bodega inexistente (no se revela si el
  // registro existe) y el intento queda en el log de auditoría.
  private async verificarPertenencia(
    bodega: Bodega,
    userEmpresaId: number,
    isSuperuser: boolean,
    actorId: number,
    operacion: string,
  ): Promise<void> {
    if (isSuperuser || bodega.id_empresa === userEmpresaId) return;

    if (actorId) {
      await this.auditoriaService.create({
        id_usuario: actorId,
        accion: 'ACCESO_DENEGADO',
        entidad_afectada: 'bodega',
        id_entidad_afectada: bodega.id_bodega,
        valor_anterior: null,
        valor_nuevo: {
          motivo: 'Intento de acceso a bodega de otra empresa',
          operacion,
          id_empresa_actor: userEmpresaId,
        },
      });
    }
    throw new NotFoundException('Bodega no encontrada');
  }

  async update(
    id: number,
    dto: UpdateBodegaDto,
    actorId: number,
    userEmpresaId: number,
    isSuperuser: boolean,
  ): Promise<Bodega> {
    const bodega = await this.bodegaRepository.findOne({ where: { id_bodega: id } });
    if (!bodega) throw new NotFoundException('Bodega no encontrada');
    await this.verificarPertenencia(bodega, userEmpresaId, isSuperuser, actorId, 'MODIFICAR');

    const anterior = { ...bodega };

    if (dto.nombre && dto.nombre !== bodega.nombre) {
      const existing = await this.bodegaRepository.findOne({
        where: { nombre: dto.nombre, id_empresa: bodega.id_empresa },
      });
      if (existing) {
        throw new BadRequestException('Ya existe una bodega con ese nombre en esta empresa.');
      }
      bodega.nombre = dto.nombre;
    }

    if (dto.direccion !== undefined) bodega.direccion = dto.direccion;
    // CU-42: el responsable es editable
    if (dto.id_usuario_responsable !== undefined) bodega.id_usuario_responsable = dto.id_usuario_responsable;

    const bodegaActualizada = await this.bodegaRepository.save(bodega);

    if (actorId) {
      await this.auditoriaService.create({
        id_usuario: actorId,
        accion: 'MODIFICAR',
        entidad_afectada: 'bodega',
        id_entidad_afectada: bodegaActualizada.id_bodega,
        valor_anterior: anterior,
        valor_nuevo: bodegaActualizada,
      });
    }

    return bodegaActualizada;
  }

  async deactivate(
    id: number,
    actorId: number,
    userEmpresaId: number,
    isSuperuser: boolean,
  ): Promise<Bodega> {
    const bodega = await this.bodegaRepository.findOne({ where: { id_bodega: id } });
    if (!bodega) throw new NotFoundException('Bodega no encontrada');
    await this.verificarPertenencia(bodega, userEmpresaId, isSuperuser, actorId, 'DESACTIVAR');

    if (!bodega.activa) return bodega;

    const activeCount = await this.bodegaRepository.count({
      where: { id_empresa: bodega.id_empresa, activa: true },
    });
    if (activeCount <= 1) {
      throw new BadRequestException('No es posible desactivar la última bodega activa de la empresa.');
    }

    const anterior = { ...bodega };
    bodega.activa = false;
    const bodegaActualizada = await this.bodegaRepository.save(bodega);

    if (actorId) {
      await this.auditoriaService.create({
        id_usuario: actorId,
        accion: 'DESACTIVAR',
        entidad_afectada: 'bodega',
        id_entidad_afectada: bodegaActualizada.id_bodega,
        valor_anterior: anterior,
        valor_nuevo: bodegaActualizada,
      });
    }

    return bodegaActualizada;
  }

  async findAll(
    filtros: { activa?: boolean; nombre?: string },
    userEmpresaId: number,
    isSuperuser: boolean,
  ): Promise<any[]> {
    const query = this.bodegaRepository.createQueryBuilder('bodega');

    if (!isSuperuser) {
      query.andWhere('bodega.id_empresa = :userEmpresaId', { userEmpresaId });
    }

    if (filtros.activa !== undefined) {
      query.andWhere('bodega.activa = :activa', { activa: filtros.activa });
    }

    if (filtros.nombre) {
      query.andWhere('bodega.nombre ILIKE :nombre', { nombre: `%${filtros.nombre}%` });
    }

    const bodegas = await query.getMany();

    // Obtenemos los IDs de bodegas para consultar el log en una sola query
    const idsBodegas = bodegas.map((b) => b.id_bodega);

    // Para cada bodega: buscamos quién la creó en el log de auditoría
    const logsCreacion = idsBodegas.length > 0
      ? await this.auditoriaRepository
          .createQueryBuilder('log')
          .where('log.entidad_afectada = :entidad', { entidad: 'bodega' })
          .andWhere('log.accion = :accion', { accion: 'CREAR' })
          .andWhere('log.id_entidad_afectada IN (:...ids)', { ids: idsBodegas })
          .getMany()
      : [];

    // Resolvemos los nombres de los responsables en una sola query
    // (responsable explícito CU-41 o, como respaldo, el creador según auditoría)
    const idsResponsables = bodegas.map((b) => b.id_usuario_responsable).filter(Boolean) as number[];
    const idsUsuarios = [...new Set([...logsCreacion.map((l) => l.id_usuario), ...idsResponsables])];
    const usuarios = idsUsuarios.length > 0
      ? await this.usuarioRepository.findBy({ id_usuario: In(idsUsuarios) as any })
      : [];
    const mapaUsuarios = new Map(usuarios.map((u) => [u.id_usuario, u.nombre_completo]));
    const mapaCreadores = new Map(logsCreacion.map((l) => [l.id_entidad_afectada, l.id_usuario]));

    const result: any[] = [];
    for (const b of bodegas) {
      const stockConsumibles = await this.stockConsumibleRepository.sum(
        'cantidad_disponible',
        { id_bodega: b.id_bodega },
      );
      const countUnidades = await this.unidadEquipoRepository.count({
        where: { id_bodega_actual: b.id_bodega },
      });

      const idResponsable = b.id_usuario_responsable ?? mapaCreadores.get(b.id_bodega);
      const nombreResponsable = idResponsable ? (mapaUsuarios.get(idResponsable) ?? null) : null;

      result.push({
        id_bodega: b.id_bodega,
        nombre: b.nombre,
        direccion: b.direccion,
        empresa: b.id_empresa === 1 ? 'Finet' : 'Cable Mágico',
        responsable: nombreResponsable,
        activa: b.activa,
        estado: b.activa ? 'Activa' : 'Inactiva',
        resumen_stock_total: Number(stockConsumibles || 0) + countUnidades,
      });
    }

    return result;
  }

  async findOne(
    id: number,
    userEmpresaId: number,
    isSuperuser: boolean,
    actorId?: number,
  ): Promise<Bodega> {
    const bodega = await this.bodegaRepository.findOne({ where: { id_bodega: id } });
    if (!bodega) throw new NotFoundException('Bodega no encontrada');
    await this.verificarPertenencia(bodega, userEmpresaId, isSuperuser, actorId ?? 0, 'CONSULTAR');

    return bodega;
  }

  async getStock(
    id: number,
    userEmpresaId: number,
    isSuperuser: boolean,
    actorId?: number,
  ): Promise<any> {
    const bodega = await this.bodegaRepository.findOne({ where: { id_bodega: id } });
    if (!bodega) throw new NotFoundException('Bodega no encontrada');
    await this.verificarPertenencia(bodega, userEmpresaId, isSuperuser, actorId ?? 0, 'CONSULTAR_STOCK');

    const unidades = await this.unidadEquipoRepository.find({
      where: { id_bodega_actual: id },
      relations: { tipoEquipo: true },
    });

    const consumibles = await this.stockConsumibleRepository.find({
      where: { id_bodega: id },
      relations: { tipoEquipo: true },
    });

    const stockPorTipo: { [key: number]: any } = {};

    for (const u of unidades) {
      const te = u.tipoEquipo;
      if (!stockPorTipo[te.id_tipo_equipo]) {
        stockPorTipo[te.id_tipo_equipo] = {
          id_tipo_equipo: te.id_tipo_equipo,
          tipo_equipo: { nombre: te.nombre, categoria: te.categoria },
          requiere_serie: te.requiereSerialNumber,
          cantidad_disponible: 0,
          umbral_minimo: null,
          desglose_estados: { 'En bodega': 0, 'Asignado a técnico': 0, 'En revisión': 0, 'En préstamo externo': 0 },
        };
      }
      const registro = stockPorTipo[te.id_tipo_equipo];
      if (u.estado in registro.desglose_estados) {
        registro.desglose_estados[u.estado]++;
      }
      // Para serializados, la cantidad disponible son las unidades físicamente en bodega
      if (u.estado === 'En bodega') {
        registro.cantidad_disponible++;
      }
    }

    for (const c of consumibles) {
      const te = c.tipoEquipo;
      const umbral = c.umbral_minimo === null || c.umbral_minimo === undefined
        ? null
        : Number(c.umbral_minimo);

      // CU-46: para tipos serializados la fila de stock_consumible solo
      // almacena el umbral; el stock real es el conteo de unidades en bodega
      if (te.requiereSerialNumber === true) {
        if (!stockPorTipo[te.id_tipo_equipo]) {
          stockPorTipo[te.id_tipo_equipo] = {
            id_tipo_equipo: te.id_tipo_equipo,
            tipo_equipo: { nombre: te.nombre, categoria: te.categoria },
            requiere_serie: true,
            cantidad_disponible: 0,
            umbral_minimo: null,
            desglose_estados: { 'En bodega': 0, 'Asignado a técnico': 0, 'En revisión': 0, 'En préstamo externo': 0 },
          };
        }
        stockPorTipo[te.id_tipo_equipo].umbral_minimo = umbral;
        continue;
      }

      stockPorTipo[te.id_tipo_equipo] = {
        id_tipo_equipo: te.id_tipo_equipo,
        tipo_equipo: { nombre: te.nombre, categoria: te.categoria },
        requiere_serie: te.requiereSerialNumber,
        // CU-45: los consumibles se expresan en su unidad de medida
        unidad_medida: te.unidadMedida ?? null,
        cantidad_disponible: Number(c.cantidad_disponible),
        umbral_minimo: umbral,
      };
    }

    return Object.values(stockPorTipo);
  }

  // CU-46: el umbral aplica a cualquier combinación de tipo de equipo y bodega;
  // para serializados el stock es el conteo de unidades 'En bodega'
  async configurarUmbral(
    id: number,
    dto: ConfigurarUmbralDto,
    actorId: number,
    userEmpresaId: number,
    isSuperuser: boolean,
  ): Promise<any> {
    const bodega = await this.bodegaRepository.findOne({ where: { id_bodega: id } });
    if (!bodega) throw new NotFoundException('Bodega no encontrada');
    await this.verificarPertenencia(bodega, userEmpresaId, isSuperuser, actorId, 'CONFIGURAR_UMBRAL');

    const tipoEquipo = await this.tipoEquipoRepository.findOne({
      where: { id_tipo_equipo: dto.id_tipo_equipo },
    });
    if (!tipoEquipo) throw new NotFoundException('Tipo de equipo no encontrado');

    let record = await this.stockConsumibleRepository.findOne({
      where: { id_bodega: id, id_tipo_equipo: dto.id_tipo_equipo },
    });

    const anterior = record ? { ...record } : null;

    if (record) {
      record.umbral_minimo = dto.umbral;
    } else {
      record = this.stockConsumibleRepository.create({
        id_bodega: id,
        id_tipo_equipo: dto.id_tipo_equipo,
        cantidad_disponible: 0,
        umbral_minimo: dto.umbral,
      });
    }

    const guardado = await this.stockConsumibleRepository.save(record);

    if (actorId) {
      await this.auditoriaService.create({
        id_usuario: actorId,
        accion: 'CONFIGURAR_UMBRAL',
        entidad_afectada: 'stock_consumible',
        id_entidad_afectada: guardado.id_stock,
        valor_anterior: anterior,
        valor_nuevo: guardado,
      });
    }

    // CU-46: si el stock actual está bajo el nuevo umbral, se genera la alerta inmediata
    const stockActual = tipoEquipo.requiereSerialNumber === true
      ? await this.unidadEquipoRepository.count({
          where: { id_bodega_actual: id, id_tipo_equipo: dto.id_tipo_equipo, estado: 'En bodega' },
        })
      : Number(guardado.cantidad_disponible);
    const alertaGenerada = dto.umbral > 0 && stockActual < dto.umbral;

    return {
      ...guardado,
      tipo_equipo: tipoEquipo.nombre,
      stock_actual: stockActual,
      alerta_generada: alertaGenerada,
      message: alertaGenerada
        ? `Umbral configurado. ALERTA: el stock actual (${stockActual}) está por debajo del umbral mínimo (${dto.umbral}).`
        : 'Umbral de stock mínimo configurado correctamente.',
    };
  }
}
