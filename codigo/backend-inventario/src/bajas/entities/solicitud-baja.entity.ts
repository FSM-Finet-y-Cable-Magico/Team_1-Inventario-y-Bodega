import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// CU-78: solicitud de baja definitiva generada por un Técnico de terreno, que
// queda pendiente hasta que un Administrador o Superusuario la resuelve.
@Entity('solicitud_baja')
export class SolicitudBaja {
  @PrimaryGeneratedColumn({ name: 'id_solicitud' })
  id_solicitud!: number;

  @Column({ type: 'integer', name: 'id_unidad' })
  id_unidad!: number;

  @Column({ type: 'integer', name: 'id_empresa', nullable: true })
  id_empresa!: number;

  @Column({ type: 'integer', name: 'id_usuario_solicitante' })
  id_usuario_solicitante!: number;

  @Column({ type: 'varchar', length: 40 })
  motivo!: string;

  @Column({ type: 'varchar', length: 200, name: 'motivo_otro', nullable: true })
  motivo_otro!: string | null;

  @Column({ type: 'varchar', length: 30 })
  estado!: string;

  @Column({ type: 'integer', name: 'id_usuario_aprobador', nullable: true })
  id_usuario_aprobador!: number | null;

  @Column({ type: 'timestamptz', name: 'fecha_solicitud', nullable: true })
  fecha_solicitud!: Date;

  @Column({ type: 'timestamptz', name: 'fecha_resolucion', nullable: true })
  fecha_resolucion!: Date | null;

  @Column({
    type: 'varchar',
    length: 200,
    name: 'motivo_rechazo',
    nullable: true,
  })
  motivo_rechazo!: string | null;
}
