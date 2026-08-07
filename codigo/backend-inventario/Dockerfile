# Etapa de compilación
FROM node:22-alpine AS build

WORKDIR /app

# Dependencias (usa el lockfile para builds reproducibles)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Código fuente
COPY . .

# Compilar a producción (genera dist/)
RUN npm run build

# Etapa de runtime (solo dependencias de producción)
FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Build compilado
COPY --from=build /app/dist ./dist

# Script de arranque (espera a la BD, migra y hace seed)
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3003

ENTRYPOINT ["docker-entrypoint.sh"]
