# JabbelPin Backend — Implementation Plan

**Service**: `apps/backend/` — NestJS 10 · TypeScript 5.4+ · PostgreSQL 16 · Socket.IO 4

> Read alongside: `docs/07-backend-guidelines.md`, `docs/11-api-contracts.md`, `docs/12-database-design.md`, `docs/05-testing-strategy.md`, `prompts/backend.prompt.md`

---

## Dependency Order

```
Phase 0 (Scaffold)
  └─→ Phase 1 (Config + DB)
         └─→ Phase 2 (Device Auth)
                └─→ Phase 3 (Audio Ingestion WebSocket)
                       └─→ Phase 4 (Session Service)
                              └─→ Phase 5 (Heartbeat)
                                     └─→ Phase 6 (OTA)
                                            └─→ Phase 7 (Observability + Load Tests)
```

---

## Phase 0 — Project Scaffold

**Goal**: Empty NestJS project with strict TypeScript, lint, formatting, and test runner configured.

### Files to Create

#### [NEW] `apps/backend/package.json`
- NestJS 10, TypeORM 0.3, PostgreSQL driver (`pg`), Socket.IO 4
- `socket.io-client` (dev — for integration tests only)
- `class-validator 0.14`, `class-transformer 0.5`
- `zod 3`, `helmet 7`, `nestjs-pino`, `pino-http`, `pino-pretty` (dev)
- `jest 29`, `ts-jest`, `supertest`, `@nestjs/testing`
- Scripts: `start:dev`, `build`, `test`, `test:coverage`, `test:integration`, `test:e2e`, `migration:run`, `migration:generate`

#### [NEW] `apps/backend/tsconfig.json`
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "module": "commonjs",
    "target": "ES2021",
    "outDir": "dist",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

#### [NEW] `apps/backend/.eslintrc.json`
- `@typescript-eslint/no-explicit-any: error`
- `@typescript-eslint/explicit-function-return-type: error`
- `no-console: error`
- `@typescript-eslint/no-floating-promises: error`

#### [NEW] `apps/backend/.prettierrc`
- `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`

#### [NEW] `apps/backend/jest.config.ts`
- `preset: ts-jest`, `testEnvironment: node`
- `collectCoverageFrom`: excludes `*.module.ts`, `main.ts`, `*.entity.ts`
- Coverage thresholds: statements 80, branches 75, functions 80, lines 80

#### [NEW] `apps/backend/.env.example`
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://user:pass@localhost:5432/jabbelpin
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_EXPIRES_IN=86400
LOG_LEVEL=info
```

### Acceptance Criteria — Phase 0
- [ ] `npm install` succeeds
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] `npm test` runs (zero tests pass, but runner works)
- [ ] ESLint: zero errors on empty `src/`

---

## Phase 1 — Config, Database & Bootstrap

**Goal**: Working app that connects to PostgreSQL, validates env, and starts HTTP server.

### Files to Create / Modify

#### [NEW] `src/config/configuration.ts`
Zod schema validating all env vars at startup. Exported as `config` singleton.

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_PRIVATE_KEY_PATH: z.string(),
  JWT_PUBLIC_KEY_PATH: z.string(),
  JWT_EXPIRES_IN: z.coerce.number().default(86400),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

export const config = envSchema.parse(process.env);
export type AppConfig = z.infer<typeof envSchema>;
```

#### [NEW] `src/config/database.config.ts`
TypeORM factory using `DATABASE_URL`. **Never `synchronize: true` in non-test envs.**

#### [NEW] `src/app.module.ts`
Root module: imports `ConfigModule`, `TypeOrmModule`, `LoggerModule` (nestjs-pino), and all feature modules.

#### [NEW] `src/main.ts`
Bootstrap with:
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`
- `helmet()`
- `useLogger(app.get(Logger))` — pino
- `AllWsExceptionsFilter` and `AllHttpExceptionsFilter` global
- `trust proxy: 1`
- Listen on `config.PORT`

#### [NEW] `migrations/001-create-initial-schema.ts`
SQL migration creating:
- `devices(id UUID PK, device_serial VARCHAR(64) UNIQUE, firmware_version, last_heartbeat_at, status, created_at)`
- `sessions(id UUID PK, device_id FK→devices, started_at, ended_at, packet_count, created_at)`
- `audio_packets(id UUID PK, device_id FK, session_id FK, sequence_no INT, payload_type VARCHAR(20), payload BYTEA, checksum VARCHAR(64), client_timestamp BIGINT, received_at TIMESTAMP, UNIQUE(session_id, sequence_no))`
- Indexes: `idx_audio_packets_device_id`, `idx_audio_packets_session_id`, `idx_audio_packets_received_at`

#### [NEW] `src/common/filters/ws-exception.filter.ts`
#### [NEW] `src/common/filters/http-exception.filter.ts`
#### [NEW] `src/common/interceptors/logging.interceptor.ts`
#### [NEW] `src/common/errors/base.error.ts`
Base class: `constructor(message, context: Record<string, unknown>)`

### TDD — Phase 1 Test Scenarios

| Test | Type | Scenario |
|---|---|---|
| Config fails on missing `DATABASE_URL` | Unit | `envSchema.parse({})` throws ZodError |
| Config accepts valid env | Unit | Parses complete env without throwing |
| Migration runs cleanly | Integration | All 3 tables exist after migration |
| Migration down rolls back | Integration | Tables removed after `down()` |
| App starts on valid config | E2E | `GET /healthz` returns `{ status: "ok" }` |

### Acceptance Criteria — Phase 1
- [ ] `GET /v1/healthz` returns `{ status: "ok", uptime: <ms> }` (200)
- [ ] Migration 001 runs without error
- [ ] Zod validation fails fast with clear message on bad env
- [ ] Pino logs structured JSON on every request
- [ ] Helmet adds security headers (verified via `supertest`)

---

## Phase 2 — Device Module & JWT Auth

**Goal**: Devices can register and receive a JWT for authenticating all subsequent requests.

### Files to Create

#### [NEW] `src/modules/device/device.module.ts`
#### [NEW] `src/modules/device/entities/device.entity.ts`
TypeORM entity matching `devices` table schema.

#### [NEW] `src/modules/device/dto/register-device.dto.ts`
```typescript
export class RegisterDeviceDto {
  @IsString() @MaxLength(64)
  readonly deviceSerial!: string;

  @IsString() @MaxLength(20)
  readonly firmwareVersion!: string;

  @IsString() @MaxLength(64)
  readonly model!: string;
}
```

#### [NEW] `src/modules/device/dto/device-response.dto.ts`
#### [NEW] `src/modules/device/dto/register-device-response.dto.ts`
Returns `{ deviceId, token, expiresAt }`.

#### [NEW] `src/modules/device/interfaces/device.interface.ts`
#### [NEW] `src/modules/device/device.service.ts`
- `registerDevice(dto)` — upsert device, issue RS256 JWT
- `findById(id)` — throws `DeviceNotFoundError` if missing
- `updateHeartbeat(id, timestamp)` — update `last_heartbeat_at`

#### [NEW] `src/modules/device/device.service.spec.ts`
#### [NEW] `src/modules/device/device.controller.ts`
- `POST /v1/devices/register` — no auth required
- `GET /v1/devices/:deviceId` — auth required
- `GET /v1/devices/:deviceId/sessions` — auth required (paginated)

#### [NEW] `src/common/guards/device-auth.guard.ts`
Validates `Authorization: Bearer <jwt>` (RS256). Sets `request.deviceId` from JWT `sub`.

#### [NEW] `src/common/errors/device-not-found.error.ts`
#### [NEW] `src/common/errors/device-already-registered.error.ts`

### TDD — Phase 2 Test Scenarios

| Test | Type | Scenario |
|---|---|---|
| `registerDevice` happy path | Unit | Returns deviceId + token on valid input |
| `registerDevice` duplicate serial | Unit | Throws `DeviceAlreadyRegisteredError` |
| `findById` unknown ID | Unit | Throws `DeviceNotFoundError` |
| `POST /devices/register` — valid | Integration | Creates device row in DB, returns 201 |
| `POST /devices/register` — missing field | Integration | Returns 400 with validation errors |
| `POST /devices/register` — duplicate | Integration | Returns 409 |
| `GET /devices/:id` — no token | Integration | Returns 401 |
| `GET /devices/:id` — valid token | Integration | Returns device JSON |
| JWT guard — expired token | Unit | Guard throws `UnauthorizedException` |
| JWT guard — malformed token | Unit | Guard throws `UnauthorizedException` |
| JWT guard — wrong audience | Unit | Guard throws `UnauthorizedException` |

### Acceptance Criteria — Phase 2
- [ ] `POST /v1/devices/register` creates device, returns JWT
- [ ] `GET /v1/devices/:id` requires valid JWT
- [ ] Duplicate `deviceSerial` returns 409
- [ ] Invalid JWT on protected endpoint returns 401
- [ ] JWT contains `{ sub, deviceId, iss: "jabbelpin-api", aud: "jabbelpin-device" }`
- [ ] All unit + integration tests pass (≥ 80% coverage on `device/`)

---

## Phase 3 — Audio Ingestion Gateway (WebSocket)

**Goal**: Phone can connect via WebSocket, emit `audio:packet` events, get ACK, and packets are stored in PostgreSQL.

### Files to Create

#### [NEW] `src/modules/audio-ingestion/audio-ingestion.module.ts`
#### [NEW] `src/modules/audio-ingestion/entities/audio-packet.entity.ts`
#### [NEW] `src/modules/audio-ingestion/entities/session.entity.ts`
#### [NEW] `src/modules/audio-ingestion/dto/audio-packet.dto.ts`
```typescript
export class AudioPacketDto {
  @IsUUID('4') readonly deviceId!: string;
  @IsUUID('4') readonly sessionId!: string;
  @IsInt() @Min(0) @Max(4294967295) readonly sequenceNo!: number;
  @IsInt() @Min(0) readonly timestamp!: number;
  @IsEnum(PacketPayloadType) readonly payloadType!: PacketPayloadType;
  @IsNotEmpty()
  @Transform(({ value }) => Buffer.isBuffer(value) ? value : Buffer.from(value as string, 'base64'))
  readonly payload!: Buffer;
  @IsNotEmpty() readonly checksum!: string;
}
```

#### [NEW] `src/modules/audio-ingestion/dto/ingest-response.dto.ts`
`{ status: 'accepted' | 'rejected', packetId?: string, code?: string, message?: string }`

#### [NEW] `src/modules/audio-ingestion/interfaces/audio-packet.interface.ts`
#### [NEW] `src/modules/audio-ingestion/interfaces/packet-validation-result.interface.ts`

#### [NEW] `src/modules/audio-ingestion/audio-ingestion.gateway.ts`
- `@WebSocketGateway({ namespace: '/device', cors: false })`
- `@UseGuards(DeviceAuthGuard)` — auth on connection
- `handleConnection` / `handleDisconnect` — structured log
- `@SubscribeMessage('audio:packet')` — validates DTO, calls service, returns ACK
- **deviceId always from `client.data.deviceId`** — never from DTO body

#### [NEW] `src/modules/audio-ingestion/audio-ingestion.service.ts`
- `ingestPacket(dto)`:
  1. Verify CRC32 checksum — throw `PacketValidationError` on mismatch
  2. Upsert with `ON CONFLICT DO NOTHING` (idempotent)
  3. Auto-create session row if `sessionId` is new
  4. Log with: `deviceId`, `sessionId`, `sequenceNo`, `payloadSizeBytes`
  5. Return `AudioPacketEntity`

#### [NEW] `src/modules/audio-ingestion/audio-ingestion.service.spec.ts`
#### [NEW] `src/modules/audio-ingestion/utils/checksum.util.ts`
CRC32 implementation matching the mobile deserializer.

#### [NEW] `src/common/pipes/binary-validation.pipe.ts`

### TDD — Phase 3 Test Scenarios

| Test | Type | Scenario |
|---|---|---|
| `ingestPacket` — valid packet | Unit | Returns entity with correct fields |
| `ingestPacket` — checksum mismatch | Unit | Throws `PacketValidationError` |
| `ingestPacket` — duplicate (session+seq) | Unit | Returns existing record (no throw) |
| `ingestPacket` — new sessionId | Unit | Auto-creates session row |
| WebSocket connect — valid token | Integration | Connection accepted, `client.data.deviceId` set |
| WebSocket connect — no token | Integration | Connection refused (401) |
| WebSocket connect — expired token | Integration | Connection refused (401) |
| `audio:packet` — valid packet | Integration | ACK `{ status: "accepted", packetId }` |
| `audio:packet` — invalid DTO | Integration | WS error event with validation message |
| `audio:packet` — checksum fail | Integration | ACK `{ status: "rejected", code: "CHECKSUM_MISMATCH" }` |
| `audio:packet` — duplicate | Integration | ACK `{ status: "accepted" }` (idempotent) |
| Sequence gap detection | Integration | Gap logged as warn; packet still stored |
| E2E: connect → send 10 packets → verify DB | E2E | 10 rows in `audio_packets`, 1 session row |

### Acceptance Criteria — Phase 3
- [ ] Phone connects with JWT → `handleConnection` fires, `client.data.deviceId` set
- [ ] `audio:packet` emits ACK with `{ status: "accepted", packetId }`
- [ ] Checksum mismatch returns `{ status: "rejected", code: "CHECKSUM_MISMATCH" }`
- [ ] Duplicate `(sessionId, sequenceNo)` is silently idempotent (no error, returns existing)
- [ ] Session row auto-created on first packet for a new `sessionId`
- [ ] `deviceId` in stored row ALWAYS comes from JWT, not from DTO
- [ ] ≥ 80% unit coverage on `audio-ingestion/`

---

## Phase 4 — Session Service & Packet Retrieval API

**Goal**: Sessions are queryable via REST. Packet replay endpoint for debugging and future ASR pipeline.

### Files to Create

#### [NEW] `src/modules/session/session.module.ts`
#### [NEW] `src/modules/session/session.service.ts`
- `findSessionsByDevice(deviceId, { limit, offset, from, to })` — paginated
- `findPacketsBySession(sessionId, { limit, offset, fromSeq })` — paginated
- `closeSession(sessionId)` — set `ended_at`, finalize `packet_count`

#### [NEW] `src/modules/session/session.controller.ts`
- `GET /v1/devices/:deviceId/sessions` — paginated list
- `GET /v1/sessions/:sessionId/packets` — paginated packets (no payload bytes in response)

### TDD — Phase 4 Test Scenarios

| Test | Type | Scenario |
|---|---|---|
| `findSessionsByDevice` — with date filter | Unit | SQL WHERE clause built correctly |
| `findPacketsBySession` — `fromSeq` filter | Unit | Only packets with seqNo ≥ fromSeq returned |
| `GET /sessions/:id/packets` — no auth | Integration | 401 |
| `GET /sessions/:id/packets` — wrong device | Integration | 403 (device can only read own sessions) |
| `GET /sessions/:id/packets` — valid | Integration | Paginated response, no payload bytes |

### Acceptance Criteria — Phase 4
- [ ] Pagination: `total`, `limit`, `offset` always in response
- [ ] Audio payload bytes NOT returned (only metadata)
- [ ] Cross-device access returns 403
- [ ] `from` / `to` date filters work correctly

---

## Phase 5 — Heartbeat Service

**Goal**: Phone forwards watch heartbeats every 60s. Backend tracks device liveness. Stale devices detected.

### Files to Create

#### [NEW] `src/modules/heartbeat/heartbeat.module.ts`
#### [NEW] `src/modules/heartbeat/heartbeat.service.ts`
- `processHeartbeat(deviceId, dto)` — update `last_heartbeat_at`, insert `heartbeat_log` row
- `detectStaleDevices()` — `last_heartbeat_at < now - 5min` → mark status `stale`
- `@Cron('*/1 * * * *')` — runs stale detection every minute

#### [NEW] `src/modules/heartbeat/heartbeat.controller.ts`
`POST /v1/devices/:deviceId/heartbeat` — body per `11-api-contracts.md`

#### [NEW] `migrations/002-add-heartbeat-log.ts`
Table: `heartbeat_log(id UUID PK, device_id FK, received_at, battery_level, ble_connected, flash_usage_percent)`

### TDD — Phase 5 Test Scenarios

| Test | Type | Scenario |
|---|---|---|
| `processHeartbeat` — valid | Unit | Updates `last_heartbeat_at`, inserts log row |
| `detectStaleDevices` — no heartbeat 6 min | Unit | Device status set to `stale` |
| `detectStaleDevices` — recent heartbeat | Unit | Device status unchanged |
| `POST /heartbeat` — valid | Integration | 200 with `{ status: "ok", serverTime }` |
| `POST /heartbeat` — unknown device | Integration | 404 |
| Cron stale detection | Unit | Jest fake timers advance, verify stale flag |

### Acceptance Criteria — Phase 5
- [ ] Heartbeat endpoint updates `last_heartbeat_at`
- [ ] `heartbeat_log` row inserted on every heartbeat
- [ ] Device with no heartbeat for 5+ min is marked `stale`
- [ ] Response includes `serverTime` (Unix ms, server clock)

---

## Phase 6 — OTA Service

**Goal**: Admin uploads firmware. Backend notifies connected phones via WebSocket. REST endpoint for latest version.

### Files to Create

#### [NEW] `src/modules/ota/ota.module.ts`
#### [NEW] `src/modules/ota/ota.service.ts`
- `getLatestFirmware()` — returns `{ version, downloadUrl, sha256, mandatory, releaseNotes }`
- `notifyConnectedDevices()` — emits `ota:available` to all connected WebSocket clients

#### [NEW] `src/modules/ota/ota.controller.ts`
- `GET /v1/firmware/latest` — no auth
- `POST /v1/firmware` — admin-only, multipart upload

#### [NEW] `migrations/003-add-firmware-versions.ts`
Table: `firmware_versions(id UUID PK, version VARCHAR(20) UNIQUE, download_url, sha256 CHAR(64), mandatory BOOLEAN, release_notes TEXT, uploaded_at TIMESTAMP)`

### TDD — Phase 6 Test Scenarios

| Test | Type | Scenario |
|---|---|---|
| `getLatestFirmware` — no firmware | Unit | Returns null |
| `getLatestFirmware` — multiple versions | Unit | Returns highest semver |
| `notifyConnectedDevices` | Unit | `server.emit('ota:available', payload)` called |
| `GET /firmware/latest` | Integration | 200 with correct JSON shape |
| `POST /firmware` — no admin auth | Integration | 403 |

---

## Phase 7 — Observability & Load Testing

**Goal**: Prometheus metrics, structured logging validation, performance under load.

### Files to Create

#### [NEW] `src/modules/metrics/metrics.module.ts`
- `GET /metrics` — Prometheus exposition format
- Custom counters: `packets_ingested_total`, `packets_rejected_total`, `ws_connections_active`, `heartbeats_received_total`
- Histograms: `packet_ingestion_duration_ms` (p50, p95, p99)

#### [NEW] `test/load/packet-ingestion.load.ts`
Artillery or k6 script: 50 concurrent WebSocket connections, each sending 100 packets/s for 60s. Assert p95 < 100ms.

### Phase 7 Test Scenarios

| Test | Type | Scenario |
|---|---|---|
| `/metrics` — format | Integration | Prometheus text format parseable |
| Counters increment | Integration | After 10 packets, `packets_ingested_total = 10` |
| Load: 50 ws × 100 pkt/s | Load | p95 ingestion latency < 100ms, zero errors |
| Memory: 30min sustained | Load | No memory leak (RSS growth < 10%) |

---

## Full Directory Structure (Final Target)

```
apps/backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   ├── configuration.ts
│   │   └── database.config.ts
│   ├── modules/
│   │   ├── audio-ingestion/
│   │   │   ├── audio-ingestion.module.ts
│   │   │   ├── audio-ingestion.gateway.ts
│   │   │   ├── audio-ingestion.service.ts
│   │   │   ├── audio-ingestion.service.spec.ts
│   │   │   ├── dto/
│   │   │   │   ├── audio-packet.dto.ts
│   │   │   │   └── ingest-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── audio-packet.entity.ts
│   │   │   │   └── session.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── audio-packet.interface.ts
│   │   │   │   └── packet-validation-result.interface.ts
│   │   │   └── utils/
│   │   │       └── checksum.util.ts
│   │   ├── device/
│   │   │   ├── device.module.ts
│   │   │   ├── device.controller.ts
│   │   │   ├── device.service.ts
│   │   │   ├── device.service.spec.ts
│   │   │   ├── dto/
│   │   │   │   ├── register-device.dto.ts
│   │   │   │   ├── register-device-response.dto.ts
│   │   │   │   └── device-status.dto.ts
│   │   │   └── entities/
│   │   │       └── device.entity.ts
│   │   ├── session/
│   │   │   ├── session.module.ts
│   │   │   ├── session.controller.ts
│   │   │   └── session.service.ts
│   │   ├── heartbeat/
│   │   │   ├── heartbeat.module.ts
│   │   │   ├── heartbeat.controller.ts
│   │   │   └── heartbeat.service.ts
│   │   ├── ota/
│   │   │   ├── ota.module.ts
│   │   │   ├── ota.controller.ts
│   │   │   └── ota.service.ts
│   │   └── metrics/
│   │       └── metrics.module.ts
│   └── common/
│       ├── decorators/
│       │   └── device-id.decorator.ts
│       ├── errors/
│       │   ├── base.error.ts
│       │   ├── packet-validation.error.ts
│       │   ├── device-not-found.error.ts
│       │   ├── device-already-registered.error.ts
│       │   └── session-not-found.error.ts
│       ├── filters/
│       │   ├── ws-exception.filter.ts
│       │   └── http-exception.filter.ts
│       ├── guards/
│       │   └── device-auth.guard.ts
│       ├── interceptors/
│       │   └── logging.interceptor.ts
│       └── pipes/
│           └── binary-validation.pipe.ts
├── migrations/
│   ├── 001-create-initial-schema.ts
│   ├── 002-add-heartbeat-log.ts
│   └── 003-add-firmware-versions.ts
├── test/
│   ├── app.e2e-spec.ts
│   ├── jest-e2e.json
│   └── load/
│       └── packet-ingestion.load.ts
├── plans/
│   └── implementation_plan.md    ← (this file)
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── jest.config.ts
├── package.json
└── tsconfig.json
```

---

## Non-Negotiable Rules (from `backend.prompt.md`)

1. **No `any`** — use `unknown` + type narrowing
2. **No `console.log`** — inject `PinoLogger` everywhere
3. **`synchronize: false`** in TypeORM always — migrations only
4. **`deviceId` from JWT** (`client.data.deviceId`) — never from message body
5. **Idempotent packet writes** — `ON CONFLICT DO NOTHING`
6. **CRC32 checksum verified** before any DB write
7. **Global `ValidationPipe`** with `whitelist: true, forbidNonWhitelisted: true`
8. **TDD**: write spec file first, red → green → refactor
9. **80% coverage threshold** — CI fails below this
10. **Typed error classes** — never `throw new Error('string')`

---

## Verification Plan

### Automated Tests
```bash
cd apps/backend
npm test                        # Unit tests (all phases)
npm run test:coverage           # Coverage report (≥ 80%)
npm run test:integration        # Integration tests (requires test DB on port 5433)
npm run test:e2e                # Full E2E
```

### Manual Verification
1. Start local Postgres: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=pass postgres:16`
2. Run migrations: `npm run migration:run`
3. Start server: `npm run start:dev`
4. Register device via `POST /v1/devices/register` with curl
5. Connect via Socket.IO test client, emit `audio:packet`, verify ACK
6. Check DB row in `audio_packets`
7. Call `GET /v1/devices/:id` with JWT — verify response
8. Call `POST /v1/devices/:id/heartbeat` — verify `last_heartbeat_at` updated
