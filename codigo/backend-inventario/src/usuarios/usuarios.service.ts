import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { UsuarioRol } from './entities/usuario-rol.entity';
import { Rol } from '../roles/entities/rol.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as bcrypt from 'bcrypt';
import { AuditoriaService } from 'src/auditoria/auditoria.service';
import { EMPRESAS } from 'src/companies/companies.service';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolRepository: Repository<UsuarioRol>,
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  // CU-05: listado con filtros por rol, estado y nombre (completo o de usuario)
  // El Superusuario ve usuarios de todas las empresas; el resto solo los de su empresa.
  async findAll(
    filtros: { rol?: string; activo?: boolean; buscar?: string },
    idEmpresaActor: number,
    actorRoles: string[] = [],
  ): Promise<Usuario[]> {
    const esSuperusuario = actorRoles.includes('SUPERUSUARIO');
    const base: any = esSuperusuario ? {} : { id_empresa: idEmpresaActor };

    if (filtros.activo !== undefined) {
      base.activo = filtros.activo;
    }

    // La búsqueda aplica sobre nombre completo O nombre de usuario
    const where = filtros.buscar
      ? [
          { ...base, nombre_completo: ILike(`%${filtros.buscar}%`) },
          { ...base, nombre_usuario: ILike(`%${filtros.buscar}%`) },
        ]
      : base;

    const usuarios = await this.usuarioRepository.find({
      where,
      relations: { usuarioRoles: { rol: true } },
      order: { nombre_completo: 'ASC' },
    });

    let resultado = usuarios.map((u) => this.conRoles(u));

    if (filtros.rol) {
      resultado = resultado.filter((u) =>
        u.roles.some((r) => r.nombre_rol === filtros.rol),
      );
    }

    // CU-05: los usuarios con rol SUPERUSUARIO solo son visibles para otro Superusuario.
    // Un Admin de empresa no debe ver ni editar a los Superusuarios del sistema.
    if (!esSuperusuario) {
      resultado = resultado.filter(
        (u) => !u.roles.some((r) => r.nombre_rol === 'SUPERUSUARIO'),
      );
    }

    // Agregamos el nombre de la empresa para que el Superusuario pueda
    // distinguir usuarios del listado consolidado.
    const mapaEmpresas = new Map(EMPRESAS.map((e) => [e.id, e.nombre]));
    resultado = resultado.map((u) => ({
      ...u,
      empresa_nombre: mapaEmpresas.get(u.id_empresa ?? -1) ?? null,
    }));

    // CU-05 Excepción 1: sin coincidencias se retorna el listado vacío;
    // el frontend muestra el mensaje correspondiente
    return resultado;
  }

  async findOne(id: number): Promise<(Usuario & { roles: Rol[] }) | null> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usuario: id },
      relations: { usuarioRoles: { rol: true } },
    });
    return usuario ? this.conRoles(usuario) : null;
  }

  // El front consume `roles` plano; usuarioRoles es el detalle de la tabla intermedia.
  // El hash de la contraseña nunca debe salir del backend.
  private conRoles(usuario: Usuario): Usuario & { roles: Rol[] } {
    const { password_hash, ...usuarioSeguro } = usuario;
    return {
      ...usuarioSeguro,
      roles: usuario.usuarioRoles?.map((ur) => ur.rol).filter(Boolean) ?? [],
    } as Usuario & { roles: Rol[] };
  }

  async create(
    createUsuarioDto: CreateUsuarioDto,
    actor: {
      sub?: number;
      id_usuario?: number;
      id_empresa: number;
      roles?: string[];
    },
  ): Promise<Usuario> {
    const actorId = actor.id_usuario ?? actor.sub;
    const actorRoles = actor.roles ?? [];
    const esSuperusuario = actorRoles.includes('SUPERUSUARIO');

    // El usuario nuevo hereda la empresa del actor; solo un Superusuario puede asignar otra
    let idEmpresa = actor.id_empresa;
    const idEmpresaExplicita = createUsuarioDto.id_empresa;
    if (
      idEmpresaExplicita !== undefined &&
      idEmpresaExplicita !== null &&
      idEmpresaExplicita !== 0 &&
      idEmpresaExplicita !== actor.id_empresa
    ) {
      if (!esSuperusuario) {
        throw new ForbiddenException(
          'Solo un Superusuario puede crear usuarios en otra empresa.',
        );
      }
      idEmpresa = idEmpresaExplicita;
    }

    // Validar roles solicitados
    let rolesAsignar: Rol[] = [];
    if (createUsuarioDto.roles?.length) {
      const idsRoles = [...new Set(createUsuarioDto.roles)];
      rolesAsignar = await this.rolRepository.findBy({ id_rol: In(idsRoles) });
      if (rolesAsignar.length !== idsRoles.length) {
        throw new BadRequestException(
          'Uno o más roles seleccionados no existen.',
        );
      }
      // CU-04 Excepción 2: el Administrador no puede asignar rol Superusuario
      if (
        rolesAsignar.some((r) => r.nombre_rol === 'SUPERUSUARIO') &&
        !esSuperusuario
      ) {
        throw new ForbiddenException(
          'Solo un Superusuario puede asignar el rol de Superusuario.',
        );
      }
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
      nombre_usuario: createUsuarioDto.nombre_usuario,
      nombre_completo: createUsuarioDto.nombre_completo,
      email: createUsuarioDto.email,
      id_empresa: idEmpresa,
      password_hash: hash,
      // CU-04: estado inicial seleccionado en el formulario (Activo por defecto)
      activo: createUsuarioDto.activo ?? true,
    });

    if (rolesAsignar.length) {
      await this.usuarioRolRepository.save(
        rolesAsignar.map((r) =>
          this.usuarioRolRepository.create({
            id_usuario: nuevoUsuario.id_usuario,
            id_rol: r.id_rol,
          }),
        ),
      );
    }

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
          roles: rolesAsignar.map((r) => r.nombre_rol),
        },
      });
    }

    const { password_hash, ...usuarioSeguro } = nuevoUsuario;
    return usuarioSeguro as Usuario;
  }

  async remove(
    id: number,
    actorId: number,
    actorRoles: string[] = [],
  ): Promise<void> {
    // CU-07 Excepción 1: el actor no puede desactivar su propia cuenta
    if (id === actorId) {
      throw new BadRequestException(
        'No es posible desactivar su propia cuenta.',
      );
    }

    const usuario = await this.findOne(id);
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    // CU-07: solo un Superusuario puede desactivar a otro Superusuario
    if (
      usuario.roles.some((r) => r.nombre_rol === 'SUPERUSUARIO') &&
      !actorRoles.includes('SUPERUSUARIO')
    ) {
      throw new ForbiddenException(
        'No tiene permisos para desactivar a un Superusuario.',
      );
    }

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

    // CU-07: solo un Superusuario puede editar a otro Superusuario
    if (
      usuario.roles.some((r) => r.nombre_rol === 'SUPERUSUARIO') &&
      !actorRoles.includes('SUPERUSUARIO')
    ) {
      throw new ForbiddenException(
        'No tiene permisos para editar a un Superusuario.',
      );
    }

    // CU-07 Excepción 1: tampoco por edición se puede desactivar la cuenta propia
    if (updateUsuarioDto.activo === false && id === actorId) {
      throw new BadRequestException(
        'No es posible desactivar su propia cuenta.',
      );
    }

    // password no se actualiza por esta vía; id_empresa solo lo cambia un Superusuario
    const { roles, password, id_empresa, ...cambios } = updateUsuarioDto;
    const idEmpresaExplicita = id_empresa;
    if (
      idEmpresaExplicita !== undefined &&
      idEmpresaExplicita !== null &&
      idEmpresaExplicita !== 0 &&
      idEmpresaExplicita !== usuario.id_empresa &&
      !actorRoles.includes('SUPERUSUARIO')
    ) {
      throw new ForbiddenException(
        'Solo un Superusuario puede cambiar la empresa de un usuario.',
      );
    }

    // CU-06: el rol es editable. Validar y reemplazar los roles asignados
    let rolesAsignar: Rol[] | null = null;
    if (roles !== undefined) {
      const idsRoles = [...new Set(roles)];
      rolesAsignar = idsRoles.length
        ? await this.rolRepository.findBy({ id_rol: In(idsRoles) })
        : [];
      if (rolesAsignar.length !== idsRoles.length) {
        throw new BadRequestException(
          'Uno o más roles seleccionados no existen.',
        );
      }
      // CU-06 Excepción 2: el Administrador no puede asignar rol Superusuario
      if (
        rolesAsignar.some((r) => r.nombre_rol === 'SUPERUSUARIO') &&
        !actorRoles.includes('SUPERUSUARIO')
      ) {
        throw new ForbiddenException(
          'Solo un Superusuario puede asignar el rol de Superusuario.',
        );
      }
    }

    const anterior = { ...usuario };
    const {
      usuarioRoles: _ur,
      roles: _roles,
      ...datosUsuario
    } = usuario as any;
    const usuarioActualizado = await this.usuarioRepository.save({
      ...datosUsuario,
      ...cambios,
      ...(idEmpresaExplicita !== undefined &&
      idEmpresaExplicita !== null &&
      idEmpresaExplicita !== 0
        ? { id_empresa: idEmpresaExplicita }
        : {}),
    });

    if (rolesAsignar !== null) {
      await this.usuarioRolRepository.delete({ id_usuario: id });
      if (rolesAsignar.length) {
        await this.usuarioRolRepository.save(
          rolesAsignar.map((r) =>
            this.usuarioRolRepository.create({
              id_usuario: id,
              id_rol: r.id_rol,
            }),
          ),
        );
      }
    }

    if (actorId) {
      await this.auditoriaService.create({
        id_usuario: actorId,
        accion: 'ACTUALIZAR',
        entidad_afectada: 'usuario',
        id_entidad_afectada: id,
        valor_anterior: anterior,
        valor_nuevo: {
          ...usuarioActualizado,
          ...(rolesAsignar !== null
            ? { roles: rolesAsignar.map((r) => r.nombre_rol) }
            : {}),
        },
      });
    }

    return usuarioActualizado;
  }
}
