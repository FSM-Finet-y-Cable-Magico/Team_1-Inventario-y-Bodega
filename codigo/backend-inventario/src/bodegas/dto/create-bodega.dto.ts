import {
  IsNotEmpty,
  IsString,
  Length,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateBodegaDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 60)
  nombre: string;

  // La empresa la asigna el backend según el actor; solo un Superusuario puede indicarla
  @IsNumber()
  @IsOptional()
  id_empresa?: number;

  // CU-41: responsable de la bodega (usuario activo de la empresa)
  @IsNumber()
  @IsOptional()
  id_usuario_responsable?: number;

  @IsString()
  @IsOptional()
  @Length(0, 200)
  direccion?: string;
}
