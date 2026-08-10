FROM node:22-alpine AS build

WORKDIR /app

# Dependencias (usa el lockfile para builds reproducibles)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Código fuente
COPY . .

# Compilar la app (adapter-node genera build/ con el servidor)
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Instalar dependencias de producción requeridas por el build compilado
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copiar build compilado
COPY --from=build /app/build ./build

EXPOSE 3000

CMD ["node", "build/index.js"]
