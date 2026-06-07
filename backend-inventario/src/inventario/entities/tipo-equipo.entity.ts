import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { UnidadEquipo } from './unidad-equipo.entity';

@Entity('modelo_equipo')
export class TipoEquipo{
    @PrimaryGeneratedColumn({name: 'id_modelo'})
    id_modelo!: number;

    @Column({type: 'varchar', length: 100, nullable: false})
    nombre!: string;

    @Column({type: 'varchar', length: 50, nullable: false})
    marca!: string;

    @Column({ type: 'integer', nullable: false })
    id_categoria_equipo!: number; 

    @Column({ type: 'text', nullable: true })
    descripcion!: string;

    @Column({ type: 'boolean', default: true, name: 'requiere_numero_serie' })
    requiereSerialNumber!: boolean;

    @Column({ type: 'varchar', length: 20, nullable: true, name: 'unidad_medida' })
    unidadMedida?: string;

    @Column({ type: 'integer', default: 0, name: 'duracion_garantia_dias' })
    duracionGarantiaDias!: number;

    @Column({ type: 'boolean', default: true })
    activo!: boolean;

    @Column({ type: 'varchar', nullable: true, name: 'ficha_tecnica_pdf_path' })
    fichaTecnicaPdfPath?: string;

    @OneToMany(() => UnidadEquipo, (unidad) => unidad.tipoEquipo)
    unidades!: UnidadEquipo[];
} 
