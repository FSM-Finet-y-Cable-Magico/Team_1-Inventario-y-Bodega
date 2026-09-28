import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// sc-158 (acuerdo G8 v1): cabecera del evento de activación recibido desde G8 CRM.
// Es la base de la idempotencia multi-equipo: event_id UNIQUE en la cabecera y
// UNIQUE(event_id, id_unidad) en las filas de asignación.
//
// Estados de proceso:
//  - PENDIENTE_CIERRE      → llegó la activación y aún no el cierre de la OT.
//  - PENDIENTE_ACTIVACION  → llegó el cierre y aún no la activación (fila sin event_id).
//  - COMPLETO              → ambos eventos; asignaciones creadas.
//  - CON_DISCREPANCIAS     → ambos eventos con problemas por ítem (serie inexistente, etc.).
@Entity('integracion_activacion')
export class IntegracionActivacion {
  @PrimaryGeneratedColumn({ name: 'id_activacion' })
  id_activacion!: number;

  // Nulo mientras la fila es el registro PENDIENTE_ACTIVACION de un cierre sin activación.
  @Column({
    type: 'varchar',
    length: 100,
    name: 'event_id',
    unique: true,
    nullable: true,
  })
  eventId?: string | null;

  @Column({ type: 'varchar', length: 100, name: 'trace_id', nullable: true })
  traceId?: string | null;

  @Column({ type: 'integer', name: 'id_empresa' })
  id_empresa!: number;

  @Column({ type: 'integer', name: 'id_ot', nullable: true })
  id_ot?: number | null;

  @Column({ type: 'integer', name: 'id_cliente_externo', nullable: true })
  idClienteExterno?: number | null;

  @Column({ type: 'varchar', length: 20, name: 'rut_cliente', nullable: true })
  rutCliente?: string | null;

  @Column({ type: 'integer', name: 'id_servicio_externo', nullable: true })
  idServicioExterno?: number | null;

  @Column({ type: 'integer', name: 'id_contrato_externo', nullable: true })
  idContratoExterno?: number | null;

  @Column({ type: 'jsonb', name: 'payload', nullable: true })
  payload?: any;

  @Column({ type: 'varchar', length: 40, name: 'estado_proceso' })
  estadoProceso!: string;

  @Column({ type: 'jsonb', name: 'equipos_asociados', nullable: true })
  equiposAsociados?: any;

  @Column({ type: 'jsonb', name: 'discrepancias', nullable: true })
  discrepancias?: any;

  @Column({
    type: 'timestamptz',
    name: 'fecha_proceso',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaProceso!: Date;
}
