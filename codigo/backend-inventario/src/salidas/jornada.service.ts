import { Injectable } from '@nestjs/common';
import { InventarioPersonalService } from './inventario-personal.service';
import { G3ClientService } from '../integraciones/g3/g3-client.service';

// CU-61: vista móvil del técnico. Agrega en un solo endpoint:
//  (A) trabajos del día, que son de G3 (no se duplica la entidad OT);
//  (B) inventario personal del técnico (CU-58).
// Si G3 no responde, la jornada se devuelve igual con `trabajos_estado:
// NO_DISPONIBLE` (degradación visible en la UI), nunca 5xx.
@Injectable()
export class JornadaService {
  constructor(
    private readonly inventarioPersonalService: InventarioPersonalService,
    private readonly g3Client: G3ClientService,
  ) {}

  async obtenerJornada(actor: any) {
    const idTecnico: number = actor.id_usuario;
    const fecha = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Santiago',
    });

    const inventario = await this.inventarioPersonalService.consultar(
      idTecnico,
      actor.id_empresa,
      actor,
    );

    const resultado = await this.g3Client.consultarOrdenes({
      idTecnico,
      idEmpresa: actor.id_empresa,
      fecha,
    });

    return {
      success: true,
      data: {
        fecha,
        // OK | NO_DISPONIBLE (G3 sin configurar, error o timeout)
        trabajos_estado: resultado.ok ? 'OK' : 'NO_DISPONIBLE',
        trabajos: resultado.ok ? this.mapearTrabajos(resultado.data ?? []) : [],
        inventario,
      },
    };
  }

  // Mapeo tolerante al contrato de G3 (docs/12 §1.1 y contrato verificado):
  // cliente{id_cliente,rut,nombre_completo|nombre} y direccion{direccion_completa|direccion,comuna,referencia}.
  private mapearTrabajos(ordenes: any[]): any[] {
    return ordenes.map((orden) => ({
      id_ot: orden?.id_ot ?? null,
      tipo_ot: orden?.tipo_ot ?? null,
      estado: orden?.estado ?? null,
      prioridad: orden?.prioridad ?? null,
      fecha_programada: orden?.fecha_programada ?? null,
      observaciones: orden?.observaciones ?? null,
      cliente: {
        id_cliente: orden?.cliente?.id_cliente ?? null,
        rut: orden?.cliente?.rut ?? null,
        nombre_completo:
          orden?.cliente?.nombre_completo ?? orden?.cliente?.nombre ?? null,
        // CU-61: teléfono del cliente (8-15 dígitos); G3 puede no enviarlo aún.
        telefono: orden?.cliente?.telefono ?? orden?.telefono ?? null,
      },
      direccion: {
        direccion:
          orden?.direccion?.direccion_completa ??
          orden?.direccion?.direccion ??
          null,
        comuna: orden?.direccion?.comuna ?? null,
        referencia: orden?.direccion?.referencia ?? null,
      },
    }));
  }
}
