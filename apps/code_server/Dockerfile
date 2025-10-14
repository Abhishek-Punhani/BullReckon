# Production Dockerfile for code_server with Nginx reverse proxy
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/code_server/package.json ./apps/code_server/
COPY apps/code_server ./apps/code_server
COPY shared ./shared
COPY types ./types
COPY middleware ./middleware
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --filter=code_server && pnpm --filter=code_server run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV NODE_ENV=production

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/code_server/package.json ./apps/code_server/
COPY --from=builder /app/apps/code_server ./apps/code_server
COPY shared ./shared
COPY types ./types
COPY middleware ./middleware
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --filter=code_server --production=false && pnpm store prune

# Install Nginx
RUN apk add --no-cache nginx
COPY apps/code_server/nginx/nginx.conf /etc/nginx/nginx.conf

WORKDIR /app/apps/code_server
EXPOSE 2000

CMD ["pnpm", "run", "start"]