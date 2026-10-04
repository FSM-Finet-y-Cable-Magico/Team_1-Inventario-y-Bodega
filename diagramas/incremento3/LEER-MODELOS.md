# Modelos del Incremento 3

El modelo físico general editable es `modelo-fisico-incrementos.chartdb.json`, exportable en ChartDB (instancia local del equipo). PNG generado desde ChartDB.

- Azul `#8eb7ff`: 12 tablas incorporadas en I1.
- Verde `#8dd6b0`: 14 tablas incorporadas en I2.
- Ámbar `#ffc870`: 6 tablas incorporadas en I3.

Fuentes: esquema-bdd-incremento1.sql; SQL de la carpeta codigo/database del I2 en Drive; esquema observado de dev a810aa40 (`docs/incremento-3/resultados/esquema.json`). `integracion_cierre` ya existía en I2. Los atributos ampliados no cambian el color de origen de una tabla. El diccionario completo documenta todos los atributos.

Los cuatro gráficos Burn-up/Burn-down representan cortes de alcance de I3 y del proyecto. Los datos están en `datos-graficos.json`; no reconstruyen avance diario.

Los componentes mantienen la fuente Draw.io y la vista UML monocroma. Los nombres de controladores y servicios se contrastaron con las clases del checkout dev probado. Las secuencias, MERE, MR, FNs y ME conservan sus fuentes originales y versiones editables.
