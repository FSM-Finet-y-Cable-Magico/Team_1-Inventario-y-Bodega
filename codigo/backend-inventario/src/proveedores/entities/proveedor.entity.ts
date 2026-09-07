import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

// CU-49: proveedor global (sin id_empresa, compartido entre ambas empresas)
@Entity('proveedor')
export class Proveedor {
  @PrimaryGeneratedColumn()
  id_proveedor: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  nombre_comercial: string;

  // formato XXXXXXXX-X, unico por proveedor
  @Column({ type: 'varchar', length: 12, unique: true, nullable: false })
  rut: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  nombre_contacto: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @CreateDateColumn()
  fecha_creacion: Date;
}
