import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// CU-97: resultado de cada línea de la toma.
export const RESULTADO_COINCIDE = 'COINCIDE';
export const RESULTADO_FALTANTE = 'FALTANTE';
export const RESULTADO_SOBRANTE = 'SOBRANTE';
export const RESULTADO_OTRA_UBICACION = 'OTRA_UBICACION';
export const RESULTADO_NO_REGISTRADA = 'NO_REGISTRADA';

// Una fila por consumible (id_unidad y numero_serie nulos) o por serie, ya sea
// esperada en la bodega (es_esperada) o encontrada sin estar en la foto inicial.
@Entity('toma_inventario_detalle')
export class TomaInventarioDetalle {
  @PrimaryGeneratedColumn()
  id_detalle!: number;

  @Column({ type: 'integer' })
  id_toma!: number;

  @Column({ type: 'integer', nullable: true })
  id_tipo_equipo!: number | null;

  @Column({ type: 'integer', nullable: true })
  id_unidad!: number | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  numero_serie!: string | null;

  @Column({ type: 'boolean', default: true })
  es_esperada!: boolean;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  cantidad_esperada!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  cantidad_contada!: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  resultado!: string | null;
}
