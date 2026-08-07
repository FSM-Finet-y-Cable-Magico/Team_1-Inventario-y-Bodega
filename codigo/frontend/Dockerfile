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
ENV PORT=3000
ENV HOST=0.0.0.0

WORKDIR /app

# Solo lo necesario para ejecutar el servidor compilado
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./

# adapter-node expone el servidor en el puerto 3000
EXPOSE 3000

CMD ["node", "build/index.js"]
