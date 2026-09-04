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
import { EMPRESAS } from 'src/companies/companies.service';

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;
const MSG_GENERICO = 'Usuario o contraseña incorrectos.';
const MSG_BLOQUEADO =
  'Cuenta bloqueada temporalmente. Intente nuevamente en 15 minutos.';

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

    // CU-01 Excepción 1 y 2: mensaje genérico sin revelar cuál campo falló
    if (!usuario) throw new UnauthorizedException(MSG_GENERICO);

    // CU-01 Excepción 3: cuenta bloqueada por intentos fallidos
    if (usuario.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
      throw new UnauthorizedException(MSG_BLOQUEADO);
    }

    if (!usuario.activo)
      throw new UnauthorizedException(
        'Cuenta desactivada. Contacte al administrador.',
      );

    const match = await bcrypt.compare(
      loginDto.password,
      usuario.password_hash,
    );

    if (!match) {
      const nuevosIntentos = (usuario.intentos_fallidos ?? 0) + 1;
      const actualizacion: Partial<Usuario> = {
        intentos_fallidos: nuevosIntentos,
      };

      if (nuevosIntentos >= MAX_INTENTOS) {
        const bloqueadoHasta = new Date();
        bloqueadoHasta.setMinutes(
          bloqueadoHasta.getMinutes() + MINUTOS_BLOQUEO,
        );
        actualizacion.bloqueado_hasta = bloqueadoHasta;
        actualizacion.intentos_fallidos = 0;
        await this.usuarioRepository.update(usuario.id_usuario, actualizacion);
        throw new UnauthorizedException(MSG_BLOQUEADO);
      }

      await this.usuarioRepository.update(usuario.id_usuario, actualizacion);
      throw new UnauthorizedException(MSG_GENERICO);
    }

    // Login exitoso: resetear contador
    await this.usuarioRepository.update(usuario.id_usuario, {
      intentos_fallidos: 0,
      bloqueado_hasta: null,
    });

    // CU-10: con la bandera activa se impide el acceso hasta establecer
    // una nueva contraseña propia
    if (usuario.debe_cambiar_password) {
      return { debe_cambiar_password: true };
    }

    // CU-13/CU-14 Excepción 1: usuario sin empresa asignada
    if (usuario.id_empresa === null || usuario.id_empresa === undefined) {
      throw new UnauthorizedException(
        'Su cuenta no tiene empresa asignada. Contacte al administrador.',
      );
    }

    const roles = usuario.usuarioRoles?.map((ur) => ur.rol.nombre_rol) ?? [];
    const payload = {
      sub: usuario.id_usuario,
      nombre_usuario: usuario.nombre_usuario,
      id_empresa: usuario.id_empresa,
      roles,
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

    // El frontend necesita los datos del usuario (sin hash) para el contexto
    // de empresa (CU-13/CU-16) y las validaciones de cuenta propia (CU-07)
    const { password_hash, usuarioRoles, ...usuarioSeguro } = usuario;
    return {
      access_token,
      usuario: {
        ...usuarioSeguro,
        roles: usuario.usuarioRoles?.map((ur) => ur.rol) ?? [],
        empresa: EMPRESAS.find((e) => e.id === usuario.id_empresa) ?? null,
      },
    };
  }

  // CU-11/CU-12: el motivo distingue cierre manual del cierre por inactividad
  async logout(token: string, usuarioId: number, motivo?: string) {
    this.tokenBlacklist.add(token);
    await this.auditoriaService.create({
      id_usuario: usuarioId,
      accion: 'LOGOUT',
      entidad_afectada: 'usuario',
      id_entidad_afectada: usuarioId,
      valor_anterior: null,
      valor_nuevo: {
        motivo: motivo === 'inactividad' ? 'inactividad' : 'manual',
      },
    });
    return { message: 'Sesión cerrada correctamente.' };
  }

  // CU-10: el usuario establece su nueva contraseña tras un restablecimiento
  async cambiarPassword(dto: {
    nombre_usuario: string;
    password_actual: string;
    nueva_password: string;
  }) {
    const usuario = await this.usuarioRepository.findOne({
      where: { nombre_usuario: dto.nombre_usuario },
    });
    if (!usuario || !usuario.activo)
      throw new UnauthorizedException(MSG_GENERICO);

    if (usuario.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
      throw new UnauthorizedException(MSG_BLOQUEADO);
    }

    const match = await bcrypt.compare(
      dto.password_actual,
      usuario.password_hash,
    );
    if (!match) throw new UnauthorizedException(MSG_GENERICO);

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(dto.nueva_password, salt);
    await this.usuarioRepository.update(usuario.id_usuario, {
      password_hash: hash,
      debe_cambiar_password: false,
    });

    await this.auditoriaService.create({
      id_usuario: usuario.id_usuario,
      accion: 'CAMBIAR_PASSWORD',
      entidad_afectada: 'usuario',
      id_entidad_afectada: usuario.id_usuario,
      valor_anterior: null,
      valor_nuevo: { nombre_usuario: usuario.nombre_usuario },
    });

    return {
      message:
        'Contraseña actualizada correctamente. Inicie sesión con su nueva contraseña.',
    };
  }

  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  async restablecerPassword(
    targetId: number,
    actorId: number,
  ): Promise<{ password_temporal: string }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usuario: targetId },
    });

    // CU-10 Excepción 1: usuario inactivo o inexistente → mensaje unificado
    if (!usuario || !usuario.activo) {
      throw new NotFoundException(
        'No es posible restablecer la contraseña de un usuario inactivo o inexistente.',
      );
    }

    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let passwordTemporal = '';
    for (let i = 0; i < 10; i++) {
      passwordTemporal += chars.charAt(
        Math.floor(Math.random() * chars.length),
      );
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(passwordTemporal, salt);

    await this.usuarioRepository.update(targetId, {
      password_hash: hash,
      debe_cambiar_password: true,
    });

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
