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

  @IsArray()
  ids_unidades: number[];
}
