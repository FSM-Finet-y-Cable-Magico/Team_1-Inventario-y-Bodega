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

    // CU-24: marca, modelo, descripción técnica, unidad de medida y garantía.
    // Requieren la migración: npm run migrar (ALTER TABLE tipo_equipo ...)
    @Column({ type: 'varchar', length: 50, nullable: true })
    marca?: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    modelo?: string | null;

    @Column({ type: 'varchar', length: 500, name: 'descripcion_tecnica', nullable: true })
    descripcionTecnica?: string | null;

    @Column({ type: 'varchar', length: 20, name: 'unidad_medida', nullable: true })
    unidadMedida?: string | null;

    @Column({ type: 'integer', name: 'garantia_dias', nullable: true, default: 0 })
    garantiaDias?: number | null;

    @Column({ type: 'boolean', name: 'requiere_serie_individual', nullable: true })
    requiereSerialNumber!: boolean;

    @Column({ type: 'text', name: 'ficha_tecnica_pdf_url', nullable: true })
    fichaTecnicaPdfUrl?: string;

    @Column({ type: 'boolean', default: true })
    activo!: boolean;

    @OneToMany(() => UnidadEquipo, (unidad) => unidad.tipoEquipo)
    unidades!: UnidadEquipo[];
}

