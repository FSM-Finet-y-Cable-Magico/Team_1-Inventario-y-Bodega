import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { MovimientoInventario } from '../transferencias/entities/movimiento-inventario.entity';
import { TomaInventarioDetalle } from './entities/toma-inventario-detalle.entity';
import { TomaInventario } from './entities/toma-inventario.entity';
import {
  ActorToma,
  TIPO_MOVIMIENTO_AJUSTE,
  TomasInventarioService,
} from './tomas-inventario.service';

// CU-97: reglas de la toma con una base en memoria mínima para el EntityManager.
const ACTOR: ActorToma = {
  id_usuario: 7,
  id_empresa: 1,
  roles: ['ADMIN_BODEGA'],
};

type Estado = {
  toma: Partial<TomaInventario> | null;
  detalles: Partial<TomaInventarioDetalle>[];
  stock: Partial<StockConsumible>[];
  unidades: Partial<UnidadEquipo>[];
  bodega: Partial<Bodega> | null;
  serieEncontrada: Partial<UnidadEquipo> | null;
};

function crear(parcial: Partial<Estado> = {}) {
  const estado: Estado = {
    toma: { id_toma: 1, id_bodega: 3, id_empresa: 1, estado: 'ABIERTA' },
    detalles: [],
    stock: [],
    unidades: [],
    bodega: { id_bodega: 3, id_empresa: 1, activa: true, nombre: 'Central' },
    serieEncontrada: null,
    ...parcial,
  };
  const guardados: unknown[] = [];
  const manager = {
    findOne: jest.fn(
      (entidad: unknown, opts: { where: Record<string, unknown> }) => {
        if (entidad === TomaInventario) {
          if (opts.where.estado)
            return Promise.resolve(
              estado.toma?.estado === opts.where.estado ? estado.toma : null,
            );
          return Promise.resolve(estado.toma);
        }
        if (entidad === Bodega) return Promise.resolve(estado.bodega);
        if (entidad === StockConsumible) {
          return Promise.resolve(
            estado.stock.find(
              (s) => s.id_tipo_equipo === opts.where.id_tipo_equipo,
            ) ?? null,
          );
        }
        return Promise.resolve(null);
      },
    ),
    find: jest.fn((entidad: unknown) => {
      if (entidad === TomaInventarioDetalle)
        return Promise.resolve(estado.detalles);
      if (entidad === StockConsumible) return Promise.resolve(estado.stock);
      if (entidad === UnidadEquipo) return Promise.resolve(estado.unidades);
      if (entidad === TipoEquipo) return Promise.resolve([]);
      return Promise.resolve([]);
    }),
    create: jest.fn((entidad: unknown, datos: object) => ({
      __entidad: entidad,
      ...datos,
    })),
    save: jest.fn((a: unknown, b?: unknown) => {
      guardados.push(b ?? a);
      return Promise.resolve(b ?? a);
    }),
    remove: jest.fn(() => Promise.resolve()),
    createQueryBuilder: jest.fn(() => {
      const qb = {
        where: () => qb,
        andWhere: () => qb,
        getOne: () => Promise.resolve(estado.serieEncontrada),
      };
      return qb;
    }),
  };
  const dataSource = {
    manager,
    transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)),
  };
  const auditoria = { create: jest.fn().mockResolvedValue(undefined) };
  const service = new TomasInventarioService(
    dataSource as never,
    auditoria as never,
  );
  return { service, manager, auditoria, guardados, estado };
}

const consumible = (cantidadEsperada: number, contada: number | null) => ({
  id_detalle: 10,
  id_toma: 1,
  id_tipo_equipo: 2,
  id_unidad: null,
  numero_serie: null,
  es_esperada: true,
  cantidad_esperada: cantidadEsperada,
  cantidad_contada: contada,
  resultado: null,
});

const serie = (numero: string, contada: number | null) => ({
  id_detalle: 20,
  id_toma: 1,
  id_tipo_equipo: 1,
  id_unidad: 5,
  numero_serie: numero,
  es_esperada: true,
  cantidad_esperada: 1,
  cantidad_contada: contada,
  resultado: null,
});

describe('TomasInventarioService (CU-97)', () => {
  describe('abrir', () => {
    it('E1: rechaza una segunda toma abierta en la bodega', async () => {
      const { service } = crear();
      await expect(service.abrir(3, ACTOR)).rejects.toThrow(ConflictException);
    });

    it('rechaza una bodega inactiva', async () => {
      const { service } = crear({
        bodega: { id_bodega: 3, id_empresa: 1, activa: false },
      });
      await expect(service.abrir(3, ACTOR)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('oculta la bodega de otra empresa', async () => {
      const { service } = crear({
        bodega: { id_bodega: 3, id_empresa: 2, activa: true },
      });
      await expect(service.abrir(3, ACTOR)).rejects.toThrow(NotFoundException);
    });
  });

  describe('registrarConteo', () => {
    it('rechaza series repetidas sin importar mayúsculas', async () => {
      const { service } = crear();
      await expect(
        service.registrarConteo(1, { series: ['abc', 'ABC'] }, ACTOR),
      ).rejects.toThrow('repetida');
    });

    it('rechaza una toma ya confirmada', async () => {
      const { service } = crear({
        toma: { id_toma: 1, id_bodega: 3, id_empresa: 1, estado: 'CONFIRMADA' },
      });
      await expect(
        service.registrarConteo(1, { series: [] }, ACTOR),
      ).rejects.toThrow(ConflictException);
    });

    it('oculta la toma de otra empresa', async () => {
      const { service } = crear({
        toma: { id_toma: 1, id_bodega: 3, id_empresa: 2, estado: 'ABIERTA' },
      });
      await expect(service.obtener(1, ACTOR)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('E2: registra como OTRA_UBICACION una serie de otra bodega', async () => {
      const { service, guardados } = crear({
        serieEncontrada: {
          id_unidad: 9,
          id_tipo_equipo: 1,
          serialNumber: 'SN-9',
        },
      });
      await service.registrarConteo(1, { series: ['sn-9'] }, ACTOR);
      expect(guardados).toContainEqual(
        expect.objectContaining({
          numero_serie: 'SN-9',
          es_esperada: false,
          resultado: 'OTRA_UBICACION',
        }),
      );
    });

    it('E2: registra como NO_REGISTRADA una serie desconocida', async () => {
      const { service, guardados } = crear();
      await service.registrarConteo(1, { series: ['NADA'] }, ACTOR);
      expect(guardados).toContainEqual(
        expect.objectContaining({
          numero_serie: 'NADA',
          resultado: 'NO_REGISTRADA',
        }),
      );
    });
  });

  describe('confirmar', () => {
    it('exige contar todos los consumibles', async () => {
      const { service } = crear({ detalles: [consumible(5, null)] });
      await expect(service.confirmar(1, false, ACTOR)).rejects.toThrow(
        'Faltan 1',
      );
    });

    it('ajusta el stock y deja el movimiento y la auditoría', async () => {
      const stock = { id_tipo_equipo: 2, cantidad_disponible: 10 };
      const { service, guardados, auditoria } = crear({
        detalles: [consumible(10, 8)],
        stock: [stock],
      });
      await service.confirmar(1, false, ACTOR);
      expect(stock.cantidad_disponible).toBe(8);
      expect(guardados).toContainEqual(
        expect.objectContaining({
          __entidad: MovimientoInventario,
          tipo_movimiento: TIPO_MOVIMIENTO_AJUSTE,
          cantidad: 2,
          id_bodega_origen: 3,
          referencia_id: 1,
        }),
      );
      expect(auditoria.create).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'CONFIRMAR_TOMA_INVENTARIO' }),
      );
    });

    it('no crea movimiento cuando no hay diferencia', async () => {
      const stock = { id_tipo_equipo: 2, cantidad_disponible: 10 };
      const { service, guardados } = crear({
        detalles: [consumible(10, 10)],
        stock: [stock],
      });
      await service.confirmar(1, false, ACTOR);
      expect(guardados).not.toContainEqual(
        expect.objectContaining({ __entidad: MovimientoInventario }),
      );
    });

    it('crea la fila de stock si aparece un consumible sin stock previo', async () => {
      const { service, guardados } = crear({ detalles: [consumible(0, 4)] });
      await service.confirmar(1, false, ACTOR);
      expect(guardados).toContainEqual(
        expect.objectContaining({
          __entidad: StockConsumible,
          cantidad_disponible: 4,
        }),
      );
    });

    it('E3: avisa si el stock cambió durante el conteo', async () => {
      const stock = { id_tipo_equipo: 2, cantidad_disponible: 7 };
      const { service } = crear({
        detalles: [consumible(10, 8)],
        stock: [stock],
      });
      await expect(service.confirmar(1, false, ACTOR)).rejects.toThrow(
        ConflictException,
      );
      expect(stock.cantidad_disponible).toBe(7);
    });

    it('E3: al forzar aplica la diferencia sobre el stock actual', async () => {
      const stock = { id_tipo_equipo: 2, cantidad_disponible: 7 };
      const { service } = crear({
        detalles: [consumible(10, 8)],
        stock: [stock],
      });
      await service.confirmar(1, true, ACTOR);
      expect(stock.cantidad_disponible).toBe(5);
    });

    it('no deja stock negativo', async () => {
      const stock = { id_tipo_equipo: 2, cantidad_disponible: 1 };
      const { service } = crear({
        detalles: [consumible(10, 8)],
        stock: [stock],
      });
      await expect(service.confirmar(1, true, ACTOR)).rejects.toThrow(
        'stock negativo',
      );
      expect(stock.cantidad_disponible).toBe(1);
    });

    it('una serie faltante se informa y la unidad no cambia de estado', async () => {
      const unidad = {
        id_unidad: 5,
        serialNumber: 'SN-5',
        estado: 'En bodega',
        id_bodega_actual: 3,
      };
      const detalle = serie('SN-5', 0);
      const { service, guardados } = crear({
        detalles: [detalle],
        unidades: [unidad],
      });
      await service.confirmar(1, false, ACTOR);
      expect(detalle.resultado).toBe('FALTANTE');
      expect(unidad.estado).toBe('En bodega');
      expect(guardados).not.toContain(unidad);
    });
  });

  it('cancelar cierra la toma sin tocar el stock', async () => {
    const { service, estado, auditoria } = crear();
    await service.cancelar(1, ACTOR);
    expect(estado.toma?.estado).toBe('CANCELADA');
    expect(auditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'CANCELAR_TOMA_INVENTARIO' }),
    );
  });
});
