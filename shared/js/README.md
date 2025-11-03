# Shared Utilities

This directory contains shared utilities and base classes for both Python (FastAPI) and JavaScript (Express) applications in the BullReckon microservices architecture.

## Structure

```
shared/
├── py/           # Python (FastAPI) utilities
│   ├── baseApp.py
│   ├── redisManager.py
│   ├── dbManager.py
│   ├── queueManager.py
│   ├── emailService.py
│   ├── webSocketServer.py
│   ├── authService.client.py
│   └── internalApi.client.py
└── js/           # JavaScript (Express) utilities
    ├── baseApp.ts
    ├── redisManager.ts
    ├── dbManager.ts
    ├── queueManager.ts
    ├── emailService.ts
    ├── webSocketServer.ts
    ├── authService.client.ts
    └── internalApi.client.ts
```

## Python (FastAPI) Utilities

### BaseApp

FastAPI base application with common middleware, routes, and manager initialization.

```python
from shared.py.baseApp import BaseApp

app = BaseApp("MyService", "1.0.0")
fastapi_app = app.get_app()
```

### RedisManager

Redis connection and operations manager.

```python
from shared.py.redisManager import RedisManager

redis = RedisManager()
await redis.connect()
await redis.set("key", "value")
```

### DBManager

MongoDB connection and operations manager.

```python
from shared.py.dbManager import DBManager

db = DBManager()
await db.connect()
await db.insert_one("users", {"name": "John"})
```

### QueueManager

Job queue manager using Redis.

```python
from shared.py.queueManager import QueueManager

queue = QueueManager(redis_manager)
await queue.add_job("my_queue", {"task": "data"})
```

### EmailService

Email sending service with templates.

```python
from shared.py.emailService import EmailService

email = EmailService()
await email.send_email("user@example.com", "Subject", "Body")
```

### WebSocketServer

WebSocket server for real-time communication.

```python
from shared.py.webSocketServer import WebSocketServer

ws = WebSocketServer(redis_manager)
# Integrate with FastAPI app
```

### AuthServiceClient

Client for communicating with the auth service.

```python
from shared.py.authService import AuthServiceClient

auth = AuthServiceClient()
user = await auth.get_user("user_id")
```

### InternalApiClient

Client for communicating with other internal services.

```python
from shared.py.internalApi import InternalApiClient

api = InternalApiClient()
data = await api.get_market_data(["AAPL", "GOOGL"])
```

## JavaScript (Express) Utilities

### BaseApp

Express base application with common middleware and manager initialization.

```typescript
import { BaseApp } from "../shared/js/baseApp";

const app = new BaseApp({ name: "MyService", version: "1.0.0" });
const expressApp = app.getApp();
```

### RedisManager

Redis connection and operations manager.

```typescript
import { RedisManager } from "../shared/js/redisManager";

const redis = new RedisManager();
await redis.connect();
await redis.set("key", "value");
```

### DBManager

MongoDB connection and operations manager.

```typescript
import { DBManager } from "../shared/js/dbManager";

const db = new DBManager();
await db.connect();
await db.insertOne("users", { name: "John" });
```

### QueueManager

Job queue manager using Redis.

```typescript
import { QueueManager } from "../shared/js/queueManager";

const queue = new QueueManager(redisManager);
await queue.addJob("my_queue", { task: "data" });
```

### EmailService

Email sending service with templates.

```typescript
import { EmailService } from "../shared/js/emailService";

const email = new EmailService();
await email.sendEmail("user@example.com", "Subject", "Body");
```

### WebSocketServer

WebSocket server for real-time communication.

```typescript
import { WebSocketServer } from "../shared/js/webSocketServer";

const ws = new WebSocketServer(redisManager);
ws.init(server); // Express server
```

### AuthServiceClient

Client for communicating with the auth service.

```typescript
import { AuthServiceClient } from "../shared/js/authService.client";

const auth = new AuthServiceClient();
const user = await auth.getUser("user_id");
```

### InternalApiClient

Client for communicating with other internal services.

```typescript
import { InternalApiClient } from "../shared/js/internalApi.client";

const api = new InternalApiClient();
const data = await api.getMarketData(["AAPL", "GOOGL"]);
```

## Environment Variables

All utilities respect the following environment variables:

- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`
- `DB_URL`, `DB_NAME`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `EMAIL_FROM`
- `AUTH_SERVICE_URL`, `MARKET_SERVICE_URL`, `CALC_SERVICE_URL`, `API_SERVICE_URL`, `CODE_SERVICE_URL`
- `JWT_SECRET`
- `APP_NAME`

## Dependencies

### Python

- `fastapi`
- `uvicorn`
- `motor` (MongoDB async driver)
- `redis` (Redis async client)
- `pymongo`
- `httpx` (HTTP client)
- `pyjwt` (JWT handling)

### JavaScript

- `express`
- `redis` (Redis client)
- `mongodb` (MongoDB driver)
- `nodemailer` (Email sending)
- `axios` (HTTP client)
- `jsonwebtoken` (JWT handling)
- `ws` (WebSocket server)
- `cors`, `helmet`, `morgan` (Express middleware)

## Usage

These utilities provide a consistent interface across all BullReckon services, whether built with FastAPI (Python) or Express (JavaScript). Each service can import the appropriate utilities based on its technology stack.
