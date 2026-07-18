# JabbelPin Backend

NestJS backend service responsible for device authentication, heartbeat tracking, and audio packet ingestion via WebSocket. It uses PostgreSQL with Drizzle ORM.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   The `.env` file is already created. You may update `DATABASE_URL` with your local Postgres credentials if they differ from the default.
   Ensure the JWT keys exist at the paths specified (`../../keys/private.pem`, etc.).

3. **Database Setup & Migrations**
   The backend uses Drizzle ORM. Entity schemas are organized within each module under the `entities/` folder (e.g., `src/modules/device/entities/device.entity.ts`).

   To automatically generate a new SQL migration when you update an entity:
   ```bash
   npm run migration:generate
   ```

   To apply pending migrations or push schema changes to your database:
   ```bash
   npm run migration:run
   ```

## Running the App

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Testing

```bash
# Unit Tests
npm test

# E2E Tests
npm run test:e2e
```
