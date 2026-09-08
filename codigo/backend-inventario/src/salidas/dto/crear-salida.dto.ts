import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
  ArrayNotEmpty,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

// CU-57: un ítem de la salida. UNIDAD → numero_serie obligatorio;
// CONSUMIBLE → id_tipo_equipo + cantidad obligatorios.
export class ItemSalidaDto {
  @IsIn(['UNIDAD', 'CONSUMIBLE'], {
    message: 'Cada ítem debe ser de tipo UNIDAD o CONSUMIBLE.',
  })
  tipo!: 'UNIDAD' | 'CONSUMIBLE';

  @ValidateIf((o) => o.tipo === 'UNIDAD')
  @IsString({
    message:
      'El número de serie es obligatorio para los equipos individualizables.',
  })
  @MaxLength(80, {
    message: 'El número de serie no puede superar los 80 caracteres.',
  })
  numero_serie?: string;

  @ValidateIf((o) => o.tipo === 'CONSUMIBLE')
  @IsInt({ message: 'El tipo de equipo es obligatorio para los consumibles.' })
  @IsPositive({
    message: 'El tipo de equipo debe ser un identificador válido.',
  })
  id_tipo_equipo?: number;

  @ValidateIf((o) => o.tipo === 'CONSUMIBLE')
  @IsNumber({}, { message: 'La cantidad debe ser un número.' })
  @Min(0.01, { message: 'La cantidad debe ser mayor a cero.' })
  cantidad?: number;
}

export class CrearSalidaDto {
  @IsInt({ message: 'El técnico destinatario es obligatorio.' })
  @IsPositive({
    message: 'El técnico destinatario debe ser un identificador válido.',
  })
  id_tecnico!: number;

  @IsInt({ message: 'La bodega de origen es obligatoria.' })
  @IsPositive({
    message: 'La bodega de origen debe ser un identificador válido.',
  })
  id_bodega_origen!: number;

  @IsArray({ message: 'La salida debe incluir al menos un ítem.' })
  @ArrayNotEmpty({ message: 'La salida debe incluir al menos un ítem.' })
  @ValidateNested({ each: true })
  @Type(() => ItemSalidaDto)
  items!: ItemSalidaDto[];
}
