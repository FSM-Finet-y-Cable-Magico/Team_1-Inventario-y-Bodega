#!/bin/sh
set -e

echo "[entrypoint] Esperando a que PostgreSQL esté disponible..."
node -e "
const { Client } = require('pg');
const url = process.env.DATABASE_URL;
async function wait() {
  for (let i = 0; i < 60; i++) {
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 3000 });
    try { await client.connect(); await client.end(); console.log('[entrypoint] BD lista.'); return; }
    catch (e) { await new Promise(r => setTimeout(r, 2000)); }
  }
  console.error('[entrypoint] No se pudo conectar a la BD.'); process.exit(1);
}
wait();
"

# Migraciones de esquema (idempotentes).
# OMITIR_MIGRACIONES=true: para una BD compartida (BDD global) cuyo esquema
# administra otro grupo; ahí el usuario de G1 no es dueño de las tablas.
if [ "$OMITIR_MIGRACIONES" = "true" ]; then
  echo "[entrypoint] OMITIR_MIGRACIONES=true: se omiten las migraciones."
else
  echo "[entrypoint] Ejecutando migraciones de esquema..."
  node dist/scripts/migrar.js
fi

# Seed de datos QA (idempotente: crea empresas, bodegas, roles y usuarios).
# OMITIR_SEED=true: no cargar usuarios ni datos de demostración (BDD global).
if [ "$OMITIR_SEED" = "true" ]; then
  echo "[entrypoint] OMITIR_SEED=true: se omite el seed de demostración."
else
  echo "[entrypoint] Ejecutando seed de datos de demostración..."
  node dist/scripts/seed-qa.js
fi

# Ubicación del punto de entrada compilado (depende de la config de Nest)
if [ -f dist/src/main.js ]; then
  MAIN=dist/src/main.js
else
  MAIN=dist/main.js
fi

echo "[entrypoint] Arrancando la API ($MAIN)..."
exec node "$MAIN"
