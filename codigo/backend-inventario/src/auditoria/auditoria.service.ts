import { Injectable } from '@nestjs/common';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, ILike, In } from 'typeorm';
import { Auditoria } from './entities/auditoria.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { FiltrarAuditoriaDto } from './dto/filtrar-auditoria.dto';
import { EMPRESAS } from '../companies/companies.service';

// CU-08: descripción breve del evento (máx. 200 caracteres)
const VERBOS: Record<string, string> = {
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
  CREAR: 'Creación de',
  ACTUALIZAR: 'Actualización de',
  DESACTIVAR: 'Desactivación de',
  RESTABLECER_PASSWORD: 'Restablecimiento de contraseña de',
  CAMBIAR_PASSWORD: 'Cambio de contraseña de',
  ACCESO_DENEGADO: 'Intento de acceso no autorizado a',
};

function descripcionEvento(log: Auditoria): string {
  // CU-11/CU-12: el cierre de sesión distingue manual vs. por inactividad
  if (log.accion === 'LOGOUT') {
    const motivo = (log.valor_nuevo as { motivo?: string } | null)?.motivo;
    return motivo === 'inactividad'
      ? 'Cierre de sesión por inactividad'
      : 'Cierre de sesión manual';
  }
  const verbo = VERBOS[log.accion] ?? log.accion;
  const objeto = log.entidad_afectada
    ? `${log.entidad_afectada.replace(/_/g, ' ')} #${log.id_entidad_afectada}`
    : '';
  return `${verbo} ${objeto}`.trim().slice(0, 200);
}

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private auditoriaRepository: Repository<Auditoria>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  async create(createAuditoriaDto: CreateAuditoriaDto) {
    const MAX_REINTENTOS = 3;
    let ultimo_error: unknown;
    for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
      try {
        const auditoria = this.auditoriaRepository.create(createAuditoriaDto);
        return await this.auditoriaRepository.save(auditoria);
      } catch (err) {
        ultimo_error = err;
      }
    }
    throw ultimo_error;
  }

  async findAll(filtros?: FiltrarAuditoriaDto) {
    const where: FindOptionsWhere<Auditoria> = {};
    if (filtros?.id_usuario) where.id_usuario = filtros.id_usuario;
    if (filtros?.accion) where.accion = filtros.accion;
    if (filtros?.entidad_afectada)
      where.entidad_afectada = filtros.entidad_afectada;
    if (filtros?.fecha_inicio && filtros?.fecha_fin) {
      where.fecha_hora = Between(filtros.fecha_inicio, filtros.fecha_fin);
    }

    // CU-09: filtros por nombre de usuario (parcial) o empresa del actor.
    // Se resuelven los ids de usuario que cumplen y se filtra el log por ellos.
    if (filtros?.usuario || filtros?.id_empresa) {
      const whereUsuario: FindOptionsWhere<Usuario> = {};
      if (filtros.usuario)
        whereUsuario.nombre_usuario = ILike(`%${filtros.usuario}%`);
      if (filtros.id_empresa) whereUsuario.id_empresa = filtros.id_empresa;
      const coincidentes = await this.usuarioRepository.find({
        where: whereUsuario,
        select: { id_usuario: true },
      });
      if (coincidentes.length === 0) return [];
      where.id_usuario = In(coincidentes.map((u) => u.id_usuario));
    }
    const pagina = filtros?.pagina ?? 1;
    const limite = filtros?.limite ?? 20;
    const logs = await this.auditoriaRepository.find({
      where,
      order: { fecha_hora: 'DESC' },
      skip: (pagina - 1) * limite,
      take: limite,
    });

    // Resolver nombre y empresa de los usuarios actores en una sola query
    const idsUsuarios = [...new Set(logs.map((l) => l.id_usuario))];
    const usuarios = idsUsuarios.length
      ? await this.usuarioRepository.findBy({ id_usuario: In(idsUsuarios) })
      : [];
    const mapaNombres = new Map(
      usuarios.map((u) => [
        u.id_usuario,
        u.nombre_usuario ?? u.nombre_completo,
      ]),
    );
    const mapaEmpresas = new Map(EMPRESAS.map((e) => [e.id, e.nombre]));
    const mapaEmpresaUsuario = new Map(
      usuarios.map((u) => [
        u.id_usuario,
        mapaEmpresas.get(u.id_empresa) ?? null,
      ]),
    );

    // CU-08: cada entrada incluye empresa en la que operaba y descripción breve
    return logs.map((l) => ({
      ...l,
      usuario_nombre: mapaNombres.get(l.id_usuario) ?? null,
      empresa: mapaEmpresaUsuario.get(l.id_usuario) ?? null,
      descripcion: descripcionEvento(l),
    }));
  }
}
