import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bodega } from './entities/bodega.entity';
import { StockConsumible } from './entities/stock-consumible.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { UnidadEquipo } from '../equipos/entities/unidad-equipo.entity';
import { TipoEquipo } from '../equipos/entities/tipo-equipo.entity';
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
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(UnidadEquipo)
    private readonly unidadEquipoRepository: Repository<UnidadEquipo>,
    @InjectRepository(TipoEquipo)
    private readonly tipoEquipoRepository: Repository<TipoEquipo>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async create(dto: CreateBodegaDto, actorId: number): Promise<Bodega> {
    const existing = await this.bodegaRepository.findOne({
      where: { nombre: dto.nombre, id_empresa: dto.id_empresa },
    });
    if (existing) {
      throw new BadRequestException(
        'Ya existe una bodega con ese nombre en esta empresa.',
      );
    }

    const responsable = await this.usuarioRepository.findOne({
      where: { id_usuario: dto.id_responsable },
    });
    if (
      !responsable ||
      !responsable.activo ||
      responsable.id_empresa !== dto.id_empresa
    ) {
      throw new BadRequestException(
        'El responsable asignado debe ser un usuario activo de la misma empresa.',
      );
    }

    const bodega = this.bodegaRepository.create({
      ...dto,
      activa: true,
    });
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

  async update(
    id: number,
    dto: UpdateBodegaDto,
    actorId: number,
  ): Promise<Bodega> {
    const bodega = await this.bodegaRepository.findOne({
      where: { id_bodega: id },
    });
    if (!bodega) {
      throw new NotFoundException('Bodega no encontrada');
    }

    const anterior = { ...bodega };

    if (dto.nombre && dto.nombre !== bodega.nombre) {
      const existing = await this.bodegaRepository.findOne({
        where: { nombre: dto.nombre, id_empresa: bodega.id_empresa },
      });
      if (existing) {
        throw new BadRequestException(
          'Ya existe una bodega con ese nombre en esta empresa.',
        );
      }
      bodega.nombre = dto.nombre;
    }

    if (dto.id_responsable && dto.id_responsable !== bodega.id_responsable) {
      const responsable = await this.usuarioRepository.findOne({
        where: { id_usuario: dto.id_responsable },
      });
      if (
        !responsable ||
        !responsable.activo ||
        responsable.id_empresa !== bodega.id_empresa
      ) {
        throw new BadRequestException(
          'El responsable asignado debe ser un usuario activo de la misma empresa.',
        );
      }
      bodega.id_responsable = dto.id_responsable;
    }

    if (dto.direccion !== undefined) {
      bodega.direccion = dto.direccion;
    }

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

  async deactivate(id: number, actorId: number): Promise<Bodega> {
    const bodega = await this.bodegaRepository.findOne({
      where: { id_bodega: id },
    });
    if (!bodega) {
      throw new NotFoundException('Bodega no encontrada');
    }

    if (!bodega.activa) {
      return bodega;
    }

    const activeCount = await this.bodegaRepository.count({
      where: { id_empresa: bodega.id_empresa, activa: true },
    });
    if (activeCount <= 1) {
      throw new BadRequestException(
        'No es posible desactivar la última bodega activa de la empresa.',
      );
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
    const query = this.bodegaRepository
      .createQueryBuilder('bodega')
      .leftJoinAndSelect('bodega.responsable', 'responsable');

    if (!isSuperuser) {
      query.andWhere('bodega.id_empresa = :userEmpresaId', { userEmpresaId });
    }

    if (filtros.activa !== undefined) {
      query.andWhere('bodega.activa = :activa', { activa: filtros.activa });
    }

    if (filtros.nombre) {
      query.andWhere('bodega.nombre ILIKE :nombre', {
        nombre: `%${filtros.nombre}%`,
      });
    }

    const bodegas = await query.getMany();

    const result: any[] = [];
    for (const b of bodegas) {
      const stockConsumibles = await this.stockConsumibleRepository.sum(
        'cantidad_disponible',
        { id_bodega: b.id_bodega },
      );
      const countUnidades = await this.unidadEquipoRepository.count({
        where: { id_bodega_actual: b.id_bodega },
      });

      result.push({
        id_bodega: b.id_bodega,
        nombre: b.nombre,
        empresa: b.id_empresa === 1 ? 'Finet' : 'Cable Mágico',
        responsable: b.responsable ? b.responsable.nombre_completo : null,
        estado: b.activa ? 'Activa' : 'Inactiva',
        resumen_stock_total: Number(stockConsumibles || 0) + countUnidades,
      });
    }

    return result;
  }

  async getStock(
    id: number,
    userEmpresaId: number,
    isSuperuser: boolean,
  ): Promise<any> {
    const bodega = await this.bodegaRepository.findOne({
      where: { id_bodega: id },
    });
    if (!bodega) {
      throw new NotFoundException('Bodega no encontrada');
    }

    if (!isSuperuser && bodega.id_empresa !== userEmpresaId) {
      throw new BadRequestException(
        'No tiene permisos para acceder a esta sección.',
      );
    }

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
          tipo_equipo: te.nombre,
          categoria: te.categoria,
          requiere_serie: te.requiere_serie_individual,
          stock: {
            'En bodega': 0,
            'Asignado a técnico': 0,
            'En revisión': 0,
            'En préstamo externo': 0,
          },
        };
      }

      if (u.estado in stockPorTipo[te.id_tipo_equipo].stock) {
        stockPorTipo[te.id_tipo_equipo].stock[u.estado]++;
      }
    }

    for (const c of consumibles) {
      const te = c.tipoEquipo;
      if (!stockPorTipo[te.id_tipo_equipo]) {
        stockPorTipo[te.id_tipo_equipo] = {
          tipo_equipo: te.nombre,
          categoria: te.categoria,
          requiere_serie: te.requiere_serie_individual,
          stock: 0,
        };
      }
      stockPorTipo[te.id_tipo_equipo].stock = Number(c.cantidad_disponible);
    }

    return Object.values(stockPorTipo);
  }

  async configurarUmbral(
    id: number,
    dto: ConfigurarUmbralDto,
    actorId: number,
  ): Promise<StockConsumible> {
    const bodega = await this.bodegaRepository.findOne({
      where: { id_bodega: id },
    });
    if (!bodega) {
      throw new NotFoundException('Bodega no encontrada');
    }

    const tipoEquipo = await this.tipoEquipoRepository.findOne({
      where: { id_tipo_equipo: dto.id_tipo_equipo },
    });
    if (!tipoEquipo) {
      throw new NotFoundException('Tipo de equipo no encontrado');
    }

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

    return guardado;
  }
}
