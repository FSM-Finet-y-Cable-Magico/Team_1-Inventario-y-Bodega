import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async login(loginDto: LoginDto) {
    const usuario = await this.usuarioRepository.findOneBy({
      nombre_usuario: loginDto.nombre_usuario,
    });
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');
    const match = await bcrypt.compare(
      loginDto.password,
      usuario.password_hash,
    );
    if (!match) throw new UnauthorizedException('Credenciales inválidas');

    return { message: 'Login exitoso' };
  }
}
