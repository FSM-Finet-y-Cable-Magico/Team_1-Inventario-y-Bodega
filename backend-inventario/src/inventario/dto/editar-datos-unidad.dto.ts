import { IsString, IsOptional, MaxLength, IsInt, IsPositive } from 'class-validator';

export class EditarDatosUnidadDto {
  // CU-34: observaciones de máximo 300 caracteres
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto.' })
  @MaxLength(300, { message: 'Las observaciones no pueden superar los 300 caracteres.' })
  observaciones?: string;

  // CU-34: ubicación física en bodega (máximo 60 caracteres)
  @IsOptional()
  @IsString({ message: 'La ubicación física debe ser texto.' })
  @MaxLength(60, { message: 'La ubicación física en bodega no puede superar los 60 caracteres.' })
  ubicacion_fisica?: string;

  @IsOptional()
  @IsInt({ message: 'La bodega debe ser un identificador numérico.' })
  @IsPositive({ message: 'La bodega debe ser un identificador válido.' })
  id_bodega_actual?: number;

  @IsOptional()
  @IsString({ message: 'El número de poste debe ser texto.' })
  @MaxLength(30, { message: 'El número de poste no puede superar los 30 caracteres.' })
  numero_poste?: string;

  @IsOptional()
  @IsString({ message: 'El modelo debe ser texto.' })
  @MaxLength(80, { message: 'El modelo no puede superar los 80 caracteres.' })
  modelo?: string;
}
