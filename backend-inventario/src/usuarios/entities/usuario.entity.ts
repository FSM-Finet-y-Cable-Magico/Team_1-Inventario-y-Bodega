import { Entity, PrimaryGeneratedColumn } from 'typeorm';
import { CreateDateColumn } from 'typeorm/browser';
import { Column } from 'typeorm/browser';

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

  @CreateDateColumn({ type: 'timestamptz', nullable: true })
  fecha_creacion: Date;

  /*
  relaciones, ver despues. Ojo que estoy viendo que hay relaciones mal hechas, no se si usuario deberia tener el usuario rol para comenzar, pregunto nomas...

  @OneToOne(()=>Empresa)
  @JoinColumn({name:'id_empresa})
  empresa:Empresa;
  */
}
