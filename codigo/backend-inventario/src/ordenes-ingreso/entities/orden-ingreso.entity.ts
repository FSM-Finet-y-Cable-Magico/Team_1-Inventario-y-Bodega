import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

// CU-52: orden de ingreso desde proveedor
@Entity('orden_ingreso')
export class OrdenIngreso {
  @PrimaryGeneratedColumn()
  id_orden: number;

  @Column({ type: 'varchar', length: 10, unique: true, nullable: false })
  correlativo: string;

  @Column({ nullable: false })
  id_proveedor: number;

  @Column({ type: 'varchar', length: 30, nullable: false })
  numero_documento: string;

  @Column({ type: 'date', nullable: false })
  fecha_documento: string;

  @Column({ nullable: false })
  id_empresa_destino: number;

  @Column({ nullable: false })
  id_bodega_destino: number;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: false,
    default: 'Pendiente de recepción',
  })
  estado: string;

  @Column({ nullable: false })
  id_usuario_registro: number;

  @CreateDateColumn()
  fecha_creacion: Date;
}
