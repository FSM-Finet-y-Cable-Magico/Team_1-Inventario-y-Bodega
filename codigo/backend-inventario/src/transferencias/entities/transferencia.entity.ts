import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('transferencia_equipo')
export class Transferencia {
  @PrimaryGeneratedColumn()
  id_transferencia: number;

  @Column({ nullable: true })
  id_empresa_origen: number;

  @Column({ nullable: true })
  id_empresa_destino: number;

  @Column({ nullable: true })
  id_usuario_registro: number;

  @Column({ type: 'date', nullable: true })
  fecha_transferencia: Date;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;
}
