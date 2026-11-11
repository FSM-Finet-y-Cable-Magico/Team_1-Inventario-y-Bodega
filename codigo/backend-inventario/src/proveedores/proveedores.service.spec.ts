import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';

// CU-98: Desactivando proveedor (y reactivarlo).
function crear(proveedor: Record<string, unknown> | null, pendientes = 0) {
  const proveedorRepository = {
    findOne: jest.fn().mockResolvedValue(proveedor),
    save: jest.fn((p) => Promise.resolve(p)),
  };
  const pivotRepository = { find: jest.fn().mockResolvedValue([]) };
  const tipoRepository = { findOne: jest.fn().mockResolvedValue(null) };
  const auditoria = { create: jest.fn().mockResolvedValue(undefined) };
  const ordenRepository = { count: jest.fn().mockResolvedValue(pendientes) };
  const service = new ProveedoresService(
    proveedorRepository as never,
    pivotRepository as never,
    tipoRepository as never,
    auditoria as never,
    ordenRepository as never,
  );
  return { service, proveedorRepository, auditoria, ordenRepository };
}

const activo = () => ({
  id_proveedor: 4,
  nombre_comercial: 'Redes SA',
  activa: true,
});

describe('ProveedoresService (CU-98)', () => {
  it('desactiva un proveedor sin órdenes pendientes y lo audita', async () => {
    const { service, proveedorRepository, auditoria } = crear(activo());
    const resultado = await service.desactivar(4, 9);
    expect(proveedorRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ activa: false }),
    );
    expect(auditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id_usuario: 9,
        accion: 'DESACTIVAR',
        entidad_afectada: 'proveedor',
        valor_anterior: { activa: true },
        valor_nuevo: { activa: false },
      }),
    );
    expect(resultado.tipos_equipo).toEqual([]);
  });

  it('E1: rechaza desactivar un proveedor ya inactivo', async () => {
    const { service, proveedorRepository } = crear({
      ...activo(),
      activa: false,
    });
    await expect(service.desactivar(4, 9)).rejects.toThrow(ConflictException);
    expect(proveedorRepository.save).not.toHaveBeenCalled();
  });

  it('E2: rechaza desactivar con órdenes de ingreso pendientes', async () => {
    const { service, proveedorRepository, auditoria } = crear(activo(), 2);
    await expect(service.desactivar(4, 9)).rejects.toThrow(/2 orden/);
    expect(proveedorRepository.save).not.toHaveBeenCalled();
    expect(auditoria.create).not.toHaveBeenCalled();
  });

  it('responde 404 si el proveedor no existe', async () => {
    const { service } = crear(null);
    await expect(service.desactivar(99, 9)).rejects.toThrow(NotFoundException);
  });

  it('reactiva un proveedor inactivo', async () => {
    const { service, auditoria } = crear({ ...activo(), activa: false });
    await service.reactivar(4, 9);
    expect(auditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'REACTIVAR',
        valor_nuevo: { activa: true },
      }),
    );
  });

  it('rechaza reactivar un proveedor que ya está activo', async () => {
    const { service } = crear(activo());
    await expect(service.reactivar(4, 9)).rejects.toThrow(ConflictException);
  });
});
