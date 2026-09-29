import { Injectable } from '@nestjs/common';
import { CompaniesService, EMPRESAS } from '../companies/companies.service';
import {
  PrestamosService,
  PRESTAMO_ACTIVO,
} from '../prestamos/prestamos.service';
import type { ActorJwt } from '../prestamos/prestamos.service';
import { UnitsService } from '../inventario/units.service';

// CU-94: tipos de alerta tal como los nombra el caso de uso (el front los
// muestra en negrita). Se devuelven en este mismo orden: A, B, C, D.
export const TIPO_STOCK_BAJO_UMBRAL = 'Stock bajo umbral';
export const TIPO_GARANTIA_CON_DEFECTO = 'Garantía con defecto';
export const TIPO_PRESTAMO_VENCIDO = 'Préstamo vencido';
export const TIPO_REVISION_PROLONGADA = 'Revisión prolongada';

// CU-94 (D): una revisión es prolongada cuando supera estos días sin resultado
const DIAS_REVISION_PROLONGADA = 30;
// CU-94: la descripción de cada alerta tiene un máximo de 100 caracteres
const MAX_DESCRIPCION = 100;

export interface AlertaActiva {
  tipo: string;
  empresa: string;
  descripcion: string;
  // Fecha/hora de generación (el front la muestra como DD/MM/YYYY HH:MM:SS)
  fecha_hora: Date | string;
}

@Injectable()
export class AlertasService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly prestamosService: PrestamosService,
    private readonly unitsService: UnitsService,
  ) {}

  // CU-94: alertas activas calculadas al vuelo en cada navegación al dashboard
  // (sin persistencia; guardar notificaciones es CU-96). Cada tipo reutiliza la
  // consulta de su CU de origen para que las cifras coincidan con esas pantallas.
  // Aislamiento manual: el Superusuario ve ambas empresas; el resto, solo la suya.
  async listarAlertasActivas(actor: ActorJwt): Promise<AlertaActiva[]> {
    const esSuperusuario = actor.roles?.includes('SUPERUSUARIO') === true;
    const empresas = esSuperusuario
      ? EMPRESAS
      : EMPRESAS.filter((e) => e.id === actor.id_empresa);

    // Fecha de evaluación: es la fecha de generación de las alertas de stock
    const ahora = new Date();
    const hoy = ahora.toLocaleDateString('en-CA', {
      timeZone: 'America/Santiago',
    });

    // CU-77: equipos 'En revisión' con su fecha de ingreso y días transcurridos
    // (sirve para B y D, con el mismo aislamiento por empresa)
    const enRevision = await this.unitsService.listarEnRevision(actor);

    return [
      ...(await this.alertasStockBajoUmbral(empresas, ahora)),
      ...this.alertasGarantiaConDefecto(enRevision, hoy, ahora),
      ...(await this.alertasPrestamoVencido(actor)),
      ...this.alertasRevisionProlongada(enRevision),
    ];
  }

  // CU-94 (A): stock activo de un tipo en una bodega menor al umbral (regla CU-46)
  private async alertasStockBajoUmbral(
    empresas: { id: number; nombre: string }[],
    ahora: Date,
  ): Promise<AlertaActiva[]> {
    const alertas: AlertaActiva[] = [];
    for (const empresa of empresas) {
      const stockBajo = await this.companiesService.getAlertasStockMinimo(
        empresa.id,
      );
      for (const s of stockBajo) {
        alertas.push({
          tipo: TIPO_STOCK_BAJO_UMBRAL,
          empresa: empresa.nombre,
          descripcion: this.recortar(
            `${s.tipo_equipo} en ${s.bodega}: ${s.cantidad_disponible} disponibles (umbral: ${s.umbral_minimo}).`,
          ),
          fecha_hora: ahora,
        });
      }
    }
    return alertas;
  }

  // CU-94 (B): equipo en revisión con garantía vigente (CU-38/39: la fecha de
  // hoy es anterior o igual al vencimiento). Fecha = cambio a 'En revisión'.
  private alertasGarantiaConDefecto(
    enRevision: Awaited<ReturnType<UnitsService['listarEnRevision']>>,
    hoy: string,
    ahora: Date,
  ): AlertaActiva[] {
    return enRevision
      .filter(
        (u) =>
          !!u.fecha_venc_garantia &&
          String(u.fecha_venc_garantia).slice(0, 10) >= hoy,
      )
      .sort((a, b) => this.compararFechaDesc(a, b))
      .map((u) => ({
        tipo: TIPO_GARANTIA_CON_DEFECTO,
        empresa: u.empresa ?? '-',
        descripcion: this.recortar(
          `Equipo ${u.numero_serie} (${u.tipo_equipo?.nombre ?? 'sin tipo'}) en revisión con garantía vigente hasta ${this.formatearFecha(String(u.fecha_venc_garantia))}.`,
        ),
        // Unidades sin historial (cargadas directo en BD): fecha de evaluación
        fecha_hora: u.fecha_ingreso_revision ?? ahora,
      }));
  }

  // CU-94 (C): préstamo externo activo que superó su fecha estimada de retorno.
  // Reutiliza la tabla de CU-83 (solo PE-XXXXX, días restantes server-side).
  // Fecha = fecha de vencimiento (fecha estimada de retorno, a las 00:00:00).
  private async alertasPrestamoVencido(
    actor: ActorJwt,
  ): Promise<AlertaActiva[]> {
    const prestamos = await this.prestamosService.listar(
      { estado: PRESTAMO_ACTIVO },
      actor,
    );

    return prestamos
      .filter(
        (p) => typeof p.dias_restantes === 'number' && p.dias_restantes < 0,
      )
      .map((p) => {
        const diasVencido = Math.abs(p.dias_restantes as number);
        return {
          tipo: TIPO_PRESTAMO_VENCIDO,
          empresa: (p.empresa as string | null) ?? '-',
          descripcion: this.recortar(
            `Préstamo ${p.correlativo as string} a ${p.nombre_receptor as string}: vencido hace ${diasVencido} ${diasVencido === 1 ? 'día' : 'días'}.`,
          ),
          // Sin zona: el navegador la interpreta como medianoche local
          fecha_hora: `${String(p.fecha_estimada_retorno).slice(0, 10)}T00:00:00`,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime(),
      );
  }

  // CU-94 (D): equipo en revisión por más de 30 días sin resultado registrado.
  // Registrar el resultado (CU-72/74/75) saca la unidad de 'En revisión', así
  // que seguir en ese estado equivale a no tener resultado.
  private alertasRevisionProlongada(
    enRevision: Awaited<ReturnType<UnitsService['listarEnRevision']>>,
  ): AlertaActiva[] {
    return enRevision
      .filter(
        (u) =>
          u.dias_en_revision !== null &&
          u.dias_en_revision > DIAS_REVISION_PROLONGADA,
      )
      .sort((a, b) => this.compararFechaDesc(a, b))
      .map((u) => ({
        tipo: TIPO_REVISION_PROLONGADA,
        empresa: u.empresa ?? '-',
        descripcion: this.recortar(
          `Equipo ${u.numero_serie} (${u.tipo_equipo?.nombre ?? 'sin tipo'}) lleva ${u.dias_en_revision} días en revisión sin resultado registrado.`,
        ),
        fecha_hora: u.fecha_ingreso_revision as Date,
      }));
  }

  // Más recientes primero dentro de cada tipo
  private compararFechaDesc(
    a: { fecha_ingreso_revision: Date | null },
    b: { fecha_ingreso_revision: Date | null },
  ): number {
    return (
      new Date(b.fecha_ingreso_revision ?? 0).getTime() -
      new Date(a.fecha_ingreso_revision ?? 0).getTime()
    );
  }

  // CU-94: descripción de máximo 100 caracteres
  private recortar(texto: string): string {
    return texto.length > MAX_DESCRIPCION
      ? `${texto.slice(0, MAX_DESCRIPCION - 3)}...`
      : texto;
  }

  // 'YYYY-MM-DD' → 'DD/MM/YYYY'
  private formatearFecha(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  }
}
