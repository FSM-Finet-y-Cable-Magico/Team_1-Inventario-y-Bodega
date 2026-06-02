import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, OneToMany } from "typeorm";
import { UnidadEquipo } from './unidad-equipo.entity';

@Entity('tipos_equipo')
@Unique(['nombre', 'marca', 'modelo'])
export class TipoEquipo{
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({length: 10})
    nombre!: string;

    @Column({
        type: 'enum',
        enum: ['ONT/ONU','Decodificador', 'Splitter', 'Herramienta', 'Consumible fibra optica', 'Consumible conector', 'Consumible otro', 'Otro']
    })
    categoria!: string;

    @Column({length: 50})
    marca!: string;

    @Column({length: 50})
    modelo!: string;

    @Column({type: 'text', nullable: true})
    descripcionTecnica!: string;

    @Column({type: 'boolean', default: true})
    requiereSerialNumber!: boolean;

    @Column({type: 'enum', enum: ['Unidad', 'Metro', 'Rollo'], nullable: true})
    unidadMedida!: string;

    @Column({ type: 'int', default: 0 })
    duracionGarantiaDias!: number; // 0 significa sin garantía

    @Column({ type: 'enum', enum: ['Activo', 'Inactivo'], default: 'Activo' })
    estado!: string;

    @Column({ type: 'string', nullable: true })
    fichaTecnicaPdfPath!: string; // CU-29: Ruta del archivo PDF en el servidor

    @OneToMany(() => UnidadEquipo, (unidad) => unidad.tipoEquipo)
    unidades!: UnidadEquipo[];
}   
