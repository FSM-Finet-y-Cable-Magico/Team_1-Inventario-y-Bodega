import { Type } from 'class-transformer';
import {
  IsInt,
  IsArray,
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
