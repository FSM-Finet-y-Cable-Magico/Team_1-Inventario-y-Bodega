import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// sc-113 (integración G3): registro de cierres de OT recibidos por webhook.
// La clave de idempotencia viene en el payload de G3: "{id_ot}:{fecha_completada ISO}".
@Entity('integracion_cierre')
export class IntegracionCierre {
  @PrimaryGeneratedColumn({ name: 'id_cierre' })
  id_cierre!: number;

  @Column({
    type: 'varchar',
    length: 120,
    name: 'clave_idempotencia',
    unique: true,
  })
  claveIdempotencia!: string;

  @Column({ type: 'integer', name: 'id_ot' })
  id_ot!: number;

  @Column({ type: 'integer', name: 'id_empresa' })
  id_empresa!: number;

  @Column({ type: 'varchar', length: 30, name: 'tipo_ot', nullable: true })
  tipo_ot?: string | null;

  // CU-64 (D): identificador de servicio SRV-YYYY-XXXXX generado al cerrar la
  // instalación (secuencia por empresa/año en la tabla secuencia_srv). Un
  // re-cierre de la misma OT conserva el SRV, por eso no es UNIQUE por fila.
  @Column({ type: 'varchar', length: 20, name: 'srv', nullable: true })
  srv?: string | null;

  // CU-64 (D): técnico del cierre (payload.id_tecnico o inferido de la unidad).
  @Column({ type: 'integer', name: 'id_tecnico', nullable: true })
  id_tecnico?: number | null;

  // CU-64 (C)/CU-68: resultado del descuento de materiales del inventario personal
  // ({descontados: [], ajustes: []}); los ajustes por saldo insuficiente también
  // quedan en discrepancias.
  @Column({ type: 'jsonb', name: 'materiales_aplicados', nullable: true })
  materialesAplicados?: any;

  @Column({ type: 'jsonb', name: 'payload' })
  payload!: any;

  // PROCESADO | PROCESADO_CON_DISCREPANCIAS
  @Column({ type: 'varchar', length: 40, name: 'estado_proceso' })
  estadoProceso!: string;

  @Column({ type: 'jsonb', name: 'discrepancias', nullable: true })
  discrepancias?: any;

  @Column({ type: 'jsonb', name: 'acciones_aplicadas', nullable: true })
  accionesAplicadas?: any;

  @Column({
    type: 'timestamptz',
    name: 'fecha_proceso',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaProceso!: Date;
}
