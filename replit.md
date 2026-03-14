# Workspace

## Overview

EUR/USD Quantitative Analysis Web App — a full-stack analytical dashboard for the Forex market.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite, Tailwind CSS, Recharts, Framer Motion
- **Build**: esbuild (CJS bundle)

## Application Purpose

Monitors EUR/USD in near real-time using adaptive polling from multiple public APIs (Frankfurter, ExchangeRate, CDN Currency API). Applies 8 analytical models to generate trade opportunities:

1. **Technical Analysis** — RSI, EMA (20/50/200), Bollinger Bands, momentum, volatility
2. **Price Action** — Engulfing, pin bar, inside bar, breakout patterns
3. **Market Structure** — Support/resistance levels, liquidity zones, market regime
4. **Econophysics** — Hurst exponent, market entropy, volatility clustering, liquidity shocks, fat tails, z-score
5. **Monte Carlo** — 1000-path GBM simulation, probability distributions, confidence intervals
6. **Bayesian Statistics** — Prior/posterior updates based on historical signal outcomes
7. **Machine Learning** — Random Forest ensemble (5 trees) scoring
8. **Market Regime** — Trending/ranging/volatile/breakout regime detection

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/              # Express API server
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── market-data.ts         # Adaptive polling, price buffer
│   │       │   └── analytics/
│   │       │       ├── technical.ts       # RSI, EMA, BB, patterns
│   │       │       ├── econophysics.ts    # Hurst, entropy, clustering
│   │       │       ├── market-state.ts    # Regime detection, S/R levels
│   │       │       ├── monte-carlo.ts     # GBM simulation
│   │       │       ├── bayesian.ts        # Bayesian prior updates
│   │       │       ├── ml-model.ts        # Random Forest ensemble
│   │       │       └── signal-generator.ts # Score aggregation
│   │       └── routes/
│   │           ├── market.ts     # /api/market/*
│   │           ├── analysis.ts   # /api/analysis/*
│   │           └── signals.ts    # /api/signals/*
│   └── forex-quant/             # React + Vite frontend
│       └── src/
│           ├── hooks/use-quant-data.ts    # React Query polling hooks
│           ├── components/
│           │   ├── Gauges.tsx             # RSI gauge, score circle
│           │   ├── ScoreBreakdown.tsx     # 8-segment score bar
│           │   └── SignalCard.tsx         # Trade opportunity card
│           └── pages/Dashboard.tsx        # Main dashboard
├── lib/
│   ├── api-spec/openapi.yaml    # OpenAPI 3.1 spec (source of truth)
│   ├── api-client-react/        # Generated React Query hooks
│   ├── api-zod/                 # Generated Zod schemas
│   └── db/
│       └── src/schema/
│           └── signals.ts       # trading_signals, price_history, bayesian_state tables
└── pnpm-workspace.yaml
```

## Key Configuration

- **Pip adjustment**: POST /api/market/pip-adjustment { pips: number } — adjustable via UI
- **Adaptive polling**: 5s → 10s → 15s → 20s → 30s → 60s on API errors, resets on success
- **Signal cooldown**: 5 minutes between new signal generation
- **Score threshold**: Only signals scoring ≥ 45/100 are persisted
- **Signal persistence**: Active until TP or SL is manually marked hit

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build`
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Database Tables

- `trading_signals` — all generated signals with scores and outcomes
- `price_history` — historical price data with OHLC
- `bayesian_state` — running Bayesian prior probabilities

## API Endpoints

- `GET /api/market/price` — current EUR/USD price
- `GET /api/market/history` — price history
- `POST /api/market/pip-adjustment` — set pip offset
- `GET /api/analysis/technical` — RSI, EMA, BB, patterns
- `GET /api/analysis/econophysics` — Hurst, entropy, fat tails, z-score
- `GET /api/analysis/market-state` — regime + support/resistance
- `GET /api/analysis/monte-carlo` — MC simulation
- `GET /api/signals` — active signals (triggers generation)
- `GET /api/signals/history` — past resolved signals
- `POST /api/signals/:id/resolve` — mark outcome
