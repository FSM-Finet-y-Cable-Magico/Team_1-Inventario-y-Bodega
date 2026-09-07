import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// CU-58: inventario personal del técnico (solo consumibles, por saldo).
// saldo = entregado desde bodega − usado en cierres (CU-64/68) − devuelto a bodega (CU-82).
@Entity('inventario_personal_tecnico')
export class InventarioPersonal {
    @PrimaryGeneratedColumn({ name: 'id_inventario' })
    id_inventario!: number;

    @Column({ type: 'integer', name: 'id_tecnico' })
    id_tecnico!: number;

    @Column({ type: 'integer', name: 'id_tipo_equipo' })
    id_tipo_equipo!: number;

    @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
    cantidad!: string;

    @CreateDateColumn({ type: 'timestamptz', name: 'fecha_actualizacion', default: () => 'CURRENT_TIMESTAMP' })
    fecha_actualizacion!: Date;
}
