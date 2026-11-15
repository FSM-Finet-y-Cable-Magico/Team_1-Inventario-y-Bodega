# Variables comunes del entorno de demostración (lo incluyen los demás scripts).
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODIGO="$(cd "$DEMO_DIR/.." && pwd)"
COMPOSE=(docker compose -p inventario-demo -f "$CODIGO/docker-compose.yml" -f "$DEMO_DIR/docker-compose.demo.yml")
URL="http://localhost:8090"
SIMULADOR="http://localhost:8091"
DUMP="$DEMO_DIR/estado-inicial-demo.dump"
psql_demo() { docker exec -i inventario-demo-db psql -U inventario -d inventario -v ON_ERROR_STOP=1 "$@"; }
recargar_nginx() { docker exec inventario-demo-nginx nginx -s reload >/dev/null 2>&1 || true; }
esperar_backend() { for i in $(seq 1 60); do curl -sf "$URL/api/health/ping" >/dev/null && return 0; sleep 3; done; return 1; }
