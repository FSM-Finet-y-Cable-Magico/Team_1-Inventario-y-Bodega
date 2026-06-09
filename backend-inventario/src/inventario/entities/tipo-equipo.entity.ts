import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { UnidadEquipo } from './unidad-equipo.entity';

@Entity('tipo_equipo')
export class TipoEquipo {
    @PrimaryGeneratedColumn({ name: 'id_tipo_equipo' })
    id_tipo_equipo!: number;

    @Column({ type: 'integer', name: 'id_empresa', nullable: true })
    id_empresa?: number;

    @Column({ type: 'varchar', length: 100, nullable: false })
    nombre!: string;

    @Column({ type: 'varchar', length: 40, nullable: true })
    categoria?: string;

    @Column({ type: 'boolean', name: 'requiere_serie_individual', nullable: true })
    requiereSerialNumber!: boolean;

    @Column({ type: 'text', name: 'ficha_tecnica_pdf_url', nullable: true })
    fichaTecnicaPdfUrl?: string;

    @Column({ type: 'boolean', default: true })
    activo!: boolean;

    @OneToMany(() => UnidadEquipo, (unidad) => unidad.tipoEquipo)
    unidades!: UnidadEquipo[];
}

