# Production Dockerfile for Auth Server with Nginx
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY shared ./shared
COPY types ./types
COPY middleware ./middleware
COPY apps/auth_server ./apps/auth_server
RUN npm install -g pnpm && pnpm install --frozen-lockfile --filter=auth_server... && pnpm --filter=auth_server run build || echo "No build script"

FROM nginx:1.25-alpine as nginx
WORKDIR /etc/nginx
COPY apps/auth_server/nginx/nginx.conf ./nginx.conf

FROM node:18-alpine AS app
WORKDIR /app
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/types ./types
COPY --from=builder /app/middleware ./middleware
COPY --from=builder /app/apps/auth_server ./apps/auth_server
COPY --from=builder /app/node_modules ./node_modules
RUN npm install -g pnpm && pnpm install --frozen-lockfile --filter=auth_server... --prod

FROM alpine:3.18
RUN apk add --no-cache supervisor nodejs
COPY --from=app /app /app
COPY --from=nginx /etc/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=nginx /etc/nginx /etc/nginx
COPY apps/auth_server/nginx/supervisord.conf /etc/supervisord.conf
WORKDIR /app/apps/auth_server
EXPOSE 4000
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
