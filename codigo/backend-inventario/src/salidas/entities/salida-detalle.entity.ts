import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SalidaBodega } from './salida-bodega.entity';

// CU-57: un ítem de la salida. Es UNA de dos cosas:
// - equipo individualizable → id_unidad (id_tipo_equipo y cantidad quedan null)
// - consumible por cantidad → id_tipo_equipo + cantidad (id_unidad null)
@Entity('salida_detalle')
export class SalidaDetalle {
    @PrimaryGeneratedColumn({ name: 'id_detalle' })
    id_detalle!: number;

    @Column({ type: 'integer', name: 'id_salida' })
    id_salida!: number;

    @Column({ type: 'integer', name: 'id_tipo_equipo', nullable: true })
    id_tipo_equipo?: number | null;

    @Column({ type: 'integer', name: 'id_unidad', nullable: true })
    id_unidad?: number | null;

    @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
    cantidad?: string | null;

    @ManyToOne(() => SalidaBodega, (salida) => salida.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id_salida' })
    salida!: SalidaBodega;
}
