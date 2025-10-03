# Multi-stage build for Next.js Web App
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy only necessary dependencies (no middleware, only shared and types)
COPY shared ./shared
COPY types ./types

# Copy web app
COPY apps/web ./apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile --filter=web...

# Build stage
FROM base AS builder

WORKDIR /app/apps/web

# Build Next.js application
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy shared dependencies
COPY --from=base /app/shared ./shared
COPY --from=base /app/types ./types

# Copy built Next.js app
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.js ./apps/web/next.config.js

# Install production dependencies only
RUN pnpm install --frozen-lockfile --filter=web... --prod

WORKDIR /app/apps/web

EXPOSE 3000

ENV NODE_ENV=production

# Use production start command
CMD ["pnpm", "run", "start"]

# Development stage (default)
FROM base AS development

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "run", "dev"]
