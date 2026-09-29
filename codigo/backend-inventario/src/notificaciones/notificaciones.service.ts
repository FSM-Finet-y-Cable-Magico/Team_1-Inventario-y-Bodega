import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Notificacion } from './entities/notificacion.entity';
import { CompaniesService, EMPRESAS } from '../companies/companies.service';
import {
  PrestamosService,
  PRESTAMO_ACTIVO,
} from '../prestamos/prestamos.service';
import type { ActorJwt } from '../prestamos/prestamos.service';
import {
  TIPO_STOCK_BAJO_UMBRAL,
  TIPO_PRESTAMO_VENCIDO,
} from '../alertas/alertas.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

// CU-96: la notificación se conserva 30 días desde que se generó, aunque el
// actor la haya marcado como leída antes.
const DIAS_HISTORIAL = 30;
// CU-96: máximo 100 caracteres por descripción (mismo criterio que CU-94)
const MAX_DESCRIPCION = 100;

export interface NotificacionApi {
  id_notificacion: number;
  tipo: string;
  empresa: string;
  descripcion: string;
  fecha_hora: Date;
}

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionRepository: Repository<Notificacion>,
    private readonly companiesService: CompaniesService,
    private readonly prestamosService: PrestamosService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  // CU-96: contador + listado de no leídas para la campana. Antes de leer
  // evalúa las dos condiciones (dedupe diario) y purga el historial vencido.
  async listarNoLeidas(
    actor: ActorJwt,
  ): Promise<{ contador: number; notificaciones: NotificacionApi[] }> {
    await this.generarPendientes();
    await this.purgarHistorialVencido();

    const esSuperusuario = actor.roles?.includes('SUPERUSUARIO') === true;
    const where: Record<string, unknown> = { leida: false };
    if (!esSuperusuario) where.id_empresa = actor.id_empresa;

    const filas = await this.notificacionRepository.find({
      where,
      order: { fecha_generacion: 'DESC' },
    });

    const mapaEmpresas = new Map(EMPRESAS.map((e) => [e.id, e.nombre]));
    const notificaciones = filas.map((n) => ({
      id_notificacion: n.id_notificacion,
      tipo: n.tipo,
      empresa: mapaEmpresas.get(n.id_empresa) ?? '-',
      descripcion: n.descripcion,
      fecha_hora: n.fecha_generacion,
    }));

    return { contador: notificaciones.length, notificaciones };
  }

  // CU-96: marcar una notificación como leída. 404 genérico si no existe o
  // es de otra empresa (mismo criterio cross-empresa que el resto del sistema).
  async marcarLeida(id: number, actor: ActorJwt): Promise<{ success: true }> {
    const notificacion = await this.buscarPropia(id, actor);

    notificacion.leida = true;
    notificacion.fecha_leida = new Date();
    await this.notificacionRepository.save(notificacion);

    await this.auditoriaService.create({
      id_usuario: actor.id_usuario,
      accion: 'ACTUALIZAR',
      entidad_afectada: 'notificacion',
      id_entidad_afectada: notificacion.id_notificacion,
      valor_anterior: { leida: false },
      valor_nuevo: { leida: true, tipo: notificacion.tipo },
    });

    return { success: true };
  }

  // CU-96: marcar todas las no leídas (dentro del alcance de empresa del
  // actor) como leídas de una sola vez.
  async marcarTodasLeidas(
    actor: ActorJwt,
  ): Promise<{ success: true; cantidad: number }> {
    const esSuperusuario = actor.roles?.includes('SUPERUSUARIO') === true;
    const where: Record<string, unknown> = { leida: false };
    if (!esSuperusuario) where.id_empresa = actor.id_empresa;

    const pendientes = await this.notificacionRepository.find({ where });
    if (pendientes.length === 0) return { success: true, cantidad: 0 };

    // Un solo UPDATE con el mismo filtro (no por ids: evita una segunda
    // condición de carrera entre el find() de arriba y este statement)
    const ahora = new Date();
    const query = this.notificacionRepository
      .createQueryBuilder()
      .update(Notificacion)
      .set({ leida: true, fecha_leida: ahora })
      .where('leida = false');
    if (!esSuperusuario) {
      query.andWhere('id_empresa = :idEmpresa', {
        idEmpresa: actor.id_empresa,
      });
    }
    await query.execute();

    await this.auditoriaService.create({
      id_usuario: actor.id_usuario,
      accion: 'ACTUALIZAR',
      entidad_afectada: 'notificacion',
      id_entidad_afectada: 0,
      valor_anterior: null,
      valor_nuevo: {
        accion: 'marcar_todas_leidas',
        cantidad: pendientes.length,
        ids: pendientes.map((n) => n.id_notificacion),
      },
    });

    return { success: true, cantidad: pendientes.length };
  }

  private async buscarPropia(
    id: number,
    actor: ActorJwt,
  ): Promise<Notificacion> {
    const notificacion = await this.notificacionRepository.findOne({
      where: { id_notificacion: id },
    });
    const esSuperusuario = actor.roles?.includes('SUPERUSUARIO') === true;
    if (
      !notificacion ||
      (!esSuperusuario && notificacion.id_empresa !== actor.id_empresa)
    ) {
      throw new NotFoundException('Notificación no encontrada');
    }
    return notificacion;
  }

  // CU-96 (A)+(B): evalúa las dos condiciones para AMBAS empresas (no solo
  // la del actor que dispara la consulta), así una notificación existe para
  // cuando corresponda a otro usuario ver su propia campana. La clave única
  // `clave_dedupe` es la que impide duplicar: si ya existe, se ignora.
  private async generarPendientes(): Promise<void> {
    const hoy = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Santiago',
    });

    const porInsertar: Partial<Notificacion>[] = [];

    // (B) Stock bajo umbral, reutilizando la regla de CU-46
    for (const empresa of EMPRESAS) {
      const stockBajo = await this.companiesService.getAlertasStockMinimo(
        empresa.id,
      );
      for (const s of stockBajo) {
        porInsertar.push({
          tipo: TIPO_STOCK_BAJO_UMBRAL,
          id_empresa: empresa.id,
          descripcion: this.recortar(
            `${s.tipo_equipo} en ${s.bodega}: ${s.cantidad_disponible} disponibles (umbral: ${s.umbral_minimo}).`,
          ),
          clave_dedupe: `${TIPO_STOCK_BAJO_UMBRAL}:${s.id_bodega}-${s.id_tipo_equipo}:${hoy}`,
        });
      }
    }

    // (A) Préstamo vencido, reutilizando la tabla de CU-83. Se evalúa con un
    // actor "vista de sistema" (rol SUPERUSUARIO interno) para traer los
    // préstamos de ambas empresas en una sola pasada; nunca se expone al cliente.
    const actorSistema: ActorJwt = {
      id_usuario: 0,
      id_empresa: 0,
      roles: ['SUPERUSUARIO'],
    };
    const prestamos = await this.prestamosService.listar(
      { estado: PRESTAMO_ACTIVO },
      actorSistema,
    );
    for (const p of prestamos) {
      const diasRestantes = p.dias_restantes as number | null;
      if (typeof diasRestantes !== 'number' || diasRestantes >= 0) continue;
      const idEmpresa = EMPRESAS.find((e) => e.nombre === p.empresa)?.id;
      if (!idEmpresa) continue; // dato inconsistente: no se notifica a ciegas
      const diasVencido = Math.abs(diasRestantes);
      porInsertar.push({
        tipo: TIPO_PRESTAMO_VENCIDO,
        id_empresa: idEmpresa,
        descripcion: this.recortar(
          `Préstamo ${p.correlativo as string} a ${p.nombre_receptor as string}: vencido hace ${diasVencido} ${diasVencido === 1 ? 'día' : 'días'}.`,
        ),
        clave_dedupe: `${TIPO_PRESTAMO_VENCIDO}:${p.id_prestamo as number}:${hoy}`,
      });
    }

    for (const datos of porInsertar) {
      const existe = await this.notificacionRepository.findOne({
        where: { clave_dedupe: datos.clave_dedupe },
      });
      if (existe) continue; // ya generada hoy para esa referencia
      await this.notificacionRepository.save(
        this.notificacionRepository.create(datos),
      );
    }
  }

  // CU-96: las leídas se conservan 30 días desde su generación y luego se
  // purgan (la campana solo lista no leídas, así que esto es limpieza de
  // la tabla, no algo que el actor perciba).
  private async purgarHistorialVencido(): Promise<void> {
    const limite = new Date();
    limite.setDate(limite.getDate() - DIAS_HISTORIAL);
    await this.notificacionRepository.delete({
      leida: true,
      fecha_generacion: LessThan(limite),
    });
  }

  private recortar(texto: string): string {
    return texto.length > MAX_DESCRIPCION
      ? `${texto.slice(0, MAX_DESCRIPCION - 3)}...`
      : texto;
  }
}
