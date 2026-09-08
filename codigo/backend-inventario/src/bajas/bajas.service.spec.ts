import {
  BajasService,
  BAJA_PENDIENTE,
  BAJA_APROBADA,
  ActorJwt,
} from './bajas.service';

// CU-78: comprobación de las reglas del caso de uso (flujo por rol y excepciones).
// Los repositorios y servicios se sustituyen por dobles mínimos.
type Doble = Record<string, jest.Mock>;

const ADMIN: ActorJwt = { id_usuario: 1, id_empresa: 1, roles: ['ADMIN'] };
const TECNICO: ActorJwt = {
  id_usuario: 9,
  id_empresa: 1,
  roles: ['TECNICO_TERRENO'],
};

function crearServicio(
  unidad: Record<string, unknown>,
  solicitudPendiente: unknown = null,
) {
  const solicitudRepository: Doble = {
    findOne: jest.fn().mockResolvedValue(solicitudPendiente),
    create: jest.fn((data: unknown) => ({
      id_solicitud: 77,
      ...(data as object),
    })),
    save: jest.fn((data: unknown) => Promise.resolve(data)),
    find: jest.fn().mockResolvedValue([]),
  };
  const unidadRepository: Doble = {
    findOne: jest.fn().mockResolvedValue(unidad),
    findBy: jest.fn().mockResolvedValue([unidad]),
  };
  const usuarioRepository: Doble = { findBy: jest.fn().mockResolvedValue([]) };
  const unitsService: Doble = {
    transicionarEstado: jest
      .fn()
      .mockResolvedValue({ estadoActual: 'Dado de baja' }),
  };
  const auditoriaService: Doble = {
    create: jest.fn().mockResolvedValue(undefined),
  };

  const service = new BajasService(
    solicitudRepository as never,
    unidadRepository as never,
    usuarioRepository as never,
    unitsService as never,
    auditoriaService as never,
  );
  return { service, solicitudRepository, unitsService, auditoriaService };
}

const UNIDAD_EN_BODEGA = {
  id_unidad: 5,
  id_empresa: 1,
  serialNumber: 'SN-001',
  estado: 'En bodega',
};

describe('BajasService (CU-78)', () => {
  it('Administrador: aplica la baja directamente sobre la unidad', async () => {
    const { service, unitsService } = crearServicio(UNIDAD_EN_BODEGA);

    const resultado: Record<string, unknown> = await service.registrar(
      { id_unidad: 5, motivo: 'Obsolescencia' },
      ADMIN,
    );

    expect(resultado.requiere_aprobacion).toBe(false);
    expect(unitsService.transicionarEstado).toHaveBeenCalledWith(
      5,
      'Dado de baja',
      ADMIN,
      undefined,
      undefined,
      undefined,
      false,
      undefined,
      { motivo: 'Obsolescencia', descripcion: null },
    );
  });

  it('Técnico de terreno: genera una solicitud pendiente sin cambiar el estado', async () => {
    const { service, unitsService, solicitudRepository } =
      crearServicio(UNIDAD_EN_BODEGA);

    const resultado: Record<string, unknown> = await service.registrar(
      { id_unidad: 5, motivo: 'Falla irreparable' },
      TECNICO,
    );

    expect(resultado.requiere_aprobacion).toBe(true);
    expect(resultado.estado).toBe(BAJA_PENDIENTE);
    expect(unitsService.transicionarEstado).not.toHaveBeenCalled();
    expect(solicitudRepository.save).toHaveBeenCalled();
  });

  it('Excepción 1: el estado actual no permite la baja', async () => {
    const { service } = crearServicio({
      ...UNIDAD_EN_BODEGA,
      estado: 'Instalado en cliente',
    });

    await expect(
      service.registrar({ id_unidad: 5, motivo: 'Obsolescencia' }, ADMIN),
    ).rejects.toThrow('Transición de estado no permitida para este equipo.');
  });

  it('Excepción 3: motivo Otro sin descripción válida (5-200)', async () => {
    const { service } = crearServicio(UNIDAD_EN_BODEGA);

    await expect(
      service.registrar(
        { id_unidad: 5, motivo: 'Otro', descripcion_otro: 'abc' },
        ADMIN,
      ),
    ).rejects.toThrow('Debe ingresar una descripción cuando selecciona Otro.');
  });

  it('Motivo fuera de la lista cerrada: se rechaza', async () => {
    const { service } = crearServicio(UNIDAD_EN_BODEGA);

    await expect(
      service.registrar({ id_unidad: 5, motivo: 'Se me perdió' }, ADMIN),
    ).rejects.toThrow('El motivo de baja seleccionado no es válido');
  });

  it('Aprobación: ejecuta la baja y cierra la solicitud', async () => {
    const solicitud = {
      id_solicitud: 77,
      id_unidad: 5,
      id_empresa: 1,
      motivo: 'Robo confirmado',
      motivo_otro: null,
      estado: BAJA_PENDIENTE,
    };
    const { service, unitsService, solicitudRepository } = crearServicio(
      UNIDAD_EN_BODEGA,
      solicitud,
    );

    const resultado: Record<string, unknown> = await service.aprobar(77, ADMIN);

    expect(unitsService.transicionarEstado).toHaveBeenCalled();
    expect(resultado.estado_solicitud).toBe(BAJA_APROBADA);
    expect(solicitudRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: BAJA_APROBADA,
        id_usuario_aprobador: 1,
      }),
    );
  });

  it('Rechazo: exige motivo y mantiene el estado de la unidad', async () => {
    const solicitud = {
      id_solicitud: 77,
      id_unidad: 5,
      id_empresa: 1,
      motivo: 'Obsolescencia',
      motivo_otro: null,
      estado: BAJA_PENDIENTE,
    };
    const { service, unitsService } = crearServicio(
      UNIDAD_EN_BODEGA,
      solicitud,
    );

    await expect(service.rechazar(77, '   ', ADMIN)).rejects.toThrow(
      'Debe ingresar un motivo de rechazo para continuar.',
    );

    const resultado: Record<string, unknown> = await service.rechazar(
      77,
      'El equipo aún es reparable',
      ADMIN,
    );
    expect(resultado.estado).toBe('Rechazada');
    expect(unitsService.transicionarEstado).not.toHaveBeenCalled();
  });
});
