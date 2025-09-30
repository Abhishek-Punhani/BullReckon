# PART A — Writeup

## Project overview

BullReckon is a small monorepo containing a Next.js frontend and several backend microservices for market data, authentication, and calculation services. The project focuses on showing real market data (fetched from Yahoo via the market microservice), a searchable symbol picker, candlestick charts, and an integrated trading modal for placing market orders (mock or backend-backed).

This document summarizes the architecture, technologies used, major design choices, challenges encountered and how they were addressed, current progress, and a rough cost estimate for deploying the minimal production stack at scale.

---

## Approach & system architecture

- Monorepo: pnpm workspace + Turbo for orchestration and type checks.
- Services split by responsibility (microservice style):
  - `apps/web` — Next.js frontend (App Router, React 19, TypeScript, Tailwind)
  - `apps/market_server` — market data service (Yahoo Finance client, historical/quote CRUD, normalization and caching)
  - `apps/auth_server` — authentication and user management (JWT / sessions, email)
  - `apps/calc_server` — calculation and trade execution endpoints (trade execution, risk settings)
  - `apps/api_server` — higher-level API endpoints (portfolio, trades history)

Data flow (high level):

User (browser) → Next.js (`apps/web`) → backend services (AUTH / MARKET / CALC / API) → market_server fetches Yahoo data

Key design choices:

- Keep market data retrieval separate (market_server) so we can enforce the constraint: never synthesize market data — only forward Yahoo results or return an error.
- Provide a small client-side symbol search that reads a two-column `public/sp500.csv` (generated from a master CSV) for fast autocompletion without adding network latency to the search UX.
- Use a small in-memory cache in `market_server` to reduce duplicate Yahoo API calls during development.

---

## Technologies used

- Node.js >= 18, TypeScript 5.9
- pnpm workspaces, Turbo (monorepo tasks)
- Next.js (app router) + React 19 for frontend
- TailwindCSS + shadcn UI primitives
- yahoo-finance2 in `market_server` for price/historical data
- Radix UI for toast/dialog primitives
- MongoDB (optional for auth/calc services) and Redis for queues (optional)

---

## Major design and implementation notes

- The frontend `apps/web` expects backend services on the default ports configured in `apps/web/lib/config.ts`. See `setup.md` for exact ports and how to change them.
- The CSV generator `apps/web/scripts/generate_sp500_public_csv.cjs` converts the master S&P CSV to a two-column `public/sp500.csv` used by the `SymbolSearch` component.
- The market microservice normalizes Yahoo responses and intentionally throws provider errors when Yahoo returns no usable historical data to abide by the "no synthetic data" requirement.
- A small `TradeModal` was added to the market page to place market orders. If an auth token exists it attempts to POST the order to `calc_server`; otherwise orders are persisted locally in `localStorage` as a fallback for demo mode.

---

## Progress status (what's done)

- Monorepo setup, pnpm + turbo scripts (root `package.json`) — done
- Next.js frontend migrated into `apps/web` with App Router and core pages — done
- Symbol search UI (`SymbolSearch`) + generator script to create `public/sp500.csv` — done
- Market charts with 1M/3M/6M/1Y/YTD/5Y/Max periods and live quote polling — done
- Market microservice (Yahoo integration) hardened so it throws provider errors when real data is missing — done
- Added Navigation sidebar and improved Market page layout — done
- Implemented `TradeModal` to place market orders (backend call with fallback to localStorage) — done
- Fixed toasts (hook and mounting) and verified TypeScript checks — done


## How to verify locally

1. Follow `setup.md` to install dependencies and start backend services on recommended ports.
2. Start the web frontend with `pnpm -C apps/web run dev` and open `http://localhost:3000`.
3. Visit `/auth/login` and try login flows (mock users available for demo mode); toasts should appear for success/failure.