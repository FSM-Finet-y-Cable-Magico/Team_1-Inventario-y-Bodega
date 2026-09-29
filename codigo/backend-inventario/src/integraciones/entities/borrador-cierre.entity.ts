import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

// CU-70: borrador del cierre que el técnico prepara en terreno con el catálogo
// codificado (T-01..T-10). El cierre de la OT lo ejecuta G3 (CU-63); este registro
// guarda lo que el técnico dejó precompletado para esa OT, y el webhook de cierre
// lo usa para completar los campos que G3 no envíe (CU-69).
// Un borrador por OT y empresa: el técnico lo edita hasta que llega el cierre.
@Entity('borrador_cierre')
@Unique('uq_borrador_cierre_ot', ['id_ot', 'id_empresa'])
export class BorradorCierre {
  @PrimaryGeneratedColumn({ name: 'id_borrador' })
  id_borrador!: number;

  @Column({ type: 'integer', name: 'id_ot' })
  id_ot!: number;

  @Column({ type: 'integer', name: 'id_empresa' })
  id_empresa!: number;

  @Column({ type: 'integer', name: 'id_tecnico' })
  id_tecnico!: number;

  // Código del catálogo (T-01..T-10). Null = Excepción 1: el técnico completó el
  // formulario manualmente porque ningún código aplicaba.
  @Column({ type: 'varchar', length: 10, name: 'codigo_trabajo', nullable: true })
  codigoTrabajo?: string | null;

  @Column({
    type: 'varchar',
    length: 300,
    name: 'falla_reportada',
    nullable: true,
  })
  fallaReportada?: string | null;

  @Column({
    type: 'varchar',
    length: 300,
    name: 'solucion_aplicada',
    nullable: true,
  })
  solucionAplicada?: string | null;

  // 'RESUELTO' | 'PARCIAL' | 'SIN_SOLUCION' (los mismos que envía G3 en el cierre).
  @Column({ type: 'varchar', length: 30, name: 'resultado', nullable: true })
  resultado?: string | null;

  @Column({
    type: 'varchar',
    length: 120,
    name: 'categoria_falla',
    nullable: true,
  })
  categoriaFalla?: string | null;

  @UpdateDateColumn({ type: 'timestamptz', name: 'fecha_actualizacion' })
  fechaActualizacion!: Date;
}
