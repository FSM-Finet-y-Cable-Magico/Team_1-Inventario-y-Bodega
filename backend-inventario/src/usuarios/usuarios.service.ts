import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as bcrypt from 'bcrypt';
import { AuditoriaService } from 'src/auditoria/auditoria.service';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly auditoriaService: AuditoriaService,
  ) {}
  async findAll(): Promise<Usuario[]> {
    return this.usuarioRepository.find();
  }

  async findOne(id: number): Promise<Usuario | null> {
    return this.usuarioRepository.findOneBy({ id_usuario: id });
  }
  async create(
    createUsuarioDto: CreateUsuarioDto,
    usuarioAuditorId: number,
  ): Promise<Usuario> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(createUsuarioDto.password, salt);
    const nuevoUsuario = await this.usuarioRepository.save({
      ...createUsuarioDto,
      password_hash: hash,
    });
    if (usuarioAuditorId) {
      await this.auditoriaService.create({
        id_usuario: usuarioAuditorId,
        accion: 'CREAR',
        entidad_afectada: 'usuario',
        id_entidad_afectada: nuevoUsuario.id_usuario,
        valor_anterior: null,
        valor_nuevo: nuevoUsuario,
      });
    }
    return nuevoUsuario;
  }
  async remove(id: number): Promise<void> {
    await this.usuarioRepository.delete(id);
  }
  async update(
    id: number,
    updateUsuarioDto: UpdateUsuarioDto,
    usuarioAuditorId: number,
  ): Promise<Usuario> {
    const usuario = await this.findOne(id);
    if (!usuario) throw new Error('Usuario no encontrado');
    const usuarioActualizado = await this.usuarioRepository.save({
      ...usuario,
      ...updateUsuarioDto,
    });
    if (usuarioAuditorId) {
      await this.auditoriaService.create({
        id_usuario: usuarioAuditorId,
        accion: 'ACTUALIZAR',
        entidad_afectada: 'usuario',
        id_entidad_afectada: id,
        valor_anterior: usuario,
        valor_nuevo: usuarioActualizado,
      });
    }
    return usuarioActualizado;
  }
}
