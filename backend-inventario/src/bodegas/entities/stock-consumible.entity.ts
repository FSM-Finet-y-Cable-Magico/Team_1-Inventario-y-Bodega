import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Bodega } from './bodega.entity';
import { TipoEquipo } from '../../inventario/entities/tipo-equipo.entity';

@Entity('stock_consumible')
export class StockConsumible {
  @PrimaryGeneratedColumn()
  id_stock: number;

  @Column({ nullable: false })
  id_tipo_equipo: number;

  @Column({ nullable: false })
  id_bodega: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  cantidad_disponible: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  umbral_minimo: number;

  @ManyToOne(() => Bodega)
  @JoinColumn({ name: 'id_bodega' })
  bodega: Bodega;

  @ManyToOne(() => TipoEquipo)
  @JoinColumn({ name: 'id_tipo_equipo' })
  tipoEquipo: TipoEquipo;
}
