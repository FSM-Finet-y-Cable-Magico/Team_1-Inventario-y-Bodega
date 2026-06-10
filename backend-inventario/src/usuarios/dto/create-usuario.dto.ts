import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]{4,20}$/, {
    message:
      '(debe contener 4 a 20 caracteres, solo minúsculas, dígitos y guión bajo)',
  })
  nombre_usuario: string;
  @IsNotEmpty()
  @IsString()
  nombre_completo: string;
  @IsNotEmpty()
  @IsString()
  @IsEmail(
    {},
    { message: 'Por favor proporciona una dirección de correo válida' },
  )
  email?: string;
  @IsNotEmpty()
  @IsString()
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
}
