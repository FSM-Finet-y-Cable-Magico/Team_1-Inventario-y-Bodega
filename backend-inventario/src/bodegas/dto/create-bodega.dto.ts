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

  @IsNumber()
  @IsNotEmpty()
  id_empresa: number;

  @IsString()
  @IsOptional()
  @Length(0, 200)
  direccion?: string;

  @IsNumber()
  @IsNotEmpty()
  id_responsable: number;
}
