import { IsInt, IsPositive } from 'class-validator';

// CU-97: apertura de una toma para una bodega
export class AbrirTomaDto {
  @IsInt({ message: 'La bodega es obligatoria.' })
  @IsPositive({ message: 'La bodega debe ser un identificador válido.' })
  id_bodega!: number;
}
