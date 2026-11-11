-- Claves foráneas del Incremento 4 para la BDD global (finet_global_validacion).
-- Misma lista que RELACIONES_FISICAS en backend-inventario/scripts/migrar.ts.
-- Idempotente: no crea una FK que ya existe. Si una validación falla por datos antiguos, la FK queda NOT VALID y se avisa.
-- Ejecutar con un rol dueño de las tablas (lo corre el administrador de la BDD).

DO $$ BEGIN
  IF to_regclass('public.usuario') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_usuario_id_empresa') THEN
    ALTER TABLE public.usuario ADD CONSTRAINT fk_usuario_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.usuario VALIDATE CONSTRAINT fk_usuario_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_usuario_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_usuario_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.bodega') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bodega_id_empresa') THEN
    ALTER TABLE public.bodega ADD CONSTRAINT fk_bodega_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.bodega VALIDATE CONSTRAINT fk_bodega_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_bodega_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_bodega_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.bodega') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bodega_id_usuario_responsable') THEN
    ALTER TABLE public.bodega ADD CONSTRAINT fk_bodega_id_usuario_responsable FOREIGN KEY (id_usuario_responsable) REFERENCES public.usuario (id_usuario) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.bodega VALIDATE CONSTRAINT fk_bodega_id_usuario_responsable;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_bodega_id_usuario_responsable: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_bodega_id_usuario_responsable: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.tipo_equipo') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tipo_equipo_id_empresa') THEN
    ALTER TABLE public.tipo_equipo ADD CONSTRAINT fk_tipo_equipo_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.tipo_equipo VALIDATE CONSTRAINT fk_tipo_equipo_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_tipo_equipo_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_tipo_equipo_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.unidad_equipo') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_unidad_equipo_id_empresa') THEN
    ALTER TABLE public.unidad_equipo ADD CONSTRAINT fk_unidad_equipo_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.unidad_equipo VALIDATE CONSTRAINT fk_unidad_equipo_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_unidad_equipo_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_unidad_equipo_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.unidad_equipo') IS NOT NULL AND to_regclass('public.bodega') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_unidad_equipo_id_bodega_actual') THEN
    ALTER TABLE public.unidad_equipo ADD CONSTRAINT fk_unidad_equipo_id_bodega_actual FOREIGN KEY (id_bodega_actual) REFERENCES public.bodega (id_bodega) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.unidad_equipo VALIDATE CONSTRAINT fk_unidad_equipo_id_bodega_actual;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_unidad_equipo_id_bodega_actual: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_unidad_equipo_id_bodega_actual: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.unidad_equipo') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_unidad_equipo_id_tecnico_asignado') THEN
    ALTER TABLE public.unidad_equipo ADD CONSTRAINT fk_unidad_equipo_id_tecnico_asignado FOREIGN KEY (id_tecnico_asignado) REFERENCES public.usuario (id_usuario) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.unidad_equipo VALIDATE CONSTRAINT fk_unidad_equipo_id_tecnico_asignado;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_unidad_equipo_id_tecnico_asignado: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_unidad_equipo_id_tecnico_asignado: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.inventario_personal_tecnico') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventario_personal_tecnico_id_tecnico') THEN
    ALTER TABLE public.inventario_personal_tecnico ADD CONSTRAINT fk_inventario_personal_tecnico_id_tecnico FOREIGN KEY (id_tecnico) REFERENCES public.usuario (id_usuario) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.inventario_personal_tecnico VALIDATE CONSTRAINT fk_inventario_personal_tecnico_id_tecnico;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_inventario_personal_tecnico_id_tecnico: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_inventario_personal_tecnico_id_tecnico: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.inventario_personal_tecnico') IS NOT NULL AND to_regclass('public.tipo_equipo') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventario_personal_tecnico_id_tipo_equipo') THEN
    ALTER TABLE public.inventario_personal_tecnico ADD CONSTRAINT fk_inventario_personal_tecnico_id_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo (id_tipo_equipo) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.inventario_personal_tecnico VALIDATE CONSTRAINT fk_inventario_personal_tecnico_id_tipo_equipo;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_inventario_personal_tecnico_id_tipo_equipo: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_inventario_personal_tecnico_id_tipo_equipo: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.movimiento_inventario') IS NOT NULL AND to_regclass('public.tipo_equipo') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimiento_inventario_id_tipo_equipo') THEN
    ALTER TABLE public.movimiento_inventario ADD CONSTRAINT fk_movimiento_inventario_id_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo (id_tipo_equipo) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.movimiento_inventario VALIDATE CONSTRAINT fk_movimiento_inventario_id_tipo_equipo;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_movimiento_inventario_id_tipo_equipo: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_movimiento_inventario_id_tipo_equipo: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.movimiento_inventario') IS NOT NULL AND to_regclass('public.unidad_equipo') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimiento_inventario_id_unidad') THEN
    ALTER TABLE public.movimiento_inventario ADD CONSTRAINT fk_movimiento_inventario_id_unidad FOREIGN KEY (id_unidad) REFERENCES public.unidad_equipo (id_unidad) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.movimiento_inventario VALIDATE CONSTRAINT fk_movimiento_inventario_id_unidad;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_movimiento_inventario_id_unidad: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_movimiento_inventario_id_unidad: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.movimiento_inventario') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimiento_inventario_id_empresa_origen') THEN
    ALTER TABLE public.movimiento_inventario ADD CONSTRAINT fk_movimiento_inventario_id_empresa_origen FOREIGN KEY (id_empresa_origen) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.movimiento_inventario VALIDATE CONSTRAINT fk_movimiento_inventario_id_empresa_origen;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_movimiento_inventario_id_empresa_origen: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_movimiento_inventario_id_empresa_origen: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.movimiento_inventario') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimiento_inventario_id_empresa_destino') THEN
    ALTER TABLE public.movimiento_inventario ADD CONSTRAINT fk_movimiento_inventario_id_empresa_destino FOREIGN KEY (id_empresa_destino) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.movimiento_inventario VALIDATE CONSTRAINT fk_movimiento_inventario_id_empresa_destino;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_movimiento_inventario_id_empresa_destino: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_movimiento_inventario_id_empresa_destino: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.movimiento_inventario') IS NOT NULL AND to_regclass('public.bodega') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimiento_inventario_id_bodega_origen') THEN
    ALTER TABLE public.movimiento_inventario ADD CONSTRAINT fk_movimiento_inventario_id_bodega_origen FOREIGN KEY (id_bodega_origen) REFERENCES public.bodega (id_bodega) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.movimiento_inventario VALIDATE CONSTRAINT fk_movimiento_inventario_id_bodega_origen;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_movimiento_inventario_id_bodega_origen: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_movimiento_inventario_id_bodega_origen: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.movimiento_inventario') IS NOT NULL AND to_regclass('public.bodega') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimiento_inventario_id_bodega_destino') THEN
    ALTER TABLE public.movimiento_inventario ADD CONSTRAINT fk_movimiento_inventario_id_bodega_destino FOREIGN KEY (id_bodega_destino) REFERENCES public.bodega (id_bodega) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.movimiento_inventario VALIDATE CONSTRAINT fk_movimiento_inventario_id_bodega_destino;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_movimiento_inventario_id_bodega_destino: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_movimiento_inventario_id_bodega_destino: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.transferencia_equipo') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transferencia_equipo_id_empresa_origen') THEN
    ALTER TABLE public.transferencia_equipo ADD CONSTRAINT fk_transferencia_equipo_id_empresa_origen FOREIGN KEY (id_empresa_origen) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.transferencia_equipo VALIDATE CONSTRAINT fk_transferencia_equipo_id_empresa_origen;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_transferencia_equipo_id_empresa_origen: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_transferencia_equipo_id_empresa_origen: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.transferencia_equipo') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transferencia_equipo_id_empresa_destino') THEN
    ALTER TABLE public.transferencia_equipo ADD CONSTRAINT fk_transferencia_equipo_id_empresa_destino FOREIGN KEY (id_empresa_destino) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.transferencia_equipo VALIDATE CONSTRAINT fk_transferencia_equipo_id_empresa_destino;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_transferencia_equipo_id_empresa_destino: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_transferencia_equipo_id_empresa_destino: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.transferencia_equipo') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transferencia_equipo_id_usuario_registro') THEN
    ALTER TABLE public.transferencia_equipo ADD CONSTRAINT fk_transferencia_equipo_id_usuario_registro FOREIGN KEY (id_usuario_registro) REFERENCES public.usuario (id_usuario) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.transferencia_equipo VALIDATE CONSTRAINT fk_transferencia_equipo_id_usuario_registro;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_transferencia_equipo_id_usuario_registro: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_transferencia_equipo_id_usuario_registro: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.salida_bodega') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_salida_bodega_id_empresa') THEN
    ALTER TABLE public.salida_bodega ADD CONSTRAINT fk_salida_bodega_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.salida_bodega VALIDATE CONSTRAINT fk_salida_bodega_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_salida_bodega_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_salida_bodega_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.salida_bodega') IS NOT NULL AND to_regclass('public.bodega') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_salida_bodega_id_bodega_origen') THEN
    ALTER TABLE public.salida_bodega ADD CONSTRAINT fk_salida_bodega_id_bodega_origen FOREIGN KEY (id_bodega_origen) REFERENCES public.bodega (id_bodega) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.salida_bodega VALIDATE CONSTRAINT fk_salida_bodega_id_bodega_origen;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_salida_bodega_id_bodega_origen: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_salida_bodega_id_bodega_origen: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.salida_bodega') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_salida_bodega_id_tecnico') THEN
    ALTER TABLE public.salida_bodega ADD CONSTRAINT fk_salida_bodega_id_tecnico FOREIGN KEY (id_tecnico) REFERENCES public.usuario (id_usuario) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.salida_bodega VALIDATE CONSTRAINT fk_salida_bodega_id_tecnico;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_salida_bodega_id_tecnico: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_salida_bodega_id_tecnico: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.salida_bodega') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_salida_bodega_id_usuario_registro') THEN
    ALTER TABLE public.salida_bodega ADD CONSTRAINT fk_salida_bodega_id_usuario_registro FOREIGN KEY (id_usuario_registro) REFERENCES public.usuario (id_usuario) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.salida_bodega VALIDATE CONSTRAINT fk_salida_bodega_id_usuario_registro;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_salida_bodega_id_usuario_registro: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_salida_bodega_id_usuario_registro: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.salida_detalle') IS NOT NULL AND to_regclass('public.tipo_equipo') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_salida_detalle_id_tipo_equipo') THEN
    ALTER TABLE public.salida_detalle ADD CONSTRAINT fk_salida_detalle_id_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo (id_tipo_equipo) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.salida_detalle VALIDATE CONSTRAINT fk_salida_detalle_id_tipo_equipo;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_salida_detalle_id_tipo_equipo: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_salida_detalle_id_tipo_equipo: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.salida_detalle') IS NOT NULL AND to_regclass('public.unidad_equipo') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_salida_detalle_id_unidad') THEN
    ALTER TABLE public.salida_detalle ADD CONSTRAINT fk_salida_detalle_id_unidad FOREIGN KEY (id_unidad) REFERENCES public.unidad_equipo (id_unidad) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.salida_detalle VALIDATE CONSTRAINT fk_salida_detalle_id_unidad;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_salida_detalle_id_unidad: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_salida_detalle_id_unidad: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.orden_ingreso') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orden_ingreso_id_empresa_destino') THEN
    ALTER TABLE public.orden_ingreso ADD CONSTRAINT fk_orden_ingreso_id_empresa_destino FOREIGN KEY (id_empresa_destino) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.orden_ingreso VALIDATE CONSTRAINT fk_orden_ingreso_id_empresa_destino;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_orden_ingreso_id_empresa_destino: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_orden_ingreso_id_empresa_destino: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.orden_ingreso') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orden_ingreso_id_usuario_registro') THEN
    ALTER TABLE public.orden_ingreso ADD CONSTRAINT fk_orden_ingreso_id_usuario_registro FOREIGN KEY (id_usuario_registro) REFERENCES public.usuario (id_usuario) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.orden_ingreso VALIDATE CONSTRAINT fk_orden_ingreso_id_usuario_registro;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_orden_ingreso_id_usuario_registro: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_orden_ingreso_id_usuario_registro: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.prestamo_externo') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_prestamo_externo_id_empresa') THEN
    ALTER TABLE public.prestamo_externo ADD CONSTRAINT fk_prestamo_externo_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.prestamo_externo VALIDATE CONSTRAINT fk_prestamo_externo_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_prestamo_externo_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_prestamo_externo_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.prestamo_externo') IS NOT NULL AND to_regclass('public.bodega') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_prestamo_externo_id_bodega_origen') THEN
    ALTER TABLE public.prestamo_externo ADD CONSTRAINT fk_prestamo_externo_id_bodega_origen FOREIGN KEY (id_bodega_origen) REFERENCES public.bodega (id_bodega) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.prestamo_externo VALIDATE CONSTRAINT fk_prestamo_externo_id_bodega_origen;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_prestamo_externo_id_bodega_origen: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_prestamo_externo_id_bodega_origen: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.prestamo_externo') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_prestamo_externo_id_usuario_registro') THEN
    ALTER TABLE public.prestamo_externo ADD CONSTRAINT fk_prestamo_externo_id_usuario_registro FOREIGN KEY (id_usuario_registro) REFERENCES public.usuario (id_usuario) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.prestamo_externo VALIDATE CONSTRAINT fk_prestamo_externo_id_usuario_registro;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_prestamo_externo_id_usuario_registro: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_prestamo_externo_id_usuario_registro: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.prestamo_detalle') IS NOT NULL AND to_regclass('public.tipo_equipo') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_prestamo_detalle_id_tipo_equipo') THEN
    ALTER TABLE public.prestamo_detalle ADD CONSTRAINT fk_prestamo_detalle_id_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo (id_tipo_equipo) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.prestamo_detalle VALIDATE CONSTRAINT fk_prestamo_detalle_id_tipo_equipo;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_prestamo_detalle_id_tipo_equipo: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_prestamo_detalle_id_tipo_equipo: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.prestamo_retorno') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_prestamo_retorno_id_usuario') THEN
    ALTER TABLE public.prestamo_retorno ADD CONSTRAINT fk_prestamo_retorno_id_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.prestamo_retorno VALIDATE CONSTRAINT fk_prestamo_retorno_id_usuario;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_prestamo_retorno_id_usuario: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_prestamo_retorno_id_usuario: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.solicitud_baja') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_solicitud_baja_id_empresa') THEN
    ALTER TABLE public.solicitud_baja ADD CONSTRAINT fk_solicitud_baja_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.solicitud_baja VALIDATE CONSTRAINT fk_solicitud_baja_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_solicitud_baja_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_solicitud_baja_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.solicitud_baja') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_solicitud_baja_id_usuario_solicitante') THEN
    ALTER TABLE public.solicitud_baja ADD CONSTRAINT fk_solicitud_baja_id_usuario_solicitante FOREIGN KEY (id_usuario_solicitante) REFERENCES public.usuario (id_usuario) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.solicitud_baja VALIDATE CONSTRAINT fk_solicitud_baja_id_usuario_solicitante;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_solicitud_baja_id_usuario_solicitante: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_solicitud_baja_id_usuario_solicitante: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.solicitud_baja') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_solicitud_baja_id_usuario_aprobador') THEN
    ALTER TABLE public.solicitud_baja ADD CONSTRAINT fk_solicitud_baja_id_usuario_aprobador FOREIGN KEY (id_usuario_aprobador) REFERENCES public.usuario (id_usuario) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.solicitud_baja VALIDATE CONSTRAINT fk_solicitud_baja_id_usuario_aprobador;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_solicitud_baja_id_usuario_aprobador: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_solicitud_baja_id_usuario_aprobador: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.donacion') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_donacion_id_empresa') THEN
    ALTER TABLE public.donacion ADD CONSTRAINT fk_donacion_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.donacion VALIDATE CONSTRAINT fk_donacion_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_donacion_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_donacion_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.donacion') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_donacion_id_usuario') THEN
    ALTER TABLE public.donacion ADD CONSTRAINT fk_donacion_id_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.donacion VALIDATE CONSTRAINT fk_donacion_id_usuario;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_donacion_id_usuario: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_donacion_id_usuario: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.notificacion') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notificacion_id_empresa') THEN
    ALTER TABLE public.notificacion ADD CONSTRAINT fk_notificacion_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.notificacion VALIDATE CONSTRAINT fk_notificacion_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_notificacion_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_notificacion_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.secuencia_srv') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_secuencia_srv_id_empresa') THEN
    ALTER TABLE public.secuencia_srv ADD CONSTRAINT fk_secuencia_srv_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.secuencia_srv VALIDATE CONSTRAINT fk_secuencia_srv_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_secuencia_srv_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_secuencia_srv_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.toma_inventario') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_toma_inventario_id_empresa') THEN
    ALTER TABLE public.toma_inventario ADD CONSTRAINT fk_toma_inventario_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.toma_inventario VALIDATE CONSTRAINT fk_toma_inventario_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_toma_inventario_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_toma_inventario_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.borrador_cierre') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_borrador_cierre_id_empresa') THEN
    ALTER TABLE public.borrador_cierre ADD CONSTRAINT fk_borrador_cierre_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.borrador_cierre VALIDATE CONSTRAINT fk_borrador_cierre_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_borrador_cierre_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_borrador_cierre_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.integracion_cierre') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_integracion_cierre_id_empresa') THEN
    ALTER TABLE public.integracion_cierre ADD CONSTRAINT fk_integracion_cierre_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.integracion_cierre VALIDATE CONSTRAINT fk_integracion_cierre_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_integracion_cierre_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_integracion_cierre_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.integracion_activacion') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_integracion_activacion_id_empresa') THEN
    ALTER TABLE public.integracion_activacion ADD CONSTRAINT fk_integracion_activacion_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.integracion_activacion VALIDATE CONSTRAINT fk_integracion_activacion_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_integracion_activacion_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_integracion_activacion_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.asignacion_equipo_servicio') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_asignacion_equipo_servicio_id_empresa') THEN
    ALTER TABLE public.asignacion_equipo_servicio ADD CONSTRAINT fk_asignacion_equipo_servicio_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.asignacion_equipo_servicio VALIDATE CONSTRAINT fk_asignacion_equipo_servicio_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_asignacion_equipo_servicio_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_asignacion_equipo_servicio_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.cierre_reparacion') IS NOT NULL AND to_regclass('public.empresa') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cierre_reparacion_id_empresa') THEN
    ALTER TABLE public.cierre_reparacion ADD CONSTRAINT fk_cierre_reparacion_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa (id_empresa) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.cierre_reparacion VALIDATE CONSTRAINT fk_cierre_reparacion_id_empresa;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_cierre_reparacion_id_empresa: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_cierre_reparacion_id_empresa: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF to_regclass('public.cierre_reparacion') IS NOT NULL AND to_regclass('public.integracion_cierre') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cierre_reparacion_id_cierre') THEN
    ALTER TABLE public.cierre_reparacion ADD CONSTRAINT fk_cierre_reparacion_id_cierre FOREIGN KEY (id_cierre) REFERENCES public.integracion_cierre (id_cierre) NOT VALID;
  END IF;
  BEGIN
    ALTER TABLE public.cierre_reparacion VALIDATE CONSTRAINT fk_cierre_reparacion_id_cierre;
  EXCEPTION WHEN others THEN RAISE WARNING 'No se pudo validar fk_cierre_reparacion_id_cierre: %', SQLERRM;
  END;
EXCEPTION WHEN undefined_object THEN RAISE WARNING 'Omitida fk_cierre_reparacion_id_cierre: %', SQLERRM;
END $$;
