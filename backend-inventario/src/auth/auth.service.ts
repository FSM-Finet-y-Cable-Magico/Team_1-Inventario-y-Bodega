import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
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
    const payload = {
      sub: usuario.id_usuario,
      nombre_usuario: usuario.nombre_usuario,
    };
    const access_token = await this.jwtService.signAsync(payload);
    return { access_token };
  }
}
