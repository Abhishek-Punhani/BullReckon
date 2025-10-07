# Production Dockerfile for auth_server with Nginx reverse proxy
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/auth_server/package.json ./apps/auth_server/
COPY apps/auth_server ./apps/auth_server
COPY shared ./shared
COPY types ./types
COPY middleware ./middleware
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --filter=auth_server && pnpm --filter=auth_server run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV NODE_ENV=production

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/auth_server/package.json ./apps/auth_server/
COPY --from=builder /app/apps/auth_server ./apps/auth_server
COPY shared ./shared
COPY types ./types
COPY middleware ./middleware
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --filter=auth_server --production=false && pnpm store prune

# Install Nginx
RUN apk add --no-cache nginx
COPY apps/auth_server/nginx/nginx.conf /etc/nginx/nginx.conf

WORKDIR /app/apps/auth_server
EXPOSE 4000

CMD ["pnpm", "run", "start"]
