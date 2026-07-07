# Build from repo root: docker compose -f docker/compose.yml build
FROM node:22-alpine AS builder
RUN npm i -g pnpm@10
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --config.dangerouslyAllowAllBuilds=true
COPY . .
ARG VITE_GITSTARS_CLIENT_ID
ARG VITE_BASE_PATH=/gitstars/
ENV VITE_GITSTARS_CLIENT_ID=$VITE_GITSTARS_CLIENT_ID
ENV VITE_BASE_PATH=$VITE_BASE_PATH
RUN pnpm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY server.js package.json ./
RUN npm install --omit=dev
ENV SERVER_PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
