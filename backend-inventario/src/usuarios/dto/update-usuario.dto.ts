import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateUsuarioDto } from './create-usuario.dto';

export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {
  // CU-06: el estado (Activo/Inactivo) es editable
  @IsOptional()
  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  activo?: boolean;
}
