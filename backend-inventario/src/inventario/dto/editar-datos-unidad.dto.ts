import { IsString, IsOptional, MaxLength, IsInt, IsPositive } from 'class-validator';

export class EditarDatosUnidadDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

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
