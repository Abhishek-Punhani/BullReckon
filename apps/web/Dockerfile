# Production Dockerfile for Next.js web app with Nginx reverse proxy
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/web ./apps/web
COPY shared ./shared
COPY types ./types
COPY packages ./packages

RUN pnpm install --frozen-lockfile --filter=web && pnpm --filter=web run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV NODE_ENV=production

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/web/package.json ./apps/web/
COPY --from=builder /app/apps/web ./apps/web
COPY shared ./shared
COPY types ./types
COPY packages ./packages

RUN pnpm install --frozen-lockfile --filter=web && pnpm store prune

# Install Nginx
RUN apk add --no-cache nginx
COPY apps/web/nginx/nginx.conf /etc/nginx/nginx.conf

WORKDIR /app/apps/web
EXPOSE 3001 3002 3003

CMD ["pnpm", "run", "start"]
