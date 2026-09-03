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

export class LoginDto {
  @IsString({ message: MSG_GENERICO })
  @IsNotEmpty({ message: MSG_GENERICO })
  @MinLength(4, { message: MSG_GENERICO })
  @MaxLength(20, { message: MSG_GENERICO })
  @Matches(/^[a-z0-9_]+$/, { message: MSG_GENERICO })
  nombre_usuario: string;

  @IsString({ message: MSG_GENERICO })
  @IsNotEmpty({ message: MSG_GENERICO })
  @MinLength(8, { message: MSG_GENERICO })
  @MaxLength(64, { message: MSG_GENERICO })
  password: string;
}
