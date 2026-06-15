import { Entity, PrimaryGeneratedColumn } from 'typeorm';
import { CreateDateColumn } from 'typeorm';
import { Column } from 'typeorm';
import { OneToMany } from 'typeorm';
import { UsuarioRol } from './usuario-rol.entity';

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn()
  id_usuario: number;

  @Column({ nullable: true }) //aca cague no me acuerdo como se pone la FK en la relacion pero lo hago dp
  id_empresa: number;

  @Column({ nullable: false })
  nombre_completo: string;

  @Column({ unique: true, nullable: true })
  nombre_usuario: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: false })
  password_hash: string;

  @Column({ nullable: true, default: true }) //los default no los vi documentados, asumo que sera asi
  activo: boolean;

  @Column({ type: 'int', default: 0, nullable: false })
  intentos_fallidos: number;

  @Column({ type: 'timestamptz', nullable: true })
  bloqueado_hasta: Date | null;

  @Column({ type: 'boolean', default: false, nullable: false })
  debe_cambiar_password: boolean;

  @CreateDateColumn({ type: 'timestamptz', nullable: true })
  fecha_creacion: Date;

  @OneToMany(() => UsuarioRol, (ur) => ur.usuario)
  usuarioRoles: UsuarioRol[];
}
