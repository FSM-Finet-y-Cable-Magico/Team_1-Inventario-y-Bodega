import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsString({ message: 'El nombre de usuario es obligatorio' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  @Matches(/^[a-z0-9_]{4,20}$/, {
    message:
      'El nombre de usuario debe tener 4 a 20 caracteres: solo minúsculas, dígitos y guión bajo',
  })
  nombre_usuario: string;
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  @IsString({ message: 'El nombre completo es obligatorio' })
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{2,80}$/, {
    message:
      'El nombre completo debe tener 2 a 80 caracteres: solo letras, espacios y tildes',
  })
  nombre_completo: string;
  // CU-04: el email es opcional; solo se valida cuando viene con contenido
  @IsOptional()
  @IsEmail(
    {},
    { message: 'Por favor proporciona una dirección de correo válida' },
  )
  email?: string;
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsString({ message: 'La contraseña es obligatoria' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W_]{8,64}$/, {
    message:
      'La contraseña debe tener entre 8 y 64 caracteres, e incluir al menos una letra mayúscula, una letra minúscula y un número.',
  })
  password: string;
  // Solo considerado si el actor es SUPERUSUARIO; los demás heredan su propia empresa
  @IsOptional()
  @IsInt()
  id_empresa?: number;
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roles?: number[];
  // CU-04: estado inicial de la cuenta (Activo/Inactivo)
  @IsOptional()
  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  activo?: boolean;
}
