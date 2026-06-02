import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { UnidadEquipo } from "./unidad-equipo.entity";

@Entity('historial_estados')
export class HistorialEstado {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => UnidadEquipo, (unidad) => unidad.historialEstados, { onDelete: 'CASCADE'})
    unidad!: UnidadEquipo;

    @Column()
    estadoAnterior!: string;

    @Column()
    estadoNuevo!: string;

    @Column({ type: 'timestamp'})
    fechaHora!: Date;

    @Column()
    usernameResponsable!: string;

    @Column()
    empresaActiva!: string;

    @Column({ type: 'text', nullable: true})
    observacion!: string;

    @Column({type: 'varchar', nullable: true})
    diagnosticoTecnico!: string;
}