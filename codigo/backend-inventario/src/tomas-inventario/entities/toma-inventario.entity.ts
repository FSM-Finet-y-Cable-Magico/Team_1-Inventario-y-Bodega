import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// CU-97: cabecera de la toma de inventario físico de una bodega.
export const TOMA_ABIERTA = 'ABIERTA';
export const TOMA_CONFIRMADA = 'CONFIRMADA';
export const TOMA_CANCELADA = 'CANCELADA';

@Entity('toma_inventario')
export class TomaInventario {
  @PrimaryGeneratedColumn()
  id_toma!: number;

  @Column({ type: 'integer' })
  id_bodega!: number;

  @Column({ type: 'integer' })
  id_empresa!: number;

  @Column({ type: 'varchar', length: 20, default: TOMA_ABIERTA })
  estado!: string;

  @Column({ type: 'integer' })
  id_usuario_apertura!: number;

  @Column({ type: 'integer', nullable: true })
  id_usuario_cierre!: number | null;

  @Column({ type: 'timestamptz' })
  fecha_apertura!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_cierre!: Date | null;
}
