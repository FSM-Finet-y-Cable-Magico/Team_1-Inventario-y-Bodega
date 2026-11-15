import { FindOperator } from 'typeorm';
import { TransferenciasService } from './transferencias.service';

// CU-23: el listado y el detalle toman el estado solo de los movimientos TRANSFERENCIA_*.
// referencia_id también lo usan órdenes de ingreso, salidas y préstamos con su propio
// número, así que un movimiento de otro módulo con el mismo id no debe mezclarse.
type Doble = Record<string, jest.Mock>;

const SUPER = { id_usuario: 1, id_empresa: 1, roles: ['SUPERUSUARIO'] };

const MOVIMIENTOS = [
  // Transferencia #2: una unidad pendiente de aprobación
  {
    referencia_id: 2,
    tipo_movimiento: 'TRANSFERENCIA_PENDIENTE',
    id_unidad: 30,
    id_bodega_origen: 1,
    id_bodega_destino: 2,
  },
  // Movimientos de otros módulos que comparten referencia_id = 2
  {
    referencia_id: 2,
    tipo_movimiento: 'INGRESO_RECEPCION',
    id_unidad: null,
    id_bodega_origen: null,
    id_bodega_destino: 1,
  },
  {
    referencia_id: 2,
    tipo_movimiento: 'SALIDA_A_TECNICO',
    id_unidad: 12,
    id_bodega_origen: 1,
    id_bodega_destino: null,
  },
  {
    referencia_id: 2,
    tipo_movimiento: 'PRESTAMO_EXTERNO',
    id_unidad: 15,
    id_bodega_origen: 1,
    id_bodega_destino: null,
  },
];

// Doble del repositorio que aplica el filtro `where` como lo haría TypeORM.
function filtrar(where: Record<string, unknown>) {
  return MOVIMIENTOS.filter((m) =>
    Object.entries(where).every(([campo, valor]) => {
      const actual = (m as Record<string, unknown>)[campo];
      if (valor instanceof FindOperator) {
        return (valor.value as unknown[]).includes(actual);
      }
      return actual === valor;
    }),
  );
}

function crearServicio() {
  const transferencia = {
    id_transferencia: 2,
    id_empresa_origen: 1,
    id_empresa_destino: 2,
    id_usuario_registro: 2,
    fecha_transferencia: '2026-11-15',
    observaciones: 'Préstamo de router',
  };
  const query = {
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([transferencia]),
  };
  const transferenciaRepository: Doble = {
    createQueryBuilder: jest.fn(() => query),
    findOne: jest.fn().mockResolvedValue(transferencia),
  };
  const movimientoRepository: Doble = {
    find: jest.fn(({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(filtrar(where)),
    ),
  };
  const unidadRepository: Doble = {
    find: jest.fn(
      ({ where }: { where: { id_unidad: FindOperator<number[]> } }) => {
        const ids = where.id_unidad.value;
        return Promise.resolve(
          ids.map((id) => ({
            id_unidad: id,
            serialNumber: `SERIE-${id}`,
            estado: 'En bodega',
            tipoEquipo: { nombre: 'Router' },
          })),
        );
      },
    ),
  };
  const repoGenerico: Doble = {
    findBy: jest
      .fn()
      .mockResolvedValue([{ id_usuario: 2, nombre_usuario: 'admin_finet' }]),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest
      .fn()
      .mockResolvedValue({ id_usuario: 2, nombre_usuario: 'admin_finet' }),
  };
  const dataSource = { getRepository: jest.fn(() => repoGenerico) };
  const servicio = new TransferenciasService(
    transferenciaRepository as never,
    movimientoRepository as never,
    unidadRepository as never,
    { create: jest.fn() } as never,
    dataSource as never,
  );
  return { servicio, movimientoRepository };
}

interface FilaListado {
  id_transferencia: number;
  estado: string;
  unidades: number;
}
interface Detalle {
  estado: string;
  unidades: { id_unidad: number }[];
}

describe('TransferenciasService · CU-23 estado desde movimientos TRANSFERENCIA_*', () => {
  it('el listado muestra el estado y la cantidad de la transferencia, sin movimientos de otros módulos', async () => {
    const { servicio } = crearServicio();
    const lista = (await servicio.consultarTransferencias(
      {},
      SUPER,
    )) as FilaListado[];
    expect(lista).toHaveLength(1);
    expect(lista[0].estado).toBe('TRANSFERENCIA_PENDIENTE');
    expect(lista[0].unidades).toBe(1);
  });

  it('el filtro por estado PENDIENTE encuentra la transferencia', async () => {
    const { servicio } = crearServicio();
    const lista = (await servicio.consultarTransferencias(
      { estado: 'PENDIENTE' },
      SUPER,
    )) as FilaListado[];
    expect(lista.map((t) => t.id_transferencia)).toEqual([2]);
  });

  it('el detalle lista solo las unidades de la transferencia', async () => {
    const { servicio } = crearServicio();
    const detalle = (await servicio.consultarDetalle(2, SUPER)) as Detalle;
    expect(detalle.estado).toBe('TRANSFERENCIA_PENDIENTE');
    expect(detalle.unidades.map((u) => u.id_unidad)).toEqual([30]);
  });
});
