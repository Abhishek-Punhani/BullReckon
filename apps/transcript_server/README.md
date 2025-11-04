# Transcript Server

A FastAPI-based microservice for extracting structured investment parameters from conversation transcripts.

## Overview

This service provides API endpoints to extract and validate investment parameters from natural language conversations between users and advisors.

## Features

- **Text Extraction**: Extract investment parameters from plain text transcripts
- **File Upload**: Upload transcript files for parameter extraction
- **Validation**: Validate extracted parameters using Pydantic models
- **Missing Field Detection**: Identify missing mandatory fields
- **Flexible Input**: Support for various time periods, currencies, and formats

## API Endpoints

### 1. Extract from Text
```bash
POST /api/transcript/extract
Content-Type: application/json

{
  "transcript": "User: I have 10 lakh rupees to invest...\nAdvisor: ..."
}
```

### 2. Extract from File
```bash
POST /api/transcript/extract-file
Content-Type: multipart/form-data

file: transcript.txt
```

### 3. Health Check
```bash
GET /api/transcript/health
```

## Response Format

### Successful Extraction
```json
{
  "timestamp": "2024-11-04T12:00:00",
  "extracted_parameters": {
    "investable_amount": 1000000.0,
    "investment_horizon": "long",
    "target_return": 12.0,
    "risk_tolerance": {
      "category": "medium",
      "risk_aversion_lambda": null
    },
    "liquidity_needs": "long",
    "constraints": {
      "sector_limits": {"IT": 0.25, "Banking": 0.30},
      "min_allocation": null,
      "max_allocation": null,
      "ESG_exclusions": ["tobacco", "gambling"],
      "no_leverage": true,
      "max_smallcap": 0.20
    },
    "preferences": {
      "diversification_priority": "sector",
      "rebalancing_frequency": "quarterly",
      "automation_mode": "auto"
    },
    "generic_notes": []
  },
  "missing_fields": [],
  "completion_status": "complete",
  "warnings": []
}
```

### Incomplete Extraction
```json
{
  "status": "incomplete",
  "missing_mandatory_fields": [
    "Investable Amount - How much capital do you want to invest?",
    "Target Return - What annual return percentage are you targeting?"
  ],
  "partial_extraction": { ... },
  "timestamp": "2024-11-04T12:00:00"
}
```

## Extracted Parameters

### Mandatory Fields
- **investable_amount**: Investment capital (numeric)
- **investment_horizon**: Investment timeframe (short/medium/long)
- **target_return**: Target annual return percentage
- **risk_tolerance**: Risk appetite (low/medium/high)
- **liquidity_needs**: When capital is needed (immediate/3-12 months/long)

### Optional Fields
- **constraints**: Investment constraints (sector limits, ESG exclusions, etc.)
- **preferences**: Investment preferences (diversification, rebalancing, automation)
- **generic_notes**: Additional user notes

## Environment Variables

- `TRANSCRIPT_SERVER_PORT`: Server port (default: 5006)
- `TRANSCRIPT_SERVER_HOST`: Server host (default: 0.0.0.0)
- `DEBUG`: Debug mode (default: false)
- `INTERNAL_API_KEY`: Internal service authentication key
- `CORS_ORIGINS`: Allowed CORS origins (default: *)
- `LOG_LEVEL`: Logging level (default: INFO)

## Development

### Local Setup
```bash
cd apps/transcript_server
pip install -r requirements.txt
python server.py
```

### Docker Development
```bash
docker build -f dev.Dockerfile -t transcript-server:dev .
docker run -p 5006:5006 transcript-server:dev
```

### Docker Production
```bash
docker build -t transcript-server:prod .
docker run -p 5006:5006 transcript-server:prod
```

## Testing

### Test with cURL

```bash
# Text extraction
curl -X POST http://localhost:5006/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d '{"transcript": "User: I have 10 lakh rupees to invest for long term..."}'

# File extraction
curl -X POST http://localhost:5006/api/transcript/extract-file \
  -F "file=@transcript.txt"

# Health check
curl http://localhost:5006/health
```

## Architecture

```
transcript_server/
├── config.py                 # Configuration
├── server.py                 # Flask application
├── controllers/              # Request handlers
│   └── transcript_controller.py
├── routes/                   # API routes
│   └── transcript_routes.py
├── models/                   # Data models
│   └── transcript_extractor.py
├── requirements.txt          # Python dependencies
├── Dockerfile                # Production container
├── dev.Dockerfile            # Development container
└── nginx/                    # Nginx configuration
    ├── nginx.conf
    └── supervisord.conf
```

## Dependencies

- **FastAPI**: Modern web framework with automatic API documentation
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation and serialization
- **httpx**: Async HTTP client for service communication
- **PyJWT**: JWT token handling
- **Shared utilities**: AuthServiceClient, RedisManager, etc.

## License

Part of the BullReckon trading platform.

