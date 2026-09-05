import { Type } from 'class-transformer';
import {
  IsInt,
  IsArray,
  IsString,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';

export class ItemRecepcionDto {
  @IsInt({ message: 'El ítem de la recepción es obligatorio' })
  id_detalle: number;

  // CU-54: la cantidad recibida en esta instancia es un entero entre 0 y el pendiente
  // del ítem. El tope depende de la orden, así que se valida en el service (Excepción 1).
  @IsInt({ message: 'La cantidad recibida debe ser un número entero' })
  @Min(0, { message: 'La cantidad recibida no puede ser negativa' })
  cantidad_recibida: number;

  // CU-55: números de serie de las unidades físicas recibidas en esta instancia.
  // Obligatorio y con largo == cantidad_recibida solo si el tipo de equipo del ítem
  // es individualizable (requiere_serie_individual = true); los consumibles no lo llevan.
  @IsOptional()
  @IsArray({ message: 'Los números de serie deben venir en un listado' })
  @IsString({ each: true, message: 'Cada número de serie debe ser texto' })
  numeros_serie?: string[];
}

export class RegistrarRecepcionDto {
  @IsArray({ message: 'Debe incluir un listado de ítems' })
  @ArrayMinSize(1, {
    message: 'Debe indicar al menos un ítem para registrar la recepción',
  })
  @ValidateNested({ each: true })
  @Type(() => ItemRecepcionDto)
  items: ItemRecepcionDto[];
}
