--
-- PostgreSQL database dump
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: empresa; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.empresa DISABLE TRIGGER ALL;

INSERT INTO public.empresa (id_empresa, nombre) VALUES (1, 'Finet');
INSERT INTO public.empresa (id_empresa, nombre) VALUES (2, 'Cable Mágico');


ALTER TABLE public.empresa ENABLE TRIGGER ALL;

--
-- Data for Name: usuario; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.usuario DISABLE TRIGGER ALL;

INSERT INTO public.usuario (id_usuario, id_empresa, nombre_completo, nombre_usuario, email, password_hash, activo, intentos_fallidos, bloqueado_hasta, debe_cambiar_password, fecha_creacion, rut) VALUES (1, 1, 'Super Usuario QA', 'superusuario', NULL, '$2b$12$Ur3LNTmpYRraj342dvNvL.zy54S9JyTkYEcQ1TE6PqewGlNLtfT36', true, 0, NULL, false, '2026-11-14 21:30:06.416903+00', NULL);
INSERT INTO public.usuario (id_usuario, id_empresa, nombre_completo, nombre_usuario, email, password_hash, activo, intentos_fallidos, bloqueado_hasta, debe_cambiar_password, fecha_creacion, rut) VALUES (2, 1, 'Admin Finet QA', 'admin_finet', NULL, '$2b$12$QtJOkYP4IeRrtSA/AfkVvuV.e75OeAcFSSV7Q.CL7NrwGjcCpmTkG', true, 0, NULL, false, '2026-11-14 21:30:06.713738+00', NULL);
INSERT INTO public.usuario (id_usuario, id_empresa, nombre_completo, nombre_usuario, email, password_hash, activo, intentos_fallidos, bloqueado_hasta, debe_cambiar_password, fecha_creacion, rut) VALUES (3, 2, 'Admin Cable Mágico QA', 'admin_cable', NULL, '$2b$12$FcpgjkcT8K9MMUfevEaX1uRJH8kyJKbXytfyGUcosYp6dMmuX8eKy', true, 0, NULL, false, '2026-11-14 21:30:07.000429+00', NULL);
INSERT INTO public.usuario (id_usuario, id_empresa, nombre_completo, nombre_usuario, email, password_hash, activo, intentos_fallidos, bloqueado_hasta, debe_cambiar_password, fecha_creacion, rut) VALUES (4, 1, 'Técnico Terreno QA', 'tecnico_qa', NULL, '$2b$12$NOIgwv09xQtJMLHlaOOXCOjJ6uvzIfVAEpwEDhJi/95OR0UH.aPbe', true, 0, NULL, false, '2026-11-14 21:30:07.324399+00', NULL);
INSERT INTO public.usuario (id_usuario, id_empresa, nombre_completo, nombre_usuario, email, password_hash, activo, intentos_fallidos, bloqueado_hasta, debe_cambiar_password, fecha_creacion, rut) VALUES (5, 2, 'Técnico Cable Mágico QA', 'tecnico_cable', NULL, '$2b$12$FthW7UL5VqgHTBwSjv6iYuYJTUNyay4prJLEk.Vsc932bLK3msw5m', true, 0, NULL, false, '2026-11-14 21:30:07.660635+00', NULL);


ALTER TABLE public.usuario ENABLE TRIGGER ALL;

--
-- Data for Name: bodega; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.bodega DISABLE TRIGGER ALL;

INSERT INTO public.bodega (id_bodega, id_empresa, nombre, direccion, id_usuario_responsable, activa) VALUES (1, 1, 'Bodega Finet Central', 'Dirección de prueba Finet', NULL, true);
INSERT INTO public.bodega (id_bodega, id_empresa, nombre, direccion, id_usuario_responsable, activa) VALUES (2, 2, 'Bodega Cable Mágico Central', 'Dirección de prueba Cable Mágico', NULL, true);


ALTER TABLE public.bodega ENABLE TRIGGER ALL;

--
-- Data for Name: tipo_equipo; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.tipo_equipo DISABLE TRIGGER ALL;

INSERT INTO public.tipo_equipo (id_tipo_equipo, id_empresa, nombre, categoria, marca, modelo, descripcion_tecnica, unidad_medida, garantia_dias, requiere_serie_individual, ficha_tecnica_pdf_url, ficha_tecnica_nombre, activo) VALUES (1, 1, 'ONT QA Finet', 'EQUIPO', 'Huawei', 'HG8145V', NULL, 'unidad', 365, true, NULL, NULL, true);
INSERT INTO public.tipo_equipo (id_tipo_equipo, id_empresa, nombre, categoria, marca, modelo, descripcion_tecnica, unidad_medida, garantia_dias, requiere_serie_individual, ficha_tecnica_pdf_url, ficha_tecnica_nombre, activo) VALUES (2, 2, 'ONT QA Cable Mágico', 'EQUIPO', 'Huawei', 'HG8145V', NULL, 'unidad', 365, true, NULL, NULL, true);
INSERT INTO public.tipo_equipo (id_tipo_equipo, id_empresa, nombre, categoria, marca, modelo, descripcion_tecnica, unidad_medida, garantia_dias, requiere_serie_individual, ficha_tecnica_pdf_url, ficha_tecnica_nombre, activo) VALUES (3, 1, 'Router Wi-Fi QA', 'Otro', 'TP-Link', 'Archer C6', NULL, 'unidad', 365, true, NULL, NULL, true);
INSERT INTO public.tipo_equipo (id_tipo_equipo, id_empresa, nombre, categoria, marca, modelo, descripcion_tecnica, unidad_medida, garantia_dias, requiere_serie_individual, ficha_tecnica_pdf_url, ficha_tecnica_nombre, activo) VALUES (4, 1, 'Switch 8 puertos QA', 'Otro', 'TP-Link', 'TL-SG108', NULL, 'unidad', 730, true, NULL, NULL, true);
INSERT INTO public.tipo_equipo (id_tipo_equipo, id_empresa, nombre, categoria, marca, modelo, descripcion_tecnica, unidad_medida, garantia_dias, requiere_serie_individual, ficha_tecnica_pdf_url, ficha_tecnica_nombre, activo) VALUES (5, 1, 'Decodificador TV QA', 'Decodificador', 'ZTE', 'ZXV10 B860', NULL, 'unidad', 365, true, NULL, NULL, true);
INSERT INTO public.tipo_equipo (id_tipo_equipo, id_empresa, nombre, categoria, marca, modelo, descripcion_tecnica, unidad_medida, garantia_dias, requiere_serie_individual, ficha_tecnica_pdf_url, ficha_tecnica_nombre, activo) VALUES (6, 1, 'Conector SC/APC QA', 'Consumible conector', 'Fiberhome', NULL, NULL, 'Unidad', 0, false, NULL, NULL, true);
INSERT INTO public.tipo_equipo (id_tipo_equipo, id_empresa, nombre, categoria, marca, modelo, descripcion_tecnica, unidad_medida, garantia_dias, requiere_serie_individual, ficha_tecnica_pdf_url, ficha_tecnica_nombre, activo) VALUES (7, 1, 'Fibra drop QA', 'Consumible fibra óptica', 'Fiberhome', NULL, NULL, 'Metro', 0, false, NULL, NULL, true);
INSERT INTO public.tipo_equipo (id_tipo_equipo, id_empresa, nombre, categoria, marca, modelo, descripcion_tecnica, unidad_medida, garantia_dias, requiere_serie_individual, ficha_tecnica_pdf_url, ficha_tecnica_nombre, activo) VALUES (8, 1, 'Cable UTP Cat6 QA', 'Consumible otro', 'Panduit', NULL, NULL, 'Metro', 0, false, NULL, NULL, true);
INSERT INTO public.tipo_equipo (id_tipo_equipo, id_empresa, nombre, categoria, marca, modelo, descripcion_tecnica, unidad_medida, garantia_dias, requiere_serie_individual, ficha_tecnica_pdf_url, ficha_tecnica_nombre, activo) VALUES (9, 2, 'Router Wi-Fi Cable QA', 'Otro', 'Huawei', 'AX3', NULL, 'unidad', 365, true, NULL, NULL, true);
INSERT INTO public.tipo_equipo (id_tipo_equipo, id_empresa, nombre, categoria, marca, modelo, descripcion_tecnica, unidad_medida, garantia_dias, requiere_serie_individual, ficha_tecnica_pdf_url, ficha_tecnica_nombre, activo) VALUES (10, 2, 'Conector SC/APC Cable QA', 'Consumible conector', 'Fiberhome', NULL, NULL, 'Unidad', 0, false, NULL, NULL, true);
INSERT INTO public.tipo_equipo (id_tipo_equipo, id_empresa, nombre, categoria, marca, modelo, descripcion_tecnica, unidad_medida, garantia_dias, requiere_serie_individual, ficha_tecnica_pdf_url, ficha_tecnica_nombre, activo) VALUES (11, 2, 'Fibra drop Cable QA', 'Consumible fibra óptica', 'Fiberhome', NULL, NULL, 'Metro', 0, false, NULL, NULL, true);


ALTER TABLE public.tipo_equipo ENABLE TRIGGER ALL;

--
-- Data for Name: unidad_equipo; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.unidad_equipo DISABLE TRIGGER ALL;

INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (1, 1, 1, 'QA-ONT-F-0001', 'HG8145V', 'En bodega', '2026-01-15', '2027-01-15', NULL, NULL, 1, NULL, NULL, NULL, 'Proveedor QA', 'Unidad QA para integración con G3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (2, 1, 1, 'QA-ONT-F-0002', 'HG8145V', 'Asignado a técnico', '2026-01-15', '2027-01-15', NULL, NULL, NULL, NULL, NULL, NULL, 'Proveedor QA', 'Unidad QA para integración con G3', NULL, NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (3, 1, 1, 'QA-ONT-F-0003', 'HG8145V', 'Instalado en cliente', '2026-01-15', '2027-01-15', NULL, NULL, NULL, NULL, NULL, NULL, 'Proveedor QA', 'Unidad QA para integración con G3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (4, 2, 2, 'QA-ONT-C-0001', 'HG8145V', 'En bodega', '2026-01-15', '2027-01-15', NULL, NULL, 2, NULL, NULL, NULL, 'Proveedor QA', 'Unidad QA para integración con G3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (5, 2, 2, 'QA-ONT-C-0002', 'HG8145V', 'Asignado a técnico', '2026-01-15', '2027-01-15', NULL, NULL, NULL, NULL, NULL, NULL, 'Proveedor QA', 'Unidad QA para integración con G3', NULL, NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (6, 2, 2, 'QA-ONT-C-0003', 'HG8145V', 'Instalado en cliente', '2026-01-15', '2027-01-15', NULL, NULL, NULL, NULL, NULL, NULL, 'Proveedor QA', 'Unidad QA para integración con G3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (7, 1, 1, 'DEMO-ONT-0001', NULL, 'En bodega', '2025-10-10', '2026-10-10', NULL, NULL, 1, NULL, NULL, 'AA:BB:CC:00:00:01', 'Distribuidora Andina SpA', NULL, 'Estante A-1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (8, 1, 1, 'DEMO-ONT-0002', NULL, 'En bodega', '2026-10-15', '2027-10-15', NULL, NULL, 1, NULL, NULL, NULL, 'Distribuidora Andina SpA', NULL, 'Estante A-2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (9, 3, 1, 'DEMO-RTR-0001', NULL, 'En bodega', '2025-11-29', '2026-11-29', NULL, NULL, 1, NULL, NULL, 'AA:BB:CC:00:00:02', 'Importadora Pacífico SpA', NULL, 'Rack B-1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (10, 3, 1, 'DEMO-RTR-0002', NULL, 'En bodega', '2025-12-29', '2026-12-29', NULL, NULL, 1, NULL, NULL, NULL, 'Importadora Pacífico SpA', NULL, 'Rack B-2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (11, 3, 1, 'DEMO-RTR-0003', NULL, 'En bodega', NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, 'Sin fecha de adquisición: garantía no calculable', 'Rack B-3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (12, 4, 1, 'DEMO-SWT-0001', NULL, 'En bodega', '2025-02-02', '2027-02-02', NULL, NULL, 1, NULL, NULL, NULL, 'Distribuidora Andina SpA', NULL, 'Piso 2 / Rack C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (13, 4, 1, 'DEMO-SWT-0002', NULL, 'En bodega', '2026-08-06', '2028-08-05', NULL, NULL, 1, NULL, NULL, NULL, 'Distribuidora Andina SpA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (15, 5, 1, 'DEMO-DEC-0002', NULL, 'Asignado a técnico', '2026-05-08', '2027-05-08', NULL, NULL, NULL, NULL, NULL, NULL, 'TecnoRed Chile Ltda.', NULL, NULL, NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (17, 3, 1, 'DEMO-RTR-0004', NULL, 'Instalado en cliente', '2026-09-15', '2027-09-15', NULL, NULL, NULL, NULL, NULL, 'AA:BB:CC:00:00:03', 'Importadora Pacífico SpA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (18, 1, 1, 'DEMO-ONT-0005', NULL, 'En revisión', NULL, NULL, 'No enciende', NULL, NULL, NULL, NULL, NULL, 'Distribuidora Andina SpA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (19, 1, 1, 'DEMO-ONT-0006', NULL, 'En revisión', NULL, NULL, 'Sin señal óptica', NULL, NULL, NULL, NULL, NULL, 'Distribuidora Andina SpA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (20, 5, 1, 'DEMO-DEC-0003', NULL, 'En préstamo externo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TecnoRed Chile Ltda.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (23, 3, 1, 'DEMO-RTR-0005', NULL, 'Dado de baja', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Importadora Pacífico SpA', NULL, NULL, 'Falla irreparable', 'Puerto WAN destruido por descarga eléctrica.', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (24, 4, 1, 'DEMO-SWT-0003', NULL, 'Dado de baja', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Distribuidora Andina SpA', NULL, NULL, 'Obsolescencia', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (25, 1, 1, 'DEMO-ONT-0007', NULL, 'Dado de baja', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Distribuidora Andina SpA', NULL, NULL, 'Donación a institución', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (26, 1, 1, 'DEMO-ONT-0008', NULL, 'Dado de baja', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Distribuidora Andina SpA', NULL, NULL, 'Donación a institución', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (27, 3, 1, 'DEMO-RTR-0006', NULL, 'Dado de baja', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Importadora Pacífico SpA', NULL, NULL, 'Donación a institución', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (28, 3, 1, 'DEMO-RTR-0007', NULL, 'Dado de baja', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Importadora Pacífico SpA', NULL, NULL, 'Donación a institución', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (29, 2, 2, 'DEMO-C-ONT-0001', NULL, 'En bodega', '2026-08-26', '2027-08-26', NULL, NULL, 2, NULL, NULL, 'AA:BB:CC:00:00:04', NULL, NULL, 'Estante C-1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (30, 2, 2, 'DEMO-C-ONT-0002', NULL, 'En bodega', '2026-08-31', '2027-08-31', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, 'Estante C-2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (32, 9, 2, 'DEMO-C-RTR-0002', NULL, 'En revisión', NULL, NULL, 'Daño físico visible', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (33, 2, 2, 'DEMO-C-ONT-0003', NULL, 'Dado de baja', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Donación a institución', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (14, 5, 1, 'DEMO-DEC-0001', NULL, 'Asignado a técnico', '2026-04-28', '2027-04-28', NULL, NULL, NULL, NULL, NULL, NULL, 'TecnoRed Chile Ltda.', NULL, NULL, NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (16, 1, 1, 'DEMO-ONT-0004', NULL, 'Asignado a técnico', '2026-07-17', '2027-07-17', NULL, NULL, NULL, NULL, NULL, NULL, 'Distribuidora Andina SpA', NULL, NULL, NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (31, 9, 2, 'DEMO-C-RTR-0001', NULL, 'Asignado a técnico', '2026-10-05', '2027-10-05', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (21, 1, 1, 'DEMO-ONT-0009', NULL, 'En préstamo externo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Distribuidora Andina SpA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (22, 3, 1, 'DEMO-RTR-0008', NULL, 'En préstamo externo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Importadora Pacífico SpA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (34, 1, 1, 'HW-ONT-99001', 'HG8245H', 'Instalado en cliente', '2026-01-10', '2027-01-10', NULL, NULL, NULL, NULL, NULL, NULL, 'Proveedor QA', NULL, NULL, NULL, NULL, NULL, '12345678-5', 'Juan Pérez González', 'Av. Libertador Bernardo O Higgins 1234, Depto 402', 'Santiago', 'SRV-2026-00101');
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (35, 1, 1, 'HW-ONT-99002', 'HG8245H', 'Instalado en cliente', '2026-01-10', '2027-01-10', NULL, NULL, NULL, NULL, NULL, NULL, 'Proveedor QA', NULL, NULL, NULL, NULL, NULL, '98765432-1', 'María José López Rodríguez', 'Calle Los Alerces 567', 'Providencia', 'SRV-2026-00102');
INSERT INTO public.unidad_equipo (id_unidad, id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia, diagnostico_tecnico, id_cliente_instalado, id_bodega_actual, numero_poste, id_caja_nap, mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle, id_tecnico_asignado, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion, srv) VALUES (36, 2, 2, 'HW-ONT-99003', 'HG8245H', 'Instalado en cliente', '2026-01-10', '2027-01-10', NULL, NULL, NULL, NULL, NULL, NULL, 'Proveedor QA', NULL, NULL, NULL, NULL, NULL, '11223344-K', 'Carlos Muñoz Valenzuela', 'Pasaje Las Flores 89', 'Maipú', 'SRV-2026-00103');


ALTER TABLE public.unidad_equipo ENABLE TRIGGER ALL;

--
-- Data for Name: asignacion_equipo_servicio; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.asignacion_equipo_servicio DISABLE TRIGGER ALL;



ALTER TABLE public.asignacion_equipo_servicio ENABLE TRIGGER ALL;

--
-- Data for Name: borrador_cierre; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.borrador_cierre DISABLE TRIGGER ALL;



ALTER TABLE public.borrador_cierre ENABLE TRIGGER ALL;

--
-- Data for Name: integracion_cierre; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.integracion_cierre DISABLE TRIGGER ALL;

INSERT INTO public.integracion_cierre (id_cierre, clave_idempotencia, id_ot, id_empresa, tipo_ot, payload, estado_proceso, discrepancias, acciones_aplicadas, fecha_proceso, srv, id_tecnico, materiales_aplicados) VALUES (1, 'CU87-SEED-SRV-2026-00101', 101, 1, 'INSTALACION', '{"id_ot": 101, "cliente": {"rut": "12345678-5", "nombre": "Juan Pérez González"}, "direccion": {"comuna": "Santiago", "direccion": "Av. Libertador Bernardo O Higgins 1234, Depto 402"}, "id_tecnico": 4}', 'PROCESADO', NULL, NULL, '2026-03-15 14:00:00+00', 'SRV-2026-00101', 4, NULL);
INSERT INTO public.integracion_cierre (id_cierre, clave_idempotencia, id_ot, id_empresa, tipo_ot, payload, estado_proceso, discrepancias, acciones_aplicadas, fecha_proceso, srv, id_tecnico, materiales_aplicados) VALUES (2, 'CU87-SEED-SRV-2026-00102', 102, 1, 'INSTALACION', '{"id_ot": 102, "cliente": {"rut": "98765432-1", "nombre": "María José López Rodríguez"}, "direccion": {"comuna": "Providencia", "direccion": "Calle Los Alerces 567"}, "id_tecnico": 4}', 'PROCESADO', NULL, NULL, '2026-03-20 14:00:00+00', 'SRV-2026-00102', 4, NULL);
INSERT INTO public.integracion_cierre (id_cierre, clave_idempotencia, id_ot, id_empresa, tipo_ot, payload, estado_proceso, discrepancias, acciones_aplicadas, fecha_proceso, srv, id_tecnico, materiales_aplicados) VALUES (3, 'CU87-SEED-SRV-2026-00103', 103, 2, 'INSTALACION', '{"id_ot": 103, "cliente": {"rut": "11223344-K", "nombre": "Carlos Muñoz Valenzuela"}, "direccion": {"comuna": "Maipú", "direccion": "Pasaje Las Flores 89"}, "id_tecnico": 5}', 'PROCESADO', NULL, NULL, '2026-03-22 14:00:00+00', 'SRV-2026-00103', 5, NULL);


ALTER TABLE public.integracion_cierre ENABLE TRIGGER ALL;

--
-- Data for Name: cierre_reparacion; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.cierre_reparacion DISABLE TRIGGER ALL;



ALTER TABLE public.cierre_reparacion ENABLE TRIGGER ALL;

--
-- Data for Name: donacion; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.donacion DISABLE TRIGGER ALL;

INSERT INTO public.donacion (id_donacion, nombre_institucion, rut_institucion, fecha_donacion, numero_resolucion, id_usuario, id_empresa, fecha_creacion) VALUES (1, 'Fundación Conecta Chile', '65123456-5', '2026-11-11', 'RES-2026-014', 2, 1, '2026-11-14 21:30:07.888888+00');


ALTER TABLE public.donacion ENABLE TRIGGER ALL;

--
-- Data for Name: donacion_detalle; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.donacion_detalle DISABLE TRIGGER ALL;

INSERT INTO public.donacion_detalle (id_detalle, id_donacion, id_unidad) VALUES (1, 1, 27);
INSERT INTO public.donacion_detalle (id_detalle, id_donacion, id_unidad) VALUES (2, 1, 28);


ALTER TABLE public.donacion_detalle ENABLE TRIGGER ALL;

--
-- Data for Name: historial_estado_equipo; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.historial_estado_equipo DISABLE TRIGGER ALL;

INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (1, 17, 4, 'Asignado a técnico', 'Instalado en cliente', 'Carga de datos de demostración (Instalado en cliente).', '2026-09-04 11:30:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (2, 18, 4, 'Asignado a técnico', 'En revisión', 'Ingreso a taller técnico. Diagnóstico: No enciende', '2026-09-08 10:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (3, 19, 4, 'Asignado a técnico', 'En revisión', 'Ingreso a taller técnico. Diagnóstico: Sin señal óptica', '2026-09-12 09:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (4, 23, 2, 'En bodega', 'Dado de baja', 'Baja definitiva. Motivo: Falla irreparable', '2026-09-06 12:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (5, 24, 2, 'En bodega', 'Dado de baja', 'Baja definitiva. Motivo: Obsolescencia', '2026-09-06 12:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (6, 25, 2, 'En bodega', 'Dado de baja', 'Baja definitiva. Motivo: Donación a institución', '2026-09-06 12:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (7, 26, 2, 'En bodega', 'Dado de baja', 'Baja definitiva. Motivo: Donación a institución', '2026-09-06 12:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (8, 27, 2, 'En bodega', 'Dado de baja', 'Baja definitiva. Motivo: Donación a institución', '2026-09-06 12:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (9, 28, 2, 'En bodega', 'Dado de baja', 'Baja definitiva. Motivo: Donación a institución', '2026-09-06 12:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (10, 32, 5, 'Asignado a técnico', 'En revisión', 'Ingreso a taller técnico. Diagnóstico: Daño físico visible', '2026-09-12 09:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (11, 33, 2, 'En bodega', 'Dado de baja', 'Baja definitiva. Motivo: Donación a institución', '2026-09-06 12:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (12, 14, 2, 'En bodega', 'Asignado a técnico', 'Salida de bodega a técnico. Salida #1.', '2026-09-10 09:30:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (13, 16, 2, 'En bodega', 'Asignado a técnico', 'Salida de bodega a técnico. Salida #1.', '2026-09-10 09:30:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (14, 31, 2, 'En bodega', 'Asignado a técnico', 'Salida de bodega a técnico. Salida #3.', '2026-09-11 11:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (15, 21, 2, 'En bodega', 'En préstamo externo', 'Préstamo externo PE-00001 a Constructora Andes Ltda..', '2026-09-09 10:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (16, 22, 2, 'En bodega', 'En préstamo externo', 'Préstamo externo PE-00001 a Constructora Andes Ltda..', '2026-09-09 10:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (17, 20, 2, 'En revisión', 'En préstamo externo', 'Envío a reparación externa. Receptor: Servicio Técnico Electronorte Ltda.', '2026-09-07 14:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (18, 34, 4, 'Asignado a técnico', 'Instalado en cliente', 'Instalación en domicilio de cliente', '2026-03-15 14:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (19, 35, 4, 'Asignado a técnico', 'Instalado en cliente', 'Instalación en domicilio de cliente', '2026-03-20 14:00:00');
INSERT INTO public.historial_estado_equipo (id_historial, id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES (20, 36, 5, 'Asignado a técnico', 'Instalado en cliente', 'Instalación en domicilio de cliente', '2026-03-22 14:00:00');


ALTER TABLE public.historial_estado_equipo ENABLE TRIGGER ALL;

--
-- Data for Name: integracion_activacion; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.integracion_activacion DISABLE TRIGGER ALL;



ALTER TABLE public.integracion_activacion ENABLE TRIGGER ALL;

--
-- Data for Name: inventario_personal_tecnico; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.inventario_personal_tecnico DISABLE TRIGGER ALL;

INSERT INTO public.inventario_personal_tecnico (id_inventario, id_tecnico, id_tipo_equipo, cantidad, fecha_actualizacion) VALUES (1, 4, 7, 25.00, '2026-11-14 21:30:07.825023+00');
INSERT INTO public.inventario_personal_tecnico (id_inventario, id_tecnico, id_tipo_equipo, cantidad, fecha_actualizacion) VALUES (3, 4, 8, 60.00, '2026-11-14 21:30:07.831991+00');
INSERT INTO public.inventario_personal_tecnico (id_inventario, id_tecnico, id_tipo_equipo, cantidad, fecha_actualizacion) VALUES (2, 4, 6, 20.00, '2026-11-14 21:30:07.834528+00');
INSERT INTO public.inventario_personal_tecnico (id_inventario, id_tecnico, id_tipo_equipo, cantidad, fecha_actualizacion) VALUES (5, 5, 11, 40.00, '2026-11-14 21:30:07.844406+00');


ALTER TABLE public.inventario_personal_tecnico ENABLE TRIGGER ALL;

--
-- Data for Name: log_auditoria; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.log_auditoria DISABLE TRIGGER ALL;



ALTER TABLE public.log_auditoria ENABLE TRIGGER ALL;

--
-- Data for Name: movimiento_inventario; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.movimiento_inventario DISABLE TRIGGER ALL;

INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (1, 4, NULL, NULL, 1, NULL, 1, 2, 'INGRESO_RECEPCION', 2.00, '2026-11-08 10:00:00', 2);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (2, 5, NULL, NULL, 1, NULL, 1, 2, 'INGRESO_RECEPCION', 3.00, '2026-11-08 10:00:00', 2);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (3, 3, NULL, NULL, 1, NULL, 1, 2, 'INGRESO_RECEPCION', 2.00, '2026-10-25 10:00:00', 3);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (4, 6, NULL, NULL, 1, NULL, 1, 2, 'INGRESO_RECEPCION', 100.00, '2026-10-25 10:00:00', 3);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (5, 11, NULL, NULL, 2, NULL, 2, 2, 'INGRESO_RECEPCION', 200.00, '2026-11-06 10:00:00', 4);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (6, 5, 14, 1, NULL, 1, NULL, 2, 'SALIDA_A_TECNICO', 1.00, '2026-09-10 09:30:00', 1);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (7, NULL, 16, 1, NULL, 1, NULL, 2, 'SALIDA_A_TECNICO', 1.00, '2026-09-10 09:30:00', 1);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (8, 7, NULL, 1, NULL, 1, NULL, 2, 'SALIDA_A_TECNICO', 25.00, '2026-09-10 09:30:00', 1);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (9, 6, NULL, 1, NULL, 1, NULL, 2, 'SALIDA_A_TECNICO', 12.00, '2026-09-10 09:30:00', 1);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (10, 8, NULL, 1, NULL, 1, NULL, 2, 'SALIDA_A_TECNICO', 60.00, '2026-09-12 15:10:00', 2);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (11, 6, NULL, 1, NULL, 1, NULL, 2, 'SALIDA_A_TECNICO', 8.00, '2026-09-12 15:10:00', 2);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (12, 9, 31, 2, NULL, 2, NULL, 2, 'SALIDA_A_TECNICO', 1.00, '2026-09-11 11:00:00', 3);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (13, 11, NULL, 2, NULL, 2, NULL, 2, 'SALIDA_A_TECNICO', 40.00, '2026-09-11 11:00:00', 3);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (14, NULL, 21, 1, NULL, 1, NULL, 2, 'PRESTAMO_EXTERNO', 1.00, '2026-09-09 10:00:00', 1);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (15, 3, 22, 1, NULL, 1, NULL, 2, 'PRESTAMO_EXTERNO', 1.00, '2026-09-09 10:00:00', 1);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (16, 7, NULL, 1, NULL, 1, NULL, 2, 'PRESTAMO_EXTERNO', 15.00, '2026-09-09 10:00:00', 1);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (17, 7, NULL, 1, NULL, 1, NULL, 2, 'PRESTAMO_EXTERNO', 20.00, '2026-08-20 09:00:00', 2);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (18, 6, NULL, 1, NULL, 1, NULL, 2, 'PRESTAMO_EXTERNO', 10.00, '2026-08-01 12:00:00', 3);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (19, 5, 20, 1, NULL, 1, NULL, 2, 'PRESTAMO_EXTERNO', 1.00, '2026-09-07 14:00:00', 4);
INSERT INTO public.movimiento_inventario (id_movimiento, id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino, id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento, cantidad, fecha, referencia_id) VALUES (20, 6, NULL, 1, 2, 1, 2, 2, 'TRANSFERENCIA_APROBADA', 10.00, '2026-11-02 10:00:00', 1);


ALTER TABLE public.movimiento_inventario ENABLE TRIGGER ALL;

--
-- Data for Name: notificacion; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.notificacion DISABLE TRIGGER ALL;



ALTER TABLE public.notificacion ENABLE TRIGGER ALL;

--
-- Data for Name: proveedor; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.proveedor DISABLE TRIGGER ALL;

INSERT INTO public.proveedor (id_proveedor, nombre_comercial, rut, nombre_contacto, telefono, email, activa, fecha_creacion) VALUES (1, 'Distribuidora Andina SpA', '76123456-0', 'Marcela Rojas', '+56912345678', 'ventas@distribuidoraandina.cl', true, '2026-11-14 21:30:07.695394+00');
INSERT INTO public.proveedor (id_proveedor, nombre_comercial, rut, nombre_contacto, telefono, email, activa, fecha_creacion) VALUES (2, 'TecnoRed Chile Ltda.', '77234567-4', 'Felipe Soto', '+56923456789', 'contacto@tecnored.cl', true, '2026-11-14 21:30:07.701172+00');
INSERT INTO public.proveedor (id_proveedor, nombre_comercial, rut, nombre_contacto, telefono, email, activa, fecha_creacion) VALUES (3, 'Importadora Pacífico SpA', '78345678-8', 'Camila Fuentes', '+56934567890', 'pedidos@importadorapacifico.cl', true, '2026-11-14 21:30:07.705601+00');


ALTER TABLE public.proveedor ENABLE TRIGGER ALL;

--
-- Data for Name: orden_ingreso; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.orden_ingreso DISABLE TRIGGER ALL;

INSERT INTO public.orden_ingreso (id_orden, correlativo, id_proveedor, numero_documento, fecha_documento, id_empresa_destino, id_bodega_destino, estado, id_usuario_registro, fecha_creacion) VALUES (1, 'OI-0001', 1, 'FAC-DEMO-01', '2026-11-12', 1, 1, 'Pendiente de recepción', 2, '2026-11-14 21:30:07.79532+00');
INSERT INTO public.orden_ingreso (id_orden, correlativo, id_proveedor, numero_documento, fecha_documento, id_empresa_destino, id_bodega_destino, estado, id_usuario_registro, fecha_creacion) VALUES (2, 'OI-0002', 2, 'FAC-DEMO-02', '2026-11-08', 1, 1, 'Recepción parcial', 2, '2026-11-14 21:30:07.79967+00');
INSERT INTO public.orden_ingreso (id_orden, correlativo, id_proveedor, numero_documento, fecha_documento, id_empresa_destino, id_bodega_destino, estado, id_usuario_registro, fecha_creacion) VALUES (3, 'OI-0003', 3, 'FAC-DEMO-03', '2026-10-25', 1, 1, 'Completada', 2, '2026-11-14 21:30:07.805695+00');
INSERT INTO public.orden_ingreso (id_orden, correlativo, id_proveedor, numero_documento, fecha_documento, id_empresa_destino, id_bodega_destino, estado, id_usuario_registro, fecha_creacion) VALUES (4, 'OI-0004', 1, 'FAC-DEMO-04', '2026-11-06', 2, 2, 'Completada', 2, '2026-11-14 21:30:07.812012+00');


ALTER TABLE public.orden_ingreso ENABLE TRIGGER ALL;

--
-- Data for Name: orden_ingreso_detalle; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.orden_ingreso_detalle DISABLE TRIGGER ALL;

INSERT INTO public.orden_ingreso_detalle (id_detalle, id_orden, id_tipo_equipo, cantidad_esperada, garantia_dias, cantidad_recibida) VALUES (1, 1, 3, 3, 365, 0);
INSERT INTO public.orden_ingreso_detalle (id_detalle, id_orden, id_tipo_equipo, cantidad_esperada, garantia_dias, cantidad_recibida) VALUES (2, 2, 4, 4, 730, 2);
INSERT INTO public.orden_ingreso_detalle (id_detalle, id_orden, id_tipo_equipo, cantidad_esperada, garantia_dias, cantidad_recibida) VALUES (3, 2, 5, 3, 365, 3);
INSERT INTO public.orden_ingreso_detalle (id_detalle, id_orden, id_tipo_equipo, cantidad_esperada, garantia_dias, cantidad_recibida) VALUES (4, 3, 3, 2, 365, 2);
INSERT INTO public.orden_ingreso_detalle (id_detalle, id_orden, id_tipo_equipo, cantidad_esperada, garantia_dias, cantidad_recibida) VALUES (5, 3, 6, 100, 0, 100);
INSERT INTO public.orden_ingreso_detalle (id_detalle, id_orden, id_tipo_equipo, cantidad_esperada, garantia_dias, cantidad_recibida) VALUES (6, 4, 11, 200, 0, 200);


ALTER TABLE public.orden_ingreso_detalle ENABLE TRIGGER ALL;

--
-- Data for Name: prestamo_externo; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prestamo_externo DISABLE TRIGGER ALL;

INSERT INTO public.prestamo_externo (id_prestamo, tipo, id_empresa, id_unidad, nombre_receptor, rut_receptor, fecha_salida, fecha_retorno_estimada, fecha_retorno_real, detalle, estado, resultado, id_usuario_registro, correlativo, id_bodega_origen) VALUES (1, 'PRESTAMO_EXTERNO', 1, NULL, 'Constructora Andes Ltda.', '96567890-5', '2026-09-09 13:00:00+00', '2026-11-18', NULL, 'Préstamo de equipos y fibra para faena en terreno.', 'ACTIVO', NULL, 2, 'PE-00001', 1);
INSERT INTO public.prestamo_externo (id_prestamo, tipo, id_empresa, id_unidad, nombre_receptor, rut_receptor, fecha_salida, fecha_retorno_estimada, fecha_retorno_real, detalle, estado, resultado, id_usuario_registro, correlativo, id_bodega_origen) VALUES (2, 'PRESTAMO_EXTERNO', 1, NULL, 'Municipalidad de Providencia', '69123456-8', '2026-08-20 12:00:00+00', '2026-11-11', NULL, 'Préstamo vencido para demostración (días restantes negativos).', 'ACTIVO', NULL, 2, 'PE-00002', 1);
INSERT INTO public.prestamo_externo (id_prestamo, tipo, id_empresa, id_unidad, nombre_receptor, rut_receptor, fecha_salida, fecha_retorno_estimada, fecha_retorno_real, detalle, estado, resultado, id_usuario_registro, correlativo, id_bodega_origen) VALUES (3, 'PRESTAMO_EXTERNO', 1, NULL, 'Servicio Técnico Electronorte Ltda.', '77456789-5', '2026-08-01 15:00:00+00', '2026-10-20', '2026-08-19', 'Préstamo cerrado con devolución completa de conectores.', 'CERRADO', NULL, 2, 'PE-00003', 1);
INSERT INTO public.prestamo_externo (id_prestamo, tipo, id_empresa, id_unidad, nombre_receptor, rut_receptor, fecha_salida, fecha_retorno_estimada, fecha_retorno_real, detalle, estado, resultado, id_usuario_registro, correlativo, id_bodega_origen) VALUES (4, 'REPARACION_EXTERNA', 1, 20, 'Servicio Técnico Electronorte Ltda.', '77456789-5', '2026-09-07 17:00:00+00', '2026-11-24', NULL, 'Falla en puerto HDMI; diagnóstico en banco.', 'ACTIVO', NULL, 2, NULL, NULL);


ALTER TABLE public.prestamo_externo ENABLE TRIGGER ALL;

--
-- Data for Name: prestamo_detalle; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prestamo_detalle DISABLE TRIGGER ALL;

INSERT INTO public.prestamo_detalle (id_detalle, id_prestamo, id_unidad, id_tipo_equipo, cantidad, cantidad_retornada) VALUES (1, 1, 21, NULL, 1.00, 0.00);
INSERT INTO public.prestamo_detalle (id_detalle, id_prestamo, id_unidad, id_tipo_equipo, cantidad, cantidad_retornada) VALUES (2, 1, 22, 3, 1.00, 0.00);
INSERT INTO public.prestamo_detalle (id_detalle, id_prestamo, id_unidad, id_tipo_equipo, cantidad, cantidad_retornada) VALUES (3, 1, NULL, 7, 15.00, 0.00);
INSERT INTO public.prestamo_detalle (id_detalle, id_prestamo, id_unidad, id_tipo_equipo, cantidad, cantidad_retornada) VALUES (4, 2, NULL, 7, 20.00, 0.00);
INSERT INTO public.prestamo_detalle (id_detalle, id_prestamo, id_unidad, id_tipo_equipo, cantidad, cantidad_retornada) VALUES (5, 3, NULL, 6, 10.00, 10.00);


ALTER TABLE public.prestamo_detalle ENABLE TRIGGER ALL;

--
-- Data for Name: prestamo_retorno; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prestamo_retorno DISABLE TRIGGER ALL;

INSERT INTO public.prestamo_retorno (id_retorno, id_detalle, cantidad, fecha_retorno, observacion, id_usuario) VALUES (1, 5, 10.00, '2026-08-19 19:00:00+00', 'Devolución completa en bodega; empaque original.', 2);


ALTER TABLE public.prestamo_retorno ENABLE TRIGGER ALL;

--
-- Data for Name: proveedor_tipo_equipo; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.proveedor_tipo_equipo DISABLE TRIGGER ALL;

INSERT INTO public.proveedor_tipo_equipo (id, id_proveedor, id_tipo_equipo) VALUES (1, 1, 1);
INSERT INTO public.proveedor_tipo_equipo (id, id_proveedor, id_tipo_equipo) VALUES (2, 1, 3);
INSERT INTO public.proveedor_tipo_equipo (id, id_proveedor, id_tipo_equipo) VALUES (3, 1, 4);
INSERT INTO public.proveedor_tipo_equipo (id, id_proveedor, id_tipo_equipo) VALUES (4, 2, 5);
INSERT INTO public.proveedor_tipo_equipo (id, id_proveedor, id_tipo_equipo) VALUES (5, 2, 6);
INSERT INTO public.proveedor_tipo_equipo (id, id_proveedor, id_tipo_equipo) VALUES (6, 3, 3);
INSERT INTO public.proveedor_tipo_equipo (id, id_proveedor, id_tipo_equipo) VALUES (7, 3, 8);


ALTER TABLE public.proveedor_tipo_equipo ENABLE TRIGGER ALL;

--
-- Data for Name: rol; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.rol DISABLE TRIGGER ALL;

INSERT INTO public.rol (id_rol, nombre_rol, descripcion) VALUES (1, 'SUPERUSUARIO', 'Rol SUPERUSUARIO (creado por seed:qa)');
INSERT INTO public.rol (id_rol, nombre_rol, descripcion) VALUES (2, 'ADMIN', 'Rol ADMIN (creado por seed:qa)');
INSERT INTO public.rol (id_rol, nombre_rol, descripcion) VALUES (3, 'TECNICO_TERRENO', 'Rol TECNICO_TERRENO (creado por seed:qa)');


ALTER TABLE public.rol ENABLE TRIGGER ALL;

--
-- Data for Name: salida_bodega; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.salida_bodega DISABLE TRIGGER ALL;

INSERT INTO public.salida_bodega (id_salida, id_tecnico, id_bodega_origen, fecha_hora, id_empresa, id_usuario_registro) VALUES (1, 4, 1, '2026-09-10 12:30:00+00', 1, 2);
INSERT INTO public.salida_bodega (id_salida, id_tecnico, id_bodega_origen, fecha_hora, id_empresa, id_usuario_registro) VALUES (2, 4, 1, '2026-09-12 18:10:00+00', 1, 2);
INSERT INTO public.salida_bodega (id_salida, id_tecnico, id_bodega_origen, fecha_hora, id_empresa, id_usuario_registro) VALUES (3, 5, 2, '2026-09-11 14:00:00+00', 2, 2);


ALTER TABLE public.salida_bodega ENABLE TRIGGER ALL;

--
-- Data for Name: salida_detalle; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.salida_detalle DISABLE TRIGGER ALL;

INSERT INTO public.salida_detalle (id_detalle, id_salida, id_tipo_equipo, id_unidad, cantidad) VALUES (1, 1, 5, 14, NULL);
INSERT INTO public.salida_detalle (id_detalle, id_salida, id_tipo_equipo, id_unidad, cantidad) VALUES (2, 1, NULL, 16, NULL);
INSERT INTO public.salida_detalle (id_detalle, id_salida, id_tipo_equipo, id_unidad, cantidad) VALUES (3, 1, 7, NULL, 25.00);
INSERT INTO public.salida_detalle (id_detalle, id_salida, id_tipo_equipo, id_unidad, cantidad) VALUES (4, 1, 6, NULL, 12.00);
INSERT INTO public.salida_detalle (id_detalle, id_salida, id_tipo_equipo, id_unidad, cantidad) VALUES (5, 2, 8, NULL, 60.00);
INSERT INTO public.salida_detalle (id_detalle, id_salida, id_tipo_equipo, id_unidad, cantidad) VALUES (6, 2, 6, NULL, 8.00);
INSERT INTO public.salida_detalle (id_detalle, id_salida, id_tipo_equipo, id_unidad, cantidad) VALUES (7, 3, 9, 31, NULL);
INSERT INTO public.salida_detalle (id_detalle, id_salida, id_tipo_equipo, id_unidad, cantidad) VALUES (8, 3, 11, NULL, 40.00);


ALTER TABLE public.salida_detalle ENABLE TRIGGER ALL;

--
-- Data for Name: secuencia_srv; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.secuencia_srv DISABLE TRIGGER ALL;



ALTER TABLE public.secuencia_srv ENABLE TRIGGER ALL;

--
-- Data for Name: solicitud_baja; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.solicitud_baja DISABLE TRIGGER ALL;

INSERT INTO public.solicitud_baja (id_solicitud, id_unidad, id_empresa, id_usuario_solicitante, motivo, motivo_otro, estado, id_usuario_aprobador, fecha_solicitud, fecha_resolucion, motivo_rechazo) VALUES (1, 8, 1, 4, 'Falla irreparable', NULL, 'Pendiente de aprobación', NULL, '2026-09-12 13:15:00+00', NULL, NULL);
INSERT INTO public.solicitud_baja (id_solicitud, id_unidad, id_empresa, id_usuario_solicitante, motivo, motivo_otro, estado, id_usuario_aprobador, fecha_solicitud, fecha_resolucion, motivo_rechazo) VALUES (2, 23, 1, 4, 'Falla irreparable', NULL, 'Aprobada', 2, '2026-09-05 12:00:00+00', '2026-09-05 18:30:00+00', NULL);
INSERT INTO public.solicitud_baja (id_solicitud, id_unidad, id_empresa, id_usuario_solicitante, motivo, motivo_otro, estado, id_usuario_aprobador, fecha_solicitud, fecha_resolucion, motivo_rechazo) VALUES (3, 12, 1, 4, 'Obsolescencia', NULL, 'Rechazada', 2, '2026-09-04 11:45:00+00', '2026-09-04 20:10:00+00', 'El equipo aún está operativo; se mantiene en bodega.');


ALTER TABLE public.solicitud_baja ENABLE TRIGGER ALL;

--
-- Data for Name: stock_consumible; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.stock_consumible DISABLE TRIGGER ALL;

INSERT INTO public.stock_consumible (id_stock, id_tipo_equipo, id_bodega, cantidad_disponible, umbral_minimo) VALUES (1, 7, 1, 450.50, 100.00);
INSERT INTO public.stock_consumible (id_stock, id_tipo_equipo, id_bodega, cantidad_disponible, umbral_minimo) VALUES (2, 6, 1, 5.00, 20.00);
INSERT INTO public.stock_consumible (id_stock, id_tipo_equipo, id_bodega, cantidad_disponible, umbral_minimo) VALUES (3, 8, 1, 320.00, 50.00);
INSERT INTO public.stock_consumible (id_stock, id_tipo_equipo, id_bodega, cantidad_disponible, umbral_minimo) VALUES (4, 11, 2, 210.00, 50.00);
INSERT INTO public.stock_consumible (id_stock, id_tipo_equipo, id_bodega, cantidad_disponible, umbral_minimo) VALUES (5, 10, 2, 140.00, 30.00);


ALTER TABLE public.stock_consumible ENABLE TRIGGER ALL;

--
-- Data for Name: toma_inventario; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.toma_inventario DISABLE TRIGGER ALL;



ALTER TABLE public.toma_inventario ENABLE TRIGGER ALL;

--
-- Data for Name: toma_inventario_detalle; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.toma_inventario_detalle DISABLE TRIGGER ALL;



ALTER TABLE public.toma_inventario_detalle ENABLE TRIGGER ALL;

--
-- Data for Name: transferencia_equipo; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.transferencia_equipo DISABLE TRIGGER ALL;

INSERT INTO public.transferencia_equipo (id_transferencia, id_empresa_origen, id_empresa_destino, id_usuario_registro, fecha_transferencia, observaciones) VALUES (1, 1, 2, 2, '2026-11-02', 'TRANSFERENCIA-DEMO-01');


ALTER TABLE public.transferencia_equipo ENABLE TRIGGER ALL;

--
-- Data for Name: usuario_rol; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.usuario_rol DISABLE TRIGGER ALL;

INSERT INTO public.usuario_rol (id_usuario_rol, id_usuario, id_rol, fecha_asignacion) VALUES (1, 1, 1, '2026-11-14 21:30:06.41891+00');
INSERT INTO public.usuario_rol (id_usuario_rol, id_usuario, id_rol, fecha_asignacion) VALUES (2, 2, 2, '2026-11-14 21:30:06.715608+00');
INSERT INTO public.usuario_rol (id_usuario_rol, id_usuario, id_rol, fecha_asignacion) VALUES (3, 3, 2, '2026-11-14 21:30:07.005316+00');
INSERT INTO public.usuario_rol (id_usuario_rol, id_usuario, id_rol, fecha_asignacion) VALUES (4, 4, 3, '2026-11-14 21:30:07.326331+00');
INSERT INTO public.usuario_rol (id_usuario_rol, id_usuario, id_rol, fecha_asignacion) VALUES (5, 5, 3, '2026-11-14 21:30:07.662292+00');


ALTER TABLE public.usuario_rol ENABLE TRIGGER ALL;

--
-- Name: asignacion_equipo_servicio_id_asignacion_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.asignacion_equipo_servicio_id_asignacion_seq', 1, false);


--
-- Name: bodega_id_bodega_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bodega_id_bodega_seq', 2, true);


--
-- Name: borrador_cierre_id_borrador_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.borrador_cierre_id_borrador_seq', 1, false);


--
-- Name: cierre_reparacion_id_cierre_reparacion_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cierre_reparacion_id_cierre_reparacion_seq', 1, false);


--
-- Name: donacion_detalle_id_detalle_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.donacion_detalle_id_detalle_seq', 2, true);


--
-- Name: donacion_id_donacion_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.donacion_id_donacion_seq', 1, true);


--
-- Name: empresa_id_empresa_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.empresa_id_empresa_seq', 1, false);


--
-- Name: historial_estado_equipo_id_historial_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.historial_estado_equipo_id_historial_seq', 20, true);


--
-- Name: integracion_activacion_id_activacion_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.integracion_activacion_id_activacion_seq', 1, false);


--
-- Name: integracion_cierre_id_cierre_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.integracion_cierre_id_cierre_seq', 3, true);


--
-- Name: inventario_personal_tecnico_id_inventario_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventario_personal_tecnico_id_inventario_seq', 5, true);


--
-- Name: log_auditoria_id_log_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.log_auditoria_id_log_seq', 1, false);


--
-- Name: movimiento_inventario_id_movimiento_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.movimiento_inventario_id_movimiento_seq', 20, true);


--
-- Name: notificacion_id_notificacion_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notificacion_id_notificacion_seq', 1, false);


--
-- Name: orden_ingreso_detalle_id_detalle_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orden_ingreso_detalle_id_detalle_seq', 6, true);


--
-- Name: orden_ingreso_id_orden_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orden_ingreso_id_orden_seq', 4, true);


--
-- Name: prestamo_detalle_id_detalle_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prestamo_detalle_id_detalle_seq', 5, true);


--
-- Name: prestamo_externo_id_prestamo_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prestamo_externo_id_prestamo_seq', 4, true);


--
-- Name: prestamo_retorno_id_retorno_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prestamo_retorno_id_retorno_seq', 1, true);


--
-- Name: proveedor_id_proveedor_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.proveedor_id_proveedor_seq', 3, true);


--
-- Name: proveedor_tipo_equipo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.proveedor_tipo_equipo_id_seq', 7, true);


--
-- Name: rol_id_rol_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rol_id_rol_seq', 3, true);


--
-- Name: salida_bodega_id_salida_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.salida_bodega_id_salida_seq', 3, true);


--
-- Name: salida_detalle_id_detalle_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.salida_detalle_id_detalle_seq', 8, true);


--
-- Name: solicitud_baja_id_solicitud_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.solicitud_baja_id_solicitud_seq', 3, true);


--
-- Name: stock_consumible_id_stock_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_consumible_id_stock_seq', 5, true);


--
-- Name: tipo_equipo_id_tipo_equipo_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tipo_equipo_id_tipo_equipo_seq', 11, true);


--
-- Name: toma_inventario_detalle_id_detalle_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.toma_inventario_detalle_id_detalle_seq', 1, false);


--
-- Name: toma_inventario_id_toma_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.toma_inventario_id_toma_seq', 1, false);


--
-- Name: transferencia_equipo_id_transferencia_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transferencia_equipo_id_transferencia_seq', 1, true);


--
-- Name: unidad_equipo_id_unidad_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.unidad_equipo_id_unidad_seq', 36, true);


--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuario_id_usuario_seq', 5, true);


--
-- Name: usuario_rol_id_usuario_rol_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuario_rol_id_usuario_rol_seq', 5, true);


--
-- PostgreSQL database dump complete
--


