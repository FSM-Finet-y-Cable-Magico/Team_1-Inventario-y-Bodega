import { IsBoolean, IsOptional } from 'class-validator';

// CU-97 E3: confirma el ajuste aunque el stock haya cambiado durante el conteo
export class ConfirmarTomaDto {
  @IsOptional()
  @IsBoolean({ message: 'forzar_movimientos debe ser verdadero o falso.' })
  forzar_movimientos?: boolean;
}
