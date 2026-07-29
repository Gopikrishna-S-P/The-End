# RecoverPro — Deployment Runbook

Operational notes for standing up a production environment. Pairs with
`PRODUCTION_READINESS.md` (the audit + task list this was written alongside).

## Required environment variables (server)

Everything below is read from `server/src/main/resources/application.properties`
(and `application-prod.properties` for the prod-only overrides). Defaults shown
are dev-safe fallbacks — production must set every one of these explicitly.

| Variable | Purpose | Dev default |
|---|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Postgres connection | `jdbc:postgresql://localhost:5432/opstool`, `opstool`, *(blank)* |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Redis (pub/sub fan-out for live-track/SOS-audio/notifications — see below) | `localhost`, `6379`, *(blank)* |
| `JWT_SECRET` | Signs auth tokens. **Must** be ≥256 bits and not the well-known placeholder — the app refuses to start otherwise (`JwtTokenProvider`). | *(unset — app won't start)* |
| `AWS_S3_ENABLED`, `AWS_REGION`, `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Document/photo/audio storage. `AWS_S3_ENABLED=false` (the default) means everything is written to **local disk**, which does not survive a container restart or scale past one instance — must be `true` with real credentials for any real deployment. | `false` |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`/`_GROWTH`/`_ENTERPRISE` | Billing | *(blank)* |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `CONTACT_EMAIL_RECIPIENT` | Transactional email + public contact form | `smtp.gmail.com:587`, blank |
| `PII_ENCRYPTION_KEY_BASE64` (+ `PII_ENCRYPTION_PROVIDER`/`PII_ENCRYPTION_KMS_*` if using KMS) | Field-level PII encryption | local provider, generated key |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173,http://localhost:3000` — **must** be the real production web origin(s) |
| `TRUSTED_PROXY_CIDR` | CIDR of your load balancer/ingress. Empty by default (nothing trusted). Behind a real LB, this **must** be set or `X-Forwarded-For` is ignored and every request looks like it came from the LB's own IP — breaking IP-based rate limiting and audit-log accuracy. | *(blank)* |
| `LLAMA_BASE_URL`, `LLAMA_MODEL` | Lucien AI backend (Ollama-compatible). See "Lucien AI" below. | `http://localhost:11434`, `llama3` |
| `CLAMAV_ENABLED`, `CLAMAV_HOST`, `CLAMAV_PORT` | Virus-scan uploads. See "ClamAV" below. | `false` |

Activate the prod profile with `SPRING_PROFILES_ACTIVE=prod` (disables the
public Swagger UI/API docs — see `application-prod.properties`).

## Manual one-time step: `ops_platform` database role

`V040__rls_failclosed_and_extend.sql` creates a `BYPASSRLS` role
(`ops_platform`) for platform-level cross-tenant access, intended per
`DATABASE_DESIGN.md §3` to be used only by platform-level operations, never
the regular tenant connection. **This requires `CREATEROLE` privilege** — if
the Flyway migration user doesn't have it (typical for a locked-down prod DB
user), the migration's `DO $$ ... $$` block for this specific role creation
will fail. Run it manually as a Postgres superuser before/alongside the first
deploy:

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ops_platform') THEN
        CREATE ROLE ops_platform NOLOGIN BYPASSRLS;
    END IF;
END
$$;
```

**Note found while writing this runbook:** no code path in `server/src/main/java`
currently grants `ops_platform` to a connecting user or does `SET ROLE
ops_platform` anywhere (grepped the whole codebase) — the role gets created by
the migration but nothing visibly assumes it yet. Confirm with whoever wrote
`DATABASE_DESIGN.md §3` what the intended grant/assumption mechanism is (a
separate platform-only datasource? a manual `GRANT ops_platform TO <user>`?)
before depending on this for a real platform-admin cross-tenant workflow —
right now it looks like dormant/unfinished infrastructure rather than
something actively wired in.

## Redis is required for full functionality, not for boot

As of this pass, the server starts and serves ordinary traffic even if Redis
is completely unreachable (`LiveTrackRedisConfig` catches the startup failure
and retries in the background every 10s — see `PRODUCTION_READINESS.md`).
But three features are genuinely non-functional without Redis:
- Live-track cross-pod fan-out (single-pod deployments are unaffected — local
  delivery on the handling pod still works).
- SOS-audio cross-pod fan-out (same caveat).
- **Notification push (SSE)** — unlike the two above, this one has no
  local-only fast path; `NotificationSseService.publish()` always round-trips
  through Redis, even for same-pod delivery. If Redis is down, no user
  receives any push notification at all (they still see them on next login
  page-load poll, they just don't arrive in real time).

Monitor for the `Redis pub/sub listener container failed to start` warning
log line — its presence means the app is up but degraded.

## ClamAV — decision needed before launch

File uploads (visit photos, collection receipts, SOS audio, platform RAG
documents) are **not virus-scanned by default** (`CLAMAV_ENABLED=false`). If
enabled, an unreachable ClamAV daemon fails closed (uploads rejected) rather
than silently skipping the scan — but no ClamAV daemon is provisioned
anywhere in this repo's infra. Decide one of:
- **Ship without it for launch** (accept the risk short-term, revisit after)
- **Stand up a ClamAV daemon** (e.g. a sidecar container) and set
  `CLAMAV_ENABLED=true` + `CLAMAV_HOST`/`CLAMAV_PORT` before launch

## Lucien AI requires an Ollama-compatible endpoint

`LLAMA_BASE_URL` (default `http://localhost:11434`, i.e. nothing in a
container/prod environment) must point at a real Ollama-compatible server
with the configured model (`LLAMA_MODEL`, default `llama3`) and embedding
model (`LLAMA_EMBEDDING_MODEL`) pulled, or every Lucien chat/RAG request
fails. Either provision this before launch or gate the `LUCIEN_AI` feature
flag off for all orgs until it's ready.

## Building and running

- `server/Dockerfile` — multi-stage Maven build → JRE-21 runtime, non-root
  user, `/actuator/health`-based `HEALTHCHECK`. Reads all config from the env
  vars above (nothing is baked into the image).
- `web/Dockerfile` — existing multi-stage Node build → Nginx serve (see
  `web/nginx.conf` for the reverse-proxy config to the server container).
- CI: `.github/workflows/{server,web,mobile}-ci.yml` — path-filtered so each
  only runs when its own subtree changes. `server-ci.yml` spins up real
  Postgres + Redis service containers and runs the full `mvn test` suite; a
  first run may surface pre-existing test failures unrelated to any specific
  change — check before assuming a red build means your PR broke something.
- Mobile has no equivalent container story (it's a native app) — see
  `mobile/eas.json` and `PRODUCTION_READINESS.md`'s mobile section for the
  EAS Build path instead.
