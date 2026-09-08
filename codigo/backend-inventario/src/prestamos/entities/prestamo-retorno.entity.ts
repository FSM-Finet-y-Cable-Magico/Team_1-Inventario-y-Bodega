import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// CU-82: cada instancia de retorno (total o parcial) de un ítem prestado.
// La tabla se crea con CU-81 porque el módulo es dueño del esquema; la lógica
// de retorno la implementa CU-82.
@Entity('prestamo_retorno')
export class PrestamoRetorno {
  @PrimaryGeneratedColumn({ name: 'id_retorno' })
  id_retorno!: number;

  @Column({ type: 'integer', name: 'id_detalle' })
  id_detalle!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  cantidad!: number | null;

  @Column({ type: 'timestamptz', name: 'fecha_retorno' })
  fecha_retorno!: Date;

  @Column({ type: 'varchar', length: 300, nullable: true })
  observacion!: string | null;

  @Column({ type: 'integer', name: 'id_usuario' })
  id_usuario!: number;
}
