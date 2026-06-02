import { Entity, PrimaryGeneratedColumn } from 'typeorm';
import { CreateDateColumn } from 'typeorm';
import { Column } from 'typeorm';
import { JoinColumn } from 'typeorm';
import { ManyToOne } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Rol } from '../../roles/entities/rol.entity';

@Entity('usuario_rol')
export class UsuarioRol {
  @PrimaryGeneratedColumn()
  id_usuario_rol: number;

  @Column({ nullable: true })
  id_usuario: number;

  @Column({ nullable: false })
  id_rol: number;

  @CreateDateColumn({ nullable: true })
  fecha_creacion: Date;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'id_rol' })
  rol: Rol;
}
