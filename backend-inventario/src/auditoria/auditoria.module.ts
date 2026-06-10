import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaController } from './auditoria.controller';
import { Auditoria } from './entities/auditoria.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Auditoria, Usuario])],
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
