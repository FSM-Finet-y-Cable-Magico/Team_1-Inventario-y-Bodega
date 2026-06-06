import { IsString, Length, IsNumber, IsOptional } from 'class-validator';

export class UpdateBodegaDto {
  @IsString()
  @IsOptional()
  @Length(3, 60)
  nombre?: string;

  @IsString()
  @IsOptional()
  @Length(0, 200)
  direccion?: string;

  @IsNumber()
  @IsOptional()
  id_responsable?: number;
}
