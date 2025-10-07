# Production Dockerfile for market_server with Nginx reverse proxy
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/market_server/package.json ./apps/market_server/
COPY apps/market_server ./apps/market_server
COPY shared ./shared
COPY types ./types
COPY middleware ./middleware
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --filter=market_server && pnpm --filter=market_server run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV NODE_ENV=production

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/market_server/package.json ./apps/market_server/
COPY --from=builder /app/apps/market_server ./apps/market_server
COPY shared ./shared
COPY types ./types
COPY middleware ./middleware
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --filter=market_server --production=false && pnpm store prune

# Install Nginx
RUN apk add --no-cache nginx
COPY apps/market_server/nginx/nginx.conf /etc/nginx/nginx.conf

WORKDIR /app/apps/market_server
EXPOSE 5000

CMD ["pnpm", "run", "start"]
