import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TipoEquipo } from './tipo-equipo.entity';
import { Bodega } from '../../bodegas/entities/bodega.entity';

@Entity('unidad_equipo')
export class UnidadEquipo {
  @PrimaryGeneratedColumn()
  id_unidad: number;

  @Column({ nullable: true })
  id_tipo_equipo: number;

  @Column({ nullable: true })
  id_empresa: number;

  @Column({ unique: true, nullable: false })
  numero_serie: string;

  @Column({ nullable: true })
  modelo: string;

  @Column({ nullable: false })
  estado: string;

  @Column({ type: 'date', nullable: true })
  fecha_adquisicion: Date;

  @Column({ type: 'date', nullable: true })
  fecha_venc_garantia: Date;

  @Column({ nullable: true })
  diagnostico_tecnico: string;

  @Column({ nullable: true })
  id_cliente_instalado: number;

  @Column({ nullable: true })
  id_bodega_actual: number;

  @Column({ nullable: true })
  numero_poste: string;

  @Column({ nullable: true })
  id_caja_nap: number;

  @ManyToOne(() => TipoEquipo)
  @JoinColumn({ name: 'id_tipo_equipo' })
  tipoEquipo: TipoEquipo;

  @ManyToOne(() => Bodega)
  @JoinColumn({ name: 'id_bodega_actual' })
  bodega: Bodega;
}
