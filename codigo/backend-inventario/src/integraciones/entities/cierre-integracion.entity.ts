import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// sc-113 (integración G3): registro de cierres de OT recibidos por webhook.
// La clave de idempotencia viene en el payload de G3: "{id_ot}:{fecha_completada ISO}".
@Entity('integracion_cierre')
export class IntegracionCierre {
    @PrimaryGeneratedColumn({ name: 'id_cierre' })
    id_cierre!: number;

    @Column({ type: 'varchar', length: 120, name: 'clave_idempotencia', unique: true })
    claveIdempotencia!: string;

    @Column({ type: 'integer', name: 'id_ot' })
    id_ot!: number;

    @Column({ type: 'integer', name: 'id_empresa' })
    id_empresa!: number;

    @Column({ type: 'varchar', length: 30, name: 'tipo_ot', nullable: true })
    tipo_ot?: string | null;

    @Column({ type: 'jsonb', name: 'payload' })
    payload!: any;

    // PROCESADO | PROCESADO_CON_DISCREPANCIAS
    @Column({ type: 'varchar', length: 40, name: 'estado_proceso' })
    estadoProceso!: string;

    @Column({ type: 'jsonb', name: 'discrepancias', nullable: true })
    discrepancias?: any;

    @Column({ type: 'jsonb', name: 'acciones_aplicadas', nullable: true })
    accionesAplicadas?: any;

    @Column({ type: 'timestamptz', name: 'fecha_proceso', default: () => 'CURRENT_TIMESTAMP' })
    fechaProceso!: Date;
}
