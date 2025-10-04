# Backtesting API Documentation

## Overview

This API allows users to store and retrieve backtesting results for algorithmic trading strategies using API key authentication.

---

## Authentication

- All endpoints require an `x-api-key` header.
- The API key must be valid and associated with a user.

---

## Endpoints

### POST `/api/backtest/results`

**Description:** Store backtest results.

**Headers:**

- `x-api-key: <your-api-key>`

**Request Body:**

```json
{
  "backtest_id": "bt_20251004_001",
  "status": "completed",
  "results": {
    "summary": {
      "symbol": "AAPL",
      "period": { "start": "2023-01-01", "end": "2023-12-31" },
      "total_trades": 152,
      "winning_trades": 95,
      "losing_trades": 57,
      "win_rate": 62.5,
      "profit_factor": 1.85,
      "pnl": {
        "gross_profit": 15320.5,
        "gross_loss": -8290.2,
        "net_profit": 7030.3,
        "percentage_return": 14.2,
        "max_drawdown": -5.8
      },
      "risk_metrics": {
        "sharpe_ratio": 1.42,
        "sortino_ratio": 1.88,
        "alpha": 0.25,
        "beta": 0.98,
        "volatility": 0.12,
        "confidence_level": 95
      }
    },
    "equity_curve": [
      { "date": "2023-01-01", "equity": 10000 },
      { "date": "2023-01-15", "equity": 10250 }
    ],
    "trade_log": [
      {
        "trade_id": 1,
        "entry_date": "2023-01-05",
        "exit_date": "2023-01-07",
        "entry_price": 135.2,
        "exit_price": 137.8,
        "position": "long",
        "size": 100,
        "pnl": 260
      }
    ]
  }
}
```

**Response:**

```json
{ "status": "success", "backtest_id": "bt_20251004_001" }
```

---

### GET `/api/backtest/results/:id`

**Description:** Retrieve a specific backtest result by ID.

**Headers:**

- `x-api-key: <your-api-key>`

**Response:**

```json
{
  "userId": "...",
  "backtest_id": "bt_20251004_001",
  "status": "completed",
  "results": { ... },
  "createdAt": "..."
}
```

---

### GET `/api/backtest/history`

**Description:** List recent backtests for the authenticated user.

**Headers:**

- `x-api-key: <your-api-key>`

**Response:**

```json
[
  {
    "userId": "...",
    "backtest_id": "bt_20251004_001",
    "status": "completed",
    "results": { ... },
    "createdAt": "..."
  }
]
```

---

## Notes

- All endpoints require API key authentication.
- The `results.summary` object must match the documented structure.
- Use the POST endpoint to store results from your backtesting script.
- Use the GET endpoints to display results in your dashboard.
