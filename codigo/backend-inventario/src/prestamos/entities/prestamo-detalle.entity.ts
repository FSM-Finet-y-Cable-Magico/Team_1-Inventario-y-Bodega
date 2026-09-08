import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// CU-81: un ítem del préstamo. Individualizable → id_unidad;
// consumible → id_tipo_equipo + cantidad.
@Entity('prestamo_detalle')
export class PrestamoDetalle {
  @PrimaryGeneratedColumn({ name: 'id_detalle' })
  id_detalle!: number;

  @Column({ type: 'integer', name: 'id_prestamo' })
  id_prestamo!: number;

  @Column({ type: 'integer', name: 'id_unidad', nullable: true })
  id_unidad!: number | null;

  @Column({ type: 'integer', name: 'id_tipo_equipo', nullable: true })
  id_tipo_equipo!: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  cantidad!: number | null;

  // CU-82: soporta retornos parciales
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'cantidad_retornada',
    default: 0,
  })
  cantidad_retornada!: number;
}
