import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}
  async findAll(): Promise<Usuario[]> {
    return this.usuarioRepository.find();
  }

  async findOne(id: number): Promise<Usuario | null> {
    return this.usuarioRepository.findOneBy({ id_usuario: id });
  }
  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(createUsuarioDto.password, salt);
    return this.usuarioRepository.save({
      ...createUsuarioDto,
      password_hash: hash,
    });
  }
  async remove(id: number): Promise<void> {
    await this.usuarioRepository.delete(id);
  }
  async update(
    id: number,
    updateUsuarioDto: UpdateUsuarioDto,
  ): Promise<Usuario> {
    const usuario = await this.findOne(id);
    if (!usuario) throw new Error('Usuario no encontrado');
    return this.usuarioRepository.save({
      ...usuario,
      ...updateUsuarioDto,
    });
  }
}
