import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { TipoEquipo } from './tipo-equipo.entity';
import { HistorialEstado } from './historial-estado.entity';

@Entity('Unidades_equipo')
export class UnidadEquipo {
    @PrimaryGeneratedColumn ('uuid')
    id!: string;

    @Column ({unique: true, length: 30})
    serialNumber!: string;

    @Column({ unique: true, length: 17, nullable: true })
    macAddress!: string;

    @ManyToOne(() => TipoEquipo, (tipo) => tipo.unidades, { eager: true})
    tipoEquipo!: TipoEquipo;

    @Column({ type: 'enum', enum: ['Finet', 'Cable Magico']})
    empresa!: string;

    @Column ({
        type: 'enum',
        enum: ['En bodega', 'Asignado a tecnico', 'Instalado en cliente', 'En revision', 'En prestamo externo', 'Dado de baja'],
        default: 'En bodega',
    })
    estadoActual!: string;

    @Column()
    proveedorId!: string;

    @Column({type: 'date'})
    fechaAdquisicion!: Date;

    @Column({ type: 'text', nullable: true})
    observaciones!: string;

    @Column({ length: 60, nullable: true})
    ubicacionFisicaBodega!: string | null;

    @OneToMany(() => HistorialEstado, (historial) => historial.unidad, { cascade: true})
    historialEstados!: HistorialEstado[];
}