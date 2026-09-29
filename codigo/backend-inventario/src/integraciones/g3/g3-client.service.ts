import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RespuestaG3<T> {
  ok: boolean;
  data: T | null;
}

// CU-48/CU-61: cliente HTTP saliente contra G3 (Terreno/FSM) usando el contrato
// X-API-KEY. NUNCA lanza: sin configuración o con error devuelve `ok: false`
// para que el llamador degrade de forma controlada (la UI lo muestra).
// La URL base y la key se definen por entorno (G3_INTEGRACION_URL /
// G3_INTEGRACION_API_KEY); las credenciales reales no viven en el repo.
@Injectable()
export class G3ClientService {
  constructor(private readonly configService: ConfigService) {}

  private obtenerConfiguracion(): {
    baseUrl: string;
    apiKey: string;
    timeoutMs: number;
  } | null {
    const baseUrl = this.configService.get<string>('G3_INTEGRACION_URL');
    const apiKey = this.configService.get<string>('G3_INTEGRACION_API_KEY');
    if (!baseUrl || !apiKey) return null;
    const timeoutMs =
      Number(this.configService.get<number | string>('G3_TIMEOUT_MS')) || 2500;
    return { baseUrl: baseUrl.replace(/\/+$/, ''), apiKey, timeoutMs };
  }

  private async obtener<T>(
    ruta: string,
    timeoutMs?: number,
  ): Promise<RespuestaG3<T>> {
    const configuracion = this.obtenerConfiguracion();
    if (!configuracion) return { ok: false, data: null };

    try {
      const respuesta = await fetch(`${configuracion.baseUrl}${ruta}`, {
        headers: { 'X-API-KEY': configuracion.apiKey },
        signal: AbortSignal.timeout(timeoutMs ?? configuracion.timeoutMs),
      });
      if (!respuesta.ok) return { ok: false, data: null };
      const cuerpo = await respuesta.json();
      return { ok: true, data: (cuerpo?.data ?? cuerpo) as T };
    } catch {
      return { ok: false, data: null };
    }
  }

  // CU-48: cliente por RUT (enriquecimiento de la ubicación externa).
  async consultarClientePorRut(
    rut: string,
    idEmpresa?: number | null,
  ): Promise<any | null> {
    const resultado = await this.obtener<any>(
      `/clientes/rut/${encodeURIComponent(rut)}?id_empresa=${idEmpresa ?? ''}`,
    );
    return resultado.ok ? resultado.data : null;
  }

  // CU-87: búsqueda parcial de clientes en G3 para reporte de equipos instalados.
  async buscarClientes(
    busqueda: string,
    idEmpresa?: number | null,
  ): Promise<any[]> {
    const texto = (busqueda || '').trim();
    if (texto.length < 3) return [];

    const query = new URLSearchParams({
      busqueda: texto,
    });
    if (idEmpresa) {
      query.set('id_empresa', String(idEmpresa));
    }

    const res = await this.obtener<any>(`/clientes?${query.toString()}`);
    if (!res.ok || !res.data) return [];

    if (Array.isArray(res.data)) return res.data;
    if (typeof res.data === 'object' && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  }

  // CU-61: trabajos del día del técnico (OTs de G3).
  async consultarOrdenes(params: {
    idTecnico: number;
    idEmpresa: number;
    fecha: string;
  }): Promise<RespuestaG3<any[]>> {
    const query = new URLSearchParams({
      id_empresa: String(params.idEmpresa),
      id_tecnico: String(params.idTecnico),
      estado: 'PENDIENTE,EN_CURSO',
      desde: params.fecha,
      hasta: params.fecha,
      page: '1',
      limit: '50',
    });
    return this.obtener<any[]>(`/ordenes?${query.toString()}`, 3000);
  }

  // CU-90: consulta órdenes de trabajo cerradas en G3 (con materiales o fallback).
  async consultarOrdenesCerradas(filtros: {
    id_tecnico?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
    id_empresa?: number;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    params.set('estado', 'CERRADA');
    if (filtros.id_tecnico)
      params.set('id_tecnico', String(filtros.id_tecnico));
    if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta);
    if (filtros.id_empresa)
      params.set('id_empresa', String(filtros.id_empresa));

    const timeout = this.obtenerConfiguracion()?.timeoutMs ?? 3000;
    const res = await this.obtener<any>(
      `/ordenes?${params.toString()}`,
      timeout,
    );
    if (!res.ok || !res.data) return [];

    let rawList: unknown[] = [];
    if (Array.isArray(res.data)) {
      rawList = res.data;
    } else if (typeof res.data === 'object' && Array.isArray(res.data.data)) {
      rawList = res.data.data;
    } else if (typeof res.data === 'object') {
      rawList = [res.data];
    }

    const ordenes: any[] = [];
    for (const item of rawList) {
      const ord = this.normalizarOrden(item);
      if (ord) ordenes.push(ord);
    }

    // Si el listado general no incluyó materiales, consultar orden individual con fallback (docs/12 §6 ítem 4)
    await Promise.all(
      ordenes.map(async (ord) => {
        if (!ord.materiales || ord.materiales.length === 0) {
          const mats = await this.consultarMaterialesOrden(ord.id_ot);
          if (mats.length > 0) {
            ord.materiales = mats;
          }
        }
      }),
    );

    return ordenes;
  }

  private async consultarMaterialesOrden(idOt: number): Promise<any[]> {
    const res = await this.obtener<any>(
      `/ordenes/${idOt}?include=materiales`,
      1500,
    );
    if (!res.ok || !res.data || typeof res.data !== 'object') return [];
    const ordObj = res.data as Record<string, unknown>;
    return this.extraerMateriales(ordObj.materiales);
  }

  private normalizarOrden(item: unknown): any | null {
    if (!item || typeof item !== 'object') return null;
    const obj = item as Record<string, unknown>;

    const idOt = Number(obj.id_ot || obj.id || 0);
    if (!idOt) return null;

    const tipoOt = (
      typeof obj.tipo_ot === 'string'
        ? obj.tipo_ot
        : typeof obj.tipo === 'string'
          ? obj.tipo
          : 'INSTALACION'
    ).toUpperCase();
    const idTecnico = Number(obj.id_tecnico || obj.tecnico_id || 0);
    const idEmpresa = obj.id_empresa ? Number(obj.id_empresa) : undefined;
    const fechaCompletada =
      typeof obj.fecha_completada === 'string'
        ? obj.fecha_completada
        : typeof obj.fecha_cierre === 'string'
          ? obj.fecha_cierre
          : undefined;

    const materiales = this.extraerMateriales(obj.materiales);

    return {
      id_ot: idOt,
      tipo_ot: tipoOt,
      id_tecnico: idTecnico,
      id_empresa: idEmpresa,
      fecha_completada: fechaCompletada,
      estado: typeof obj.estado === 'string' ? obj.estado : undefined,
      materiales,
    };
  }

  private extraerMateriales(raw: unknown): any[] {
    if (!Array.isArray(raw)) return [];
    const list: any[] = [];

    for (const m of raw) {
      if (!m || typeof m !== 'object') continue;
      const mat = m as Record<string, unknown>;
      const cantidad = Number(mat.cantidad ?? mat.cant ?? 0);
      if (cantidad <= 0) continue;

      list.push({
        id_tipo_equipo: mat.id_tipo_equipo
          ? Number(mat.id_tipo_equipo)
          : undefined,
        nombre:
          typeof mat.nombre === 'string'
            ? mat.nombre
            : typeof mat.tipo === 'string'
              ? mat.tipo
              : undefined,
        cantidad,
        unidad_medida:
          typeof mat.unidad_medida === 'string' ? mat.unidad_medida : undefined,
      });
    }

    return list;
  }
}
