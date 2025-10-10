# Code Execution Server

Professional code execution service for BullReckon playground with Docker isolation and queue-based processing.

## Features

- **Multi-language Support**: Python, JavaScript, TypeScript, Go, Java, C++, Rust
- **Docker Isolation**: Each execution runs in isolated Docker containers
- **Security**: Network disabled, resource limits, code sanitization
- **Queue-Based**: Uses BullMQ for reliable job processing
- **Rate Limiting**: Configurable concurrency and rate limits
- **Authentication**: JWT-based authentication via middleware

## Architecture

```
code_server/
├── controllers/        # Request handlers
├── services/          # Business logic (code execution)
├── workers/           # Queue job processors
├── queues/            # Queue setup
├── routes/            # API routes
├── temp/              # Temporary code files
└── server.ts          # Main server file
```

## API Endpoints

### Execute Code

```http
POST /api/code/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "language": "python",
  "code": "print('Hello, World!')"
}
```

**Response:**

```json
{
  "output": "Hello, World!\n"
}
```

## Supported Languages

| Language   | Docker Image       | Extension |
| ---------- | ------------------ | --------- |
| Python     | python:3.10-slim   | .py       |
| JavaScript | node:20-alpine     | .js       |
| TypeScript | node:20-alpine     | .ts       |
| Go         | golang:1.20-alpine | .go       |
| Java       | openjdk:21-slim    | .java     |
| C++        | gcc:latest         | .cpp      |
| Rust       | rust:1.72-slim     | .rs       |

## Security Features

1. **Docker Isolation**:
   - `--network none`: No network access
   - `--memory="256m"`: 256MB RAM limit
   - `--cpus="0.5"`: 0.5 CPU limit
   - `--pids-limit=50`: Max 50 processes

2. **Code Sanitization**:
   - Blocks dangerous commands (rm -rf, fork bombs, etc.)
   - Size limit: 50KB per code submission

3. **Execution Limits**:
   - Timeout: 10 seconds
   - Max output: 1MB
   - Read-only file system

## Environment Variables

```env
PORT=3005
NODE_ENV=development
DB_URL=mongodb://localhost:27017/bullreckon
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=bullreckon:
PREPULL_DOCKER_IMAGES=true
```

## Development

```bash
pnpm install
npm run dev
```

## Production

```bash
npm run build
npm start
```
