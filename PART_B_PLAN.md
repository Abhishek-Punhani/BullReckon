# PART B — Plan & Roadmap

This document outlines the planned roadmap for Part B and the innovation layer features we aim to implement.

## High-level goals for Part B

- Productionize core services and add robust order persistence and portfolio management.
- Improve the market UX with richer charting features (indicators, annotations, multi-chart layouts).
- Add user-level data persistence (trade history, positions, P&L) and a simulated trading environment with realistic fills.
- Add CI/CD and deployment scripts (Docker, infra IaC) for reproducible deployments.

## Innovation layer features (priority)

1. Smart Order Routing (Innovation)
   - Build an order simulator that estimates slippage and fill probability per symbol and quantity.
   - Provide an "estimated execution" cost and show expected slippage to the user before order placement.

2. Strategy Backtester & Live Paper Trading
   - Integrate a backtest engine that can run strategies over historical Yahoo data.
   - Provide live paper trading that records orders against live quotes and computes portfolio P&L.

3. Social / Leaderboards
   - Add a simple leaderboard showing top performers in paper trading competitions.
   - Allow users to share strategies and results.

5. Data Tiering & Caching
   - Add a persistent cache (Redis) and background workers to fetch and normalize Yahoo data to reduce cold-start times.

## Success criteria

- Reliable trade persistence and accurate portfolio P&L.
- Charts with indicators and responsive UX across devices.
- Ability to run a 1-month backtest and compare results to paper trading.

## Risks & mitigation

- Yahoo API rate limits — mitigate with caching and a paid data provider if necessary.
- Data accuracy and fill realism — mitigate with improved slippage models and optional integrations with real market data providers.