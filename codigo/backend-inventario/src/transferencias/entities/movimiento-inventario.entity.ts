import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('movimiento_inventario')
export class MovimientoInventario {
  @PrimaryGeneratedColumn()
  id_movimiento: number;

  @Column({ nullable: true })
  id_tipo_equipo: number;

  @Column({ nullable: true })
  id_unidad: number;

  @Column({ nullable: true })
  id_empresa_origen: number;

  @Column({ nullable: true })
  id_empresa_destino: number;

  @Column({ nullable: true })
  id_bodega_origen: number;

  @Column({ nullable: true })
  id_bodega_destino: number;

  @Column({ nullable: true })
  id_usuario: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  tipo_movimiento: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 1 })
  cantidad: number;

  @Column({ type: 'timestamp', nullable: true })
  fecha: Date;

  @Column({ nullable: true })
  referencia_id: number;
}
