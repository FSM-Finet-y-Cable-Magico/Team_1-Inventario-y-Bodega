import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { IntegracionesService } from './integraciones.service';
import { IntegracionActivacion } from './entities/integracion-activacion.entity';
import { IntegracionCierre } from './entities/cierre-integracion.entity';
import { AsignacionEquipoServicio } from './entities/asignacion-equipo-servicio.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { InventarioPersonal } from '../salidas/entities/inventario-personal.entity';
import { InventarioPersonalService } from '../salidas/inventario-personal.service';
import { CierreReparacion } from './entities/cierre-reparacion.entity';
import { BorradorCierre } from './entities/borrador-cierre.entity';
import { CierresTrabajoService } from './cierres-trabajo.service';
import { IntegracionContexto } from './guards/api-key.guard';

// sc-158: pruebas del acuerdo G8. El service trabaja dentro de una transacción,
// así que se usa un EntityManager en memoria que comparte el mismo "store" que
// los repositorios inyectados (así la idempotencia y el commit son observables).
type Fila = Record<string, any>;

const PK: Record<string, string> = {
  IntegracionCierre: 'id_cierre',
  IntegracionActivacion: 'id_activacion',
  AsignacionEquipoServicio: 'id_asignacion',
  UnidadEquipo: 'id_unidad',
  HistorialEstado: 'id_historial',
  InventarioPersonal: 'id_inventario',
  TipoEquipo: 'id_tipo_equipo',
  StockConsumible: 'id_stock',
  CierreReparacion: 'id_cierre_reparacion',
  BorradorCierre: 'id_borrador',
};

class FakeManager {
  store: Record<string, Fila[]> = {};
  private seq = 1000;
  onSave: ((clase: string, fila: Fila) => void) | null = null;

  constructor(seed: Record<string, Fila[]> = {}) {
    this.store = seed;
  }

  tabla(entity: any): Fila[] {
    const nombre = typeof entity === 'string' ? entity : entity.name;
    if (!this.store[nombre]) this.store[nombre] = [];
    return this.store[nombre];
  }

  create(entity: any, datos: Fila): Fila {
    // Instancia real (no un objeto plano) para que save() reconozca la clase
    // cuando se llama con un solo argumento, igual que TypeORM.
    const instancia = Object.create(entity?.prototype ?? Object.prototype);
    Object.assign(instancia, datos);
    return instancia;
  }

  async save(entity: any, datos?: Fila): Promise<Fila> {
    const esClase = typeof entity === 'function';
    const clase = esClase ? entity : entity.constructor;
    if (this.onSave) this.onSave(clase.name, datos ?? entity);
    const fila = esClase ? { ...(datos ?? {}) } : { ...entity };
    const tabla = this.tabla(clase);
    const pk = PK[clase.name] ?? 'id';
    if (fila[pk] === undefined) fila[pk] = this.seq++;
    const idx = tabla.findIndex((f) => f[pk] === fila[pk]);
    if (idx >= 0) tabla[idx] = fila;
    else tabla.push(fila);
    return fila;
  }

  // CU-64 (D): upsert de la secuencia SRV por empresa/año.
  async query(sql: string, params?: any[]): Promise<any[]> {
    if (/secuencia_srv/i.test(sql)) {
      const [idEmpresa, anio] = params ?? [];
      const filas = this.tabla('secuencia_srv');
      let fila = filas.find(
        (f) => f.id_empresa === idEmpresa && f.anio === anio,
      );
      if (!fila) {
        fila = { id_empresa: idEmpresa, anio, ultimo: 0 };
        filas.push(fila);
      }
      fila.ultimo += 1;
      return [{ ultimo: fila.ultimo }];
    }
    return [];
  }

  private coincide(fila: Fila, where: Record<string, any>): boolean {
    return Object.entries(where).every(([campo, valor]) => {
      // Soporte mínimo de operadores TypeORM usados por el service.
      if (valor && typeof valor === 'object' && valor._type === 'not') {
        const interno = valor._value;
        if (interno && typeof interno === 'object' && interno._type === 'isNull') {
          return fila[campo] !== null && fila[campo] !== undefined;
        }
      }
      if (valor && typeof valor === 'object' && valor._type === 'in') {
        const lista = Array.isArray(valor._value) ? valor._value : [];
        return lista.includes(fila[campo]);
      }
      return fila[campo] === valor;
    });
  }

  private ordenar(filas: Fila[], order?: Record<string, 'ASC' | 'DESC'>): Fila[] {
    if (!order) return filas;
    const criterios = Object.entries(order);
    return [...filas].sort((a, b) => {
      for (const [campo, direccion] of criterios) {
        if (a[campo] === b[campo]) continue;
        const comparacion = a[campo] > b[campo] ? 1 : -1;
        return direccion === 'DESC' ? -comparacion : comparacion;
      }
      return 0;
    });
  }

  async find(entity: any, opciones: any = {}): Promise<Fila[]> {
    const filas = this.tabla(entity).filter((f) => this.coincide(f, opciones.where ?? {}));
    return this.ordenar(filas, opciones.order);
  }

  async findOne(entity: any, opciones: any = {}): Promise<Fila | null> {
    const filas = await this.find(entity, opciones);
    return filas[0] ?? null;
  }

  async update(entity: any, criterios: Fila, cambios: Fila): Promise<void> {
    for (const fila of this.tabla(entity)) {
      if (this.coincide(fila, criterios)) Object.assign(fila, cambios);
    }
  }
}

function crearServicio(
  seed: Record<string, Fila[]> = {},
  inventarioPersonalService?: unknown,
) {
  const manager = new FakeManager(seed);
  const queryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager,
  };
  const dataSource = { createQueryRunner: jest.fn().mockReturnValue(queryRunner) };
  const cierreRepository = {
    findOne: jest.fn((opciones: any) => manager.findOne(IntegracionCierre, opciones)),
  };
  const activacionRepository = {
    findOne: jest.fn((opciones: any) => manager.findOne(IntegracionActivacion, opciones)),
  };
  const asignacionRepository = {
    findOne: jest.fn((opciones: any) => manager.findOne(AsignacionEquipoServicio, opciones)),
    find: jest.fn((opciones: any) => manager.find(AsignacionEquipoServicio, opciones)),
  };
  const unitRepository = {
    findOne: jest.fn((opciones: any) => manager.findOne(UnidadEquipo, opciones)),
    find: jest.fn((opciones: any) => manager.find(UnidadEquipo, opciones)),
  };
  const tipoRepository = {
    find: jest.fn((opciones: any) => manager.find(TipoEquipo, opciones)),
  };
  const stockRepository = {
    find: jest.fn((opciones: any) => manager.find(StockConsumible, opciones)),
  };
  // CU-69: cierres de reparación registrados junto al cierre de OT.
  const reparacionRepository = {
    findOne: jest.fn((opciones: any) => manager.findOne(CierreReparacion, opciones)),
  };
  const auditoriaService = { create: jest.fn() };
  // CU-70: el cierre consulta el borrador del técnico (catálogo T-01..T-10).
  const cierresTrabajoService = new CierresTrabajoService(
    { findOne: jest.fn((opciones: any) => manager.findOne(BorradorCierre, opciones)) } as never,
    auditoriaService as never,
  );
  const catalogService = { consultar: jest.fn().mockResolvedValue([]) };
  // CU-64/CU-68: se usa el servicio real de inventario personal contra el
  // FakeManager (sus métodos de descuento no tocan los repositorios inyectados).
  const inventario =
    inventarioPersonalService ??
    new InventarioPersonalService({} as never, {} as never);

  const service = new IntegracionesService(
    cierreRepository as never,
    activacionRepository as never,
    asignacionRepository as never,
    reparacionRepository as never,
    auditoriaService as never,
    cierresTrabajoService,
    unitRepository as never,
    tipoRepository as never,
    stockRepository as never,
    catalogService as never,
    inventario as never,
    dataSource as never,
  );
  return {
    service,
    manager,
    queryRunner,
    catalogService,
    activacionRepository,
    auditoriaService,
  };
}

const G8: IntegracionContexto = { grupo: 'G8', empresas: [1] };

const UNIDAD_INSTALADA: Fila = {
  id_unidad: 501,
  serialNumber: 'ONT-123456',
  id_empresa: 1,
  estado: 'Instalado en cliente',
  id_tipo_equipo: 3,
  id_bodega_actual: null,
  fechaAdquisicion: '2026-01-01',
  fechaVencGarantia: '2027-01-01',
  macAddress: 'AA:BB:CC:DD:EE:FF',
  tipoEquipo: {
    nombre: 'ONT Huawei',
    categoria: 'ONT/ONU',
    marca: 'Huawei',
    modelo: 'HG8145',
  },
};

function payloadActivacion(overrides: Fila = {}) {
  return {
    event_id: 'client-activation-ot-781',
    trace_id: 'contract-92',
    id_empresa: 1,
    id_ot: 781,
    id_cliente: 130,
    rut_cliente: '12345678-9',
    id_servicio: 245,
    id_contrato: 92,
    equipos: [{ numero_serie: 'ONT-123456' }],
    ...overrides,
  };
}

describe('IntegracionesService — sc-158 (acuerdo G8 P0)', () => {
  describe('scope por empresa', () => {
    it('rechaza una empresa fuera del scope de la API key (403)', () => {
      const { service } = crearServicio();
      expect(() => service.validarScope(G8, 2)).toThrow(ForbiddenException);
    });

    it('exige id_empresa numérico (400)', () => {
      const { service } = crearServicio();
      expect(() => service.validarScope(G8, Number(undefined))).toThrow(BadRequestException);
    });
  });

  describe('GET /integraciones/unidades/{serie}', () => {
    it('404 genérico cuando la serie no existe en la empresa', async () => {
      const { service } = crearServicio({ UnidadEquipo: [] });
      await expect(service.consultarUnidadPorSerie('NO-EXISTE', 1)).rejects.toThrow(
        'Número de serie no encontrado.',
      );
    });

    it('amplía la respuesta con tipo, garantía y asignación actual', async () => {
      const { service } = crearServicio({
        UnidadEquipo: [{ ...UNIDAD_INSTALADA }],
        AsignacionEquipoServicio: [
          {
            id_asignacion: 9,
            id_unidad: 501,
            id_empresa: 1,
            idClienteExterno: 130,
            idServicioExterno: 245,
            idContratoExterno: 92,
            id_ot: 781,
            activa: true,
            fechaInstalacion: new Date('2026-09-25T10:00:00Z'),
          },
        ],
      });

      const respuesta = await service.consultarUnidadPorSerie('ONT-123456', 1);

      expect(respuesta.data).toMatchObject({
        id_unidad: 501,
        numero_serie: 'ONT-123456',
        estado: 'Instalado en cliente',
        id_empresa: 1,
        id_tipo_equipo: 3,
        tipo_equipo: {
          nombre: 'ONT Huawei',
          categoria: 'ONT/ONU',
          marca: 'Huawei',
          modelo: 'HG8145',
        },
        mac_address: 'AA:BB:CC:DD:EE:FF',
        id_bodega_actual: null,
        fecha_adquisicion: '2026-01-01',
        garantia: { fecha_vencimiento: '2027-01-01', vigente: true },
        asignacion_actual: {
          id_cliente_externo: 130,
          id_servicio_externo: 245,
          id_contrato_externo: 92,
          id_ot: 781,
        },
      });
    });
  });

  describe('GET /integraciones/tipos-equipo', () => {
    it('devuelve el catálogo de la empresa con los campos del acuerdo', async () => {
      const { service, catalogService } = crearServicio();
      catalogService.consultar.mockResolvedValue([
        {
          id_tipo_equipo: 3,
          id_empresa: 1,
          nombre: 'ONT Huawei',
          categoria: 'ONT/ONU',
          marca: 'Huawei',
          modelo: 'HG8145',
          descripcionTecnica: 'ONT GPON',
          unidadMedida: null,
          garantiaDias: 365,
          requiereSerialNumber: true,
          activo: true,
        },
      ]);

      const respuesta = await service.consultarTiposEquipo(1, { categoria: 'ONT/ONU' });

      expect(catalogService.consultar).toHaveBeenCalledWith({
        categoria: 'ONT/ONU',
        activo: undefined,
        buscar: undefined,
        id_empresa: 1,
      });
      expect(respuesta.data[0]).toEqual({
        id_tipo_equipo: 3,
        id_empresa: 1,
        nombre: 'ONT Huawei',
        categoria: 'ONT/ONU',
        marca: 'Huawei',
        modelo: 'HG8145',
        descripcion_tecnica: 'ONT GPON',
        unidad_medida: null,
        garantia_dias: 365,
        requiere_serie_individual: true,
        activo: true,
      });
    });

    it('rechaza un filtro activo distinto de true/false (400)', async () => {
      const { service } = crearServicio();
      await expect(service.consultarTiposEquipo(1, { activo: '1' })).rejects.toThrow(
        "El filtro activo debe ser 'true' o 'false'.",
      );
    });
  });

  describe('POST /integraciones/activaciones', () => {
    it('exige event_id, id_ot, id_contrato, id_servicio y equipos (400)', async () => {
      const { service } = crearServicio();

      await expect(
        service.registrarActivacion(payloadActivacion({ event_id: '' }), G8),
      ).rejects.toThrow('Falta el event_id de la activación.');

      await expect(
        service.registrarActivacion(payloadActivacion({ id_ot: undefined }), G8),
      ).rejects.toThrow('Falta el id_ot de la activación o no es numérico.');

      await expect(
        service.registrarActivacion(payloadActivacion({ id_contrato: undefined }), G8),
      ).rejects.toThrow('Falta el id_contrato de la activación o no es numérico.');

      await expect(
        service.registrarActivacion(payloadActivacion({ id_servicio: undefined }), G8),
      ).rejects.toThrow('Falta el id_servicio de la activación o no es numérico.');

      await expect(
        service.registrarActivacion(payloadActivacion({ equipos: [] }), G8),
      ).rejects.toThrow('La activación debe incluir al menos un equipo en el campo equipos.');
    });

    it('misma activación dos veces → una sola asignación y duplicado: true', async () => {
      const { service, manager } = crearServicio({
        UnidadEquipo: [{ ...UNIDAD_INSTALADA }],
        IntegracionCierre: [
          {
            id_cierre: 1,
            claveIdempotencia: '781:2026-09-25T10:00:00Z',
            id_ot: 781,
            id_empresa: 1,
            payload: { id_empresa: 1, fecha_completada: '2026-09-25T10:00:00Z' },
          },
        ],
      });

      const primera = await service.registrarActivacion(payloadActivacion(), G8);
      const segunda = await service.registrarActivacion(payloadActivacion(), G8);

      expect(primera.data).toMatchObject({
        event_id: 'client-activation-ot-781',
        id_servicio: 245,
        equipos_asociados: 1,
        duplicado: false,
      });
      expect(segunda.data).toMatchObject({ equipos_asociados: 1, duplicado: true });
      expect(manager.tabla(AsignacionEquipoServicio)).toHaveLength(1);
      expect(manager.tabla(AsignacionEquipoServicio)[0].activa).toBe(true);
    });

    it('mismo event_id con otros datos → 409 (conflicto de idempotencia)', async () => {
      const { service } = crearServicio({
        UnidadEquipo: [{ ...UNIDAD_INSTALADA }],
      });

      await service.registrarActivacion(payloadActivacion(), G8);
      await expect(
        service.registrarActivacion(payloadActivacion({ id_servicio: 999 }), G8),
      ).rejects.toThrow(ConflictException);
    });

    it('activación sin cierre → PENDIENTE_CIERRE y sin asignaciones', async () => {
      const { service, manager } = crearServicio();

      const respuesta = await service.registrarActivacion(payloadActivacion(), G8);

      expect(respuesta.data).toMatchObject({ equipos_asociados: 0, duplicado: false });
      expect(manager.tabla(AsignacionEquipoServicio)).toHaveLength(0);
      const cabecera = manager.tabla(IntegracionActivacion)[0];
      expect(cabecera.estadoProceso).toBe('PENDIENTE_CIERRE');
      expect(cabecera.eventId).toBe('client-activation-ot-781');
    });

    it('multi-equipo con el cierre ya recibido → todas las asignaciones del evento', async () => {
      const { service, manager } = crearServicio({
        UnidadEquipo: [
          { ...UNIDAD_INSTALADA },
          { ...UNIDAD_INSTALADA, id_unidad: 502, serialNumber: 'ONT-999999' },
        ],
        IntegracionCierre: [
          {
            id_cierre: 1,
            claveIdempotencia: '781:2026-09-25T10:00:00Z',
            id_ot: 781,
            id_empresa: 1,
            payload: { id_empresa: 1, fecha_completada: '2026-09-25T10:00:00Z' },
          },
        ],
      });

      const respuesta = await service.registrarActivacion(
        payloadActivacion({
          equipos: [{ numero_serie: 'ONT-123456' }, { numero_serie: 'ONT-999999' }],
        }),
        G8,
      );

      expect(respuesta.data.equipos_asociados).toBe(2);
      const asignaciones = manager.tabla(AsignacionEquipoServicio);
      expect(asignaciones).toHaveLength(2);
      expect(asignaciones.every((a) => a.eventId === 'client-activation-ot-781')).toBe(true);
      expect(manager.tabla(IntegracionActivacion)[0].estadoProceso).toBe('COMPLETO');
    });

    it('reemplazo: retira la asignación activa anterior del mismo servicio', async () => {
      const { service, manager } = crearServicio({
        UnidadEquipo: [{ ...UNIDAD_INSTALADA }],
        AsignacionEquipoServicio: [
          {
            id_asignacion: 77,
            id_unidad: 400,
            id_empresa: 1,
            idServicioExterno: 245,
            activa: true,
            fechaInstalacion: new Date('2026-01-01T00:00:00Z'),
            fechaRetiro: null,
          },
        ],
        IntegracionCierre: [
          {
            id_cierre: 1,
            claveIdempotencia: '781:2026-09-25T10:00:00Z',
            id_ot: 781,
            id_empresa: 1,
            payload: { id_empresa: 1, fecha_completada: '2026-09-25T10:00:00Z' },
          },
        ],
      });

      await service.registrarActivacion(payloadActivacion(), G8);

      const anteriores = manager.tabla(AsignacionEquipoServicio).filter((a) => a.id_asignacion === 77);
      expect(anteriores[0].activa).toBe(false);
      expect(anteriores[0].fechaRetiro).toBeTruthy();
      const nuevas = manager.tabla(AsignacionEquipoServicio).filter((a) => a.id_unidad === 501);
      expect(nuevas).toHaveLength(1);
      expect(nuevas[0].activa).toBe(true);
    });

    it('serie inexistente → CON_DISCREPANCIAS (nunca 4xx)', async () => {
      const { service, manager } = crearServicio({
        IntegracionCierre: [
          {
            id_cierre: 1,
            claveIdempotencia: '781:2026-09-25T10:00:00Z',
            id_ot: 781,
            id_empresa: 1,
            payload: { id_empresa: 1, fecha_completada: '2026-09-25T10:00:00Z' },
          },
        ],
      });

      const respuesta = await service.registrarActivacion(
        payloadActivacion({ equipos: [{ numero_serie: 'NO-EXISTE' }] }),
        G8,
      );

      expect(respuesta.data.equipos_asociados).toBe(0);
      const cabecera = manager.tabla(IntegracionActivacion)[0];
      expect(cabecera.estadoProceso).toBe('CON_DISCREPANCIAS');
      expect(cabecera.discrepancias[0].codigo).toBe('SERIE_NO_EXISTE');
    });
  });

  describe('correlación cierre ↔ activación (ambos órdenes)', () => {
    const payloadCierre = () => ({
      clave_idempotencia: '781:2026-09-25T10:00:00Z',
      id_ot: 781,
      id_empresa: 1,
      tipo_ot: 'INSTALACION',
      fecha_completada: '2026-09-25T10:00:00Z',
      equipos_instalados: [{ numero_serie: 'ONT-123456', accion: 'INSTALADO_EN_CLIENTE' }],
      equipos_retirados: [],
    });

    it('activación→cierre: el cierre completa la activación pendiente', async () => {
      const { service, manager } = crearServicio({
        UnidadEquipo: [
          { ...UNIDAD_INSTALADA, estado: 'Asignado a técnico', tipoEquipo: undefined },
        ],
      });

      await service.registrarActivacion(payloadActivacion(), G8);
      expect(manager.tabla(IntegracionActivacion)[0].estadoProceso).toBe('PENDIENTE_CIERRE');

      await service.recibirCierreOt(781, payloadCierre(), G8);

      const cabecera = manager.tabla(IntegracionActivacion)[0];
      expect(cabecera.estadoProceso).toBe('COMPLETO');
      const asignaciones = manager.tabla(AsignacionEquipoServicio);
      expect(asignaciones).toHaveLength(1);
      expect(asignaciones[0]).toMatchObject({
        id_unidad: 501,
        eventId: 'client-activation-ot-781',
        idServicioExterno: 245,
        idContratoExterno: 92,
        activa: true,
      });
    });

    it('cierre→activación: deja PENDIENTE_ACTIVACION y la activación lo completa', async () => {
      const { service, manager } = crearServicio({
        UnidadEquipo: [
          { ...UNIDAD_INSTALADA, estado: 'Asignado a técnico', tipoEquipo: undefined },
        ],
      });

      await service.recibirCierreOt(781, payloadCierre(), G8);

      const placeholder = manager.tabla(IntegracionActivacion)[0];
      expect(placeholder.estadoProceso).toBe('PENDIENTE_ACTIVACION');
      expect(placeholder.eventId).toBeNull();

      const respuesta = await service.registrarActivacion(payloadActivacion(), G8);

      expect(respuesta.data.duplicado).toBe(false);
      expect(respuesta.data.equipos_asociados).toBe(1);
      expect(manager.tabla(IntegracionActivacion)).toHaveLength(1);
      expect(manager.tabla(IntegracionActivacion)[0].estadoProceso).toBe('COMPLETO');
      expect(manager.tabla(AsignacionEquipoServicio)).toHaveLength(1);
    });
  });

  describe('CU-64/CU-68 — acciones atómicas del cierre de instalación', () => {
    const TIPO_MATERIAL: Fila = {
      id_tipo_equipo: 7,
      id_empresa: 1,
      nombre: 'Cable UTP Cat6',
      unidadMedida: 'Metro',
      requiereSerialNumber: false,
    };

    const payloadCierreInstalacion = (overrides: Fila = {}) => ({
      clave_idempotencia: '781:2026-09-25T10:00:00Z',
      id_ot: 781,
      id_empresa: 1,
      tipo_ot: 'INSTALACION',
      id_tecnico: 45,
      fecha_completada: '2026-09-25T10:00:00Z',
      cliente: { rut: '12345678-5', nombre_completo: 'Juan Pérez' },
      direccion: { direccion_completa: 'Av. Siempre Viva 742', comuna: 'Santiago' },
      equipos_instalados: [
        { numero_serie: 'ONT-123456', accion: 'INSTALADO_EN_CLIENTE' },
      ],
      equipos_retirados: [],
      materiales: [{ id_tipo_equipo: 7, cantidad: 10 }],
      ...overrides,
    });

    function seedCierre(materialesSaldo = 25) {
      return {
        TipoEquipo: [{ ...TIPO_MATERIAL }],
        UnidadEquipo: [
          {
            ...UNIDAD_INSTALADA,
            estado: 'Asignado a técnico',
            idTecnicoAsignado: 45,
            tipoEquipo: undefined,
          },
        ],
        InventarioPersonal: [
          {
            id_inventario: 1,
            id_tecnico: 45,
            id_tipo_equipo: 7,
            cantidad: String(materialesSaldo),
          },
        ],
      };
    }

    it('descuenta materiales, persiste cliente/dirección y devuelve SRV', async () => {
      const { service, manager } = crearServicio(seedCierre(25));

      const respuesta = await service.recibirCierreOt(
        781,
        payloadCierreInstalacion(),
        G8,
      );

      expect(respuesta.data.srv).toBe('SRV-2026-00001');
      expect(respuesta.data.id_tecnico).toBe(45);
      expect(respuesta.data.estado_proceso).toBe('PROCESADO');
      expect(respuesta.data.materiales.descontados).toEqual([
        {
          id_tipo_equipo: 7,
          nombre: 'Cable UTP Cat6',
          cantidad: 10,
          saldo_anterior: 25,
          saldo_nuevo: 15,
        },
      ]);
      expect(respuesta.data.materiales.ajustes).toEqual([]);
      // El saldo real quedó descontado en el inventario personal del técnico.
      expect(
        Number(manager.tabla(InventarioPersonal)[0].cantidad),
      ).toBe(15);
      // Cliente/dirección persistidos en la unidad instalada (CU-48/71/73/87).
      const unidad = manager.tabla(UnidadEquipo)[0];
      expect(unidad.estado).toBe('Instalado en cliente');
      expect(unidad.clienteRut).toBe('12345678-5');
      expect(unidad.clienteNombre).toBe('Juan Pérez');
      expect(unidad.direccionInstalacion).toBe('Av. Siempre Viva 742');
      expect(unidad.comunaInstalacion).toBe('Santiago');
      expect(unidad.srv).toBe('SRV-2026-00001');
    });

    it('saldo exacto (disponible == declarado) permite el cierre', async () => {
      const { service } = crearServicio(seedCierre(10));

      const respuesta = await service.recibirCierreOt(
        781,
        payloadCierreInstalacion(),
        G8,
      );

      expect(respuesta.data.materiales.descontados[0].cantidad).toBe(10);
      expect(respuesta.data.materiales.ajustes).toEqual([]);
      expect(respuesta.data.discrepancias).toEqual([]);
    });

    it('saldo insuficiente: ajuste registrado, nunca rechazo del cierre', async () => {
      const { service, manager } = crearServicio(seedCierre(4));

      const respuesta = await service.recibirCierreOt(
        781,
        payloadCierreInstalacion(),
        G8,
      );

      // 2xx con ajuste: se descuenta lo disponible y el faltante queda registrado.
      expect(respuesta.data.srv).toBe('SRV-2026-00001');
      expect(respuesta.data.materiales.descontados[0]).toMatchObject({
        cantidad: 4,
        saldo_nuevo: 0,
      });
      expect(respuesta.data.materiales.ajustes[0]).toMatchObject({
        disponible: 4,
        declarado: 10,
        faltante: 6,
      });
      expect(respuesta.data.discrepancias[0].codigo).toBe(
        'SALDO_INSUFICIENTE_AJUSTADO',
      );
      expect(respuesta.data.discrepancias[0].detalle).toContain(
        'Saldo insuficiente de [Cable UTP Cat6]: disponible 4 Metro, declarado 10 Metro.',
      );
      expect(Number(manager.tabla(InventarioPersonal)[0].cantidad)).toBe(0);
    });

    it('múltiples consumibles: reporta todos los insuficientes', async () => {
      const { service } = crearServicio({
        ...seedCierre(100),
        TipoEquipo: [
          { ...TIPO_MATERIAL },
          {
            id_tipo_equipo: 8,
            id_empresa: 1,
            nombre: 'Conector SC',
            unidad_medida: 'Unidad',
          },
        ],
        InventarioPersonal: [
          { id_inventario: 1, id_tecnico: 45, id_tipo_equipo: 7, cantidad: '100' },
          { id_inventario: 2, id_tecnico: 45, id_tipo_equipo: 8, cantidad: '2' },
        ],
      });

      const respuesta = await service.recibirCierreOt(
        781,
        payloadCierreInstalacion({
          materiales: [
            { id_tipo_equipo: 7, cantidad: 10 },
            { id_tipo_equipo: 8, cantidad: 5 },
          ],
        }),
        G8,
      );

      expect(respuesta.data.materiales.descontados).toHaveLength(2);
      expect(respuesta.data.materiales.descontados[1]).toMatchObject({
        id_tipo_equipo: 8,
        cantidad: 2,
        saldo_nuevo: 0,
      });
      expect(respuesta.data.materiales.ajustes).toHaveLength(1);
      expect(respuesta.data.materiales.ajustes[0]).toMatchObject({
        id_tipo_equipo: 8,
        disponible: 2,
        declarado: 5,
        faltante: 3,
      });
      expect(respuesta.data.discrepancias).toHaveLength(1);
    });

    it('cantidad cero o negativa es payload inválido (400)', async () => {
      const { service } = crearServicio(seedCierre());

      await expect(
        service.recibirCierreOt(
          781,
          payloadCierreInstalacion({
            materiales: [{ id_tipo_equipo: 7, cantidad: 0 }],
          }),
          G8,
        ),
      ).rejects.toThrow(
        'La cantidad del material [7] debe ser mayor que cero (posición 0).',
      );
    });

    it('sin técnico identificado: registra discrepancia y no descuenta', async () => {
      const { service, manager } = crearServicio({
        ...seedCierre(25),
        UnidadEquipo: [{ ...UNIDAD_INSTALADA, estado: 'Asignado a técnico' }],
      });

      const respuesta = await service.recibirCierreOt(
        781,
        payloadCierreInstalacion({ id_tecnico: undefined }),
        G8,
      );

      expect(respuesta.data.discrepancias[0].codigo).toBe('TECNICO_NO_IDENTIFICADO');
      expect(Number(manager.tabla(InventarioPersonal)[0].cantidad)).toBe(25);
    });

    it('REPARACION no genera SRV', async () => {
      const { service } = crearServicio(seedCierre(25));

      const respuesta = await service.recibirCierreOt(
        781,
        payloadCierreInstalacion({ tipo_ot: 'REPARACION' }),
        G8,
      );

      expect(respuesta.data.srv).toBeNull();
    });

    it('re-cierre de la misma OT conserva el SRV original', async () => {
      const { service } = crearServicio({
        ...seedCierre(25),
        IntegracionCierre: [
          {
            id_cierre: 1,
            claveIdempotencia: '780:2026-09-24T10:00:00Z',
            id_ot: 781,
            id_empresa: 1,
            srv: 'SRV-2026-00007',
            payload: {},
          },
        ],
      });

      const respuesta = await service.recibirCierreOt(
        781,
        payloadCierreInstalacion(),
        G8,
      );

      expect(respuesta.data.srv).toBe('SRV-2026-00007');
    });

    it('E1/atomicidad: si una escritura falla a mitad, se revierte todo', async () => {
      const { service, manager, queryRunner } = crearServicio(seedCierre(25));
      manager.onSave = (clase) => {
        if (clase === 'HistorialEstado') {
          throw new Error('fallo simulado de escritura');
        }
      };

      await expect(
        service.recibirCierreOt(781, payloadCierreInstalacion(), G8),
      ).rejects.toThrow('fallo simulado de escritura');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      // No se descuenta el material antes del rollback.
      expect(Number(manager.tabla(InventarioPersonal)[0].cantidad)).toBe(25);
    });
  });
});

describe('IntegracionesService — sc-159 (acuerdo G8 P1)', () => {
  describe('GET /integraciones/equipos?id_servicio=', () => {
    const ASIGNACIONES = [
      {
        id_asignacion: 1,
        id_unidad: 501,
        id_empresa: 1,
        eventId: 'client-activation-ot-781',
        idServicioExterno: 245,
        id_ot: 781,
        activa: true,
        fechaInstalacion: new Date('2026-09-25T10:00:00Z'),
      },
      {
        id_asignacion: 2,
        id_unidad: 502,
        id_empresa: 1,
        idServicioExterno: 245,
        id_ot: 780,
        activa: false,
        fechaInstalacion: new Date('2026-01-01T00:00:00Z'),
        fechaRetiro: new Date('2026-09-25T10:00:00Z'),
      },
      {
        id_asignacion: 3,
        id_unidad: 503,
        id_empresa: 1,
        idServicioExterno: 999,
        id_ot: 700,
        activa: true,
        fechaInstalacion: new Date('2026-02-01T00:00:00Z'),
      },
    ];

    const UNIDADES: Fila[] = [
      {
        id_unidad: 501,
        id_empresa: 1,
        id_tipo_equipo: 3,
        serialNumber: 'ONT-123456',
        estado: 'Instalado en cliente',
        tipoEquipo: { id_tipo_equipo: 3, nombre: 'ONT Huawei', categoria: 'ONT/ONU' },
      },
      {
        id_unidad: 502,
        id_empresa: 1,
        id_tipo_equipo: 3,
        serialNumber: 'ONT-000001',
        estado: 'Instalado en cliente',
        tipoEquipo: { id_tipo_equipo: 3, nombre: 'ONT Huawei', categoria: 'ONT/ONU' },
      },
    ];

    it('devuelve solo las asignaciones activas del servicio', async () => {
      const { service } = crearServicio({
        AsignacionEquipoServicio: ASIGNACIONES.map((a) => ({ ...a })),
        UnidadEquipo: UNIDADES.map((u) => ({ ...u })),
      });

      const respuesta = await service.consultarEquiposPorServicio(1, '245');

      expect(respuesta.data).toEqual([
        {
          id_unidad: 501,
          numero_serie: 'ONT-123456',
          estado: 'Instalado en cliente',
          tipo_equipo: {
            id_tipo_equipo: 3,
            nombre: 'ONT Huawei',
            categoria: 'ONT/ONU',
          },
          fecha_instalacion: new Date('2026-09-25T10:00:00Z'),
          id_ot: 781,
        },
      ]);
    });

    it('servicio sin equipos → 200 con lista vacía', async () => {
      const { service } = crearServicio({ AsignacionEquipoServicio: [] });

      const respuesta = await service.consultarEquiposPorServicio(1, '245');

      expect(respuesta.data).toEqual([]);
    });

    it('exige id_servicio numérico (400)', async () => {
      const { service } = crearServicio();

      await expect(
        service.consultarEquiposPorServicio(1, undefined as never),
      ).rejects.toThrow('Falta el parámetro id_servicio o no es numérico.');
    });
  });

  describe('GET /integraciones/stock', () => {
    const TIPOS: Fila[] = [
      {
        id_tipo_equipo: 3,
        id_empresa: 1,
        nombre: 'ONT Huawei',
        categoria: 'ONT/ONU',
        requiereSerialNumber: true,
        activo: true,
      },
      {
        id_tipo_equipo: 7,
        id_empresa: 1,
        nombre: 'Cable UTP Cat6',
        categoria: 'Consumible otro',
        unidadMedida: 'Metro',
        requiereSerialNumber: false,
        activo: true,
      },
    ];

    it('individualizables: disponibles En bodega y reservados Asignado a técnico', async () => {
      const { service } = crearServicio({
        TipoEquipo: TIPOS.map((t) => ({ ...t })),
        UnidadEquipo: [
          { id_unidad: 1, id_empresa: 1, id_tipo_equipo: 3, estado: 'En bodega' },
          { id_unidad: 2, id_empresa: 1, id_tipo_equipo: 3, estado: 'En bodega' },
          { id_unidad: 3, id_empresa: 1, id_tipo_equipo: 3, estado: 'Asignado a técnico' },
          { id_unidad: 4, id_empresa: 1, id_tipo_equipo: 3, estado: 'Instalado en cliente' },
        ],
      });

      const respuesta = await service.consultarStock(1, { id_tipo_equipo: '3' });

      expect(respuesta.data).toEqual([
        {
          id_tipo_equipo: 3,
          id_empresa: 1,
          nombre: 'ONT Huawei',
          categoria: 'ONT/ONU',
          unidad_medida: null,
          requiere_serie_individual: true,
          disponible: 2,
          reservado: 1,
          total: 3,
        },
      ]);
    });

    it('consumibles: suma el stock de todas las bodegas', async () => {
      const { service } = crearServicio({
        TipoEquipo: TIPOS.map((t) => ({ ...t })),
        StockConsumible: [
          { id_stock: 1, id_tipo_equipo: 7, id_bodega: 1, cantidad_disponible: '25.5' },
          { id_stock: 2, id_tipo_equipo: 7, id_bodega: 2, cantidad_disponible: '10' },
        ],
      });

      const respuesta = await service.consultarStock(1, { id_tipo_equipo: '7' });

      expect(respuesta.data[0]).toMatchObject({
        id_tipo_equipo: 7,
        disponible: 35.5,
        reservado: 0,
        total: 35.5,
      });
    });

    it('filtra por categoría y devuelve 200 con lista vacía si no hay tipos', async () => {
      const { service } = crearServicio({ TipoEquipo: TIPOS.map((t) => ({ ...t })) });

      const respuesta = await service.consultarStock(1, {
        categoria: 'No existe',
      });

      expect(respuesta.data).toEqual([]);
    });

    it('tipo inexistente en la empresa → 404', async () => {
      const { service } = crearServicio({ TipoEquipo: TIPOS.map((t) => ({ ...t })) });

      await expect(
        service.consultarStock(1, { id_tipo_equipo: '999' }),
      ).rejects.toThrow('El tipo de equipo no existe en esa empresa.');
    });

    it('id_tipo_equipo no numérico → 400', async () => {
      const { service } = crearServicio();

      await expect(
        service.consultarStock(1, { id_tipo_equipo: 'abc' }),
      ).rejects.toThrow('El parámetro id_tipo_equipo debe ser numérico.');
    });
  });

  // CU-69: el cierre de OT de reparación registra la parte de inventario (estados,
  // consumibles y auditoría); el cierre de la OT en sí lo ejecuta G3 (doc-12 §1.3).
  describe('CU-69 — Registrando cierre de trabajo de reparación', () => {
    const TIPO_FIBRA: Fila = {
      id_tipo_equipo: 7,
      id_empresa: 1,
      nombre: 'Fibra drop QA',
      unidadMedida: 'Metro',
      requiereSerialNumber: false,
    };

    const payloadReparacion = (overrides: Fila = {}) => ({
      clave_idempotencia: `900:${Math.random()}`,
      id_ot: 900,
      id_empresa: 1,
      tipo_ot: 'REPARACION',
      id_tecnico: 45,
      fecha_completada: '2026-09-25T10:00:00Z',
      cliente: { rut: '12345678-5', nombre_completo: 'Juan Pérez' },
      direccion: { direccion_completa: 'Av. Siempre Viva 742', comuna: 'Santiago' },
      reparacion: {
        falla_reportada: 'Sin señal óptica en la ONT del cliente',
        solucion_aplicada: 'Se limpió el conector y se reconfiguró el equipo',
        resultado: 'RESUELTO',
      },
      ...overrides,
    });

    const unidad = (serie: string, estado: string): Fila => ({
      ...UNIDAD_INSTALADA,
      id_unidad: serie === 'NS-RET-001' ? 601 : 602,
      serialNumber: serie,
      estado,
      idTecnicoAsignado: 45,
      tipoEquipo: undefined,
    });

    const seed = (extra: Record<string, Fila[]> = {}) => ({
      TipoEquipo: [{ ...TIPO_FIBRA }],
      InventarioPersonal: [
        { id_inventario: 1, id_tecnico: 45, id_tipo_equipo: 7, cantidad: '50.5' },
      ],
      ...extra,
    });

    const cierre = (manager: FakeManager): Fila =>
      manager.tabla(CierreReparacion)[0];

    it('flujo normal: registra el cierre con el resultado y los datos del cliente', async () => {
      const { service, manager } = crearServicio(seed());

      const respuesta = await service.recibirCierreOt(900, payloadReparacion(), G8);

      expect(respuesta.data.estado_proceso).toBe('PROCESADO');
      expect(respuesta.data.id_cierre_reparacion).toBe(
        cierre(manager).id_cierre_reparacion,
      );
      expect(cierre(manager)).toMatchObject({
        resultado: 'Resuelto',
        fallaReportada: 'Sin señal óptica en la ONT del cliente',
        rutCliente: '12345678-5',
        direccionServicio: 'Av. Siempre Viva 742',
        id_tecnico: 45,
      });
    });

    it('con retiro: la unidad pasa a En revisión (CU-71) sin que G3 mande accion', async () => {
      const { service, manager } = crearServicio(
        seed({ UnidadEquipo: [unidad('NS-RET-001', 'Instalado en cliente')] }),
      );

      await service.recibirCierreOt(
        900,
        payloadReparacion({ equipos_retirados: [{ numero_serie: 'NS-RET-001' }] }),
        G8,
      );

      expect(manager.tabla(UnidadEquipo)[0].estado).toBe('En revisión');
      expect(cierre(manager).equiposRetirados).toEqual([
        {
          numero_serie: 'NS-RET-001',
          estado_anterior: 'Instalado en cliente',
          estado_nuevo: 'En revisión',
        },
      ]);
      expect(cierre(manager).equiposInstalados).toEqual([]);
    });

    it('con reemplazo: retiro a revisión e instalación del equipo del técnico', async () => {
      const { service, manager } = crearServicio(
        seed({
          UnidadEquipo: [
            unidad('NS-RET-001', 'Instalado en cliente'),
            unidad('NS-NEW-002', 'Asignado a técnico'),
          ],
        }),
      );

      await service.recibirCierreOt(
        900,
        payloadReparacion({
          equipos_retirados: [{ numero_serie: 'NS-RET-001' }],
          equipos_instalados: [{ numero_serie: 'NS-NEW-002' }],
        }),
        G8,
      );

      const unidades = manager.tabla(UnidadEquipo);
      const porSerie = (serie: string) =>
        unidades.find((u) => u.serialNumber === serie)?.estado;
      expect(porSerie('NS-RET-001')).toBe('En revisión');
      expect(porSerie('NS-NEW-002')).toBe('Instalado en cliente');
      expect(cierre(manager).equiposRetirados).toHaveLength(1);
      expect(cierre(manager).equiposInstalados).toHaveLength(1);
    });

    it('mapea los tres resultados de G3 a los literales del CU', async () => {
      for (const [g3, esperado] of [
        ['RESUELTO', 'Resuelto'],
        ['PARCIAL', 'Resuelto parcialmente'],
        ['SIN_SOLUCION', 'Sin solución'],
      ]) {
        const { service, manager } = crearServicio(seed());
        await service.recibirCierreOt(
          900,
          payloadReparacion({
            reparacion: {
              falla_reportada: 'Sin señal óptica en la ONT del cliente',
              solucion_aplicada: 'Se limpió el conector y se reconfiguró el equipo',
              resultado: g3,
            },
          }),
          G8,
        );
        expect(cierre(manager).resultado).toBe(esperado);
      }
    });

    it('deja en el cierre los consumibles descontados del inventario del técnico (CU-58/CU-68)', async () => {
      const { service, manager } = crearServicio(seed());

      await service.recibirCierreOt(
        900,
        payloadReparacion({ materiales: [{ id_tipo_equipo: 7, cantidad: 10.5 }] }),
        G8,
      );

      expect(Number(manager.tabla(InventarioPersonal)[0].cantidad)).toBe(40);
      expect(cierre(manager).consumibles).toEqual([
        {
          id_tipo_equipo: 7,
          tipo_equipo: 'Fibra drop QA',
          cantidad: 10.5,
          descontado: true,
          saldo_resultante: 40,
        },
      ]);
    });

    it('Excepción 1: saldo insuficiente queda como ajuste en el cierre, sin rechazarlo', async () => {
      const { service, manager } = crearServicio(
        seed({
          InventarioPersonal: [
            { id_inventario: 1, id_tecnico: 45, id_tipo_equipo: 7, cantidad: '2' },
          ],
        }),
      );

      const respuesta = await service.recibirCierreOt(
        900,
        payloadReparacion({ materiales: [{ id_tipo_equipo: 7, cantidad: 5 }] }),
        G8,
      );

      expect(respuesta.data.estado_proceso).toBe('PROCESADO_CON_DISCREPANCIAS');
      expect(respuesta.data.discrepancias[0].codigo).toBe(
        'SALDO_INSUFICIENTE_AJUSTADO',
      );
      expect(cierre(manager).consumibles).toContainEqual(
        expect.objectContaining({ descontado: false, cantidad: 5 }),
      );
    });

    it('Excepción 1: NS inexistente queda como discrepancia y el cierre igual se registra', async () => {
      const { service, manager } = crearServicio(seed());

      const respuesta = await service.recibirCierreOt(
        900,
        payloadReparacion({ equipos_retirados: [{ numero_serie: 'NS-NO-EXISTE' }] }),
        G8,
      );

      expect(respuesta.data.discrepancias[0]).toMatchObject({
        codigo: 'SERIE_NO_EXISTE',
        numero_serie: 'NS-NO-EXISTE',
      });
      expect(cierre(manager)).toBeDefined();
    });

    it('sin falla o solución válidas no registra el cierre y lo informa como discrepancia', async () => {
      const { service, manager } = crearServicio(seed());

      const respuesta = await service.recibirCierreOt(
        900,
        payloadReparacion({
          reparacion: {
            falla_reportada: 'ok',
            solucion_aplicada: '',
            resultado: 'RESUELTO',
          },
        }),
        G8,
      );

      expect(cierre(manager)).toBeUndefined();
      expect(respuesta.data.discrepancias[0].codigo).toBe(
        'DATOS_REPARACION_INCOMPLETOS',
      );
    });

    it('audita el cierre con el técnico como actor', async () => {
      const { service, auditoriaService, manager } = crearServicio(seed());

      await service.recibirCierreOt(900, payloadReparacion(), G8);

      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_usuario: 45,
          accion: 'CIERRE_REPARACION',
          entidad_afectada: 'cierre_reparacion',
          id_entidad_afectada: cierre(manager).id_cierre_reparacion,
        }),
      );
    });

    // CU-70: el tipo de trabajo que el técnico dejó preparado completa el cierre.
    it('completa falla, solución y resultado desde el borrador del técnico (CU-70)', async () => {
      const { service, manager } = crearServicio(
        seed({
          BorradorCierre: [
            {
              id_borrador: 10,
              id_ot: 900,
              id_empresa: 1,
              id_tecnico: 45,
              codigoTrabajo: 'T-06',
              fallaReportada: 'Corte de fibra en el poste frente al domicilio',
            },
          ],
        }),
      );

      await service.recibirCierreOt(
        900,
        payloadReparacion({ reparacion: {} }),
        G8,
      );

      expect(cierre(manager)).toMatchObject({
        codigoTrabajo: 'T-06',
        fallaReportada: 'Corte de fibra en el poste frente al domicilio',
        resultado: 'Resuelto',
        categoriaFalla: 'Corte de fibra',
      });
      expect(cierre(manager).solucionAplicada).toContain('empalme');
    });

    // Excepción 1 del CU-70: sin tipo de trabajo ni borrador, el cierre necesita
    // los datos de G3; si tampoco vienen, queda la discrepancia de CU-69.
    it('sin borrador ni datos de G3 no inventa el cierre (E1)', async () => {
      const { service, manager } = crearServicio(seed());

      const respuesta = await service.recibirCierreOt(
        900,
        payloadReparacion({ reparacion: {} }),
        G8,
      );

      expect(cierre(manager)).toBeUndefined();
      expect(respuesta.data.discrepancias[0].codigo).toBe(
        'DATOS_REPARACION_INCOMPLETOS',
      );
    });

    it('un cierre de instalación no registra reparación', async () => {
      const { service, manager } = crearServicio(seed());

      await service.recibirCierreOt(
        901,
        payloadReparacion({ id_ot: 901, tipo_ot: 'INSTALACION', reparacion: undefined }),
        G8,
      );

      expect(cierre(manager)).toBeUndefined();
    });
  });
});
