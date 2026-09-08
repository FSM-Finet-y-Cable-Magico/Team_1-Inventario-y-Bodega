import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

// CU-81: los formatos y rangos los valida PrestamosService para devolver los
// mensajes exactos del caso de uso (incluida la Excepción 1 por cada NS).
export class CreatePrestamoDto {
  @IsString()
  nombre_receptor: string;

  @IsOptional()
  @IsString()
  rut_receptor?: string;

  @IsString()
  fecha_estimada_retorno: string;

  @IsString()
  motivo: string;

  @IsInt()
  id_bodega_origen: number;

  // Números de serie de los equipos individualizables
  @IsOptional()
  @IsArray()
  numeros_serie?: string[];

  // Consumibles: [{ id_tipo_equipo, cantidad }]
  @IsOptional()
  @IsArray()
  consumibles?: { id_tipo_equipo: number; cantidad: number }[];
}
