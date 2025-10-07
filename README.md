# BullReckon

[![Build Passing](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/yourorg/yourrepo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-13+-black?logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express.js-Backend-lightgrey?logo=express)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-blue?logo=docker)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Nginx](https://img.shields.io/badge/Nginx-Reverse%20Proxy-green?logo=nginx)](https://nginx.org/)

---

## Overview

**BullReckon** is a modern, scalable trading and risk management platform built with a microservices architecture. It provides real-time market data, automated risk controls, portfolio management, and a rich web interface. The system is designed for extensibility, reliability, and developer productivity.

---

## Table of Contents

- [Architecture](#architecture)
- [Service Breakdown](#service-breakdown)
- [Directory Structure](#directory-structure)
- [Installation & Setup](#installation--setup)
- [API Key System](#api-key-system)
- [Development Guide](#development-guide)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Architecture

BullReckon is a **TypeScript monorepo** using [pnpm workspaces](https://pnpm.io/workspaces) and [TurboRepo](https://turbo.build/). Each major domain is a separate service, containerized with Docker and orchestrated via Docker Compose. Nginx is used for load balancing and CORS. Redis and MongoDB are used for queues and persistent storage.

### High-Level Diagram

```
[ Web (Next.js) ]
      |
[ web-nginx ]
      |
[ API Gateway (api-nginx) ]
      |
-----------------------------
|   |   |   |   |   |   |   |
API CALC MARKET AUTH REDIS ...
```

### Service Communication Flow

```
1. User Request → Web (Next.js Frontend)
2. Web → Service APIs (Auth, Market, Calc, API Gateway)
3. Services → Internal Auth Validation (JWT/Internal Secret)
4. Services → Database (MongoDB) for persistence
5. Services → Redis Queue for background jobs
6. Workers → Process queued jobs
7. Market Service → Yahoo Finance API for data
8. WebSocket → Real-time updates to connected clients
```

### Load Balancing Strategy

Each backend service runs **3 replicated instances** behind an **Nginx reverse proxy** using the **least connections** algorithm for optimal load distribution:

- **Web Service**: 3 instances (ports 3001-3003) → Nginx (port 3000)
- **Auth Service**: 3 instances (ports 4001-4003) → Nginx (port 4000)
- **Market Service**: 3 instances (ports 5001-5003) → Nginx (port 5000)
- **Calc Service**: 3 instances (ports 8001-8003) → Nginx (port 8000)
- **API Service**: 3 instances (ports 3005-3007) → Nginx (port 3004)

---

## Service Breakdown

### 1. Web (Next.js Frontend)

- **Path:** `apps/web`
- **Stack:** Next.js, React, TailwindCSS, TypeScript
- **Features:**
  - Modern dashboard UI
  - Real-time market data and portfolio updates
  - User authentication (JWT, Google OAuth)
  - API key management UI
  - Strategy builder and backtesting
  - Responsive/mobile support
- **Dev:** `pnpm -C apps/web run dev`

### 2. Auth Server

- **Path:** `apps/auth_server`
- **Stack:** Node.js, Express, TypeScript, MongoDB
- **Features:**
  - User registration, login, password reset
  - JWT and session management
  - Email verification (with templates)
  - Secure password hashing
  - Internal API for user info
- **Dev:** `pnpm -C apps/auth_server run dev`

### 3. Market Server

- **Path:** `apps/market_server`
- **Stack:** Node.js, Express, TypeScript
- **Features:**
  - Aggregates live market data (Yahoo Finance, etc.)
  - Provides stock quotes, historical data, and symbol search
  - Caches and rate-limits requests
  - Exposes REST API for frontend and other services
- **Dev:** `pnpm -C apps/market_server run dev`

### 4. Calc Server

- **Path:** `apps/calc_server`
- **Stack:** Node.js, Express, TypeScript, BullMQ, Redis
- **Features:**
  - Risk management and monitoring
  - Portfolio and position calculations
  - Automated strategy execution
  - Background jobs and queue workers
  - Email alerts for risk events
- **Dev:** `pnpm -C apps/calc_server run dev`

### 5. API Server (Gateway)

- **Path:** `apps/api_server`
- **Stack:** Node.js, Express, TypeScript
- **Features:**
  - API gateway for all backend services
  - Backtesting and script trading endpoints
  - API key validation and rate limiting
  - Aggregates and proxies requests to other services
- **Dev:** `pnpm -C apps/api_server run dev`

### 6. Shared, Middleware, Packages

- **shared/**: Base classes, DB, queue, email, WebSocket, etc.
- **middleware/**: Express middleware (auth, error handling, etc.)
- **packages/**: Shared configs, UI, and TypeScript settings

---

## Directory Structure

```
bullReckon/
├── apps/
│   ├── web/           # Next.js frontend
│   ├── api_server/    # API gateway
│   ├── calc_server/   # Risk, portfolio, strategy
│   ├── market_server/ # Market data
│   └── auth_server/   # Auth & user management
├── shared/            # Shared utilities
├── middleware/        # Express middleware
├── packages/          # Shared configs, UI, tsconfig
├── docker-compose.yml # Service orchestration
├── README.md
└── ...
```

---

## Installation & Setup

### Prerequisites

- Node.js (v18+ recommended)
- pnpm (preferred, or npm/yarn)
- Docker & Docker Compose
- Git
- (Optional) MongoDB and Redis locally, or use cloud providers

### 1. Clone the Repository

```bash
git clone https://github.com/yourorg/bullReckon.git
cd bullReckon
```

### 2. Install Dependencies

```bash
pnpm install
# or npm install
```

### 3. Configure Environment Variables

- Copy `.env.example` to `.env` in the root and in each service folder as needed:
  ```bash
  cp .env.example .env
  cp apps/auth_server/.env.example apps/auth_server/.env
  cp apps/calc_server/.env.example apps/calc_server/.env
  # Edit apps/market_server/.env as needed
  ```
- Edit the `.env` files to set secrets, DB URLs, ports, and service URLs. See comments in each file for required values.

### 4. Build and Start All Services (Recommended)

```bash
docker-compose up --build
```

- This will build and start all backend services, Nginx, Redis, and MongoDB (if configured in Docker).
- Access the app at:
  - Frontend: http://localhost:3000
  - API: http://localhost:3004
  - Market: http://localhost:5000
  - Auth: http://localhost:4000
  - Calc: http://localhost:8000

### 5. Running Services Individually (Development)

- You can run any service in dev mode with hot reload:
  ```bash
  pnpm -C apps/auth_server run dev
  pnpm -C apps/market_server run dev
  pnpm -C apps/calc_server run dev
  pnpm -C apps/api_server run dev
  pnpm -C apps/web run dev
  ```
- Set the `PORT` env variable as needed (see `.env` and service docs).

### 6. Useful Commands

- Type checking: `pnpm run check-types`
- Lint: `pnpm run lint`
- Build web: `pnpm -C apps/web run build`
- Run all dev services: `pnpm run dev` (uses turbo)

### 7. Database & Queues

- MongoDB: Set `DB_URL` in each service's `.env`.
- Redis: Set `REDIS_HOST` and `REDIS_PORT` in `.env`.
- To disable queues for local dev, set `DISABLE_REDIS_QUEUES=true` in root `.env`.

---

## API Key System

BullReckon uses an API key system to secure and manage access to backend APIs. Each user or integration can generate and manage their own API keys via the web UI or API endpoints.

**How API Keys Work:**

- API keys are stored in the database and associated with a user.
- To access protected endpoints, include your API key in the `x-api-key` header.
- The backend validates the key, checks permissions, and rate limits requests.
- API keys can be revoked or rotated at any time.

**Example Usage:**

```http
GET /api/market/quotes
x-api-key: <your-api-key>
```

**API Key Management:**

- Generate, view, and revoke keys in the web dashboard (Profile > API Keys)
- Or use the API endpoints (see `apps/api_server/routes/api.routes..ts` and `apps/api_server/models/apiKey.ts`)

**Security:**

- Never share your API key publicly.
- Use HTTPS in production to protect keys in transit.
- Keys are hashed in the database for security.

**More Info:**

- See the [API Documentation](https://bull-reckon-web.vercel.app/docs/api) for full API reference, endpoints, and usage examples.

---

## Development Guide

- Each service can be run and debugged independently.
- Use `.env` files in each service for configuration.
- Hot-reload supported via `dev.Dockerfile` and `pnpm dev`.
- Shared code is in `shared/` and `packages/`.
- Lint and typecheck before pushing code.

---

## Testing

- Unit and integration tests are located in each service's `tests/` folder (if present).
- Run tests with:
  ```bash
  pnpm test
  # or npm test
  ```

---

## Local DB and queues

- MongoDB: If you run `auth_server` or `calc_server` and they rely on MongoDB, make sure a local MongoDB is running and set `DB_URL` appropriately in the respective `.env`.
- Redis: Queues may be used (see root `.env` for `DISABLE_REDIS_QUEUES`). For local development you can set `DISABLE_REDIS_QUEUES=true` to avoid running Redis.

## Debugging and common problems

- Ports already in use: If a service fails to start because the port is used, either stop the other service or change the `PORT` environment variable when starting the service.
- Missing env vars: Many services expect secrets (JWT, mail). If the service crashes on startup with missing env, check the .env and add required values.
- Toasts or client UI not appearing: ensure the web app is started in dev mode and that the browser console has no hydration error. If you modified `app/layout.tsx` or client components, ensure they are client components (`"use client"`) where required.

---

## Deployment

- **Current Status:** Four backend service instances are deployed on [Render](https://render.com). The web frontend (Next.js) is deployed on [Vercel](https://vercel.com).
- **Nginx:** Not currently in use for production, but planned for future deployment to enable advanced load balancing and reverse proxy features.
- **Cloud Deployment:** Ensure environment variables and persistent storage are configured for each service.
- **Databases:** Use managed MongoDB (e.g., Atlas) and managed Redis (e.g., Redis Cloud, using a free instance from [redis.com](https://redis.com)) for production reliability and scalability.

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgements

- Yahoo Finance for market data
- BullMQ for queue management
- All open-source contributors

---

_Built with ❤️ by the BullReckon team._

---
