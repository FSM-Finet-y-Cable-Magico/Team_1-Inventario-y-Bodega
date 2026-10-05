import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let query: jest.Mock;

  beforeEach(async () => {
    query = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DataSource, useValue: { query } }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('reports backend availability without querying the database', () => {
    const result = controller.ping();
    expect(result.message).toBe('Backend vivo');
    expect(typeof result.time).toBe('string');
    expect(query).not.toHaveBeenCalled();
  });

  it('reports the table names returned by the database', async () => {
    query.mockResolvedValue([{ table_name: 'usuario' }]);
    const result = await controller.checkDb();
    expect(result).toMatchObject({
      status: 'ok',
      database: 'Railway PostgreSQl',
      tables: ['usuario'],
      tablesFound: 1,
    });
    expect(typeof result.timestamp).toBe('string');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('information_schema.tables'),
    );
  });

  it('reports a database connection failure', async () => {
    query.mockRejectedValue(new Error('QA unavailable'));
    await expect(controller.checkDb()).resolves.toEqual({
      status: 'error',
      message: 'QA unavailable',
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
