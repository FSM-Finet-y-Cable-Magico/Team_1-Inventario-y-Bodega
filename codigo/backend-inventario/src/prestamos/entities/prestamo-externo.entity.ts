import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// CU-81: cabecera de una salida temporal de equipos a un externo.
// CU-75 (Grupo 3) escribirá aquí la variante tipo = 'REPARACION_EXTERNA';
// esta entidad es el único dueño de la tabla.
@Entity('prestamo_externo')
export class PrestamoExterno {
  @PrimaryGeneratedColumn({ name: 'id_prestamo' })
  id_prestamo!: number;

  @Column({ type: 'varchar', length: 12, unique: true })
  correlativo!: string;

  @Column({ type: 'varchar', length: 30 })
  tipo!: string;

  @Column({ type: 'varchar', length: 80, name: 'nombre_receptor' })
  nombre_receptor!: string;

  @Column({ type: 'varchar', length: 12, name: 'rut_receptor', nullable: true })
  rut_receptor!: string | null;

  @Column({ type: 'timestamptz', name: 'fecha_salida' })
  fecha_salida!: Date;

  @Column({ type: 'date', name: 'fecha_estimada_retorno' })
  fecha_estimada_retorno!: string;

  @Column({ type: 'varchar', length: 200 })
  motivo!: string;

  @Column({
    type: 'varchar',
    length: 300,
    name: 'descripcion_falla',
    nullable: true,
  })
  descripcion_falla!: string | null;

  @Column({ type: 'varchar', length: 20 })
  estado!: string;

  @Column({ type: 'integer', name: 'id_empresa', nullable: true })
  id_empresa!: number;

  @Column({ type: 'integer', name: 'id_bodega_origen' })
  id_bodega_origen!: number;

  @Column({ type: 'integer', name: 'id_usuario' })
  id_usuario!: number;

  @Column({ type: 'timestamptz', name: 'fecha_retorno_real', nullable: true })
  fecha_retorno_real!: Date | null;

  @Column({
    type: 'varchar',
    length: 300,
    name: 'resultado_retorno',
    nullable: true,
  })
  resultado_retorno!: string | null;
}
