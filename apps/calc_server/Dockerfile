# Production Dockerfile for calc_server with Nginx reverse proxy
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/calc_server/package.json ./apps/calc_server/
COPY apps/calc_server ./apps/calc_server
COPY shared/js ./shared/js
COPY types ./types
COPY middleware ./middleware
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --filter=calc_server && pnpm --filter=calc_server run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV NODE_ENV=production

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/calc_server/package.json ./apps/calc_server/
COPY --from=builder /app/apps/calc_server ./apps/calc_server
COPY --from=builder /app/shared/js ./shared/js
COPY types ./types
COPY middleware ./middleware
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --filter=calc_server --production=false && pnpm store prune

# Install Nginx
RUN apk add --no-cache nginx
COPY apps/calc_server/nginx/nginx.conf /etc/nginx/nginx.conf

WORKDIR /app/apps/calc_server
EXPOSE 8000

CMD ["pnpm", "run", "start"]
