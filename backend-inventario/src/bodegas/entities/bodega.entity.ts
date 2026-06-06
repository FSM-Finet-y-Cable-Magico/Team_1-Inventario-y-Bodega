import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

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

  @Column({ nullable: false })
  id_responsable: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'id_responsable' })
  responsable: Usuario;
}
