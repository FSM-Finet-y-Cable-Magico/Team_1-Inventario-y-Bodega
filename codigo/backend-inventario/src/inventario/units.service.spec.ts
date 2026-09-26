import { UnitsService } from './units.service';
import { UnidadEquipo } from './entities/unidad-equipo.entity';

// CU-48: ubicación externa de una unidad fuera de bodega. Solo se prueba el
// resolvedor: usa el DataSource (usuario / préstamo externo) y, opcionalmente,
// G3 por RUT. El resto de dependencias no participan.
type Doble = Record<string, jest.Mock>;

function crearServicio(
  opciones: {
    usuario?: Record<string, unknown> | null;
    prestamo?: Record<string, unknown> | null;
    g3?: { url?: string; key?: string };
  } = {},
) {
  const usuarioRepo: Doble = {
    findOne: jest.fn().mockResolvedValue(opciones.usuario ?? null),
  };
  const prestamoRepo: Doble = {
    findOne: jest.fn().mockResolvedValue(opciones.prestamo ?? null),
  };
  const dataSource = {
    getRepository: jest.fn((entidad: any) => {
      if (entidad.name === 'Usuario') return usuarioRepo;
      if (entidad.name === 'PrestamoExterno') return prestamoRepo;
      return { findOne: jest.fn().mockResolvedValue(null) };
    }),
  };
  const configService = {
    get: jest.fn((clave: string) => {
      if (clave === 'G3_INTEGRACION_URL') return opciones.g3?.url;
      if (clave === 'G3_INTEGRACION_API_KEY') return opciones.g3?.key;
      return undefined;
    }),
  };

  const service = new UnitsService(
    {} as never,
    {} as never,
    {} as never,
    dataSource as never,
    {} as never,
    {} as never,
    configService as never,
  );
  return { service };
}

const UNIDAD = (overrides: Record<string, unknown> = {}) =>
  ({
    id_unidad: 501,
    id_empresa: 1,
    estado: 'Asignado a técnico',
    idTecnicoAsignado: 45,
    ...overrides,
  }) as unknown as UnidadEquipo;

describe('UnitsService — CU-48 (ubicación externa en la ficha)', () => {
  const fetchOriginal = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  it('Asignado a técnico: nombre y RUT del usuario', async () => {
    const { service } = crearServicio({
      usuario: { id_usuario: 45, nombre_completo: 'Pedro Técnico', rut: '11111111-1' },
    });

    const ubicacion = await service.resolverUbicacionExterna(UNIDAD());

    expect(ubicacion).toEqual({
      tipo: 'TECNICO',
      datos: {
        id_usuario: 45,
        nombre_completo: 'Pedro Técnico',
        rut: '11111111-1',
      },
      campos_faltantes: [],
    });
  });

  it('Asignado a técnico sin datos: marca los campos no registrados (E1)', async () => {
    const { service } = crearServicio({ usuario: null });

    const ubicacion = await service.resolverUbicacionExterna(UNIDAD());

    expect(ubicacion?.campos_faltantes).toEqual(['nombre_completo', 'rut']);
  });

  it('Instalado en cliente: datos persistidos por el cierre (CU-64)', async () => {
    const { service } = crearServicio();

    const ubicacion = await service.resolverUbicacionExterna(
      UNIDAD({
        estado: 'Instalado en cliente',
        clienteRut: '12345678-5',
        clienteNombre: 'María Soto',
        direccionInstalacion: 'Los Aromos 123',
        comunaInstalacion: 'Valparaíso',
      }),
    );

    expect(ubicacion).toEqual({
      tipo: 'CLIENTE',
      datos: {
        rut: '12345678-5',
        nombre: 'María Soto',
        direccion: 'Los Aromos 123',
        comuna: 'Valparaíso',
      },
      campos_faltantes: [],
    });
  });

  it('Instalado en cliente sin dirección: E1 la marca como faltante', async () => {
    const { service } = crearServicio();

    const ubicacion = await service.resolverUbicacionExterna(
      UNIDAD({
        estado: 'Instalado en cliente',
        clienteRut: '12345678-5',
        clienteNombre: 'María Soto',
        direccionInstalacion: null,
      }),
    );

    expect(ubicacion?.campos_faltantes).toEqual(['direccion']);
  });

  it('Instalado en cliente: G3 completa los campos que faltan', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          rut: '12345678-5',
          nombre_completo: 'María Soto',
          direcciones: [{ direccion: 'Los Aromos 123', comuna: 'Valparaíso' }],
        },
      }),
    }) as never;
    const { service } = crearServicio({
      g3: { url: 'https://g3.test/api/integraciones/', key: 'g3-key' },
    });

    const ubicacion = await service.resolverUbicacionExterna(
      UNIDAD({ estado: 'Instalado en cliente', clienteRut: '12345678-5' }),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://g3.test/api/integraciones/clientes/rut/12345678-5?id_empresa=1',
      expect.objectContaining({ headers: { 'X-API-KEY': 'g3-key' } }),
    );
    expect(ubicacion).toEqual({
      tipo: 'CLIENTE',
      datos: {
        rut: '12345678-5',
        nombre: 'María Soto',
        direccion: 'Los Aromos 123',
        comuna: 'Valparaíso',
      },
      campos_faltantes: [],
    });
  });

  it('Instalado en cliente: si G3 falla, degrada mostrando lo persistido', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout')) as never;
    const { service } = crearServicio({
      g3: { url: 'https://g3.test/api/integraciones', key: 'g3-key' },
    });

    const ubicacion = await service.resolverUbicacionExterna(
      UNIDAD({
        estado: 'Instalado en cliente',
        clienteRut: '12345678-5',
        clienteNombre: 'María Soto',
      }),
    );

    expect(ubicacion?.datos.nombre).toBe('María Soto');
    expect(ubicacion?.campos_faltantes).toEqual(['direccion']);
  });

  it('En préstamo externo: receptor, N° PE y motivo', async () => {
    const { service } = crearServicio({
      prestamo: {
        id_prestamo: 10,
        nombreReceptor: 'Empresa Reparadora Ltda.',
        rutReceptor: '76543210-K',
        correlativo: 'PE-00010',
        detalle: 'Reparación de fuente',
      },
    });

    const ubicacion = await service.resolverUbicacionExterna(
      UNIDAD({ estado: 'En préstamo externo' }),
    );

    expect(ubicacion).toEqual({
      tipo: 'PRESTAMO_EXTERNO',
      datos: {
        nombre_receptor: 'Empresa Reparadora Ltda.',
        rut_receptor: '76543210-K',
        numero_prestamo: 'PE-00010',
        motivo: 'Reparación de fuente',
      },
      campos_faltantes: [],
    });
  });

  it('En préstamo externo sin correlativo: E1 marca el N° de préstamo', async () => {
    const { service } = crearServicio({
      prestamo: {
        id_prestamo: 11,
        nombreReceptor: 'Taller X',
        rutReceptor: null,
        correlativo: null,
        detalle: 'Reparación externa',
      },
    });

    const ubicacion = await service.resolverUbicacionExterna(
      UNIDAD({ estado: 'En préstamo externo' }),
    );

    expect(ubicacion?.campos_faltantes).toEqual(['numero_prestamo']);
  });

  it('En bodega o Dado de baja: sin ubicación externa', async () => {
    const { service } = crearServicio();

    await expect(
      service.resolverUbicacionExterna(UNIDAD({ estado: 'En bodega' })),
    ).resolves.toBeNull();
    await expect(
      service.resolverUbicacionExterna(UNIDAD({ estado: 'Dado de baja' })),
    ).resolves.toBeNull();
  });
});
