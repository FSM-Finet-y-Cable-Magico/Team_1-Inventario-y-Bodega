import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { AuditoriaService } from 'src/auditoria/auditoria.service';

@Injectable()
export class AuthService {
  private readonly tokenBlacklist = new Set<string>();

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async login(loginDto: LoginDto) {
    const usuario = await this.usuarioRepository.findOne({
      where: { nombre_usuario: loginDto.nombre_usuario },
      relations: { usuarioRoles: { rol: true } },
    });
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');

    if (!usuario.activo)
      throw new UnauthorizedException('Cuenta desactivada. Contacte al administrador.');

    const match = await bcrypt.compare(loginDto.password, usuario.password_hash);
    if (!match) throw new UnauthorizedException('Credenciales inválidas');

    const payload = {
      sub: usuario.id_usuario,
      nombre_usuario: usuario.nombre_usuario,
      id_empresa: usuario.id_empresa,
      roles: usuario.usuarioRoles?.map((ur) => ur.rol.nombre_rol) ?? [],
    };
    const access_token = await this.jwtService.signAsync(payload);

    await this.auditoriaService.create({
      id_usuario: usuario.id_usuario,
      accion: 'LOGIN',
      entidad_afectada: 'usuario',
      id_entidad_afectada: usuario.id_usuario,
      valor_anterior: null,
      valor_nuevo: { nombre_usuario: usuario.nombre_usuario },
    });

    return { access_token };
  }

  async logout(token: string, usuarioId: number) {
    this.tokenBlacklist.add(token);
    await this.auditoriaService.create({
      id_usuario: usuarioId,
      accion: 'LOGOUT',
      entidad_afectada: 'usuario',
      id_entidad_afectada: usuarioId,
      valor_anterior: null,
      valor_nuevo: null,
    });
    return { message: 'Sesión cerrada correctamente.' };
  }

  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  async restablecerPassword(targetId: number, actorId: number): Promise<{ password_temporal: string }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usuario: targetId },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');
    if (!usuario.activo) throw new UnauthorizedException('El usuario está desactivado.');

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    let passwordTemporal = '';
    for (let i = 0; i < 10; i++) {
      passwordTemporal += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordTemporal, salt);

    await this.usuarioRepository.update(targetId, { password_hash: hash });

    await this.auditoriaService.create({
      id_usuario: actorId,
      accion: 'RESTABLECER_PASSWORD',
      entidad_afectada: 'usuario',
      id_entidad_afectada: targetId,
      valor_anterior: null,
      valor_nuevo: { accion: 'password temporal generado' },
    });

    return { password_temporal: passwordTemporal };
  }
}
