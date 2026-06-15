import { Type } from 'class-transformer';

export class FiltrarAuditoriaDto {
  fecha_inicio?: Date;
  fecha_fin?: Date;
  @Type(() => Number)
  id_usuario?: number;
  // CU-09: filtros por nombre de usuario (parcial) y empresa
  usuario?: string;
  @Type(() => Number)
  id_empresa?: number;
  @Type(() => Number)
  id_entidad_afectada?: number;
  ip_origen?: string;
  entidad_afectada?: string;
  accion?: string;
  @Type(() => Number)
  pagina?: number;
  @Type(() => Number)
  limite?: number;
}
