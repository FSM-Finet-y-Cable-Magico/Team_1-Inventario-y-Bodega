import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UnidadEquipo } from '../../inventario/entities/unidad-equipo.entity';

// sc-158 (acuerdo G8 v1, ratificado 24-sept-2026): tabla histórica equipo ↔ servicio.
// Los IDs de G8 (cliente/servicio/contrato) se guardan como referencias externas,
// SIN FK cross-domain. id_unidad sí es FK interna a unidad_equipo.
@Entity('asignacion_equipo_servicio')
export class AsignacionEquipoServicio {
  @PrimaryGeneratedColumn({ name: 'id_asignacion' })
  id_asignacion!: number;

  @Column({ type: 'integer', name: 'id_unidad' })
  id_unidad!: number;

  @Column({ type: 'integer', name: 'id_empresa' })
  id_empresa!: number;

  // Evento de activación de G8 que originó la asignación (UNIQUE(event_id, id_unidad)).
  @Column({ type: 'varchar', length: 100, name: 'event_id', nullable: true })
  eventId?: string | null;

  @Column({ type: 'integer', name: 'id_cliente_externo', nullable: true })
  idClienteExterno?: number | null;

  @Column({ type: 'varchar', length: 20, name: 'rut_cliente', nullable: true })
  rutCliente?: string | null;

  @Column({ type: 'integer', name: 'id_servicio_externo' })
  idServicioExterno!: number;

  @Column({ type: 'integer', name: 'id_contrato_externo', nullable: true })
  idContratoExterno?: number | null;

  @Column({ type: 'integer', name: 'id_ot', nullable: true })
  id_ot?: number | null;

  @Column({ type: 'timestamptz', name: 'fecha_instalacion' })
  fechaInstalacion!: Date;

  @Column({ type: 'timestamptz', name: 'fecha_retiro', nullable: true })
  fechaRetiro?: Date | null;

  @Column({ type: 'boolean', default: true })
  activa!: boolean;

  @Column({ type: 'varchar', length: 30, nullable: true })
  origen?: string | null;

  @Column({ type: 'varchar', length: 100, name: 'trace_id', nullable: true })
  traceId?: string | null;

  @ManyToOne(() => UnidadEquipo)
  @JoinColumn({ name: 'id_unidad' })
  unidad?: UnidadEquipo;
}
