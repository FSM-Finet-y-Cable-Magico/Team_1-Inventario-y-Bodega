import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UsuarioRol } from '../../usuarios/entities/usuario-rol.entity';

@Entity('rol')
export class Rol {
  @PrimaryGeneratedColumn()
  id_rol: number;

  @Column({ nullable: false, unique: true })
  nombre_rol: string;

  @Column({ nullable: true })
  descripcion: string;

  @OneToMany(() => UsuarioRol, (ur) => ur.rol)
  usuarioRol: UsuarioRol[];
}
