FROM node:18-alpine AS base

RUN npm install -g pnpm

WORKDIR /app

# Copy root dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json /app/

# Copy shared dependencies
COPY shared /app/shared
COPY types /app/types
COPY packages /app/packages

# Copy web app files
COPY apps/web /app/apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build Next.js
WORKDIR /app/apps/web
RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "start"]