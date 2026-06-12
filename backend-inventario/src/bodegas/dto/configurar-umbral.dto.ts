import { IsNotEmpty, IsNumber, IsInt, Min, Max } from 'class-validator';

const MENSAJE_UMBRAL = 'El umbral debe ser un número entero entre 0 y 9999.';

export class ConfigurarUmbralDto {
  @IsNumber()
  @IsNotEmpty()
  id_tipo_equipo: number;

  // CU-46 Excepción 1: entero entre 0 y 9999 (0 = sin alerta)
  @IsInt({ message: MENSAJE_UMBRAL })
  @IsNotEmpty({ message: MENSAJE_UMBRAL })
  @Min(0, { message: MENSAJE_UMBRAL })
  @Max(9999, { message: MENSAJE_UMBRAL })
  umbral: number;
}
