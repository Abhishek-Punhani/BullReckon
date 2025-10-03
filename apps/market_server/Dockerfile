# Multi-stage build for Market Server
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./

# Copy only necessary shared dependencies (no packages folder)
COPY shared ./shared
COPY types ./types
COPY middleware ./middleware

# Copy market server
COPY apps/market_server ./apps/market_server

# Install dependencies
RUN pnpm install --frozen-lockfile --filter=market_server...

# Production stage
FROM node:18-alpine AS production

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./

# Copy dependencies from base
COPY --from=base /app/shared ./shared
COPY --from=base /app/types ./types
COPY --from=base /app/middleware ./middleware
COPY --from=base /app/apps/market_server ./apps/market_server
COPY --from=base /app/node_modules ./node_modules

# Install production dependencies only
RUN pnpm install --frozen-lockfile --filter=market_server... --prod

WORKDIR /app/apps/market_server

EXPOSE 5000

# Use production start command
CMD ["node", "server.ts"]

# Development stage (default)
FROM base AS development

WORKDIR /app/apps/market_server

EXPOSE 5000

CMD ["pnpm", "run", "dev"]