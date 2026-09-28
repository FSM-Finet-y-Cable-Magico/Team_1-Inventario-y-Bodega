import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TipoEquipo } from './tipo-equipo.entity';
import { HistorialEstado } from './historial-estado.entity';

@Entity('unidad_equipo')
export class UnidadEquipo {
  @PrimaryGeneratedColumn({ name: 'id_unidad' })
  id_unidad!: number;

  @Column({ type: 'integer', name: 'id_tipo_equipo', nullable: true })
  id_tipo_equipo!: number;

  @Column({ type: 'integer', name: 'id_empresa', nullable: true })
  id_empresa!: number;

  @Column({
    type: 'varchar',
    length: 80,
    unique: true,
    name: 'numero_serie',
    nullable: false,
  })
  serialNumber!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  modelo?: string;

  @Column({ type: 'varchar', length: 30, nullable: false })
  estado!: string;

  @Column({ type: 'date', name: 'fecha_adquisicion', nullable: true })
  fechaAdquisicion?: Date;

  @Column({ type: 'date', name: 'fecha_venc_garantia', nullable: true })
  fechaVencGarantia?: Date | null;

  @Column({ type: 'text', name: 'diagnostico_tecnico', nullable: true })
  diagnosticoTecnico?: string | null;

  @Column({ type: 'integer', name: 'id_cliente_instalado', nullable: true })
  id_cliente_instalado?: number;

  @Column({ type: 'integer', name: 'id_bodega_actual', nullable: true })
  id_bodega_actual?: number | null;

  @Column({ type: 'varchar', length: 30, name: 'numero_poste', nullable: true })
  numeroPoste?: string | null;

  @Column({ type: 'integer', name: 'id_caja_nap', nullable: true })
  id_caja_nap?: number;

  // CU-57: técnico que tiene la unidad asignada (estado 'Asignado a técnico')
  @Column({ type: 'integer', name: 'id_tecnico_asignado', nullable: true })
  idTecnicoAsignado?: number | null;

  @Column({
    type: 'varchar',
    length: 17,
    name: 'mac_address',
    nullable: true,
    unique: true,
  })
  macAddress?: string | null;

  // CU-32/CU-33/CU-34: proveedor, observaciones y ubicación física.
  // Requieren migración: npm run migrar
  @Column({ type: 'varchar', length: 80, nullable: true })
  proveedor?: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  observaciones?: string | null;

  @Column({
    type: 'varchar',
    length: 60,
    name: 'ubicacion_fisica',
    nullable: true,
  })
  ubicacionFisica?: string | null;

  // CU-78/CU-80: motivo de la baja definitiva (lista cerrada) y su descripción
  // cuando el motivo es 'Otro'. Requieren migración: npm run migrar
  @Column({ type: 'varchar', length: 40, name: 'motivo_baja', nullable: true })
  motivoBaja?: string | null;

  @Column({
    type: 'varchar',
    length: 200,
    name: 'motivo_baja_detalle',
    nullable: true,
  })
  motivoBajaDetalle?: string | null;

  // CU-64: cliente y dirección persistidos del cierre de instalación (G3 identifica
  // por RUT) para CU-48/71/73/87, y SRV del servicio instalado. El SRV del cierre
  // vive en `integracion_cierre`; aquí se guarda el vigente de la unidad.
  @Column({ type: 'varchar', length: 20, name: 'cliente_rut', nullable: true })
  clienteRut?: string | null;

  @Column({
    type: 'varchar',
    length: 150,
    name: 'cliente_nombre',
    nullable: true,
  })
  clienteNombre?: string | null;

  @Column({
    type: 'varchar',
    length: 300,
    name: 'direccion_instalacion',
    nullable: true,
  })
  direccionInstalacion?: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'comuna_instalacion',
    nullable: true,
  })
  comunaInstalacion?: string | null;

  @Column({ type: 'varchar', length: 20, name: 'srv', nullable: true })
  srv?: string | null;

  // Relaciones tipadas de TypeORM mapeadas a tus llaves foráneas reales
  @ManyToOne(() => TipoEquipo, (tipo) => tipo.unidades, { eager: true })
  @JoinColumn({ name: 'id_tipo_equipo' })
  tipoEquipo!: TipoEquipo;

  @OneToMany(() => HistorialEstado, (historial) => historial.unidad)
  historialEstados!: HistorialEstado[];
}
