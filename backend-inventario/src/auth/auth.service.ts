import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { AuditoriaService } from 'src/auditoria/auditoria.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async login(loginDto: LoginDto) {
    const usuario = await this.usuarioRepository.findOne({
      where: {
        nombre_usuario: loginDto.nombre_usuario,
      },
      relations: {
        usuarioRoles: {
          rol: true,
        },
      },
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
      roles: usuario.usuarioRoles?.map((ur) => ur.rol.nombre_rol) ?? [],
    };
    const access_token = await this.jwtService.signAsync(payload);
    return { access_token };
  }
}
