import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('log_auditoria')
export class Auditoria {
  @PrimaryGeneratedColumn()
  id_log: number;

  @Column({ nullable: false })
  id_usuario: number;

  @Column({ nullable: false })
  accion: string;

  @Column({ nullable: true })
  entidad_afectada: string;

  @Column({ nullable: false })
  id_entidad_afectada: number;

  @Column({ type: 'jsonb', nullable: true })
  valor_anterior: any;

  @Column({ type: 'jsonb', nullable: false })
  valor_nuevo: any;

  @Column({ type: 'inet', nullable: true })
  ip_origen: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  fecha_hora: Date;
}
