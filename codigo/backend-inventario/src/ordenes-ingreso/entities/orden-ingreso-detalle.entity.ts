import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// CU-52: detalle (ítem) de una orden de ingreso
@Entity('orden_ingreso_detalle')
export class OrdenIngresoDetalle {
  @PrimaryGeneratedColumn()
  id_detalle: number;

  @Column({ nullable: false })
  id_orden: number;

  @Column({ nullable: false })
  id_tipo_equipo: number;

  @Column({ type: 'int', nullable: false })
  cantidad_esperada: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  garantia_dias: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  cantidad_recibida: number;
}
