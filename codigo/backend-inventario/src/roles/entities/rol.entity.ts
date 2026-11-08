import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UsuarioRol } from '../../usuarios/entities/usuario-rol.entity';
import { rolInterno } from '../equivalencias-rol';

@Entity('rol')
export class Rol {
  @PrimaryGeneratedColumn()
  id_rol: number;

  // BDD global: al leer se traduce al nombre interno de G1 (Terreno →
  // TECNICO_TERRENO, etc.); al escribir se guarda tal cual.
  @Column({
    nullable: false,
    unique: true,
    transformer: {
      from: (valor: string | null) =>
        valor == null ? valor : rolInterno(valor),
      to: (valor: unknown) => valor,
    },
  })
  nombre_rol: string;

  @Column({ nullable: true })
  descripcion: string;

  @OneToMany(() => UsuarioRol, (ur) => ur.rol)
  usuarioRol: UsuarioRol[];
}
