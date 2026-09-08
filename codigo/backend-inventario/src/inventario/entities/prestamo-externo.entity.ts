import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UnidadEquipo } from './unidad-equipo.entity';

@Entity('prestamo_externo')
export class PrestamoExterno {
  @PrimaryGeneratedColumn({ name: 'id_prestamo' })
  id_prestamo!: number;

  @Column({ type: 'varchar', length: 30, name: 'tipo' })
  tipo!: 'REPARACION_EXTERNA' | 'PRESTAMO_EXTERNO';

  @Column({ type: 'integer', name: 'id_empresa' })
  id_empresa!: number;

  @Column({ type: 'integer', name: 'id_unidad', nullable: true })
  id_unidad?: number | null;

  @ManyToOne(() => UnidadEquipo)
  @JoinColumn({ name: 'id_unidad' })
  unidad?: UnidadEquipo;

  @Column({ type: 'varchar', length: 80, name: 'nombre_receptor' })
  nombreReceptor!: string;

  @Column({ type: 'varchar', length: 12, name: 'rut_receptor', nullable: true })
  rutReceptor?: string | null;

  @Column({
    type: 'timestamptz',
    name: 'fecha_salida',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaSalida!: Date;

  @Column({ type: 'date', name: 'fecha_retorno_estimada' })
  fechaRetornoEstimada!: Date;

  @Column({ type: 'date', name: 'fecha_retorno_real', nullable: true })
  fechaRetornoReal?: Date | null;

  @Column({ type: 'text', name: 'detalle' })
  detalle!: string;

  @Column({ type: 'varchar', length: 20, name: 'estado', default: 'ACTIVO' })
  estado!: 'ACTIVO' | 'CERRADO';

  // CU-76: resultado del servicio al registrar el retorno de reparación externa
  @Column({ type: 'varchar', length: 20, name: 'resultado', nullable: true })
  resultado?: 'REPARADO' | 'NO_REPARADO' | null;

  @Column({ type: 'integer', name: 'id_usuario_registro' })
  idUsuarioRegistro!: number;

  // CU-81: los préstamos por lote (módulo `prestamos`) comparten esta cabecera y
  // agregan su correlativo PE-XXXXX y la bodega de origen. Quedan en null en los
  // registros de reparación externa (CU-75), que van por unidad.
  @Column({ type: 'varchar', length: 12, name: 'correlativo', nullable: true })
  correlativo?: string | null;

  @Column({ type: 'integer', name: 'id_bodega_origen', nullable: true })
  idBodegaOrigen?: number | null;
}
