import { G3ClientService } from './g3-client.service';

// CU-48/CU-61: cliente saliente contra G3. Nunca lanza; sin configuración o con
// error devuelve ok:false / null para que la UI degrade.
describe('G3ClientService', () => {
  const fetchOriginal = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  function crearServicio(url?: string, key?: string) {
    const configService = {
      get: jest.fn((clave: string) => {
        if (clave === 'G3_INTEGRACION_URL') return url;
        if (clave === 'G3_INTEGRACION_API_KEY') return key;
        return undefined;
      }),
    };
    return new G3ClientService(configService as never);
  }

  it('sin configuración no llama a G3 y devuelve null', async () => {
    global.fetch = jest.fn() as never;
    const service = crearServicio();

    await expect(
      service.consultarClientePorRut('12345678-5', 1),
    ).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('consulta el cliente por RUT con X-API-KEY y desenvuelve el envelope', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { rut: '12345678-5' } }),
    }) as never;
    const service = crearServicio('https://g3.test/api/integraciones/', 'k1');

    const cliente = await service.consultarClientePorRut('12345678-5', 1);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://g3.test/api/integraciones/clientes/rut/12345678-5?id_empresa=1',
      expect.objectContaining({ headers: { 'X-API-KEY': 'k1' } }),
    );
    expect(cliente).toEqual({ rut: '12345678-5' });
  });

  it('un 404 u error de red se degrada a null', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as never;
    const service = crearServicio('https://g3.test/api/integraciones', 'k1');
    await expect(
      service.consultarClientePorRut('12345678-5', 1),
    ).resolves.toBeNull();

    global.fetch = jest.fn().mockRejectedValue(new Error('timeout')) as never;
    await expect(
      service.consultarClientePorRut('12345678-5', 1),
    ).resolves.toBeNull();
  });

  it('consulta las OT del día con los filtros del contrato', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id_ot: 1 }] }),
    }) as never;
    const service = crearServicio('https://g3.test/api/integraciones', 'k1');

    const resultado = await service.consultarOrdenes({
      idTecnico: 45,
      idEmpresa: 1,
      fecha: '2026-09-26',
    });

    expect(resultado).toEqual({ ok: true, data: [{ id_ot: 1 }] });
    const urlLlamada = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(urlLlamada).toContain('/ordenes?');
    expect(urlLlamada).toContain('id_empresa=1');
    expect(urlLlamada).toContain('id_tecnico=45');
    expect(urlLlamada).toContain('estado=PENDIENTE%2CEN_CURSO');
    expect(urlLlamada).toContain('desde=2026-09-26');
    expect(urlLlamada).toContain('hasta=2026-09-26');
  });

  it('si G3 no responde, consultarOrdenes devuelve ok:false', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout')) as never;
    const service = crearServicio('https://g3.test/api/integraciones', 'k1');

    await expect(
      service.consultarOrdenes({
        idTecnico: 45,
        idEmpresa: 1,
        fecha: '2026-09-26',
      }),
    ).resolves.toEqual({ ok: false, data: null });
  });

  it('buscarClientes valida longitud mínima y consulta con query param', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id_cliente: 10, rut: '12345678-9', nombre_completo: 'Juan Perez' },
        ],
      }),
    }) as never;
    const service = crearServicio('https://g3.test/api/integraciones', 'k1');

    // Menos de 3 caracteres retorna vacío sin llamar
    const corto = await service.buscarClientes('ju', 1);
    expect(corto).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();

    // Con 3 o más caracteres consulta a G3
    const resultado = await service.buscarClientes('juan', 1);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].nombre_completo).toBe('Juan Perez');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/clientes?busqueda=juan&id_empresa=1'),
      expect.anything(),
    );
  });

  it('consultarOrdenesCerradas consulta estado CERRADA y normaliza materiales', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id_ot: 101,
            tipo_ot: 'INSTALACION',
            id_tecnico: 5,
            id_empresa: 1,
            materiales: [
              { id_tipo_equipo: 2, nombre: 'Conector SC/APC', cantidad: 4 },
            ],
          },
        ],
      }),
    }) as never;
    const service = crearServicio('https://g3.test/api/integraciones', 'k1');

    const ordenes = await service.consultarOrdenesCerradas({
      id_tecnico: 5,
      fecha_desde: '2026-09-01',
      fecha_hasta: '2026-09-15',
      id_empresa: 1,
    });

    expect(ordenes).toHaveLength(1);
    expect(ordenes[0].id_ot).toBe(101);
    expect(ordenes[0].id_tecnico).toBe(5);
    expect(ordenes[0].materiales).toHaveLength(1);
    expect(ordenes[0].materiales[0].cantidad).toBe(4);

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(callUrl).toContain('estado=CERRADA');
    expect(callUrl).toContain('id_tecnico=5');
    expect(callUrl).toContain('fecha_desde=2026-09-01');
    expect(callUrl).toContain('fecha_hasta=2026-09-15');
  });
});
