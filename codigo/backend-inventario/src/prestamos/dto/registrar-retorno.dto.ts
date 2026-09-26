import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

// CU-82: retorno total o parcial de un préstamo externo.
// Cada ítem se identifica por su id_detalle; para consumibles se indica la
// cantidad devuelta en esta instancia (las unidades individualizables ocupan un
// detalle cada una, así que no necesitan cantidad).
export class RegistrarRetornoDto {
  @IsString()
  fecha_retorno: string;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsArray()
  // CU-84: cada ítem se identifica por id_detalle o por numero_serie
  items: { id_detalle?: number; numero_serie?: string; cantidad?: number }[];

  // CU-95: confirmación explícita del aviso de garantía vigente ("Continuar sin garantía")
  @IsOptional()
  @IsBoolean()
  forzar_aviso_garantia?: boolean;
}
