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

# Migraciones de esquema (idempotentes)
echo "[entrypoint] Ejecutando migraciones de esquema..."
node dist/scripts/migrar.js

# Seed de datos QA (idempotente: crea empresas, bodegas, roles y usuarios)
echo "[entrypoint] Ejecutando seed de datos de demostración..."
node dist/scripts/seed-qa.js

# Ubicación del punto de entrada compilado (depende de la config de Nest)
if [ -f dist/src/main.js ]; then
  MAIN=dist/src/main.js
else
  MAIN=dist/main.js
fi

echo "[entrypoint] Arrancando la API ($MAIN)..."
exec node "$MAIN"
