import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('bodega')
export class Bodega {
  @PrimaryGeneratedColumn()
  id_bodega: number;

  @Column({ nullable: true })
  id_empresa: number;

  @Column({ nullable: false })
  nombre: string;

  @Column({ nullable: true })
  direccion: string;

  @Column({ default: true })
  activa: boolean;
}
