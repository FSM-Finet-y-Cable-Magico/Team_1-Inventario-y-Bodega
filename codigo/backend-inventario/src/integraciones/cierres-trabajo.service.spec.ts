import { CierresTrabajoService } from './cierres-trabajo.service';
import { BorradorCierre } from './entities/borrador-cierre.entity';
import { TIPOS_TRABAJO } from './tipos-trabajo';

// CU-70: catálogo codificado T-01..T-10 y borrador del cierre del técnico.
// Dobles manuales al estilo del resto de los specs del módulo.

const TECNICO = { id_usuario: 45, id_empresa: 1, roles: ['TECNICO_TERRENO'] };

function crearServicio(borradores: any[] = []) {
  const repositorio = {
    findOne: jest.fn(
      async (opciones: any) =>
        borradores.find(
          (b) =>
            b.id_ot === opciones.where.id_ot &&
            b.id_empresa === opciones.where.id_empresa,
        ) ?? null,
    ),
    save: jest.fn(async (fila: any) => {
      const guardado = { id_borrador: fila.id_borrador ?? 10, ...fila };
      const indice = borradores.findIndex(
        (b) => b.id_borrador === guardado.id_borrador,
      );
      if (indice >= 0) borradores[indice] = guardado;
      else borradores.push(guardado);
      return guardado;
    }),
  };
  const auditoriaService = { create: jest.fn() };
  const servicio = new CierresTrabajoService(
    repositorio as never,
    auditoriaService as never,
  );
  return { servicio, repositorio, auditoriaService, borradores };
}

// El manager de la transacción del webhook solo necesita findOne.
const managerCon = (borrador: any) =>
  ({
    findOne: jest.fn(async (entidad: any, opciones: any) =>
      entidad === BorradorCierre &&
      borrador &&
      borrador.id_ot === opciones.where.id_ot
        ? borrador
        : null,
    ),
  }) as never;

describe('CU-70 — Seleccionando tipo de trabajo codificado para cierre', () => {
  describe('catálogo', () => {
    it('expone los 10 códigos del CU, de T-01 a T-10', () => {
      const { servicio } = crearServicio();

      const data = servicio.listarTiposTrabajo();

      expect(data).toHaveLength(10);
      expect(data.map((t) => t.codigo)).toEqual([
        'T-01',
        'T-02',
        'T-03',
        'T-04',
        'T-05',
        'T-06',
        'T-07',
        'T-08',
        'T-09',
        'T-10',
      ]);
      expect(data[5]).toMatchObject({
        codigo: 'T-06',
        nombre: 'Reparación fibra',
      });
    });

    it('cada código trae campos predefinidos para precompletar el cierre', () => {
      for (const tipo of TIPOS_TRABAJO) {
        expect(Object.keys(tipo.campos).length).toBeGreaterThan(0);
        expect(tipo.campos.solucion_aplicada?.length ?? 0).toBeGreaterThan(5);
      }
    });

    it('filtra por tipo de OT e incluye los códigos que aplican a ambas', () => {
      const { servicio } = crearServicio();

      const reparacion = servicio.listarTiposTrabajo('REPARACION');

      expect(reparacion.map((t) => t.codigo)).toEqual([
        'T-04',
        'T-05',
        'T-06',
        'T-07',
        'T-08',
        'T-09',
        'T-10',
      ]);
      // T-10 (retiro por baja) aplica a instalación y reparación.
      expect(
        servicio.listarTiposTrabajo('INSTALACION').map((t) => t.codigo),
      ).toContain('T-10');
    });
  });

  describe('borrador del cierre', () => {
    it('guarda el tipo seleccionado con los campos que el técnico ajustó', async () => {
      const { servicio, auditoriaService } = crearServicio();

      const data = await servicio.guardarBorrador(
        900,
        {
          codigo_trabajo: 'T-06',
          falla_reportada: 'Corte de fibra en la acometida del cliente',
          solucion_aplicada: 'Se hizo el empalme y se midió la potencia óptica',
          resultado: 'RESUELTO',
        },
        TECNICO,
      );

      expect(data).toMatchObject({
        id_ot: 900,
        id_empresa: 1,
        id_tecnico: 45,
        codigoTrabajo: 'T-06',
        resultado: 'RESUELTO',
      });
      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'CREAR_BORRADOR_CIERRE',
          entidad_afectada: 'borrador_cierre',
        }),
      );
    });

    it('Excepción 1: sin código el borrador se guarda igual con los campos manuales', async () => {
      const { servicio } = crearServicio();

      const data = await servicio.guardarBorrador(
        901,
        {
          falla_reportada: 'Situación no cubierta por el catálogo',
          solucion_aplicada: 'Se coordinó una visita con el área de redes',
        },
        TECNICO,
      );

      expect(data.codigoTrabajo).toBeNull();
      expect(data.fallaReportada).toBe('Situación no cubierta por el catálogo');
    });

    it('un código fuera del catálogo es rechazado', async () => {
      const { servicio } = crearServicio();

      await expect(
        servicio.guardarBorrador(900, { codigo_trabajo: 'T-99' }, TECNICO),
      ).rejects.toThrow('no existe en el catálogo');
    });

    it('un resultado fuera de los tres del CU es rechazado', async () => {
      const { servicio } = crearServicio();

      await expect(
        servicio.guardarBorrador(900, { resultado: 'MAS O MENOS' }, TECNICO),
      ).rejects.toThrow('RESUELTO, PARCIAL o SIN_SOLUCION');
    });

    it('reemplaza el borrador existente de la misma OT y lo audita como actualización', async () => {
      const { servicio, auditoriaService, borradores } = crearServicio([
        {
          id_borrador: 10,
          id_ot: 900,
          id_empresa: 1,
          id_tecnico: 45,
          codigoTrabajo: 'T-06',
        },
      ]);

      await servicio.guardarBorrador(900, { codigo_trabajo: 'T-09' }, TECNICO);

      expect(borradores).toHaveLength(1);
      expect(borradores[0].codigoTrabajo).toBe('T-09');
      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'ACTUALIZAR_BORRADOR_CIERRE' }),
      );
    });

    it('el borrador de otra empresa no es visible', async () => {
      const { servicio } = crearServicio([
        { id_borrador: 10, id_ot: 900, id_empresa: 2, codigoTrabajo: 'T-06' },
      ]);

      const data = await servicio.obtenerBorrador(900, TECNICO);

      expect(data).toBeNull();
    });
  });

  describe('precompletado del cierre (CU-69)', () => {
    it('toma los campos del borrador del técnico', async () => {
      const { servicio } = crearServicio();

      const preparado = await servicio.completarDesdeBorrador(
        managerCon({
          id_ot: 900,
          id_empresa: 1,
          codigoTrabajo: 'T-06',
          fallaReportada: 'Corte de fibra en el poste frente al domicilio',
          resultado: 'PARCIAL',
        }),
        900,
        1,
      );

      expect(preparado).toMatchObject({
        codigo_trabajo: 'T-06',
        campos: {
          falla_reportada: 'Corte de fibra en el poste frente al domicilio',
          resultado: 'PARCIAL',
          // Lo que el borrador no trae sale del catálogo del código.
          categoria_falla: 'Corte de fibra',
        },
      });
      expect(preparado?.campos.solucion_aplicada).toContain('empalme');
    });

    it('con el código en el payload y sin borrador usa solo el catálogo', async () => {
      const { servicio } = crearServicio();

      const preparado = await servicio.completarDesdeBorrador(
        managerCon(null),
        900,
        1,
        'T-04',
      );

      expect(preparado?.codigo_trabajo).toBe('T-04');
      expect(preparado?.campos.categoria_falla).toBe('Equipo defectuoso');
    });

    it('sin borrador ni código no aporta nada al cierre', async () => {
      const { servicio } = crearServicio();

      expect(
        await servicio.completarDesdeBorrador(managerCon(null), 900, 1),
      ).toBeNull();
    });
  });
});
