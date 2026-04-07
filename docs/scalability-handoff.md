# Hytale Server Manager — Scalability Technical Handoff

> **Audience:** AI agent or engineer picking up scalability work without prior context.
> **Scope:** Based entirely on the architecture as it exists in this codebase and what was discussed during the development session that produced this document. All file references are relative to the monorepo root.

---

## 1. Current Architecture

### Monorepo Structure

```text
hytale_server_manager/          ← pnpm workspace root (turbo.json orchestration)
├── packages/
│   ├── server/                 ← Express + Socket.IO backend (TypeScript)
│   ├── frontend/               ← React 19 + Vite + TanStack Query SPA
│   └── website/                ← Astro marketing site (not relevant to scalability)
├── Dockerfile                  ← Production multi-stage build
├── Dockerfile.dev              ← Development image (node:24-slim + Java + build tools)
├── docker-compose.yml          ← Production deployment
└── docker-compose.dev.yml      ← Development deployment (separate ports, shared volumes)
```

**Package manager:** pnpm 9.15.0 with workspace hoisting. The pnpm content-addressable store is configured at `/app/.pnpm-store` (inside the project root — important for Docker volume isolation, covered in Section 5).

**Build toolchain:** Turbo for task orchestration, TypeScript 6.0, Vite 8 for frontend.

---

### Backend (`packages/server`)

**Runtime:** Node.js 24, Express 5, TypeScript compiled via `ts-node-dev` in development and `tsc` in production.

**Entry point:** `src/index.ts` → `src/app.ts` (`App` class). `App` owns:

- The Express instance
- The HTTP/HTTPS server
- The Socket.IO server (`io`)
- All service instances (constructed once, shared by reference)
- All WebSocket event handlers

**Key services instantiated in `App`:**

- `ServerService` — lifecycle management for all game servers
- `MetricsService` — host + per-server CPU/memory/disk metrics
- `SchedulerService` — cron-based scheduled tasks
- `AlertsService`, `AutomationRulesService`
- `BackupService`, `FileService`, `WorldsService`
- `DiscordNotificationService`, `SettingsService`
- `ModService`, `ModProviderService`
- `HytaleDownloaderService`, `ServerUpdateService`

**Configuration:** `src/config.ts` loads from three sources merged in order: hardcoded defaults ← `config.json` file ← environment variables. All paths (DB, servers, backups, logs, certs) are resolved to absolute paths at startup.

---

### Database

**Engine:** SQLite via `better-sqlite3`, accessed through Prisma 7 with `@prisma/adapter-better-sqlite3`.

**Prisma client construction** (`src/lib/prisma.ts`):

```ts
function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? 'file:./data/db/hytale-manager.db';
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}
```

**Key models relevant to scalability** (full schema in `packages/server/prisma/schema.prisma`):

| Model | Scalability-relevant fields |
| --- | --- |
| `Server` | `status`, `pid`, `startedAt`, `adapterType`, `jvmArgs`, `rconPort`, `rconPassword` |
| `ServerMetric` | Per-server time-series: CPU, memory, disk, player count, TPS |
| `HostMetric` | Host-level time-series metrics |
| `ConsoleLog` | Per-server log entries |
| `ScheduledTask` | Cron tasks — executed by `SchedulerService` on a single node |

**Notable absence:** There is no `nodeId` or `Node` table. The schema has no concept of which backend instance owns a given running server process. This is the primary scalability gap.

---

### Adapter Pattern

`IServerAdapter` (`src/adapters/IServerAdapter.ts`) defines the full contract for interacting with a game server: lifecycle (`start`, `stop`, `restart`, `kill`), process persistence (`reconnect`, `disconnect`, `getPid`), metrics, console, players, mods, backups, files.

`ServerService.getAdapter()` (`src/services/ServerService.ts:30-98`) resolves adapters:

```ts
private adapters: Map<string, IServerAdapter> = new Map();

private async getAdapter(serverId: string): Promise<IServerAdapter> {
  if (this.adapters.has(serverId)) return this.adapters.get(serverId)!;
  // Load from DB, create new adapter, cache it
  switch (server.adapterType) {
    case 'java': return new JavaServerAdapter(...);
    case 'hytale': throw new Error('not yet implemented');
  }
}
```

**Currently only one adapter is implemented:** `JavaServerAdapter` (`src/adapters/JavaServerAdapter.ts`). Despite the interface comment saying "mock servers for development", there is no mock adapter — both dev and production use `JavaServerAdapter` and spawn real Java processes.

**`JavaServerAdapter` state split:**

| State | Location | Survives process restart? |
| --- | --- | --- |
| `status` (running/stopped/crashed) | In-memory (`this.status`) + DB (on transitions) | DB value survives; in-memory lost |
| `pid` | In-memory (`this.process.pid`) + DB (written on spawn) | DB value survives; handle lost |
| `ChildProcess` reference | In-memory only (`this.process`) | Never — OS handle is process-scoped |
| Player count | In-memory only | Lost on restart |
| Live metrics | In-memory only (polled from OS) | Lost on restart |
| Log callbacks / streaming | In-memory only | Lost on restart |

---

### WebSocket Architecture

Socket.IO is used for real-time state push to the browser. Three namespaces:

- `/servers` (`ServerEvents`) — server status + metrics, pushed every 2 seconds
- `/console` (`ConsoleEvents`) — live log streaming per server
- `/hytale-downloader` — binary download progress

**`ServerEvents` status push loop** (`src/websocket/ServerEvents.ts:159-176`):

```ts
setInterval(async () => {
  const metrics = await this.serverService.getServerMetrics(serverId);
  const status = await this.serverService.getServerStatus(serverId);
  this.io.of('/servers').to(`server:${serverId}`).emit('server:metrics', { ... });
  this.io.of('/servers').to(`server:${serverId}`).emit('server:status', { ... });
}, 2000);
```

`getServerStatus()` calls `adapter.getStatus()` which returns `this.status` from in-memory. **This means what the browser sees is the adapter's in-memory state, not the raw DB row.** A backend node that did not start a server will always return `stopped` from its adapter, regardless of what the DB says.

---

### Deployment

**Production (`docker-compose.yml`):**

- Single container: `ghcr.io/nebula-codes/hytale-server-manager:latest`
- Built from `Dockerfile` (multi-stage: Alpine builder + Debian slim runtime with Temurin JRE 25)
- Backend serves the pre-built frontend as static files from `./public`
- Ports: `3001` (HTTP/HTTPS, all traffic)
- Named volumes: `hsm-database`, `hsm-servers`, `hsm-backups`, `hsm-logs`, `hsm-certs`, `hsm-downloader`

**Development (`docker-compose.dev.yml`):**

- Two containers built from `Dockerfile.dev` (same `node:24-slim` + Java + build tools: `python3`, `make`, `g++`)
- `hsm-server-dev`: backend on port `8080`, `pid: host` (shares host PID namespace for correct process detection)
- `hsm-frontend-dev`: Vite dev server on port `3030`, proxies `/api` and `/socket.io` to `http://server:8080`
- **Shares the same named Docker volumes as production** (prefixed `hytale_server_manager_` by Compose)
- Node_modules and pnpm store are isolated per-container via named volumes to prevent musl/glibc binary cross-contamination

**Nginx reverse proxy** (on the host, managed by Certbot):

- Production config: `/etc/nginx/sites-available/hypanel.keanuhie.com` → all traffic to `:3001`
- Dev config: `/etc/nginx/sites-available/hypanel.keanuhie.com.dev` → `/api` + `/socket.io` to `:8080`, everything else to `:3030`
- Switched by symlinking the active config into `sites-enabled/` and reloading nginx

---

## 2. Scalability Gaps & Pain Points

### Gap 1: SQLite — single-writer file database

SQLite uses file-level locking. Even in WAL (Write-Ahead Logging) mode, only one writer can commit at a time. Running two backend processes against the same SQLite file (as dev and production currently do via shared Docker volumes) causes write contention and potential data corruption on concurrent writes. There is no connection pooling, no horizontal read scaling, and no support for separate database hosts.

**Affected code:** `src/lib/prisma.ts` — the `PrismaBetterSqlite3` adapter is SQLite-specific and incompatible with PostgreSQL.

### Gap 2: In-memory adapter state is not shared

`ServerService.adapters: Map<string, IServerAdapter>` is local to the OS process. The `ChildProcess` reference, real-time `status`, player count, and metrics only exist in the node that spawned the server. Any other backend node creates a blank adapter and always reports `stopped`.

**Consequence observed during development:** When the dev backend started (without `pid: host`) it couldn't find the Cursebreaker game server's PID (PID 2919) in its container PID namespace, wrote `status: crashed, pid: null` to the shared DB, corrupting production's state. This was fixed with `pid: host`, but the underlying issue (two backends sharing one DB with no ownership coordination) remains.

### Gap 3: No process ownership tracking

The `Server` table has no `nodeId` column. When `getAdapter()` is called for a server that was started by a different node, it silently creates a new blank adapter with no process handle, no real status, and no ability to send commands. There is no way to route a `stop` command to the correct node.

### Gap 4: WebSocket state is node-local

`ServerEvents` only emits to `this.io` — the Socket.IO server of the current process. Clients connected to node A never receive broadcasts about servers running on node B. There is no cross-node pub/sub mechanism.

### Gap 5: Scheduled tasks run on every node

`SchedulerService` loads and starts all cron tasks on startup. With multiple nodes, every task would fire once per node, causing duplicate backups, duplicate Discord notifications, duplicate restart commands, etc. There is no distributed locking or leader election.

### Gap 6: Metrics time-series in SQLite

`ServerMetric` and `HostMetric` grow unboundedly (a 30-day retention is configured but relies on a cleanup job running on a single node). With multiple servers and 2-second metric intervals, write volume to the DB is high, and SQLite is the worst possible choice for time-series workloads.

### Gap 7: JWT secrets and encryption keys must be identical across nodes

`SETTINGS_ENCRYPTION_KEY` (for `GlobalSetting.encrypted` fields) and `JWT_SECRET`/`JWT_REFRESH_SECRET` must be the same on all nodes — currently they're hardcoded placeholders in `docker-compose.dev.yml`. Any token issued by one node must be verifiable by all nodes; any encrypted setting must be decryptable by all nodes.

---

## 3. Target Scalable Architecture

### Database: PostgreSQL

Replace SQLite with PostgreSQL. Prisma already supports PostgreSQL — the schema requires no model changes, only the `datasource` block and `DATABASE_URL` format change. The `PrismaBetterSqlite3` adapter must be replaced with the default Prisma client (no custom adapter needed for PostgreSQL).

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

For time-series data (`ServerMetric`, `HostMetric`, `ConsoleLog`), TimescaleDB (a PostgreSQL extension) or a dedicated TSDB (InfluxDB, Victoria Metrics) should replace the current models once write volume justifies it.

### Schema additions for multi-node coordination

Two new tables are required:

```prisma
model Node {
  id            String    @id  // UUID generated at startup, stable for the node's lifetime
  address       String         // Internal HTTP address: "http://hsm-node-1:8080"
  lastHeartbeat DateTime       // Updated every 30s; stale after 90s = dead node
  startedAt     DateTime  @default(now())
}
```

Add to `Server`:

```prisma
nodeId        String?    // Which Node.id currently owns this server's ChildProcess
metricsJson   String?    // Last-known live metrics blob, flushed from owning node every 2s
playersOnline Int        @default(0)  // Flushed from owning node
```

### Process ownership and `RemoteAdapter`

Add a new `RemoteAdapter` implementing `IServerAdapter`. When `getAdapter()` detects that `server.nodeId !== this.nodeId`:

- `getStatus()` / `getMetrics()` → reads the DB columns (`status`, `metricsJson`, `playersOnline`) flushed by the owning node
- `start()` / `stop()` / `restart()` / `sendCommand()` → HTTP POST to `Node.address` of the owning node's internal API (a new internal-only route group, not exposed externally)
- `reconnect()` → always returns `false`
- `isConnected()` → always returns `false`

`getAdapter()` updated logic:

```ts
private async getAdapter(serverId: string): Promise<IServerAdapter> {
  if (this.adapters.has(serverId)) return this.adapters.get(serverId)!;

  const server = await this.prisma.server.findUnique({ where: { id: serverId } });

  if (server.nodeId && server.nodeId !== this.nodeId) {
    // Owned by another node — return a remote proxy
    const ownerNode = await this.prisma.node.findUnique({ where: { id: server.nodeId } });
    if (ownerNode && isAlive(ownerNode)) {
      return new RemoteAdapter(serverId, ownerNode.address);
    }
    // Owner node is dead — fall through to recovery (existing recoverOrphanedServers logic)
  }

  // Create local adapter (this node will own it after startServer sets nodeId)
  return new JavaServerAdapter(...);
}
```

### Cross-node WebSocket broadcasting (Redis pub/sub)

Add Redis (or Valkey) as a pub/sub broker. When the owning node changes a server's status or metrics, it publishes to a Redis channel. All nodes subscribe and emit to their local Socket.IO clients.

```text
Owning Node:  adapter state change → publish to Redis channel "server:{id}:status"
All Nodes:    subscribe → receive → this.io.of('/servers').to(`server:${id}`).emit(...)
```

Socket.IO has a first-party Redis adapter (`@socket.io/redis-adapter`) that handles this transparently, including room membership across nodes. This means a client connected to any node receives all events regardless of which node owns the server.

### Distributed scheduled task execution (leader election)

Use a DB-level advisory lock or a simple `leader_election` table with heartbeats:

```prisma
model LeaderElection {
  id        String   @id @default("scheduler")
  nodeId    String
  expiresAt DateTime
}
```

On each tick, the scheduler tries to upsert this row with its own `nodeId` only if `expiresAt` is in the past (i.e., the previous leader died). Only the current leader runs scheduled tasks. This prevents duplicate execution across nodes.

### Stateless HTTP layer

The Express routes are already effectively stateless — all state is in the DB or the adapter map. Once the adapter map is proxied via `RemoteAdapter` for foreign-owned servers, all HTTP handlers become stateless and any node can serve any request.

JWT verification already works across nodes as long as `JWT_SECRET` is identical (injected via environment/secrets manager). Same for `SETTINGS_ENCRYPTION_KEY`.

### Target topology

```text
                    ┌─────────────────────────────┐
                    │         Load Balancer        │
                    │    (nginx / cloud LB)        │
                    └──────┬──────────────┬────────┘
                           │              │
               ┌───────────▼──┐     ┌─────▼────────┐
               │  HSM Node A  │     │  HSM Node B  │
               │  (Express +  │     │  (Express +  │
               │   Socket.IO) │     │   Socket.IO) │
               └──────┬───────┘     └──────┬───────┘
                      │                    │
          ┌───────────┼────────────────────┤
          │           │                    │
  ┌───────▼──┐  ┌─────▼──────┐   ┌────────▼───┐
  │PostgreSQL│  │   Redis    │   │ Shared FS  │
  │(primary) │  │ (pub/sub + │   │ (servers,  │
  │          │  │  sessions) │   │  backups)  │
  └──────────┘  └────────────┘   └────────────┘
```

The shared filesystem (game server files, backups) can be NFS, a cloud-managed file share (EFS, Azure Files), or kept on a single host with nodes running on the same machine — depending on whether horizontal scaling is across machines or just multiple processes on one host.

---

## 4. Migration Path

### Phase 0 — Immediate: fix multi-node DB corruption (minimum viable, no new infrastructure)

**Goal:** Prevent the dev backend from corrupting production's server state. Already partially addressed by `pid: host`, but the root problem (no ownership tracking) remains.

1. Add `nodeId String?` to the `Server` model via a Prisma migration (non-breaking, nullable)
2. Generate a stable node ID on startup (e.g., from `os.hostname()` or a UUID written to a file)
3. `startServer()` sets `Server.nodeId = this.nodeId`; `stopServer()` clears it to `null`
4. `getServerStatus()`: if `server.nodeId` is set and does not match `this.nodeId`, return the DB `status` field directly instead of calling `adapter.getStatus()` — this prevents blank adapter creation and the false `stopped` response
5. `recoverOrphanedServers()`: only attempt recovery for servers where `nodeId` matches this node OR `nodeId` is null

**Files to change:** `src/services/ServerService.ts`, `prisma/schema.prisma`, one new Prisma migration.

**No new infrastructure required.** SQLite remains. This phase resolves the dev/prod co-existence problem.

---

### Phase 1 — PostgreSQL migration

**Goal:** Remove the SQLite single-writer bottleneck.

1. Add `postgres` service to `docker-compose.yml` (or use a managed PostgreSQL)
2. Change `prisma/schema.prisma` datasource to `postgresql`
3. Remove `@prisma/adapter-better-sqlite3` from dependencies; remove the adapter from `src/lib/prisma.ts`
4. Run `prisma migrate dev` to generate a new initial migration for PostgreSQL
5. Write a one-time data migration script to transfer the SQLite data to PostgreSQL (Prisma Studio or a custom `ts-node` script)
6. Update `DATABASE_URL` in all environment configs and Docker compose files
7. Remove the `better-sqlite3` and `@prisma/adapter-better-sqlite3` packages

**Breaking change:** Production must be taken offline for the data migration. Plan a maintenance window.

---

### Phase 2 — `RemoteAdapter` and cross-node command routing

**Goal:** Allow any node to manage servers started by any other node.

1. Add `Node` table to the schema (see Section 3)
2. Implement node registration on startup: insert/upsert into `Node` table, start heartbeat interval
3. Implement stale-node detection: `isAlive(node) = node.lastHeartbeat > now - 90s`
4. Implement `RemoteAdapter` class
5. Update `getAdapter()` to instantiate `RemoteAdapter` when `server.nodeId !== this.nodeId` and the owning node is alive
6. Add internal HTTP route group (`/internal/servers/:id/start|stop|command`) — these routes must be firewalled from external access, only reachable node-to-node
7. `startServer()` must flush `Server.metricsJson` and `Server.playersOnline` on the 2-second metrics loop so `RemoteAdapter.getMetrics()` has fresh data to return

---

### Phase 3 — Redis pub/sub for WebSocket broadcasting

**Goal:** Clients on any node see real-time updates for all servers.

1. Add Redis to the infrastructure
2. Install `@socket.io/redis-adapter` and `ioredis`
3. In `app.ts`, configure the Socket.IO Redis adapter:

   ```ts
   import { createAdapter } from '@socket.io/redis-adapter';
   import { createClient } from 'ioredis';
   const pubClient = createClient({ url: process.env.REDIS_URL });
   const subClient = pubClient.duplicate();
   io.adapter(createAdapter(pubClient, subClient));
   ```

4. No changes needed to `ServerEvents` — Socket.IO transparently replicates room membership and `emit` calls across all nodes via the adapter

---

### Phase 4 — Distributed scheduler (leader election)

**Goal:** Scheduled tasks (backups, restarts, cron commands) run exactly once across all nodes.

1. Add `LeaderElection` table (see Section 3)
2. Refactor `SchedulerService` to check/acquire leadership before executing any task
3. Leadership lease: 60-second TTL, renewed every 30 seconds by the current leader
4. On node shutdown, explicitly release leadership (delete or expire the row)

---

### Phase 5 — Time-series data offload (optional, high scale only)

**Goal:** Avoid PostgreSQL write saturation from metric inserts.

1. Evaluate write volume: at 2-second intervals with N servers, inserts/sec = `N / 2` for `ServerMetric` + 1 for `HostMetric`
2. At >50 concurrent servers, consider TimescaleDB extension on the existing PostgreSQL instance (minimal migration, same Prisma schema)
3. At >500 servers, consider a dedicated TSDB (Victoria Metrics, InfluxDB) and remove `ServerMetric`/`HostMetric` from the Prisma schema entirely; query them through a separate metrics API

---

## 5. Related Topics

### Containerization and volume isolation

The pnpm content-addressable store is configured at `/app/.pnpm-store` (inside the project root, mounted at `/app`). This means the store is **shared between the host filesystem and all containers** via the `.:/app` volume mount. This caused native module binary corruption: Alpine-based containers (musl libc) compiled `better-sqlite3` and cached it in `/app/.pnpm-store`; subsequent Debian-based containers (glibc) reused the musl binary, causing `ENOENT: libc.musl-x86_64.so.1` at runtime.

**Fix applied:** Named Docker volumes shadow `/app/.pnpm-store`, `/app/node_modules`, and `/app/packages/*/node_modules` per service. Each container gets an isolated, glibc-compiled dependency tree. Build tools (`python3`, `make`, `g++`) are included in `Dockerfile.dev` so `better-sqlite3` compiles from source against glibc.

**For production at scale:** Use a pre-built Docker image with all dependencies baked in (no `pnpm install` at container startup). The production `Dockerfile` already does this correctly.

### PID namespace and process visibility

`docker-compose.dev.yml` sets `pid: host` on the server container. This shares the host's PID namespace with the container, allowing `process.kill(pid, 0)` (the existence check in `JavaServerAdapter.reconnect()`) to correctly find game server processes that were spawned before the container started.

**For multi-node production:** Each node runs on a host that spawns its own game server processes. The `pid: host` concern only applies to dev where game servers run on the host OS while the manager runs in Docker. In production, the game servers are spawned as child processes of the manager container — they share the same PID namespace automatically.

### Secrets management

Currently `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `SETTINGS_ENCRYPTION_KEY` are hardcoded placeholders in `docker-compose.dev.yml`. For multi-node production:

- All nodes must share identical values for these three secrets
- Use Docker Swarm secrets, Kubernetes secrets, HashiCorp Vault, or AWS Secrets Manager
- Never store these in version control; the `docker-compose.dev.yml` values are intentionally weak and labeled as dev-only

### nginx configuration

Two nginx site configs exist on the host:

- `/etc/nginx/sites-available/hypanel.keanuhie.com` — production: all traffic → `:3001`
- `/etc/nginx/sites-available/hypanel.keanuhie.com.dev` — dev: `/api` + `/socket.io` → `:8080`, `/*` → `:3030` (Vite HMR)

Active config is controlled by the symlink in `sites-enabled/`. Switching requires a symlink swap + `systemctl reload nginx`.

**For horizontal scaling:** Replace nginx static upstream config with an upstream block pointing to multiple backend nodes. Example:

```nginx
upstream hsm_backends {
  least_conn;
  server 127.0.0.1:8080;
  server 127.0.0.1:8081;
}
```

Socket.IO requires sticky sessions (same client must always hit the same node) **unless** the Redis Socket.IO adapter is in place (Phase 3). With the Redis adapter, any node can serve any client and sticky sessions are not required.

### Monitoring and observability

No monitoring infrastructure currently exists beyond Winston file logging and the in-app `ServerMetric`/`HostMetric` tables. For a scaled deployment, add:

- **Structured JSON logging** from Winston (already supported, set `LOG_LEVEL=info` and add a JSON transport)
- **Log aggregation:** ship Winston logs to Loki or ELK
- **Metrics scraping:** expose a `/metrics` endpoint in Prometheus format (process metrics + per-server status)
- **Alerting:** the in-app `AlertsService` is per-node; at scale, route alerts through PagerDuty or similar via the existing Discord webhook infrastructure as a stopgap

### CI/CD considerations

The project has no CI/CD pipeline in the repository as of this handoff. When adding one:

- The `Dockerfile` multi-stage build is production-ready and can be used directly in CI
- The dev image (`Dockerfile.dev`) is not suitable for CI — use the production `Dockerfile` for test runs
- Run `pnpm test` (Jest for backend, Vitest for frontend) before building the production image
- The `turbo.json` task graph ensures correct build ordering across packages
