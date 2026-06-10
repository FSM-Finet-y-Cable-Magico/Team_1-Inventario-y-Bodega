import { Injectable } from '@nestjs/common';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { Auditoria } from './entities/auditoria.entity';
import { FiltrarAuditoriaDto } from './dto/filtrar-auditoria.dto';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private auditoriaRepository: Repository<Auditoria>,
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
    if (filtros?.fecha_inicio && filtros?.fecha_fin) {
      where.fecha_hora = Between(filtros.fecha_inicio, filtros.fecha_fin);
    }
    const pagina = filtros?.pagina ?? 1;
    const limite = filtros?.limite ?? 20;
    return await this.auditoriaRepository.find({
      where,
      skip: (pagina - 1) * limite,
      take: limite,
    });
  }
}
