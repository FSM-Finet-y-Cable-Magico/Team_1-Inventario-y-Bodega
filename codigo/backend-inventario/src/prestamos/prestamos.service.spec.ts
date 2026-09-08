import {
  PrestamosService,
  ActorJwt,
  PRESTAMO_ACTIVO,
} from './prestamos.service';

// CU-84: trazabilidad de la devolución. Los casos de prueba del caso de uso se
// validan ANTES de abrir la transacción, así que basta con dobles de los
// repositorios: si alguna validación falla, el DataSource no debe usarse.
type Doble = Record<string, jest.Mock>;

const ADMIN: ActorJwt = { id_usuario: 1, id_empresa: 1, roles: ['ADMIN'] };

const PRESTAMO = {
  id_prestamo: 10,
  correlativo: 'PE-00010',
  estado: PRESTAMO_ACTIVO,
  id_empresa: 1,
  id_bodega_origen: 1,
};

// Un equipo en préstamo (detalle 1) y un consumible de 10 unidades (detalle 2)
const DETALLES = [
  {
    id_detalle: 1,
    id_prestamo: 10,
    id_unidad: 5,
    id_tipo_equipo: 1,
    cantidad: null,
    cantidad_retornada: 0,
  },
  {
    id_detalle: 2,
    id_prestamo: 10,
    id_unidad: null,
    id_tipo_equipo: 2,
    cantidad: 10,
    cantidad_retornada: 0,
  },
];

function crearServicio(
  overrides: { detalles?: unknown[]; unidad?: Record<string, unknown> } = {},
) {
  const detalles = overrides.detalles ?? DETALLES;
  const unidad = overrides.unidad ?? {
    id_unidad: 5,
    serialNumber: 'SN-0005',
    estado: 'En préstamo externo',
  };

  const prestamoRepository: Doble = {
    findOne: jest.fn().mockResolvedValue(PRESTAMO),
  };
  const detalleRepository: Doble = {
    findBy: jest.fn().mockResolvedValue(detalles),
  };
  const retornoRepository: Doble = { findBy: jest.fn().mockResolvedValue([]) };
  const unidadRepository: Doble = {
    find: jest.fn().mockResolvedValue([unidad]),
  };
  const tipoRepository: Doble = {
    findBy: jest
      .fn()
      .mockResolvedValue([{ id_tipo_equipo: 2, nombre: 'Cable UTP Cat6' }]),
  };
  const dataSource: Doble = { createQueryRunner: jest.fn() };

  const service = new PrestamosService(
    prestamoRepository as never,
    detalleRepository as never,
    retornoRepository as never,
    unidadRepository as never,
    {} as never,
    {} as never,
    tipoRepository as never,
    {} as never,
    {} as never,
    dataSource as never,
  );
  return { service, dataSource };
}

const FECHA_VALIDA = new Date(Date.now() - 86400000).toLocaleDateString(
  'en-CA',
);

describe('PrestamosService — trazabilidad del retorno (CU-84)', () => {
  it('(A) rechaza un NS que no pertenece al préstamo', async () => {
    const { service, dataSource } = crearServicio();

    await expect(
      service.registrarRetorno(
        10,
        { fecha_retorno: FECHA_VALIDA, items: [{ numero_serie: 'SN-OTRO' }] },
        ADMIN,
      ),
    ).rejects.toThrow(
      'El equipo [SN-OTRO] no pertenece al préstamo [PE-00010].',
    );
    // nada se procesa: la transacción ni siquiera se abre
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('(B) rechaza un NS que ya fue retornado', async () => {
    const { service } = crearServicio({
      detalles: [{ ...DETALLES[0], cantidad_retornada: 1 }, DETALLES[1]],
    });

    await expect(
      service.registrarRetorno(
        10,
        { fecha_retorno: FECHA_VALIDA, items: [{ numero_serie: 'SN-0005' }] },
        ADMIN,
      ),
    ).rejects.toThrow(
      'El equipo [SN-0005] ya fue retornado o no está en préstamo externo.',
    );
  });

  it('(B) rechaza un NS que ya no está en préstamo externo', async () => {
    const { service } = crearServicio({
      unidad: { id_unidad: 5, serialNumber: 'SN-0005', estado: 'En bodega' },
    });

    await expect(
      service.registrarRetorno(
        10,
        { fecha_retorno: FECHA_VALIDA, items: [{ numero_serie: 'SN-0005' }] },
        ADMIN,
      ),
    ).rejects.toThrow(
      'El equipo [SN-0005] ya fue retornado o no está en préstamo externo.',
    );
  });

  it('(C) rechaza una cantidad mayor a la prestada', async () => {
    const { service } = crearServicio();

    await expect(
      service.registrarRetorno(
        10,
        {
          fecha_retorno: FECHA_VALIDA,
          items: [{ id_detalle: 2, cantidad: 15 }],
        },
        ADMIN,
      ),
    ).rejects.toThrow(
      'La cantidad retornada supera la cantidad prestada del ítem [Cable UTP Cat6].',
    );
  });

  it('(C) suma lo ya retornado y lo pedido en el mismo envío', async () => {
    const { service } = crearServicio({
      detalles: [DETALLES[0], { ...DETALLES[1], cantidad_retornada: 4 }],
    });

    // 4 previos + 3 + 4 = 11 > 10 prestados
    await expect(
      service.registrarRetorno(
        10,
        {
          fecha_retorno: FECHA_VALIDA,
          items: [
            { id_detalle: 2, cantidad: 3 },
            { id_detalle: 2, cantidad: 4 },
          ],
        },
        ADMIN,
      ),
    ).rejects.toThrow(
      'La cantidad retornada supera la cantidad prestada del ítem [Cable UTP Cat6].',
    );
  });

  it('acumula un error por cada ítem inválido y no procesa nada', async () => {
    const { service, dataSource } = crearServicio();

    await expect(
      service.registrarRetorno(
        10,
        {
          fecha_retorno: FECHA_VALIDA,
          items: [{ numero_serie: 'SN-OTRO' }, { id_detalle: 2, cantidad: 99 }],
        },
        ADMIN,
      ),
    ).rejects.toThrow(
      'El equipo [SN-OTRO] no pertenece al préstamo [PE-00010]. La cantidad retornada supera la cantidad prestada del ítem [Cable UTP Cat6].',
    );
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('Excepción 1 de CU-82: no admite fecha futura', async () => {
    const { service, dataSource } = crearServicio();
    const manana = new Date(Date.now() + 86400000).toLocaleDateString('en-CA');

    await expect(
      service.registrarRetorno(
        10,
        { fecha_retorno: manana, items: [{ id_detalle: 1 }] },
        ADMIN,
      ),
    ).rejects.toThrow('La fecha de retorno no puede ser futura.');
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });
});
