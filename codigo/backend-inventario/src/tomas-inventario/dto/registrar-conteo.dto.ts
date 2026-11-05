import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConteoConsumibleDto {
  @IsInt({ message: 'El detalle del consumible es obligatorio.' })
  @IsPositive({ message: 'El detalle debe ser un identificador válido.' })
  id_detalle!: number;

  @IsNumber({}, { message: 'La cantidad contada debe ser un número.' })
  @Min(0, { message: 'La cantidad contada no puede ser negativa.' })
  cantidad_contada!: number;
}

// CU-97: `series` es la lista completa de series contadas hasta ahora
export class RegistrarConteoDto {
  @IsOptional()
  @IsArray({ message: 'Los consumibles deben enviarse en una lista.' })
  @ValidateNested({ each: true })
  @Type(() => ConteoConsumibleDto)
  consumibles?: ConteoConsumibleDto[];

  @IsOptional()
  @IsArray({ message: 'Las series deben enviarse en una lista.' })
  @IsString({ each: true, message: 'Cada serie debe ser un texto.' })
  @MaxLength(80, {
    each: true,
    message: 'El número de serie no puede superar los 80 caracteres.',
  })
  series?: string[];
}
