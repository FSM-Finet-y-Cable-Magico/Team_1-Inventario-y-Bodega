import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { SolicitudBaja } from './entities/solicitud-baja.entity';
import { CreateBajaDto } from './dto/create-baja.dto';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { UnitsService } from '../inventario/units.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EMPRESAS } from '../companies/companies.service';
import {
  exigirConfirmacionGarantia,
  auditarAvisoGarantiaIgnorado,
} from '../inventario/aviso-garantia';

// CU-78: lista cerrada de motivos de baja definitiva
export const MOTIVOS_BAJA = [
  'Pérdida no recuperable',
  'Robo confirmado',
  'Falla irreparable',
  'Obsolescencia',
  'Donación a institución',
  'Otro',
];

// CU-78 Excepción 1: únicos estados desde los que la máquina permite 'Dado de baja'
const ESTADOS_QUE_PERMITEN_BAJA = ['En bodega', 'En revisión'];

// Usuario autenticado tal como lo entrega JwtStrategy
export interface ActorJwt {
  id_usuario: number;
  id_empresa: number;
  roles?: string[];
}

export const BAJA_PENDIENTE = 'Pendiente de aprobación';
export const BAJA_APROBADA = 'Aprobada';
export const BAJA_RECHAZADA = 'Rechazada';

@Injectable()
export class BajasService {
  constructor(
    @InjectRepository(SolicitudBaja)
    private readonly solicitudRepository: Repository<SolicitudBaja>,
    @InjectRepository(UnidadEquipo)
    private readonly unidadRepository: Repository<UnidadEquipo>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly unitsService: UnitsService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  private esSuperusuario(actor: ActorJwt): boolean {
    return actor.roles?.includes('SUPERUSUARIO') === true;
  }

  // CU-78: quién aplica la baja directamente y quién solo puede solicitarla.
  // ADMIN_BODEGA se incluye porque ya puede ejecutar la transición a 'Dado de baja'
  // por el flujo de cambio de estado (CU-35); el Técnico de terreno siempre solicita.
  private aplicaBajaDirecta(actor: ActorJwt): boolean {
    return ['ADMIN', 'SUPERUSUARIO', 'ADMIN_BODEGA'].some((r) =>
      actor.roles?.includes(r),
    );
  }

  // CU-78 Excepción 3: el motivo debe pertenecer a la lista cerrada y, si es
  // 'Otro', exige una descripción de entre 5 y 200 caracteres
  private validarMotivo(
    motivo: string,
    descripcionOtro?: string,
  ): string | null {
    const motivoNormalizado = motivo?.trim() ?? '';
    if (!MOTIVOS_BAJA.includes(motivoNormalizado)) {
      throw new BadRequestException(
        `El motivo de baja seleccionado no es válido. Opciones permitidas: ${MOTIVOS_BAJA.join(', ')}.`,
      );
    }
    if (motivoNormalizado !== 'Otro') return null;

    const descripcion = descripcionOtro?.trim() ?? '';
    if (descripcion.length < 5 || descripcion.length > 200) {
      throw new BadRequestException(
        'Debe ingresar una descripción cuando selecciona Otro.',
      );
    }
    return descripcion;
  }

  private async buscarUnidad(
    idUnidad: number,
    actor: ActorJwt,
  ): Promise<UnidadEquipo> {
    const unidad = await this.unidadRepository.findOne({
      where: { id_unidad: idUnidad },
    });
    if (!unidad) throw new NotFoundException('El equipo solicitado no existe.');
    // Aislamiento por empresa (el Superusuario opera sobre ambas empresas)
    if (!this.esSuperusuario(actor) && unidad.id_empresa !== actor.id_empresa) {
      throw new NotFoundException('El equipo solicitado no existe.');
    }
    return unidad;
  }

  // CU-78 Excepción 1: mensaje exacto del caso de uso
  private validarEstado(unidad: UnidadEquipo): void {
    if (!ESTADOS_QUE_PERMITEN_BAJA.includes(unidad.estado)) {
      throw new BadRequestException(
        'Transición de estado no permitida para este equipo.',
      );
    }
  }

  //CU-78
  async registrar(
    dto: CreateBajaDto,
    actor: ActorJwt,
  ): Promise<Record<string, unknown>> {
    const descripcion = this.validarMotivo(dto.motivo, dto.descripcion_otro);
    const unidad = await this.buscarUnidad(dto.id_unidad, actor);
    this.validarEstado(unidad);

    // CU-78 Excepción 2 / CU-95: garantía vigente → aviso (409) salvo que el
    // actor confirme "Continuar sin garantía"; en ese caso se audita el aviso ignorado
    const vigentes = exigirConfirmacionGarantia(
      [unidad],
      dto.forzar_aviso_garantia,
    );
    await auditarAvisoGarantiaIgnorado(
      this.auditoriaService,
      vigentes,
      'Dado de baja',
      actor.id_usuario,
    );

    // CU-78: Administrador/Superusuario aplican la baja directamente
    if (this.aplicaBajaDirecta(actor)) {
      return this.ejecutarBaja(unidad, dto.motivo.trim(), descripcion, actor);
    }

    // CU-78: el Técnico de terreno genera una solicitud pendiente de aprobación
    // (la unidad NO cambia de estado todavía)
    const pendiente = await this.solicitudRepository.findOne({
      where: { id_unidad: unidad.id_unidad, estado: BAJA_PENDIENTE },
    });
    if (pendiente) {
      throw new ConflictException(
        `Ya existe una solicitud de baja pendiente de aprobación para el equipo [${unidad.serialNumber}].`,
      );
    }

    const solicitud = await this.solicitudRepository.save(
      this.solicitudRepository.create({
        id_unidad: unidad.id_unidad,
        id_empresa: unidad.id_empresa,
        id_usuario_solicitante: actor.id_usuario,
        motivo: dto.motivo.trim(),
        motivo_otro: descripcion,
        estado: BAJA_PENDIENTE,
        fecha_solicitud: new Date(),
        id_usuario_aprobador: null,
        fecha_resolucion: null,
        motivo_rechazo: null,
      }),
    );

    await this.auditoriaService.create({
      id_usuario: actor.id_usuario,
      accion: 'SOLICITAR_BAJA',
      entidad_afectada: 'solicitud_baja',
      id_entidad_afectada: solicitud.id_solicitud,
      valor_anterior: null,
      valor_nuevo: {
        numero_serie: unidad.serialNumber,
        motivo: solicitud.motivo,
        motivo_otro: solicitud.motivo_otro,
        estado: BAJA_PENDIENTE,
      },
    });

    return {
      success: true,
      requiere_aprobacion: true,
      id_solicitud: solicitud.id_solicitud,
      estado: BAJA_PENDIENTE,
      numero_serie: unidad.serialNumber,
      message:
        'Solicitud de baja registrada. Queda pendiente de aprobación de un Administrador o Superusuario.',
    };
  }

  // CU-78/CU-79: la baja real reutiliza la máquina de estados (transición
  // validada, historial y auditoría dentro de la misma transacción)
  private async ejecutarBaja(
    unidad: UnidadEquipo,
    motivo: string,
    descripcion: string | null,
    actor: ActorJwt,
  ): Promise<Record<string, unknown>> {
    const resultado: { estadoActual: string } =
      await this.unitsService.transicionarEstado(
        unidad.id_unidad,
        'Dado de baja',
        actor,
        undefined,
        undefined,
        undefined,
        false,
        undefined,
        { motivo, descripcion },
      );

    return {
      success: true,
      requiere_aprobacion: false,
      id_unidad: unidad.id_unidad,
      numero_serie: unidad.serialNumber,
      estado: resultado.estadoActual,
      motivo_baja: motivo,
      message: `El equipo [${unidad.serialNumber}] quedó dado de baja de forma definitiva.`,
    };
  }

  //CU-78
  async aprobar(
    idSolicitud: number,
    actor: ActorJwt,
  ): Promise<Record<string, unknown>> {
    const solicitud = await this.buscarSolicitudPendiente(idSolicitud, actor);
    const unidad = await this.buscarUnidad(solicitud.id_unidad, actor);
    // El estado pudo cambiar entre la solicitud y la aprobación
    this.validarEstado(unidad);

    const resultado = await this.ejecutarBaja(
      unidad,
      solicitud.motivo,
      solicitud.motivo_otro,
      actor,
    );

    // ponytail: la baja y el cierre de la solicitud no comparten transacción; si
    // falla este save la unidad queda de baja y la solicitud pendiente (al
    // reintentar aprobar aparece la Excepción 1). Unificar con un QueryRunner
    // compartido si el caso llega a darse en producción.
    solicitud.estado = BAJA_APROBADA;
    solicitud.id_usuario_aprobador = actor.id_usuario;
    solicitud.fecha_resolucion = new Date();
    await this.solicitudRepository.save(solicitud);

    await this.auditoriaService.create({
      id_usuario: actor.id_usuario,
      accion: 'APROBAR_BAJA',
      entidad_afectada: 'solicitud_baja',
      id_entidad_afectada: solicitud.id_solicitud,
      valor_anterior: { estado: BAJA_PENDIENTE },
      valor_nuevo: {
        estado: BAJA_APROBADA,
        numero_serie: unidad.serialNumber,
        motivo: solicitud.motivo,
      },
    });

    return {
      ...resultado,
      id_solicitud: solicitud.id_solicitud,
      estado_solicitud: BAJA_APROBADA,
    };
  }

  //CU-78
  async rechazar(
    idSolicitud: number,
    motivoRechazo: string,
    actor: ActorJwt,
  ): Promise<Record<string, unknown>> {
    const motivo = motivoRechazo?.trim() ?? '';
    if (!motivo) {
      throw new BadRequestException(
        'Debe ingresar un motivo de rechazo para continuar.',
      );
    }
    if (motivo.length > 200) {
      throw new BadRequestException(
        'El motivo de rechazo no puede superar los 200 caracteres.',
      );
    }

    const solicitud = await this.buscarSolicitudPendiente(idSolicitud, actor);
    const unidad = await this.buscarUnidad(solicitud.id_unidad, actor);

    solicitud.estado = BAJA_RECHAZADA;
    solicitud.id_usuario_aprobador = actor.id_usuario;
    solicitud.fecha_resolucion = new Date();
    solicitud.motivo_rechazo = motivo;
    await this.solicitudRepository.save(solicitud);

    await this.auditoriaService.create({
      id_usuario: actor.id_usuario,
      accion: 'RECHAZAR_BAJA',
      entidad_afectada: 'solicitud_baja',
      id_entidad_afectada: solicitud.id_solicitud,
      valor_anterior: { estado: BAJA_PENDIENTE },
      valor_nuevo: {
        estado: BAJA_RECHAZADA,
        numero_serie: unidad.serialNumber,
        motivo_rechazo: motivo,
      },
    });

    return {
      success: true,
      id_solicitud: solicitud.id_solicitud,
      estado: BAJA_RECHAZADA,
      numero_serie: unidad.serialNumber,
      message: `La solicitud de baja del equipo [${unidad.serialNumber}] fue rechazada. El equipo mantiene su estado actual.`,
    };
  }

  private async buscarSolicitudPendiente(
    idSolicitud: number,
    actor: ActorJwt,
  ): Promise<SolicitudBaja> {
    const solicitud = await this.solicitudRepository.findOne({
      where: { id_solicitud: idSolicitud },
    });
    if (!solicitud) {
      throw new NotFoundException(
        `No existe la solicitud de baja con ID [${idSolicitud}].`,
      );
    }
    if (
      !this.esSuperusuario(actor) &&
      solicitud.id_empresa !== actor.id_empresa
    ) {
      throw new NotFoundException(
        `No existe la solicitud de baja con ID [${idSolicitud}].`,
      );
    }
    if (solicitud.estado !== BAJA_PENDIENTE) {
      throw new ConflictException(
        `La solicitud [${idSolicitud}] ya fue resuelta (estado actual: ${solicitud.estado}).`,
      );
    }
    return solicitud;
  }

  // CU-78: bandeja de solicitudes (pendientes y resueltas)
  async listar(
    filtros: { estado?: string },
    actor: ActorJwt,
  ): Promise<Record<string, unknown>[]> {
    const where: FindOptionsWhere<SolicitudBaja> = {};
    if (filtros.estado) where.estado = filtros.estado;
    if (!this.esSuperusuario(actor)) where.id_empresa = actor.id_empresa;

    const solicitudes = await this.solicitudRepository.find({
      where,
      order: { fecha_solicitud: 'DESC' },
    });
    if (solicitudes.length === 0) return [];

    const unidades = await this.unidadRepository.findBy({
      id_unidad: In(solicitudes.map((s) => s.id_unidad)),
    });
    const mapaUnidades = new Map(unidades.map((u) => [u.id_unidad, u]));

    const idsUsuarios = [
      ...new Set(
        solicitudes
          .flatMap((s) => [s.id_usuario_solicitante, s.id_usuario_aprobador])
          .filter((id): id is number => Boolean(id)),
      ),
    ];
    const usuarios = idsUsuarios.length
      ? await this.usuarioRepository.findBy({ id_usuario: In(idsUsuarios) })
      : [];
    const mapaUsuarios = new Map(
      usuarios.map((u) => [u.id_usuario, u.nombre_completo]),
    );
    const mapaEmpresas = new Map(EMPRESAS.map((e) => [e.id, e.nombre]));

    return solicitudes.map((s) => ({
      id_solicitud: s.id_solicitud,
      id_unidad: s.id_unidad,
      numero_serie: mapaUnidades.get(s.id_unidad)?.serialNumber ?? null,
      estado_unidad: mapaUnidades.get(s.id_unidad)?.estado ?? null,
      empresa: mapaEmpresas.get(s.id_empresa) ?? null,
      motivo: s.motivo,
      motivo_otro: s.motivo_otro,
      estado: s.estado,
      solicitante: mapaUsuarios.get(s.id_usuario_solicitante) ?? null,
      aprobador: s.id_usuario_aprobador
        ? (mapaUsuarios.get(s.id_usuario_aprobador) ?? null)
        : null,
      fecha_solicitud: s.fecha_solicitud,
      fecha_resolucion: s.fecha_resolucion,
      motivo_rechazo: s.motivo_rechazo,
    }));
  }
}
