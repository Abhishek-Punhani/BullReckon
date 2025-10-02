FROM node:18-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy root dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json /app/

# Copy shared dependencies
COPY shared /app/shared
COPY types /app/types
COPY middleware /app/middleware
COPY packages /app/packages

# Copy service files
COPY apps/calc_server /app/apps/calc_server

# Install dependencies
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/calc_server

EXPOSE 8000

CMD ["pnpm", "run", "dev"]