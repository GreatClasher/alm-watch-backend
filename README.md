# IoT Telemetry, Real-Time Audio Ingestion & AI Orchestration Backend

A high-throughput, production-grade microservices backend built with **NestJS, TypeScript, PostgreSQL, and WebSockets**. 

This platform handles real-time IoT device telemetry, binary audio streaming over WebSockets, distributed tracing with asynchronous context propagation, and AI/LLM orchestration pipelines.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Clients["IoT Devices & Mobile Clients"]
        D1["IoT Hardware / Wearable"]
        D2["Mobile Client / Companion App"]
    end

    subgraph Ingress["API Ingress & Security"]
        NG["Ingress / Reverse Proxy"]
        MW["CorrelationIdMiddleware\n(W3C traceparent & X-Request-Id)"]
        AUTH["DeviceAuthGuard\n(RS256 JWT Verification)"]
    end

    subgraph Context["Observability & Tracing Layer"]
        ALS["RequestContextService\n(Node.js AsyncLocalStorage)"]
        PINO["Structured Pino Logger\n(Enriched with traceId, requestId, deviceId)"]
        ERR["Unified Exception Filters\n(AllHttpExceptionsFilter & AllWsExceptionsFilter)"]
    end

    subgraph Core["Core Application Modules"]
        WS["AudioIngestionGateway\n(/device WebSocket Namespace)"]
        HB["HeartbeatModule\n(Telemetry, Battery & Signal Deltas)"]
        DEV["DeviceModule\n(Registration & Status)"]
        SESS["SessionModule\n(Session Audio & Ogg Opus Muxer)"]
        AI["AiOrchestratorModule & Assistant\n(Context Recall, Memory & LLM Routing)"]
    end

    subgraph Data["Persistence & Caching"]
        PG[("PostgreSQL\n(Drizzle ORM)")]
        REDIS[("Redis\n(BullMQ & Async Caching)")]
    end

    D1 -->|HTTP REST / Heartbeats| NG
    D1 -->|Binary Audio Packets (WebSocket)| WS
    D2 -->|REST API Requests| NG

    NG --> MW --> AUTH --> ALS
    ALS --> PINO
    ALS --> ERR

    AUTH --> DEV
    AUTH --> HB
    WS --> SESS
    SESS --> AI

    HB --> PG
    DEV --> PG
    AI --> REDIS
    AI --> PG
```

---

## 🚀 Key Features & Subsystems

### 1. Real-Time Audio Ingestion & WebSocket Gateway (`/device`)
- High-throughput binary audio streaming over Socket.io (`audio:packet`, `audio:packets:batch`).
- **Validation & Checksum Verification:** Automated packet checksum validation (`ChecksumUtil`) and sequence gap detection to eliminate dropped frames.
- **Opus Stream Muxing:** Custom `OggOpusWriter` utility streaming synthesized Opus audio in standard Ogg containers via `GET /v1/sessions/:sessionId/audio.ogg`.
- **Fault-Tolerant Exception Handling:** Custom `AllWsExceptionsFilter` catching socket errors, enriching logs with active `traceId`, and emitting structured `'exception'` payloads back to client sockets without crashing connections.

### 2. Distributed Tracing & Asynchronous Context Propagation
- **`RequestContextService`:** Built on Node.js's native `AsyncLocalStorage` to propagate `requestId`, `traceId`, `deviceId`, and `userId` across complex asynchronous promise chains without manual parameter passing.
- **W3C `traceparent` & Header Ingestion:** `CorrelationIdMiddleware` parses incoming W3C `traceparent` headers (extracting 32-hex trace IDs) and `X-Request-Id` headers (falling back to generated UUIDv4).
- **Latency Tracking:** Measures request lifecycle duration and injects `X-Response-Time` and `X-Request-Id` headers into outgoing HTTP responses.
- **Structured Pino Logging:** Refactored `LoggingInterceptor` and exception filters to guarantee full correlation metadata across all HTTP and WebSocket log outputs.

### 3. IoT Device Fleet Management & Telemetry
- Heartbeat telemetry tracking device battery levels, charging status, RSSI signal strength, and flash usage.
- Automated alert triggers for `rapid_drain` battery events and `weak_signal` degradation with recovery state reconciliation.
- RS256 JWT public-key signature verification across HTTP routes and WebSocket handshakes (`DeviceAuthGuard`).

### 4. AI Orchestration & Memory Pipeline
- Multi-step cognitive pipeline routing real-time device queries to LLM providers.
- Automated episode consolidation, conversation transcripts, observation entities, and semantic memory recall.
- BullMQ Redis queues for asynchronous audio processing and background transcription backfills.

---

## 🛠️ Tech Stack

- **Framework:** NestJS 10, Express, Socket.io
- **Language:** TypeScript 5 (Strict Mode)
- **Database & ORM:** PostgreSQL, Drizzle ORM
- **Cache & Message Queue:** Redis, BullMQ
- **Logging & Observability:** Pino (`nestjs-pino`), Node.js `AsyncLocalStorage`, W3C Distributed Tracing
- **Testing:** Jest, Supertest, isolated unit test suites (`--runInBand`)

---

## 📦 Project Structure

```text
src/
├── common/
│   ├── context/            # RequestContextService (AsyncLocalStorage context store)
│   ├── decorators/         # Custom @DeviceId, @UserId route parameter decorators
│   ├── errors/             # Domain-specific typed error classes
│   ├── filters/            # Global HTTP & WebSocket exception filters
│   ├── guards/             # DeviceAuthGuard (RS256 JWT authentication)
│   ├── interceptors/       # LoggingInterceptor (Pino correlation logging)
│   ├── middleware/         # CorrelationIdMiddleware (W3C traceparent & X-Request-Id)
│   ├── storage/            # Local & cloud storage providers
│   └── utils/              # OggOpusWriter, query parsers, checksum utilities
├── config/                 # Typed configuration & validation
├── database/               # DatabaseModule & Drizzle connection management
├── health/                 # HealthController & liveness probes (/v1/healthz)
├── modules/
│   ├── ai-orchestrator/    # LLM agent routing & inference
│   ├── assistant/          # Assistant gateways & voice activity detection (VAD)
│   ├── audio-ingestion/    # WebSocket gateway & batch packet processing
│   ├── consolidation/      # Episode & memory consolidation workers
│   ├── context/            # Session context state management
│   ├── conversation/       # Multi-turn conversation history
│   ├── device/             # Device registration, status, and fleet queries
│   ├── episode/            # Episodic memory & artifact persistence
│   ├── heartbeat/          # IoT telemetry, battery/signal deltas, and alerts
│   ├── memory/             # Semantic memory recall & embeddings
│   ├── ota/                # Over-the-air firmware update orchestration
│   ├── pipeline/           # Data pipeline execution & monitoring
│   └── session/            # Audio recording sessions & Ogg Opus streaming
├── app.module.ts           # Root module with global filters, middleware, and providers
└── main.ts                 # Application bootstrap with Helmet, Pino, and ValidationPipe
```

---

## ⚡ Getting Started

### Prerequisites
- Node.js >= 18.x
- Docker & Docker Compose (or local PostgreSQL and Redis)

### 1. Installation
```bash
git clone https://github.com/GreatClasher/alm-watch-backend.git
cd alm-watch-backend
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your environment variables:
```env
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/alm_backend
REDIS_HOST=localhost
REDIS_PORT=6379
LOG_LEVEL=info
JWT_PUBLIC_KEY_PATH=test/dummy.pem
```

### 3. Database Migrations (Drizzle ORM)
Generate and apply database migrations:
```bash
# Generate SQL migrations from entity schemas
npm run migration:generate

# Apply pending migrations to PostgreSQL
npm run migration:run
```

### 4. Running the Application
```bash
# Development mode with hot-reload
npm run start:dev

# Production build
npm run build
npm run start:prod
```

---

## 🧪 Testing

The repository features comprehensive unit and integration test suites running in isolated mode (`--runInBand`) without external database dependencies:

```bash
# Run unit tests across context, middleware, interceptor, and exception filters
npx jest --runInBand

# Run full test suite with coverage
npm run test:cov

# Typecheck TypeScript definitions
npm run typecheck
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

**Author:** Anubhav Yadav ([@GreatClasher](https://github.com/GreatClasher))
