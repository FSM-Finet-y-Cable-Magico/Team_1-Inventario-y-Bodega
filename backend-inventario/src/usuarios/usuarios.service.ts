import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
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

  // CU-05: listado con filtros por rol, estado y nombre
  async findAll(filtros: { rol?: string; activo?: boolean; buscar?: string }, idEmpresaActor: number): Promise<Usuario[]> {
    const where: any = { id_empresa: idEmpresaActor };

    if (filtros.activo !== undefined) {
      where.activo = filtros.activo;
    }

    if (filtros.buscar) {
      where.nombre_completo = ILike(`%${filtros.buscar}%`);
    }

    const usuarios = await this.usuarioRepository.find({ where });

    // CU-05 Excepción 1: no hay resultados con los filtros aplicados
    if (usuarios.length === 0) {
      throw new NotFoundException('No se encontraron usuarios con los filtros seleccionados.');
    }

    return usuarios;
  }

  async findOne(id: number): Promise<Usuario | null> {
    return this.usuarioRepository.findOneBy({ id_usuario: id });
  }

  async create(
    createUsuarioDto: CreateUsuarioDto,
    actorId: number,
    actorRoles: string[],
  ): Promise<Usuario> {
    // CU-04 Excepción 2: el Administrador no puede asignar rol Superusuario
    if (
      (createUsuarioDto as any).rol === 'SUPERUSUARIO' &&
      !actorRoles.includes('SUPERUSUARIO')
    ) {
      throw new ForbiddenException(
        'Solo un Superusuario puede asignar el rol de Superusuario.',
      );
    }

    // CU-04 Excepción 3: nombre de usuario ya existe
    const existe = await this.usuarioRepository.findOne({
      where: { nombre_usuario: createUsuarioDto.nombre_usuario },
    });
    if (existe) {
      throw new ConflictException(
        `El nombre de usuario '${createUsuarioDto.nombre_usuario}' no está disponible.`,
      );
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(createUsuarioDto.password, salt);
    const nuevoUsuario = await this.usuarioRepository.save({
      ...createUsuarioDto,
      password_hash: hash,
    });

    if (actorId) {
      await this.auditoriaService.create({
        id_usuario: actorId,
        accion: 'CREAR',
        entidad_afectada: 'usuario',
        id_entidad_afectada: nuevoUsuario.id_usuario,
        valor_anterior: null,
        valor_nuevo: {
          nombre_completo: nuevoUsuario.nombre_completo,
          nombre_usuario: nuevoUsuario.nombre_usuario,
          id_empresa: nuevoUsuario.id_empresa,
        },
      });
    }

    return nuevoUsuario;
  }

  async remove(id: number, actorId: number): Promise<void> {
    // CU-07 Excepción 1: el actor no puede desactivar su propia cuenta
    if (id === actorId) {
      throw new BadRequestException('No es posible desactivar su propia cuenta.');
    }

    const usuario = await this.findOne(id);
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    await this.usuarioRepository.update(id, { activo: false });

    if (actorId) {
      await this.auditoriaService.create({
        id_usuario: actorId,
        accion: 'DESACTIVAR',
        entidad_afectada: 'usuario',
        id_entidad_afectada: id,
        valor_anterior: { activo: true },
        valor_nuevo: { activo: false },
      });
    }
  }

  async update(
    id: number,
    updateUsuarioDto: UpdateUsuarioDto,
    actorId: number,
    actorRoles: string[],
  ): Promise<Usuario> {
    const usuario = await this.findOne(id);
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    // CU-06 Excepción 2: el Administrador no puede cambiar el rol a Superusuario
    if (
      (updateUsuarioDto as any).rol === 'SUPERUSUARIO' &&
      !actorRoles.includes('SUPERUSUARIO')
    ) {
      throw new ForbiddenException(
        'Solo un Superusuario puede asignar el rol de Superusuario.',
      );
    }

    const anterior = { ...usuario };
    const usuarioActualizado = await this.usuarioRepository.save({
      ...usuario,
      ...updateUsuarioDto,
    });

    if (actorId) {
      await this.auditoriaService.create({
        id_usuario: actorId,
        accion: 'ACTUALIZAR',
        entidad_afectada: 'usuario',
        id_entidad_afectada: id,
        valor_anterior: anterior,
        valor_nuevo: usuarioActualizado,
      });
    }

    return usuarioActualizado;
  }
}
