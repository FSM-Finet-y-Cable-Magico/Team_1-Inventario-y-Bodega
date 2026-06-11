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

  // CU-41: responsable de la bodega. Requiere migración: npm run migrar
  @Column({ nullable: true })
  id_usuario_responsable: number | null;

  @Column({ default: true })
  activa: boolean;
}
