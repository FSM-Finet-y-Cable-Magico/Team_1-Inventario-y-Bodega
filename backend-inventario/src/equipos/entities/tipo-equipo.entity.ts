import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_equipo')
export class TipoEquipo {
  @PrimaryGeneratedColumn()
  id_tipo_equipo: number;

  @Column({ nullable: true })
  id_empresa: number;

  @Column({ nullable: false })
  nombre: string;

  @Column({ nullable: true })
  categoria: string;

  @Column({ name: 'requiere_serie_individual', nullable: true })
  requiere_serie_individual: boolean;

  @Column({ nullable: true })
  ficha_tecnica_pdf_url: string;

  @Column({ default: true })
  activo: boolean;
}
