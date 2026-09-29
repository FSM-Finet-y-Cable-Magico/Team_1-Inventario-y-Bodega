import { Module } from '@nestjs/common';
import { G3ClientService } from './g3-client.service';

// Módulo sin dependencias propias (ConfigModule es global): lo importan tanto
// `inventario` (CU-48) como `salidas` (CU-61) sin crear ciclos.
@Module({
  providers: [G3ClientService],
  exports: [G3ClientService],
})
export class G3ClientModule {}
