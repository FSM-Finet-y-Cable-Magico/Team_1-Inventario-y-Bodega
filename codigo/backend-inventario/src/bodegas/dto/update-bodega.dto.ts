import { IsString, Length, IsOptional, IsNumber } from 'class-validator';

export class UpdateBodegaDto {
  @IsString()
  @IsOptional()
  @Length(3, 60)
  nombre?: string;

  @IsString()
  @IsOptional()
  @Length(0, 200)
  direccion?: string;

  // CU-42: responsable editable
  @IsNumber()
  @IsOptional()
  id_usuario_responsable?: number;
}
