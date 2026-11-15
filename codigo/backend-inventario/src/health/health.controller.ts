import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

// ======================================================================
// Estado del servicio · HealthController (controlador)
// Estado del servicio (no es un CU)
// ======================================================================
@Controller('health')
export class HealthController {
  //datasource global para que las queries sean directas, porsiacaso
  constructor(private dataSource: DataSource) {}
  // Estado del servicio (no es un CU)
  @Get('db')
  async checkDb() {
    try {
      //listar las tablas de usuario o ver si funciona el schema publico, nunca cache si avisaron que separaron los schemas por empresa
      const tables = await this.dataSource.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
      );
      return {
        status: 'ok',
        database: 'Railway PostgreSQl',
        tables: tables.map((t) => t.table_name),
        tablesFound: tables.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }
  // Estado del servicio (no es un CU)
  @Get('ping')
  ping() {
    return { message: 'Backend vivo', time: new Date().toISOString() };
  }
}
