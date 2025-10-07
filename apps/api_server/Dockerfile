# Production Dockerfile for api_server with Nginx reverse proxy
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/api_server/package.json ./apps/api_server/
COPY apps/api_server ./apps/api_server
COPY shared ./shared
COPY types ./types
COPY middleware ./middleware
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --filter=api_server && pnpm --filter=api_server run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV NODE_ENV=production

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/api_server/package.json ./apps/api_server/
COPY --from=builder /app/apps/api_server ./apps/api_server
COPY shared ./shared
COPY types ./types
COPY middleware ./middleware
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --filter=api_server --production=false && pnpm store prune

# Install Nginx
RUN apk add --no-cache nginx
COPY apps/api_server/nginx/nginx.conf /etc/nginx/nginx.conf

WORKDIR /app/apps/api_server
EXPOSE 3005 3006 3007

CMD ["pnpm", "run", "start"]
