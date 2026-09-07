import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// CU-49: tabla puente N:M entre proveedor y tipo_equipo
@Entity('proveedor_tipo_equipo')
export class ProveedorTipoEquipo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  id_proveedor: number;

  @Column({ nullable: false })
  id_tipo_equipo: number;
}
