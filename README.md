# BullReckon — Setup and Run (Developer Instructions)

This document explains how to set up and run the BullReckon monorepo locally on a Windows development machine (cmd.exe examples). It includes installing prerequisites, environment variables, running individual services, and running the entire monorepo in development.

## Prerequisites

- Node.js LTS (>=18). Verify with:

```cmd
node -v
```

- pnpm (recommended as the repo uses pnpm workspace). Install globally if needed:

```cmd
npm install -g pnpm
```

- Git
- (Optional) MongoDB if you plan to run auth/calc servers with a local DB. If you use hosted MongoDB, set the connection string in the service `.env` files.
- (Optional) Redis if you want to enable queues. The repo supports disabling Redis via env.

## Quick repo clone

Clone the repository and open a terminal in the repo folder:

```cmd
git clone <your-repo-url> BullReckon
cd BullReckon
```

Replace `<your-repo-url>` with the GitHub HTTPS or SSH URL.

## Install dependencies

From the repository root run:

```cmd
pnpm install
```

This installs dependencies for all workspace packages.

## Environment variables

There are several `.env` files used by services. The repo contains examples in a few places (for example: `apps/auth_server/.env.example`, `apps/calc_server/.env.example`, and `apps/market_server/.env`). There is also a root `.env` with values used for mail & local development.

Recommended approach:

1. Copy example env files into each service that needs them and edit values.

```cmd
copy apps\auth_server\.env.example apps\auth_server\.env
copy apps\calc_server\.env.example apps\calc_server\.env
rem  (market_server may have an .env already; edit if needed)
```

2. Edit the copied files and set values for:

- PORT (we recommend using the ports below so the web app's defaults match)
- DB_URL (if using MongoDB locally)
- SESSION_SECRET or JWT secrets
- NEXT_PUBLIC_GOOGLE_CLIENT_ID (for Google OAuth in the web app)

Important: The web app expects the backend services to be available at these defaults (see `apps/web/lib/config.ts`):

- AUTH_SERVER: http://localhost:4000
- MARKET_SERVER: http://localhost:5000
- CALC_SERVER: http://localhost:8000
- API_SERVER: http://localhost:3004

To match those defaults set the `PORT` variable when starting each service (examples below).

Sensitive secrets (API keys, mail credentials) should not be committed to git. Use environment variables or a local `.env` excluded by `.gitignore`.

## Start services (development)

You can start services individually (one terminal per service) or start the full monorepo with Turbo.

A. Start an individual service

Open separate terminals (cmd.exe) for each service and run the following commands. These examples set the PORT on Windows cmd and start the service using the package script defined in `package.json`.

Auth server (recommended port 4000 to match web defaults):

```cmd
cd D:\Codes\webdev\prep\BullReckon
set PORT=4000
pnpm -C apps/auth_server run dev
```

Market server (recommended port 5000):

```cmd
cd D:\Codes\webdev\prep\BullReckon
set PORT=5000
pnpm -C apps/market_server run dev
```

Calc server (recommended port 8000):

```cmd
cd D:\Codes\webdev\prep\BullReckon
set PORT=8000
pnpm -C apps/calc_server run dev
```

API server (if used; default API port expected by web is 3004):

```cmd
cd D:\Codes\webdev\prep\BullReckon
set PORT=3004
pnpm -C apps/api_server run dev
```

B. Start the web frontend

The web frontend is a Next.js app located in `apps/web` (port 3000 by default). Start it in a separate terminal:

```cmd
cd D:\Codes\webdev\prep\BullReckon
pnpm -C apps/web run dev
```

Visit http://localhost:3000 in your browser.

C. Start the whole monorepo (turbo)

The repository root defines a `dev` script that runs `turbo run dev`. If you prefer one command to start all workspace services that expose a `dev` task, run:

```cmd
cd D:\Codes\webdev\prep\BullReckon
pnpm run dev
```

Turbo will look up `dev` scripts defined in workspace packages and run them according to `turbo.json` configuration. This is convenient but you may still prefer to start services individually so you can inspect logs in separate terminals.

## Useful developer commands

- Run TypeScript checks across the monorepo (root):

```cmd
pnpm run check-types
```

- Typecheck only web app:

```cmd
pnpm -C apps/web run check-types
```

- Lint (root):

```cmd
pnpm run lint
```

- Build the web app for production:

```cmd
pnpm -C apps/web run build
pnpm -C apps/web run start
```

## Local DB and queues

- MongoDB: If you run `auth_server` or `calc_server` and they rely on MongoDB, make sure a local MongoDB is running and set `DB_URL` appropriately in the respective `.env`.
- Redis: Queues may be used (see root `.env` for `DISABLE_REDIS_QUEUES`). For local development you can set `DISABLE_REDIS_QUEUES=true` to avoid running Redis.

## Debugging and common problems

- Ports already in use: If a service fails to start because the port is used, either stop the other service or change the `PORT` environment variable when starting the service.
- Missing env vars: Many services expect secrets (JWT, mail). If the service crashes on startup with missing env, check the .env and add required values.
- Toasts or client UI not appearing: ensure the web app is started in dev mode and that the browser console has no hydration error. If you modified `app/layout.tsx` or client components, ensure they are client components (`"use client"`) where required.

## Running tests (if any)

This repo currently does not include a centralized test command. If/when tests are added, run them via pnpm scripts defined in package.json at the package level.

## Production / Deployment recommendations

- Web (Next.js): Deploy to Vercel for easiest integration. The app uses Next.js v15 so Vercel supports it out of the box.
- Backend services: Containerize with Docker and deploy to a cloud provider (AWS ECS/Fargate, DigitalOcean App Platform, Render, or Heroku). Provide environment variables from a secrets store.
- Databases: Use managed MongoDB (Atlas) and managed Redis (ElastiCache, Redis Cloud) in production.

Estimated monthly cost (very rough) for a small production setup:

- Basic deployment (web on Vercel free/Pro, backends on a single small VM or Render): $20–100/month.
- Medium production (managed DB + Redis + 2–3 small app instances): $150–500/month.
- Scaled production (replicated DB, autoscaling, monitoring): $500+/month (depends heavily on traffic and retention, and whether you use paid data/APIs).

## Deliverables & paperwork (course / project)

You asked for PART A/B deliverables. Prepare these files in the repository root:

- `README.md` — high level project README (link to the rest of the docs).
- `PART_A_WRITEUP.md` — approach, architecture, challenges, progress, cost estimate.
- `PART_A_CONTRIBUTIONS.md` — per-team-member contributions.
- `PART_B_PLAN.md` — roadmap and innovation layer plan for Part B.

Add these files to the repo and commit them. Example:

```cmd
cd D:\Codes\webdev\prep\BullReckon
echo "# PART A Writeup" > PART_A_WRITEUP.md
git add PART_A_WRITEUP.md PART_A_CONTRIBUTIONS.md PART_B_PLAN.md README.md
git commit -m "Add project writeups and deliverables placeholders"
git push origin master
```

## GitHub / Collaboration notes

- Add collaborators (via GitHub UI): go to the repository -> Settings -> Manage access -> Invite teams or collaborators. Add the users `varun-kolanu` and `criticic` as requested.
- To open a PR, create a branch, commit, push, and open a pull request on GitHub.

## Next steps & verification checklist

1. Ensure you have Node >=18 and pnpm installed.
2. Copy/edit `.env` files for each server you plan to run.
3. Start backend services (auth, market, calc) — recommended ports above.
4. Start the web app: `pnpm -C apps/web run dev` and visit `http://localhost:3000`.
5. Log in (use mock user or register) and exercise flows (market page, search, trade modal). Check browser console and server logs if something fails.

If you'd like, I can also add a small `run-all` task or a `docker-compose` file to orchestrate services locally — tell me which option you prefer and I will implement it.

---

If anything above is unclear or you want the exact `docker-compose` and minimal scripts to start everything with a single command, say the word and I will add them.
