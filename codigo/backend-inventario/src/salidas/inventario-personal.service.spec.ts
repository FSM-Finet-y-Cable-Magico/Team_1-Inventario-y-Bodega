import { InventarioPersonalService } from './inventario-personal.service';
import { InventarioPersonal } from './entities/inventario-personal.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';

// CU-68: verificación de saldo de consumibles en cierre. Los métodos de saldo
// usan el EntityManager de la transacción del llamador; aquí se prueba contra un
// manager en memoria con el mismo store que usaría la transacción real.
type Fila = Record<string, any>;

class FakeManager {
  store: Record<string, Fila[]> = {};

  constructor(seed: Record<string, Fila[]> = {}) {
    this.store = seed;
  }

  tabla(entity: any): Fila[] {
    const nombre = typeof entity === 'string' ? entity : entity.name;
    if (!this.store[nombre]) this.store[nombre] = [];
    return this.store[nombre];
  }

  async findOne(entity: any, opciones: any = {}): Promise<Fila | null> {
    const where = opciones.where ?? {};
    const fila = this.tabla(entity).find((f) =>
      Object.entries(where).every(([campo, valor]) => f[campo] === valor),
    );
    return fila ?? null;
  }

  async save(entity: any, datos?: Fila): Promise<Fila> {
    const esClase = typeof entity === 'function';
    const clase = esClase ? entity : entity.constructor;
    const fila = esClase ? { ...(datos ?? {}) } : { ...entity };
    const tabla = this.tabla(clase);
    const idx = tabla.findIndex(
      (f) =>
        f.id_tecnico === fila.id_tecnico &&
        f.id_tipo_equipo === fila.id_tipo_equipo,
    );
    if (idx >= 0) tabla[idx] = fila;
    else tabla.push(fila);
    return fila;
  }
}

const TIPOS: Fila[] = [
  {
    id_tipo_equipo: 7,
    id_empresa: 1,
    nombre: 'Cable UTP Cat6',
    unidadMedida: 'Metro',
  },
  {
    id_tipo_equipo: 8,
    id_empresa: 1,
    nombre: 'Conector SC',
    unidadMedida: 'Unidad',
  },
];

function crearManager(saldos: Record<number, number> = {}) {
  const inventario = Object.entries(saldos).map(
    ([idTipo, cantidad], index) => ({
      id_inventario: index + 1,
      id_tecnico: 45,
      id_tipo_equipo: Number(idTipo),
      cantidad: String(cantidad),
    }),
  );
  return new FakeManager({
    InventarioPersonal: inventario,
    TipoEquipo: TIPOS.map((t) => ({ ...t })),
  });
}

function crearServicio(manager: FakeManager) {
  return new InventarioPersonalService({} as never, {} as never);
}

describe('InventarioPersonalService — CU-68 (validación de saldo en cierre)', () => {
  it('sin insuficientes: validarSaldo no lanza (saldo == declarado incluido)', async () => {
    const manager = crearManager({ 7: 10, 8: 3 });
    const service = crearServicio(manager);

    await expect(
      service.validarSaldo(manager as never, 45, [
        { id_tipo_equipo: 7, cantidad: 10 },
        { id_tipo_equipo: 8, cantidad: 1 },
      ]),
    ).resolves.toBeUndefined();
  });

  it('saldo insuficiente: mensaje exacto de la Excepción 1', async () => {
    const manager = crearManager({ 7: 4 });
    const service = crearServicio(manager);

    await expect(
      service.validarSaldo(manager as never, 45, [
        { id_tipo_equipo: 7, cantidad: 10 },
      ]),
    ).rejects.toThrow(
      'Saldo insuficiente de [Cable UTP Cat6]: disponible 4 Metro, declarado 10 Metro.',
    );
  });

  it('múltiples insuficientes: reporta todos', async () => {
    const manager = crearManager({ 7: 4, 8: 1 });
    const service = crearServicio(manager);

    const insuficientes = await service.detectarInsuficientes(
      manager as never,
      45,
      [
        { id_tipo_equipo: 7, cantidad: 10 },
        { id_tipo_equipo: 8, cantidad: 2 },
      ],
    );

    expect(insuficientes).toHaveLength(2);
    expect(insuficientes[0].mensaje).toContain('Cable UTP Cat6');
    expect(insuficientes[1].mensaje).toContain('Conector SC');
  });

  it('sin fila de inventario el saldo es 0', async () => {
    const manager = crearManager({});
    const service = crearServicio(manager);

    await expect(
      service.saldoDisponible(manager as never, 45, 7),
    ).resolves.toBe(0);
  });

  it('descontarHasta descuenta solo lo disponible y devuelve el faltante', async () => {
    const manager = crearManager({ 7: 4 });
    const service = crearServicio(manager);

    const resultado = await service.descontarHasta(manager as never, 45, 7, 10);

    expect(resultado).toEqual({ saldoAnterior: 4, descontado: 4, faltante: 6 });
    expect(Number(manager.tabla(InventarioPersonal)[0].cantidad)).toBe(0);
  });

  it('descontarHasta con saldo suficiente descuenta todo', async () => {
    const manager = crearManager({ 7: 25 });
    const service = crearServicio(manager);

    const resultado = await service.descontarHasta(manager as never, 45, 7, 10);

    expect(resultado).toEqual({
      saldoAnterior: 25,
      descontado: 10,
      faltante: 0,
    });
    expect(Number(manager.tabla(InventarioPersonal)[0].cantidad)).toBe(15);
  });
});
