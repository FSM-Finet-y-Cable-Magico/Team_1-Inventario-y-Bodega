import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrestamosService } from './prestamos.service';
import { PrestamosController } from './prestamos.controller';
import { PrestamoExterno } from '../inventario/entities/prestamo-externo.entity';
import { PrestamoDetalle } from './entities/prestamo-detalle.entity';
import { PrestamoRetorno } from './entities/prestamo-retorno.entity';
import { UnidadEquipo } from '../inventario/entities/unidad-equipo.entity';
import { HistorialEstado } from '../inventario/entities/historial-estado.entity';
import { TipoEquipo } from '../inventario/entities/tipo-equipo.entity';
import { StockConsumible } from '../bodegas/entities/stock-consumible.entity';
import { Bodega } from '../bodegas/entities/bodega.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PrestamoExterno,
      PrestamoDetalle,
      PrestamoRetorno,
      UnidadEquipo,
      HistorialEstado,
      TipoEquipo,
      StockConsumible,
      Bodega,
      Usuario,
    ]),
    AuditoriaModule,
  ],
  controllers: [PrestamosController],
  providers: [PrestamosService],
})
export class PrestamosModule {}
