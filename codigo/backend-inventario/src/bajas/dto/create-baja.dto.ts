import { IsInt, IsOptional, IsString } from 'class-validator';

// CU-78: la validación del motivo (lista cerrada) y de la descripción de 'Otro'
// vive en BajasService para devolver los mensajes exactos del caso de uso.
export class CreateBajaDto {
  @IsInt()
  id_unidad: number;

  @IsString()
  motivo: string;

  @IsOptional()
  @IsString()
  descripcion_otro?: string;
}
