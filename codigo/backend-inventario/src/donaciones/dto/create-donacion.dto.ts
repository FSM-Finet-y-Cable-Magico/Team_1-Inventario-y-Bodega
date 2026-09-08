import { IsArray, IsOptional, IsString } from 'class-validator';

// CU-80: el formato de cada campo lo valida DonacionesService para devolver los
// mensajes acumulados del caso de uso.
export class CreateDonacionDto {
  @IsString()
  nombre_institucion: string;

  @IsString()
  rut_institucion: string;

  @IsString()
  fecha_donacion: string;

  @IsOptional()
  @IsString()
  numero_resolucion?: string;

  // Opcional en el DTO para que la validación previa (POST /donaciones/validar)
  // pueda comprobar solo los datos de la institución; al registrar, el service
  // exige al menos un equipo con el mensaje del caso de uso.
  @IsOptional()
  @IsArray()
  ids_unidades: number[];
}
