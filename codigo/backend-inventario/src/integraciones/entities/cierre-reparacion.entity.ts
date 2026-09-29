import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// CU-69: cierre de trabajo de reparación. El cierre de la OT lo ejecuta G3 y nos
// llega por el webhook de sc-113 (doc-12 §1.3, bloque `reparacion`); aquí queda la
// parte de inventario: qué se retiró, qué se instaló en reemplazo, qué consumibles
// se descontaron del inventario personal del técnico (CU-58/CU-68) y con qué resultado.
@Entity('cierre_reparacion')
export class CierreReparacion {
  @PrimaryGeneratedColumn({ name: 'id_cierre_reparacion' })
  id_cierre_reparacion!: number;

  // Cierre de integración que lo originó (integracion_cierre.id_cierre).
  @Column({ type: 'integer', name: 'id_cierre', nullable: true })
  id_cierre?: number | null;

  @Column({ type: 'integer', name: 'id_ot' })
  id_ot!: number;

  @Column({ type: 'integer', name: 'id_empresa' })
  id_empresa!: number;

  @Column({ type: 'integer', name: 'id_tecnico', nullable: true })
  id_tecnico?: number | null;

  @Column({ type: 'varchar', length: 12, name: 'rut_cliente', nullable: true })
  rutCliente?: string | null;

  @Column({
    type: 'varchar',
    length: 200,
    name: 'direccion_servicio',
    nullable: true,
  })
  direccionServicio?: string | null;

  // CU-69: 5 a 300 caracteres, obligatorias en la especificación.
  @Column({ type: 'varchar', length: 300, name: 'falla_reportada' })
  fallaReportada!: string;

  @Column({ type: 'varchar', length: 300, name: 'solucion_aplicada' })
  solucionAplicada!: string;

  // Literales de pantalla: 'Resuelto' | 'Resuelto parcialmente' | 'Sin solución'
  @Column({ type: 'varchar', length: 30, name: 'resultado' })
  resultado!: string;

  @Column({
    type: 'boolean',
    name: 'resuelto_remotamente',
    default: false,
  })
  resueltoRemotamente!: boolean;

  @Column({
    type: 'varchar',
    length: 120,
    name: 'categoria_falla',
    nullable: true,
  })
  categoriaFalla?: string | null;

  // Series retiradas e instaladas en reemplazo, con el resultado de su transición.
  @Column({ type: 'jsonb', name: 'equipos_retirados', nullable: true })
  equiposRetirados?: any;

  @Column({ type: 'jsonb', name: 'equipos_instalados', nullable: true })
  equiposInstalados?: any;

  // Consumibles declarados con su descuento (CU-68) o la discrepancia registrada.
  @Column({ type: 'jsonb', name: 'consumibles', nullable: true })
  consumibles?: any;

  // CU-70: tipo de trabajo codificado (T-01..T-10) con el que se preparó el cierre.
  @Column({ type: 'varchar', length: 10, name: 'codigo_trabajo', nullable: true })
  codigoTrabajo?: string | null;

  @Column({ type: 'timestamptz', name: 'fecha_cierre', nullable: true })
  fechaCierre?: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'fecha_registro',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaRegistro!: Date;
}
