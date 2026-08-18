# Infrastructure — current state and decisions

Pre-populated 2026-08-18 to answer SYSTEM 05 TASK 5.1's "confirm and document the deployment
target" investigation, ahead of that system's own execution session — decisions below came
directly from the user, not from re-deriving them via a fresh SYSTEM 05 investigation.

## What exists in the repo today

- `docker-compose.yml`, `server/Dockerfile`, `web/Dockerfile` at the repo root — a Docker-Compose
  based deployment, not Kubernetes/ECS/etc.
- No Terraform/IaC (`*.tf`) found.
- No `.github/workflows` confirmed yet as part of this pass — SYSTEM 06 (CI/CD) owns that check.
- `Caddyfile` (reverse proxy / TLS termination via Caddy, per
  `docs/superpowers/plans/2026-08-10-lucien-ambient-voice.md`).

## Decisions (user-confirmed)

**Deployment target: OCI (Oracle Cloud Infrastructure).**
Backend, frontend, Postgres, and Redis run on an OCI Ampere A1 instance (2 OCPU / 12GB — the
free-tier shape as of the June 2026 cut; do not provision the older 4 OCPU/24GB shape). DNS via
Cloudflare, SSL/TLS mode must be **Full (strict)** — Flexible causes a redirect loop with Caddy.
Step-by-step provisioning (instance creation, static IP, security list, Docker install, deploy) is
already written out in `docs/superpowers/plans/2026-08-10-lucien-ambient-voice.md`, Task 3 — that
task is deployment-target-generic despite living in a Lucien-specific plan file and should be the
reference for SYSTEM 05 TASK 5.1/5.2's actual provisioning work, not re-derived from scratch.

**AI backend: Sarvam AI, via hosted API — not self-deployed.**
Supersedes an earlier plan (see the amendment at the top of
`docs/superpowers/plans/2026-08-10-lucien-ambient-voice.md`) that would have moved Lucien's LLM
from local CPU Ollama to a self-hosted RunPod GPU Serverless endpoint. That RunPod work is now
unnecessary — Lucien's `ModelClientPort` interface
(`server/src/main/java/com/recoverpro/server/port/ModelClientPort.java`) already exists as the
swap point (currently only implemented by `LlamaClientAdapter`, which its own javadoc already
flags as swappable); a new adapter calling Sarvam AI's API replaces it. **Not yet designed**: the
actual request/response mapping (needs Sarvam AI's API docs), which Sarvam AI product(s) are in
scope (chat/LLM only, or also the STT/TTS the same plan's "Existing voice POC" section describes
as `tts-service/`'s IndicF5 + faster-whisper, currently CPU-only and "not viable for real usage"),
and credential storage (fits SYSTEM 04's `docs/RUNBOOK-SECRETS.md` pattern once that exists).

## Open questions for a future SYSTEM 05 (or Lucien-provider-migration) session

- Exact Sarvam AI product scope (chat / STT / TTS / all three).
- Sarvam AI credential provisioning and rotation procedure.
- Whether OCI Ampere A1 free tier (2 OCPU/12GB) is sufficient once Lucien's inference calls are
  network round-trips to Sarvam AI rather than local Ollama — likely yes (removes local LLM CPU
  load entirely), but not load-tested.
- CI/CD pipeline existence (SYSTEM 06's own job, not re-verified here).
