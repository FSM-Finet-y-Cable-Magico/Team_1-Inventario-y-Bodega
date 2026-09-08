import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// CU-80: cabecera de una donación de equipos dados de baja
@Entity('donacion')
export class Donacion {
  @PrimaryGeneratedColumn({ name: 'id_donacion' })
  id_donacion!: number;

  @Column({ type: 'varchar', length: 100, name: 'nombre_institucion' })
  nombre_institucion!: string;

  @Column({ type: 'varchar', length: 12, name: 'rut_institucion' })
  rut_institucion!: string;

  @Column({ type: 'date', name: 'fecha_donacion' })
  fecha_donacion!: string;

  @Column({
    type: 'varchar',
    length: 30,
    name: 'numero_resolucion',
    nullable: true,
  })
  numero_resolucion!: string | null;

  @Column({ type: 'integer', name: 'id_usuario' })
  id_usuario!: number;

  @Column({ type: 'integer', name: 'id_empresa', nullable: true })
  id_empresa!: number;

  @Column({ type: 'timestamptz', name: 'fecha_creacion', nullable: true })
  fecha_creacion!: Date;
}
