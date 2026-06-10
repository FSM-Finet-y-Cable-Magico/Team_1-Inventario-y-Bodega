import { Injectable } from '@nestjs/common';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, In } from 'typeorm';
import { Auditoria } from './entities/auditoria.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { FiltrarAuditoriaDto } from './dto/filtrar-auditoria.dto';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private auditoriaRepository: Repository<Auditoria>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  async create(createAuditoriaDto: CreateAuditoriaDto) {
    const MAX_REINTENTOS = 3;
    let ultimo_error: unknown;
    for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
      try {
        const auditoria = this.auditoriaRepository.create(createAuditoriaDto);
        return await this.auditoriaRepository.save(auditoria);
      } catch (err) {
        ultimo_error = err;
      }
    }
    throw ultimo_error;
  }

  async findAll(filtros?: FiltrarAuditoriaDto) {
    const where: FindOptionsWhere<Auditoria> = {};
    if (filtros?.id_usuario) where.id_usuario = filtros.id_usuario;
    if (filtros?.accion) where.accion = filtros.accion;
    if (filtros?.entidad_afectada) where.entidad_afectada = filtros.entidad_afectada;
    if (filtros?.fecha_inicio && filtros?.fecha_fin) {
      where.fecha_hora = Between(filtros.fecha_inicio, filtros.fecha_fin);
    }
    const pagina = filtros?.pagina ?? 1;
    const limite = filtros?.limite ?? 20;
    const logs = await this.auditoriaRepository.find({
      where,
      order: { fecha_hora: 'DESC' },
      skip: (pagina - 1) * limite,
      take: limite,
    });

    // Resolver los nombres de los usuarios actores en una sola query
    const idsUsuarios = [...new Set(logs.map((l) => l.id_usuario))];
    const usuarios = idsUsuarios.length
      ? await this.usuarioRepository.findBy({ id_usuario: In(idsUsuarios) })
      : [];
    const mapaNombres = new Map(usuarios.map((u) => [u.id_usuario, u.nombre_usuario ?? u.nombre_completo]));

    return logs.map((l) => ({
      ...l,
      usuario_nombre: mapaNombres.get(l.id_usuario) ?? null,
    }));
  }
}
