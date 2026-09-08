import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { SalidaDetalle } from './salida-detalle.entity';

// CU-57: cabecera de una salida de bodega a técnico (equipos y/o consumibles).
@Entity('salida_bodega')
export class SalidaBodega {
  @PrimaryGeneratedColumn({ name: 'id_salida' })
  id_salida!: number;

  @Column({ type: 'integer', name: 'id_tecnico' })
  id_tecnico!: number;

  @Column({ type: 'integer', name: 'id_bodega_origen' })
  id_bodega_origen!: number;

  // Fecha/hora automática del sistema (America/Santiago en el service)
  @CreateDateColumn({
    type: 'timestamptz',
    name: 'fecha_hora',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_hora!: Date;

  @Column({ type: 'integer', name: 'id_empresa', nullable: true })
  id_empresa?: number;

  @Column({ type: 'integer', name: 'id_usuario_registro', nullable: true })
  id_usuario_registro?: number;

  @OneToMany(() => SalidaDetalle, (detalle) => detalle.salida)
  detalles!: SalidaDetalle[];
}
