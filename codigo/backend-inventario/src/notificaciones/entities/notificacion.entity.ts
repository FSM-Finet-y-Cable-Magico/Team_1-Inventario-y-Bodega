import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// CU-96: notificación persistida de la campana del sistema. Se genera para
// dos condiciones (préstamo vencido y stock bajo umbral, CU-94 A/C) y el
// actor la marca como leída individualmente o todas a la vez.
@Entity('notificacion')
export class Notificacion {
  @PrimaryGeneratedColumn({ name: 'id_notificacion' })
  id_notificacion!: number;

  // Literal exacto del tipo de alerta (comparte los strings con CU-94, ver
  // TIPO_STOCK_BAJO_UMBRAL / TIPO_PRESTAMO_VENCIDO en alertas.service.ts)
  @Column({ type: 'varchar', length: 40 })
  tipo!: string;

  @Column({ type: 'integer', name: 'id_empresa' })
  id_empresa!: number;

  @Column({ type: 'varchar', length: 150 })
  descripcion!: string;

  // Clave de deduplicación diaria: '<TIPO>:<referencia>:<YYYY-MM-DD>'.
  // El UNIQUE es la garantía real de "no duplicar notificaciones ya
  // generadas" — no una condición de carrera resuelta en memoria.
  @Column({ type: 'varchar', length: 120, name: 'clave_dedupe', unique: true })
  clave_dedupe!: string;

  @Column({ type: 'boolean', default: false })
  leida!: boolean;

  @Column({
    type: 'timestamptz',
    name: 'fecha_generacion',
    default: () => 'now()',
  })
  fecha_generacion!: Date;

  @Column({ type: 'timestamptz', name: 'fecha_leida', nullable: true })
  fecha_leida!: Date | null;
}
