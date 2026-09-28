import { JornadaService } from './jornada.service';

// CU-61: jornada del técnico = trabajos del día (G3) + inventario personal (CU-58).
const ACTOR = { id_usuario: 45, id_empresa: 1, roles: ['TECNICO_TERRENO'] };

function crearServicio(opciones: {
  inventario?: Record<string, unknown>;
  ordenes?: { ok: boolean; data: unknown[] | null };
}) {
  const inventarioPersonalService = {
    consultar: jest.fn().mockResolvedValue(
      opciones.inventario ?? {
        tecnico: { id_usuario: 45, nombre_completo: 'Pedro Técnico' },
        ns_asignados: [],
        saldos: [],
      },
    ),
  };
  const g3Client = {
    consultarOrdenes: jest
      .fn()
      .mockResolvedValue(opciones.ordenes ?? { ok: true, data: [] }),
  };
  const service = new JornadaService(
    inventarioPersonalService as never,
    g3Client as never,
  );
  return { service, inventarioPersonalService, g3Client };
}

const ORDEN_G3 = {
  id_ot: 781,
  tipo_ot: 'INSTALACION',
  estado: 'PENDIENTE',
  prioridad: 'ALTA',
  fecha_programada: '2026-09-26T10:00:00Z',
  cliente: { id_cliente: 130, rut: '12345678-5', nombre: 'María Soto' },
  direccion: { direccion_completa: 'Los Aromos 123', comuna: 'Valparaíso' },
};

describe('JornadaService — CU-61 (vista móvil del técnico)', () => {
  it('combina los trabajos del día (G3) con el inventario personal (CU-58)', async () => {
    const { service, inventarioPersonalService } = crearServicio({
      ordenes: { ok: true, data: [ORDEN_G3] },
      inventario: {
        tecnico: { id_usuario: 45, nombre_completo: 'Pedro Técnico' },
        ns_asignados: [{ numero_serie: 'ONT-1', estado: 'Asignado a técnico' }],
        saldos: [{ id_tipo_equipo: 7, saldo: 15, unidad_medida: 'Metro' }],
      },
    });

    const respuesta = await service.obtenerJornada(ACTOR);

    expect(inventarioPersonalService.consultar).toHaveBeenCalledWith(
      45,
      1,
      ACTOR,
    );
    expect(respuesta.data.trabajos_estado).toBe('OK');
    expect(respuesta.data.trabajos).toEqual([
      {
        id_ot: 781,
        tipo_ot: 'INSTALACION',
        estado: 'PENDIENTE',
        prioridad: 'ALTA',
        fecha_programada: '2026-09-26T10:00:00Z',
        observaciones: null,
        cliente: {
          id_cliente: 130,
          rut: '12345678-5',
          nombre_completo: 'María Soto',
          telefono: null,
        },
        direccion: {
          direccion: 'Los Aromos 123',
          comuna: 'Valparaíso',
          referencia: null,
        },
      },
    ]);
    expect(respuesta.data.inventario.saldos).toHaveLength(1);
  });

  it('E1: sin trabajos del día → 200 con lista vacía', async () => {
    const { service } = crearServicio({ ordenes: { ok: true, data: [] } });

    const respuesta = await service.obtenerJornada(ACTOR);

    expect(respuesta.data.trabajos_estado).toBe('OK');
    expect(respuesta.data.trabajos).toEqual([]);
  });

  it('si G3 no está disponible, degrada sin fallar (NO_DISPONIBLE)', async () => {
    const { service } = crearServicio({ ordenes: { ok: false, data: null } });

    const respuesta = await service.obtenerJornada(ACTOR);

    expect(respuesta.data.trabajos_estado).toBe('NO_DISPONIBLE');
    expect(respuesta.data.trabajos).toEqual([]);
    // El inventario personal se sigue mostrando aunque G3 falle.
    expect(respuesta.data.inventario).toBeDefined();
  });

  it('acepta el alias nombre por nombre_completo y direccion directa', async () => {
    const { service } = crearServicio({
      ordenes: {
        ok: true,
        data: [
          {
            id_ot: 782,
            cliente: { nombre: 'Cliente Alias' },
            direccion: { direccion: 'Calle 1' },
          },
        ],
      },
    });

    const respuesta = await service.obtenerJornada(ACTOR);

    expect(respuesta.data.trabajos[0].cliente.nombre_completo).toBe(
      'Cliente Alias',
    );
    expect(respuesta.data.trabajos[0].direccion.direccion).toBe('Calle 1');
  });
});
