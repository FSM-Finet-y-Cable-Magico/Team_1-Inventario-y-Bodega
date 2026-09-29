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

  private obtenerConfiguracion(): { baseUrl: string; apiKey: string } | null {
    const baseUrl = this.configService.get<string>('G3_INTEGRACION_URL');
    const apiKey = this.configService.get<string>('G3_INTEGRACION_API_KEY');
    if (!baseUrl || !apiKey) return null;
    return { baseUrl: baseUrl.replace(/\/+$/, ''), apiKey };
  }

  private async obtener<T>(
    ruta: string,
    timeoutMs = 2500,
  ): Promise<RespuestaG3<T>> {
    const configuracion = this.obtenerConfiguracion();
    if (!configuracion) return { ok: false, data: null };

    try {
      const respuesta = await fetch(`${configuracion.baseUrl}${ruta}`, {
        headers: { 'X-API-KEY': configuracion.apiKey },
        signal: AbortSignal.timeout(timeoutMs),
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
}
