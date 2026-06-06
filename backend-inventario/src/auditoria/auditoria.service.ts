import { Injectable } from '@nestjs/common';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { UpdateAuditoriaDto } from './dto/update-auditoria.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auditoria } from './entities/auditoria.entity';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private auditoriaRepository: Repository<Auditoria>,
  ) {}

  async create(createAuditoriaDto: CreateAuditoriaDto) {
    const auditoria = this.auditoriaRepository.create(createAuditoriaDto);
    return await this.auditoriaRepository.save(auditoria);
  }

  findAll() {
    return `This action returns all auditoria`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auditoria`;
  }

  update(id: number, updateAuditoriaDto: UpdateAuditoriaDto) {
    return `This action updates a #${id} auditoria`;
  }

  remove(id: number) {
    return `This action removes a #${id} auditoria`;
  }
}
