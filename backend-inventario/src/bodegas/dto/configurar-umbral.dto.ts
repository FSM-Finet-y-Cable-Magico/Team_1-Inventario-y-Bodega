import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class ConfigurarUmbralDto {
  @IsNumber()
  @IsNotEmpty()
  id_tipo_equipo: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(9999)
  umbral: number;
}
