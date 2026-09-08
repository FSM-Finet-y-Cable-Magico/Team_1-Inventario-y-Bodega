import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UnidadEquipo } from './unidad-equipo.entity';

@Entity('historial_estado_equipo')
export class HistorialEstado {
  @PrimaryGeneratedColumn({ name: 'id_historial' })
  id_historial!: number;

  @Column({ type: 'integer', name: 'id_unidad', nullable: true })
  id_unidad!: number;

  @Column({ type: 'integer', name: 'id_usuario', nullable: true })
  id_usuario!: number;

  @Column({
    type: 'varchar',
    length: 30,
    name: 'estado_anterior',
    nullable: true,
  })
  estadoAnterior?: string;

  @Column({ type: 'varchar', length: 30, name: 'estado_nuevo', nullable: true })
  estadoNuevo?: string;

  @Column({ type: 'text', name: 'motivo', nullable: true })
  motivo?: string;

  @Column({
    type: 'timestamp',
    name: 'fecha_hora',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaHora!: Date;

  @ManyToOne(() => UnidadEquipo, (unidad) => unidad.historialEstados, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_unidad' })
  unidad!: UnidadEquipo;
}
