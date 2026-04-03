# Vault — Architecture & Conventions

## Overview
Vault is a personal belongings manager built with Next.js 15 (App Router), TypeScript, SQLite (via Drizzle ORM), and Tailwind CSS + shadcn/ui components.

## Tech Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 App Router | Full-stack, file-based routing, server components |
| Language | TypeScript | Type safety across the whole stack |
| Database | SQLite + Drizzle ORM | Zero-infrastructure, file-based, great DX |
| UI | Tailwind CSS 4 + shadcn/ui (Radix UI) | Utility-first, accessible primitives |
| State | TanStack Query v5 | Server state, caching, background refetching |
| Forms | React Hook Form + Zod | Performant forms, type-safe validation |
| Charts | Recharts | React-native charting for dashboard |
| Toasts | Sonner | Best-in-class toast library for Next.js |
| Date | date-fns | Tree-shakeable date utilities |

## Directory Structure
```
src/
├── app/                        # Next.js App Router pages
│   ├── (dashboard)/            # Route group — shared dashboard layout
│   │   ├── page.tsx            # Dashboard home (portfolio stats)
│   │   ├── catalog/            # Item catalog
│   │   ├── maintenance/        # Service & maintenance guides
│   │   └── rentals/            # Rental listings
│   ├── api/                    # API route handlers
│   │   ├── items/              # CRUD for belongings
│   │   ├── market-value/       # Market value lookups (parallel)
│   │   ├── maintenance/        # Maintenance guide fetching
│   │   └── rentals/            # Rental listing management
│   ├── layout.tsx              # Root layout (providers, fonts)
│   └── globals.css             # Global styles + Tailwind
│
├── components/                 # React components
│   ├── ui/                     # Base shadcn/ui primitives
│   ├── catalog/                # Item catalog components
│   ├── dashboard/              # Dashboard widgets
│   ├── maintenance/            # Maintenance components
│   ├── rentals/                # Rental components
│   └── layout/                 # Nav, sidebar, header
│
├── lib/
│   ├── db/
│   │   ├── index.ts            # DB connection singleton
│   │   └── schema.ts           # Drizzle schema (source of truth)
│   ├── services/               # Business logic (no HTTP)
│   │   ├── market-value/       # Parallel marketplace scrapers
│   │   │   ├── index.ts        # Orchestrator (runs in parallel)
│   │   │   ├── ebay.ts         # eBay Finding API
│   │   │   └── craigslist.ts   # Craigslist parser
│   │   ├── maintenance.ts      # Maintenance guide fetcher
│   │   └── rental.ts           # Rental business logic
│   └── utils/
│       ├── cn.ts               # clsx + tailwind-merge
│       ├── currency.ts         # Format USD, calculate depreciation
│       └── date.ts             # Date helpers
│
└── types/
    └── index.ts                # Shared TypeScript types
```

## Conventions

### API Routes
- Located in `src/app/api/`
- Use Next.js Route Handler format (`GET`, `POST`, etc. exported from `route.ts`)
- Always return `NextResponse.json({ data, error })`
- Validate request bodies with Zod before touching the DB

### Database
- Schema defined in `src/lib/db/schema.ts` (single source of truth)
- DB connection singleton in `src/lib/db/index.ts`
- Run `npm run db:push` to sync schema to DB during development
- Run `npm run db:generate && npm run db:migrate` for production migrations

### Components
- Server Components by default; add `"use client"` only when needed (event handlers, hooks, browser APIs)
- shadcn/ui primitives live in `src/components/ui/`
- Feature components (e.g., `ItemCard`) live in their domain folder (e.g., `src/components/catalog/`)

### Secrets
- All secrets in `.env` (never `.env.example`, never hardcoded)
- Client-safe values prefixed with `NEXT_PUBLIC_`
- See `.env.example` for all required keys

### Market Value (Parallel Fetching)
- `src/lib/services/market-value/index.ts` runs all marketplace fetchers with `Promise.allSettled()` so one failure doesn't block others
- Each source returns `{ source, price, url, confidence }` — the orchestrator merges and averages them

### Styling
- Tailwind CSS 4 utility classes; no custom CSS unless absolutely necessary
- Use `cn()` from `@/lib/utils/cn` to merge conditional classes
- Dark mode via `next-themes`

## Development Commands
```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run db:push      # Sync schema to SQLite (dev)
npm run db:studio    # Open Drizzle Studio (DB GUI)
npm run build        # Production build
npm run lint         # ESLint
```

## Environment Setup
1. Copy `.env.example` to `.env`
2. Run `npm install`
3. Run `npm run db:push` to create the database
4. Run `npm run dev`
