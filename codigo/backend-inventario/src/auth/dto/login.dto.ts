import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// CU-01 Excepción 1: ante formato inválido el sistema responde el mensaje
// genérico, sin especificar cuál de los dos campos falló.
const MSG_GENERICO = 'Usuario o contraseña incorrectos.';

export const FORMATO_USUARIO_O_EMAIL =
  /^(?:[A-Za-z0-9._-]{3,50}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

export class LoginDto {
  @IsString({ message: MSG_GENERICO })
  @IsNotEmpty({ message: MSG_GENERICO })
  // BDD global: el usuario lo pudo crear G1 (jperez), G3 (nombre.apellido) o
  // G8 (solo email). Se acepta el nombre de usuario o el email.
  @MinLength(3, { message: MSG_GENERICO })
  @MaxLength(150, { message: MSG_GENERICO })
  @Matches(FORMATO_USUARIO_O_EMAIL, { message: MSG_GENERICO })
  nombre_usuario: string;

  @IsString({ message: MSG_GENERICO })
  @IsNotEmpty({ message: MSG_GENERICO })
  @MinLength(8, { message: MSG_GENERICO })
  // 72 = límite de bcrypt y máximo que permite G8.
  @MaxLength(72, { message: MSG_GENERICO })
  password: string;
}
