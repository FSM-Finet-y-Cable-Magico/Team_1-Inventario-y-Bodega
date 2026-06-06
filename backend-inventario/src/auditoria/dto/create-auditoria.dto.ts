export class CreateAuditoriaDto {
  id_usuario: number;
  accion: string;
  entidad_afectada: string; //ver como hacerlo ya que deberia ser automatico con el id
  id_entidad_afectada: number;
  valor_anterior: any;
  valor_nuevo: any;
  ip_origen: string;
}
