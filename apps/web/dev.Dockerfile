# Production Dockerfile for Next.js Web App with Nginx
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY shared ./shared
COPY types ./types
COPY apps/web ./apps/web
RUN npm install -g pnpm && pnpm install --frozen-lockfile --filter=web... && pnpm --filter=web run build

# Nginx stage
FROM nginx:1.25-alpine as nginx
WORKDIR /etc/nginx
COPY apps/web/nginx/nginx.conf ./nginx.conf

# App stage
FROM node:18-alpine AS app
WORKDIR /app
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/types ./types
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.js ./apps/web/next.config.js
RUN npm install -g pnpm && pnpm install --frozen-lockfile --filter=web... --prod

# Supervisor stage
FROM alpine:3.18
RUN apk add --no-cache supervisor nodejs
COPY --from=app /app /app
COPY --from=nginx /etc/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=nginx /etc/nginx /etc/nginx
COPY apps/web/nginx/supervisord.conf /etc/supervisord.conf
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
