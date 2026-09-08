import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BajasService } from './bajas.service';
import { BajasController } from './bajas.controller';
import { SolicitudBaja } from './entities/solicitud-baja.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { InventarioModule } from '../inventario/inventario.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitudBaja, UnidadEquipo, Usuario]),
    InventarioModule,
    AuditoriaModule,
  ],
  controllers: [BajasController],
  providers: [BajasService],
})
export class BajasModule {}
