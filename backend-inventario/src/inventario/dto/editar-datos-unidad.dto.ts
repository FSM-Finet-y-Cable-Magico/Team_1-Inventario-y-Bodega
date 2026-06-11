import { IsString, IsOptional, MaxLength, IsInt, IsPositive } from 'class-validator';

export class EditarDatosUnidadDto {
  // CU-34: observaciones de máximo 300 caracteres
  @IsOptional()
  @IsString()
  @MaxLength(300)
  observaciones?: string;

  // CU-34: ubicación física en bodega (máximo 60 caracteres)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  ubicacion_fisica?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  id_bodega_actual?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numero_poste?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  modelo?: string;
}
