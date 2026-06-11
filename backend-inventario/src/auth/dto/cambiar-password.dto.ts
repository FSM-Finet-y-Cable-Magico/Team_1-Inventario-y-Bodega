import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// CU-10: la nueva contraseña debe cumplir las reglas de RF-01
export class CambiarPasswordDto {
  @IsString({ message: 'El nombre de usuario es obligatorio' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  @MinLength(4, { message: 'Usuario o contraseña incorrectos.' })
  @MaxLength(20, { message: 'Usuario o contraseña incorrectos.' })
  @Matches(/^[a-z0-9_]+$/, { message: 'Usuario o contraseña incorrectos.' })
  nombre_usuario: string;

  @IsString({ message: 'La contraseña actual es obligatoria' })
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  password_actual: string;

  @IsString({ message: 'La nueva contraseña es obligatoria' })
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W_]{8,64}$/, {
    message:
      'La nueva contraseña debe tener entre 8 y 64 caracteres, e incluir al menos una letra mayúscula, una letra minúscula y un número.',
  })
  nueva_password: string;
}
