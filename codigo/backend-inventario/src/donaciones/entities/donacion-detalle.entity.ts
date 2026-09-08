import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// CU-80: cada unidad incluida en una donación
@Entity('donacion_detalle')
export class DonacionDetalle {
  @PrimaryGeneratedColumn({ name: 'id_detalle' })
  id_detalle!: number;

  @Column({ type: 'integer', name: 'id_donacion' })
  id_donacion!: number;

  @Column({ type: 'integer', name: 'id_unidad' })
  id_unidad!: number;
}
