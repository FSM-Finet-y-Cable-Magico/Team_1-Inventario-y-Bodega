import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReportesService } from './reportes.service';

describe('ReportesService - CU-87, CU-90, CU-92', () => {
  let service: ReportesService;
  let mockDataSource: any;
  let mockBodegaRepo: any;
  let mockStockRepo: any;
  let mockTipoEquipoRepo: any;
  let mockUnidadRepo: any;
  let mockMovimientoRepo: any;
  let mockUsuarioRepo: any;
  let mockAuditoriaService: any;
  let mockG3ClientService: any;
  let mockExcelExportService: any;

  beforeEach(() => {
    mockDataSource = {
      query: jest.fn(),
    };
    mockBodegaRepo = { find: jest.fn() };
    mockStockRepo = { find: jest.fn() };
    mockTipoEquipoRepo = { find: jest.fn() };
    mockUnidadRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };
    mockMovimientoRepo = { find: jest.fn() };
    mockUsuarioRepo = { find: jest.fn().mockResolvedValue([]) };
    mockAuditoriaService = {
      create: jest.fn().mockResolvedValue(true),
    };
    mockG3ClientService = {
      consultarClientePorRut: jest.fn().mockResolvedValue(null),
      buscarClientes: jest.fn().mockResolvedValue([]),
      consultarOrdenesCerradas: jest.fn().mockResolvedValue([]),
    };
    mockExcelExportService = {
      generateXlsx: jest
        .fn()
        .mockReturnValue(Buffer.from('mock-excel-content')),
    };

    service = new ReportesService(
      mockDataSource,
      mockBodegaRepo,
      mockStockRepo,
      mockTipoEquipoRepo,
      mockUnidadRepo,
      mockMovimientoRepo,
      mockUsuarioRepo,
      mockAuditoriaService,
      mockG3ClientService,
      mockExcelExportService,
    );
  });

  describe('CU-87 - getEquiposInstaladosReport', () => {
    it('debe lanzar BadRequestException si no se ingresa ningún criterio', async () => {
      await expect(
        service.getEquiposInstaladosReport(
          { id_empresa: 1 },
          { id_usuario: 1, id_empresa: 1, roles: ['ADMIN_BODEGA'] },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si el nombre tiene menos de 3 caracteres', async () => {
      await expect(
        service.getEquiposInstaladosReport(
          { id_empresa: 1, nombre: 'ab' },
          { id_usuario: 1, id_empresa: 1, roles: ['ADMIN_BODEGA'] },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si el formato del RUT es inválido', async () => {
      await expect(
        service.getEquiposInstaladosReport(
          { id_empresa: 1, rut: '1234567' },
          { id_usuario: 1, id_empresa: 1, roles: ['ADMIN_BODEGA'] },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe respetar el aislamiento por empresa para usuarios no superusuario', async () => {
      await expect(
        service.getEquiposInstaladosReport(
          { id_empresa: 2, rut: '12345678-5' },
          { id_usuario: 1, id_empresa: 1, roles: ['ADMIN_BODEGA'] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('retorna reporte usando columnas canónicas y cruza con integracion_cierre', async () => {
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id_unidad: 10,
            serialNumber: 'QA-ONT-FINET-0001',
            estado: 'Instalado en cliente',
            clienteRut: '12345678-5',
            clienteNombre: 'María González',
            direccionInstalacion: 'Av. Siempre Viva 123',
            comunaInstalacion: 'Santiago',
            srv: 'SRV-2026-00001',
            id_empresa: 1,
            tipoEquipo: { nombre: 'ONT Huawei' },
          },
        ]),
      };
      mockUnidadRepo.createQueryBuilder.mockReturnValue(mockQb);

      mockDataSource.query
        .mockResolvedValueOnce([
          {
            srv: 'SRV-2026-00001',
            id_tecnico: 8,
            fecha_proceso: new Date('2026-09-10T12:00:00Z'),
            payload: {},
          },
        ])
        .mockResolvedValueOnce([]);

      mockUsuarioRepo.find.mockResolvedValueOnce([
        { id_usuario: 8, nombre_completo: 'Carlos Técnico' },
      ]);

      const resultado = await service.getEquiposInstaladosReport(
        { id_empresa: 1, rut: '12345678-5' },
        { id_usuario: 1, id_empresa: 1, roles: ['ADMIN_BODEGA'] },
      );

      expect(resultado).toHaveLength(1);
      expect(resultado[0].numero_servicio).toBe('SRV-2026-00001');
      expect(resultado[0].rut_cliente).toBe('12345678-5');
      expect(resultado[0].nombre_cliente).toBe('María González');
      expect(resultado[0].direccion_instalacion).toContain(
        'Av. Siempre Viva 123',
      );
      expect(resultado[0].tecnico_instalacion).toBe('Carlos Técnico');
      expect(resultado[0].numero_serie).toBe('QA-ONT-FINET-0001');
    });
  });

  describe('CU-90 - getTecnicosProductividadReport', () => {
    it('E1: debe lanzar BadRequestException si el rango de fechas supera los 90 días', async () => {
      await expect(
        service.getTecnicosProductividadReport(
          {
            id_empresa: 1,
            fecha_desde: '2026-01-01',
            fecha_hasta: '2026-05-01',
          },
          { id_usuario: 1, id_empresa: 1, roles: ['ADMIN'] },
        ),
      ).rejects.toThrow(
        'El rango de fechas para este reporte no puede superar los 90 días.',
      );
    });

    it('procesa métricas con atribución correcta de id_tecnico de integracion_cierre', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([
          {
            id_usuario: 15,
            nombre_completo: 'Técnico Pérez',
            id_empresa: 1,
          },
        ])
        .mockResolvedValueOnce([
          {
            id_ot: 501,
            id_empresa: 1,
            tipo_ot: 'INSTALACION',
            id_tecnico: 15,
            payload: {
              materiales: [
                { nombre: 'Fibra Drop 50m', cantidad: 50 },
                { nombre: 'Conector SC', cantidad: 2 },
              ],
            },
          },
        ]);

      mockTipoEquipoRepo.find.mockResolvedValueOnce([
        {
          id_tipo_equipo: 1,
          nombre: 'Fibra Drop 50m',
          categoria: 'Consumible fibra óptica',
          unidadMedida: 'Metros',
        },
        {
          id_tipo_equipo: 2,
          nombre: 'Conector SC',
          categoria: 'Consumible conector',
          unidadMedida: 'Unidad',
        },
      ]);

      const resultado = await service.getTecnicosProductividadReport(
        {
          id_empresa: 1,
          fecha_desde: '2026-09-01',
          fecha_hasta: '2026-09-20',
        },
        { id_usuario: 1, id_empresa: 1, roles: ['SUPERUSUARIO'] },
      );

      expect(resultado).toHaveLength(1);
      expect(resultado[0].id_tecnico).toBe(15);
      expect(resultado[0].instalaciones_cerradas).toBe(1);
      expect(resultado[0].metros_fibra_optica).toBe(50);
      expect(resultado[0].unidades_conectores).toBe(2);
    });
  });

  describe('CU-92 - exportarReporteExcel', () => {
    it('genera archivo excel para reporte de stock sin timeout_test', async () => {
      jest.spyOn(service, 'getStockReport').mockResolvedValueOnce([] as any);

      const res = await service.exportarReporteExcel(
        { tipo: 'stock', id_empresa: 1 },
        { id_usuario: 1, id_empresa: 1, roles: ['ADMIN_BODEGA'] },
      );

      expect(res.buffer).toBeDefined();
      expect(res.filename).toMatch(/reporte-stock-\d{8}\.xlsx/);
      expect(res.sheetName).toMatch(/Stock\d{8}/);
    });
  });
});
