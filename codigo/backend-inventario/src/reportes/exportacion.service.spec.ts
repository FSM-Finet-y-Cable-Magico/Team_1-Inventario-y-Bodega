import {
  ExportacionService,
  MENSAJE_TIMEOUT,
  TIMEOUT_EXPORTACION_MS,
} from './exportacion.service';

// CU-93: exportación a PDF del reporte visible. Los reportes ya existen
// (CU-85..CU-91), así que aquí se prueban la adaptación a la tabla, la
// auditoría y la Excepción 1 (15 segundos).

const ACTOR = {
  id_usuario: 3,
  id_empresa: 1,
  nombre_usuario: 'admin_finet',
  roles: ['ADMIN'],
};

function crearServicio(reportes: Record<string, any> = {}) {
  const reportesService = {
    getStockReport: jest.fn().mockResolvedValue([]),
    getMovementsReport: jest.fn().mockResolvedValue([]),
    getGarantiasReport: jest.fn().mockResolvedValue([]),
    getInventarioTecnicosReport: jest.fn().mockResolvedValue([]),
    getConsumoReport: jest.fn().mockResolvedValue([]),
    ...reportes,
  };
  const auditoriaService = { create: jest.fn() };
  // CU-93: el nombre completo del encabezado se busca por el id del token.
  const usuarioRepository = {
    findOne: jest.fn().mockResolvedValue({ nombre_completo: 'Admin Finet QA' }),
  };
  const servicio = new ExportacionService(
    reportesService as never,
    auditoriaService as never,
    usuarioRepository as never,
  );
  return { servicio, reportesService, auditoriaService };
}

describe('CU-93 — Exportando reporte a PDF', () => {
  it('exporta los cinco reportes del módulo', async () => {
    const { servicio } = crearServicio();
    expect(servicio.tiposDisponibles()).toEqual([
      'stock',
      'movimientos',
      'garantias',
      'tecnicos-inventario',
      'consumo',
    ]);
  });

  it('genera el PDF con los filtros del reporte visible y nombra el archivo con la fecha', async () => {
    const { servicio, reportesService } = crearServicio({
      getStockReport: jest.fn().mockResolvedValue([
        { bodega: 'Bodega Central', tipo_equipo: 'ONT Huawei', en_bodega: 12 },
      ]),
    });
    const filtros = { id_empresa: 1, id_bodega: 4 };

    const { archivo, nombre, filas } = await servicio.exportarPdf(
      'stock',
      filtros,
      ACTOR,
    );

    // El reporte se pide con los mismos filtros y el mismo actor que la pantalla.
    expect(reportesService.getStockReport).toHaveBeenCalledWith(filtros, ACTOR);
    const texto = archivo.toString('latin1');
    expect(texto.startsWith('%PDF')).toBe(true);
    expect(texto).toContain('(Finet) Tj');
    expect(texto).toContain('Empresa: Finet');
    expect(texto).toContain('Bodega: 4');
    expect(texto).toContain('Admin Finet QA');
    expect(filas).toBe(1);
    expect(nombre).toMatch(/^reporte-stock-\d{8}\.pdf$/);
  });

  it('registra la exportación en la auditoría', async () => {
    const { servicio, auditoriaService } = crearServicio();

    await servicio.exportarPdf('consumo', { id_empresa: 1 }, ACTOR);

    expect(auditoriaService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id_usuario: 3,
        accion: 'EXPORTAR_REPORTE_PDF',
        entidad_afectada: 'reporte_consumo',
        valor_nuevo: expect.objectContaining({ formato: 'PDF', filas: 0 }),
      }),
    );
  });

  it('aplana el inventario de técnicos: una fila por equipo y por consumible', async () => {
    const { servicio } = crearServicio({
      getInventarioTecnicosReport: jest.fn().mockResolvedValue([
        {
          tecnico: { nombre_completo: 'Técnico Terreno QA', empresa: 'Finet' },
          equipos_individualizables: [
            {
              numero_serie: 'DEMO-ONT-0004',
              tipo_equipo: 'ONT QA',
              fecha_asignacion: '2026-09-10',
              dias_transcurridos: 19,
            },
          ],
          consumibles: [
            {
              tipo_equipo: 'Fibra drop QA',
              cantidad_disponible: 25,
              unidad_medida: 'Metro',
            },
          ],
        },
        {
          tecnico: { nombre_completo: 'Técnico sin carga', empresa: 'Finet' },
          equipos_individualizables: [],
          consumibles: [],
        },
      ]),
    });

    const { archivo, filas } = await servicio.exportarPdf(
      'tecnicos-inventario',
      {},
      ACTOR,
    );

    expect(filas).toBe(3);
    const texto = archivo.toString('latin1');
    expect(texto).toContain('DEMO-ONT-0004');
    expect(texto).toContain('25 Metro');
    expect(texto).toContain('Sin inventario asignado');
  });

  it('traduce el indicador de desvío y la referencia de los movimientos', async () => {
    const { servicio } = crearServicio({
      getConsumoReport: jest
        .fn()
        .mockResolvedValue([{ tipo_consumible: 'Fibra', desvio: true }]),
      getMovementsReport: jest.fn().mockResolvedValue([
        {
          fecha: '2026-09-29T12:00:00.000Z',
          tipo_movimiento: 'INGRESO',
          referencia_id: 7,
          referencia_tipo: 'orden_ingreso',
        },
      ]),
    });

    const consumo = await servicio.exportarPdf('consumo', {}, ACTOR);
    expect(consumo.archivo.toString('latin1')).toContain('Desv');

    const movimientos = await servicio.exportarPdf('movimientos', {}, ACTOR);
    expect(movimientos.archivo.toString('latin1')).toContain(
      'orden_ingreso #7',
    );
  });

  it('un tipo de reporte inexistente es rechazado', async () => {
    const { servicio } = crearServicio();

    await expect(servicio.exportarPdf('ventas', {}, ACTOR)).rejects.toThrow(
      'Tipo de reporte no válido',
    );
  });

  it('Excepción 1: a los 15 segundos informa el error y pide reintentar', async () => {
    jest.useFakeTimers();
    const { servicio, auditoriaService } = crearServicio({
      // Un reporte que nunca responde: simula la generación que se pasa del límite.
      getStockReport: jest.fn().mockReturnValue(new Promise(() => {})),
    });

    const exportacion = servicio.exportarPdf('stock', {}, ACTOR);
    const esperado = expect(exportacion).rejects.toThrow(MENSAJE_TIMEOUT);
    jest.advanceTimersByTime(TIMEOUT_EXPORTACION_MS);
    await esperado;

    // Sin archivo no hay exportación que auditar.
    expect(auditoriaService.create).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
