import { BadRequestException, Injectable, Logger, RequestTimeoutException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ReportesService } from './reportes.service';
import {
  ColumnaPdf,
  construirPdfReporte,
  fechaLegible,
} from './pdf-reporte';

// CU-93: la generación no puede pasar de 15 segundos (Excepción 1). El valor se
// puede bajar por entorno (EXPORT_PDF_TIMEOUT_MS) para probar la excepción.
export const TIMEOUT_EXPORTACION_MS =
  Number(process.env.EXPORT_PDF_TIMEOUT_MS) > 0
    ? Number(process.env.EXPORT_PDF_TIMEOUT_MS)
    : 15_000;
export const MENSAJE_TIMEOUT =
  'La generación del archivo superó los 15 segundos. Intente nuevamente.';

type Actor = {
  id_usuario?: number;
  sub?: number;
  id_empresa?: number;
  nombre_completo?: string;
  nombre_usuario?: string;
  roles?: string[];
};

// Los cinco reportes del módulo (CU-85, CU-86, CU-88, CU-89, CU-91), con las
// columnas que se llevan al PDF. El peso reparte el ancho de la página.
const REPORTES: Record<
  string,
  { titulo: string; entidad: string; columnas: ColumnaPdf[] }
> = {
  stock: {
    titulo: 'Reporte de stock por bodega',
    entidad: 'reporte_stock',
    columnas: [
      { titulo: 'Empresa', campo: 'empresa' },
      { titulo: 'Bodega', campo: 'bodega', peso: 1.4 },
      { titulo: 'Tipo de equipo', campo: 'tipo_equipo', peso: 1.6 },
      { titulo: 'En bodega', campo: 'en_bodega', peso: 0.7 },
      { titulo: 'Asignado', campo: 'asignado_a_tecnico', peso: 0.7 },
      { titulo: 'En revisión', campo: 'en_revision', peso: 0.7 },
      { titulo: 'En préstamo', campo: 'en_prestamo_externo', peso: 0.7 },
      { titulo: 'Total activo', campo: 'total_activo', peso: 0.7 },
      { titulo: 'Umbral', campo: 'umbral_minimo', peso: 0.6 },
    ],
  },
  movimientos: {
    titulo: 'Reporte de movimientos de inventario',
    entidad: 'reporte_movimientos',
    columnas: [
      { titulo: 'Fecha y hora', campo: 'fecha', peso: 1.2 },
      { titulo: 'Movimiento', campo: 'tipo_movimiento', peso: 1.3 },
      { titulo: 'NS / consumible', campo: 'item', peso: 1.4 },
      { titulo: 'Cantidad', campo: 'cantidad', peso: 0.6 },
      { titulo: 'Empresa', campo: 'empresa', peso: 0.8 },
      { titulo: 'Bodega', campo: 'bodega', peso: 1.2 },
      { titulo: 'Usuario', campo: 'usuario', peso: 1.2 },
      { titulo: 'Referencia', campo: 'referencia', peso: 1 },
    ],
  },
  garantias: {
    titulo: 'Reporte de garantías',
    entidad: 'reporte_garantias',
    columnas: [
      { titulo: 'NS', campo: 'numero_serie', peso: 1.2 },
      { titulo: 'Tipo de equipo', campo: 'tipo_equipo', peso: 1.3 },
      { titulo: 'Marca', campo: 'marca', peso: 0.9 },
      { titulo: 'Modelo', campo: 'modelo', peso: 0.9 },
      { titulo: 'Proveedor', campo: 'proveedor', peso: 1.2 },
      { titulo: 'Adquisición', campo: 'fecha_adquisicion', peso: 0.9 },
      { titulo: 'Garantía (d)', campo: 'duracion_garantia_dias', peso: 0.75 },
      { titulo: 'Vencimiento', campo: 'fecha_vencimiento', peso: 0.9 },
      { titulo: 'Días rest./venc.', campo: 'dias_texto', peso: 1 },
      { titulo: 'Estado', campo: 'estado', peso: 1.3 },
      { titulo: 'Empresa', campo: 'empresa', peso: 0.8 },
    ],
  },
  'tecnicos-inventario': {
    titulo: 'Reporte de inventario en poder de técnicos',
    entidad: 'reporte_inventario_tecnicos',
    columnas: [
      { titulo: 'Técnico', campo: 'tecnico', peso: 1.4 },
      { titulo: 'Empresa', campo: 'empresa', peso: 0.8 },
      { titulo: 'Ítem', campo: 'item', peso: 1.6 },
      { titulo: 'Tipo de equipo', campo: 'tipo_equipo', peso: 1.4 },
      { titulo: 'Cantidad', campo: 'cantidad', peso: 0.7 },
      { titulo: 'Asignación', campo: 'fecha_asignacion', peso: 0.9 },
      { titulo: 'Días', campo: 'dias_transcurridos', peso: 0.6 },
    ],
  },
  consumo: {
    titulo: 'Reporte de consumo de materiales',
    entidad: 'reporte_consumo',
    columnas: [
      { titulo: 'Tipo de consumible', campo: 'tipo_consumible', peso: 1.8 },
      { titulo: 'Unidad', campo: 'unidad_medida', peso: 0.8 },
      { titulo: 'Ingresada', campo: 'cantidad_ingresada' },
      { titulo: 'Entregada', campo: 'cantidad_entregada' },
      { titulo: 'Usada en cierres', campo: 'cantidad_usada_en_cierres', peso: 1.1 },
      { titulo: 'Devuelta', campo: 'cantidad_devuelta' },
      { titulo: 'Diferencia', campo: 'diferencia' },
      { titulo: 'Indicador', campo: 'indicador', peso: 1.2 },
    ],
  },
};

// Etiquetas legibles de los filtros para el encabezado del PDF.
const ETIQUETAS_FILTRO: Record<string, string> = {
  id_empresa: 'Empresa',
  id_bodega: 'Bodega',
  id_tipo_equipo: 'Tipo de equipo',
  fecha_desde: 'Desde',
  fecha_hasta: 'Hasta',
  tipo_movimiento: 'Movimiento',
  id_usuario: 'Usuario',
  periodo: 'Período',
};

@Injectable()
export class ExportacionService {
  private readonly logger = new Logger(ExportacionService.name);

  constructor(
    private readonly reportesService: ReportesService,
    private readonly auditoriaService: AuditoriaService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  tiposDisponibles(): string[] {
    return Object.keys(REPORTES);
  }

  // CU-93: genera el PDF del reporte visible, con los mismos filtros.
  async exportarPdf(
    tipo: string,
    filtros: Record<string, any>,
    actor: Actor,
  ): Promise<{ archivo: Buffer; nombre: string; filas: number }> {
    const definicion = REPORTES[tipo];
    if (!definicion) {
      throw new BadRequestException(
        `Tipo de reporte no válido. Use uno de: ${this.tiposDisponibles().join(', ')}.`,
      );
    }

    const fecha = new Date();
    // Excepción 1: el trabajo sigue en curso, pero el actor recibe el error a
    // los 15 segundos en vez de esperar indefinidamente.
    const filas = await this.conTimeout(
      this.obtenerFilas(tipo, filtros, actor),
      tipo,
    );

    const archivo = construirPdfReporte({
      empresa: this.nombreEmpresa(filtros.id_empresa ?? actor.id_empresa),
      titulo: definicion.titulo,
      filtros: this.describirFiltros(filtros),
      generadoPor: await this.nombreDelActor(actor),
      fecha,
      columnas: definicion.columnas,
      filas,
    });

    await this.auditarExportacion(actor, tipo, definicion.entidad, filtros, filas.length);

    const marca = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`;
    return { archivo, nombre: `reporte-${tipo}-${marca}.pdf`, filas: filas.length };
  }

  // El JWT solo trae el nombre de usuario; el encabezado del CU pide el nombre
  // de quien generó el reporte, así que se busca y se degrada al del token.
  private async nombreDelActor(actor: Actor): Promise<string> {
    if (actor.nombre_completo) return actor.nombre_completo;
    const id = actor.id_usuario ?? actor.sub;
    if (id) {
      const usuario = await this.usuarioRepository
        .findOne({ where: { id_usuario: id } })
        .catch(() => null);
      if (usuario?.nombre_completo) return usuario.nombre_completo;
    }
    return actor.nombre_usuario ?? 'Usuario del sistema';
  }

  private async conTimeout<T>(trabajo: Promise<T>, tipo: string): Promise<T> {
    let temporizador: NodeJS.Timeout;
    const limite = new Promise<never>((_, rechazar) => {
      temporizador = setTimeout(() => {
        this.logger.warn(
          `Exportación PDF de [${tipo}] superó ${TIMEOUT_EXPORTACION_MS} ms.`,
        );
        rechazar(new RequestTimeoutException(MENSAJE_TIMEOUT));
      }, TIMEOUT_EXPORTACION_MS);
    });
    try {
      return await Promise.race([trabajo, limite]);
    } finally {
      clearTimeout(temporizador!);
    }
  }

  // Cada reporte ya existe (CU-85..CU-91): aquí solo se adapta su forma a la
  // tabla del PDF, sin repetir las consultas ni las reglas de empresa.
  private async obtenerFilas(
    tipo: string,
    filtros: Record<string, any>,
    actor: Actor,
  ): Promise<Record<string, any>[]> {
    if (tipo === 'stock') {
      return this.reportesService.getStockReport(filtros, actor);
    }
    if (tipo === 'movimientos') {
      const filas = await this.reportesService.getMovementsReport(
        filtros,
        actor,
      );
      return filas.map((fila) => ({
        ...fila,
        fecha: fila.fecha ? fechaLegible(new Date(fila.fecha)) : null,
        referencia: fila.referencia_id
          ? `${fila.referencia_tipo ?? 'documento'} #${fila.referencia_id}`
          : null,
      }));
    }
    if (tipo === 'garantias') {
      const filas = await this.reportesService.getGarantiasReport(
        filtros,
        actor,
      );
      return filas.map((fila) => ({
        ...fila,
        dias_texto:
          fila.dias_restantes !== null && fila.dias_restantes !== undefined
            ? `${fila.dias_restantes} restantes`
            : fila.dias_vencidos !== null && fila.dias_vencidos !== undefined
              ? `${fila.dias_vencidos} vencidos`
              : 'Sin garantía',
      }));
    }
    if (tipo === 'consumo') {
      const filas = await this.reportesService.getConsumoReport(filtros, actor);
      return filas.map((fila) => ({
        ...fila,
        indicador: fila.desvio ? 'Desvío sobre 15%' : 'Dentro del rango',
      }));
    }

    // Inventario de técnicos: el reporte viene anidado (un bloque por técnico)
    // y la tabla del PDF necesita una fila por ítem.
    const tecnicos = await this.reportesService.getInventarioTecnicosReport(
      filtros,
      actor,
    );
    const filas: Record<string, any>[] = [];
    for (const bloque of tecnicos) {
      const base = {
        tecnico: bloque.tecnico?.nombre_completo ?? '-',
        empresa: bloque.tecnico?.empresa ?? '-',
      };
      for (const equipo of bloque.equipos_individualizables ?? []) {
        filas.push({
          ...base,
          item: equipo.numero_serie,
          tipo_equipo: equipo.tipo_equipo,
          cantidad: 1,
          fecha_asignacion: equipo.fecha_asignacion,
          dias_transcurridos: equipo.dias_transcurridos,
        });
      }
      for (const consumible of bloque.consumibles ?? []) {
        filas.push({
          ...base,
          item: consumible.tipo_equipo,
          tipo_equipo: consumible.tipo_equipo,
          cantidad: `${consumible.cantidad_disponible} ${consumible.unidad_medida ?? ''}`.trim(),
          fecha_asignacion: null,
          dias_transcurridos: null,
        });
      }
      if (
        (bloque.equipos_individualizables ?? []).length === 0 &&
        (bloque.consumibles ?? []).length === 0
      ) {
        filas.push({ ...base, item: 'Sin inventario asignado' });
      }
    }
    return filas;
  }

  private describirFiltros(
    filtros: Record<string, any>,
  ): { etiqueta: string; valor: string }[] {
    return Object.entries(filtros)
      .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
      .map(([clave, valor]) => ({
        etiqueta: ETIQUETAS_FILTRO[clave] ?? clave,
        valor: clave === 'id_empresa' ? this.nombreEmpresa(valor) : String(valor),
      }));
  }

  private nombreEmpresa(idEmpresa: any): string {
    if (Number(idEmpresa) === 1) return 'Finet';
    if (Number(idEmpresa) === 2) return 'Cable Mágico';
    return 'Inventario y Bodega';
  }

  private async auditarExportacion(
    actor: Actor,
    tipo: string,
    entidad: string,
    filtros: Record<string, any>,
    filas: number,
  ) {
    const actorId = actor.id_usuario ?? actor.sub;
    if (!actorId) return;
    await this.auditoriaService.create({
      id_usuario: actorId,
      accion: 'EXPORTAR_REPORTE_PDF',
      entidad_afectada: entidad,
      id_entidad_afectada: 0,
      valor_anterior: null,
      valor_nuevo: { tipo, formato: 'PDF', filtros, filas },
    });
  }
}
