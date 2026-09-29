import { ConflictException } from '@nestjs/common';
import { UnidadEquipo } from './entities/unidad-equipo.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';

// CU-95: aviso de garantía vigente al registrar 'Dado de baja' o 'En revisión'.
// Lo comparten todos los flujos que llevan una unidad a esos estados (CU-35/40,
// CU-71, CU-72, CU-76, CU-78, CU-82) para que el mensaje sea uno solo.
export const ESTADOS_CON_AVISO_GARANTIA = ['Dado de baja', 'En revisión'];

// Código que acompaña al 409 para que el front abra el diálogo del aviso
export const CODIGO_AVISO_GARANTIA = 'AVISO_GARANTIA';

// Columna date (string 'YYYY-MM-DD' en runtime) o Date → 'YYYY-MM-DD'
function fechaISO(fecha: Date | string | null | undefined): string | null {
  if (!fecha) return null;
  return typeof fecha === 'string'
    ? fecha.slice(0, 10)
    : fecha.toISOString().slice(0, 10);
}

// CU-39/CU-95: vigente si la fecha actual (Chile) es anterior o igual al vencimiento
export function tieneGarantiaVigente(unidad: UnidadEquipo): boolean {
  const vencimiento = fechaISO(unidad.fechaVencGarantia);
  if (!vencimiento) return false;
  const hoy = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Santiago',
  });
  return hoy <= vencimiento;
}

// CU-95: texto exacto del aviso (el proveedor sin registrar se indica como "no registrado")
export function mensajeAvisoGarantia(unidad: UnidadEquipo): string {
  const [anio, mes, dia] = (fechaISO(unidad.fechaVencGarantia) ?? '').split(
    '-',
  );
  const equipo =
    [unidad.tipoEquipo?.marca, unidad.modelo ?? unidad.tipoEquipo?.modelo]
      .filter((p) => typeof p === 'string' && p.trim() !== '')
      .join(' ') || 'marca y modelo no registrados';
  const proveedor = unidad.proveedor?.trim() || 'no registrado';
  return (
    `AVISO: El equipo ${unidad.serialNumber} (${equipo}) tiene garantía vigente ` +
    `hasta ${dia}/${mes}/${anio}. Considere contactar al proveedor ${proveedor} ` +
    `antes de proceder. ¿Desea continuar de todas formas?`
  );
}

// CU-95: si alguna unidad tiene garantía vigente y el actor no confirmó
// (forzar_aviso_garantia), se interrumpe con 409 y el aviso sin ejecutar nada.
// Devuelve las unidades con garantía vigente (para auditar el aviso ignorado).
export function exigirConfirmacionGarantia(
  unidades: UnidadEquipo[],
  forzarAvisoGarantia: boolean | undefined,
): UnidadEquipo[] {
  const vigentes = unidades.filter((u) => tieneGarantiaVigente(u));
  if (vigentes.length > 0 && forzarAvisoGarantia !== true) {
    throw new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      codigo: CODIGO_AVISO_GARANTIA,
      message: vigentes.map((u) => mensajeAvisoGarantia(u)).join('\n'),
    });
  }
  return vigentes;
}

// CU-95: el actor eligió "Continuar sin garantía" → se audita el aviso ignorado
export async function auditarAvisoGarantiaIgnorado(
  auditoriaService: AuditoriaService,
  unidades: UnidadEquipo[],
  estadoSolicitado: string,
  idUsuario: number,
): Promise<void> {
  for (const unidad of unidades) {
    await auditoriaService.create({
      id_usuario: idUsuario,
      accion: 'AVISO_GARANTIA_IGNORADO',
      entidad_afectada: 'unidad_equipo',
      id_entidad_afectada: unidad.id_unidad,
      valor_anterior: { estado: unidad.estado },
      valor_nuevo: {
        numero_serie: unidad.serialNumber,
        estado_solicitado: estadoSolicitado,
        fecha_venc_garantia: fechaISO(unidad.fechaVencGarantia),
        proveedor: unidad.proveedor ?? null,
        fecha_hora: new Date().toISOString(),
      },
    });
  }
}
