import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  Matches,
  IsEmail,
  IsArray,
  IsInt,
} from 'class-validator';

export class CreateProveedorDto {
  @IsString({ message: 'El nombre comercial es obligatorio' })
  @IsNotEmpty({ message: 'El nombre comercial es obligatorio' })
  @Length(3, 100, {
    message: 'El nombre comercial debe tener entre 3 y 100 caracteres',
  })
  nombre_comercial: string;

  // CU-49: formato XXXXXXXX-X (7 u 8 dígitos + guión + dígito verificador)
  @IsString({ message: 'El RUT es obligatorio' })
  @IsNotEmpty({ message: 'El RUT es obligatorio' })
  @Matches(/^\d{7,8}-[\dKk]$/, {
    message: 'El RUT debe tener el formato XXXXXXXX-X',
  })
  rut: string;

  @IsOptional()
  @IsString()
  @Length(2, 80, {
    message: 'El nombre de contacto debe tener entre 2 y 80 caracteres',
  })
  nombre_contacto?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8,15}$/, {
    message: 'El teléfono debe contener entre 8 y 15 dígitos',
  })
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  email?: string;

  // CU-49: tipos de equipo suministrados (opcional, selección múltiple del catálogo)
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  ids_tipos_equipo?: number[];
}
