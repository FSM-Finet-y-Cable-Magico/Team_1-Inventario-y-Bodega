export class CreateTransferenciaDto {
  id_empresa_destino: number;
  id_bodega_origen: number;
  id_bodega_destino: number;
  ids_unidades: number[];
  observaciones?: string;
}
