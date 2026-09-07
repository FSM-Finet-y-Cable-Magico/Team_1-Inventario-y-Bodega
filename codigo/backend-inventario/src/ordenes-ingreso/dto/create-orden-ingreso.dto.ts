import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsDateString,
  IsArray,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  Min,
  Max,
  Matches,
  Length,
} from 'class-validator';

export class ItemOrdenIngresoDto {
  @IsInt({ message: 'El tipo de equipo es obligatorio' })
  id_tipo_equipo: number;

  @IsInt({ message: 'La cantidad esperada debe ser un número entero' })
  @Min(1, { message: 'La cantidad esperada debe ser mayor a 0' })
  cantidad_esperada: number;

  @IsInt({ message: 'La garantía en días debe ser un número entero' })
  @Min(0, { message: 'La garantía en días debe ser al menos 0' })
  @Max(3650, { message: 'La garantía en días no puede superar 3650' })
  garantia_dias: number;
}

export class CreateOrdenIngresoDto {
  @IsInt({ message: 'El proveedor es obligatorio' })
  id_proveedor: number;

  @IsString({ message: 'El número de documento es obligatorio' })
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  @Length(1, 30, {
    message: 'El número de documento debe tener entre 1 y 30 caracteres',
  })
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'El número de documento debe ser alfanumérico',
  })
  numero_documento: string;

  @IsDateString(
    {},
    {
      message: 'La fecha del documento debe tener formato válido (YYYY-MM-DD)',
    },
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha del documento debe tener formato válido (YYYY-MM-DD)',
  })
  @IsNotEmpty({ message: 'La fecha del documento es obligatoria' })
  fecha_documento: string;

  // La empresa destinataria la asigna el backend según el actor;
  // solo un Superusuario puede indicarla (mismo patrón que CU-41 en bodegas).
  @IsInt({ message: 'La empresa destinataria es obligatoria' })
  @IsOptional()
  id_empresa_destino?: number;

  @IsInt({ message: 'La bodega de destino es obligatoria' })
  id_bodega_destino: number;

  @IsArray({ message: 'Debe incluir un listado de ítems' })
  @ArrayMinSize(1, {
    message: 'Debe agregar al menos un ítem a la orden de ingreso',
  })
  @ValidateNested({ each: true })
  @Type(() => ItemOrdenIngresoDto)
  items: ItemOrdenIngresoDto[];
}
