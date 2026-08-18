# Config reference (partial)

**This file is incomplete.** SYSTEM 04 TASK 4.1 owns the full version — every `${...}`
placeholder in `application*.properties`, tabulated with purpose/required-in-prod/default/
consequence-if-missing. That system hasn't run yet. This entry exists because SYSTEM 08
TASK 8.1.d explicitly requires it before that fix counts as real, not decorative.

| Variable | Purpose | Required in production | Default | Consequence if missing |
|---|---|---|---|---|
| `TRUSTED_PROXY_CIDR` | `server.tomcat.remoteip.internal-proxies` — the CIDR(s) Tomcat's `RemoteIpValve` trusts to supply `X-Forwarded-For`. Everything downstream (`request.getRemoteAddr()`, and every caller of `ClientIpResolver.resolve()` — `AuthServiceImpl` login rate-limiting/audit, `RefreshTokenRotationServiceImpl` session IP/theft-detection, `ContactController` rate-limiting) depends on this being correct. | **Yes**, once deployed behind any reverse proxy/load balancer (OCI + Caddy, per `docs/INFRA-CURRENT.md`) | empty string (`${TRUSTED_PROXY_CIDR:}`) | Empty means `internal-proxies` falls back to Tomcat's built-in private-range regex. If the real proxy's address falls outside that default range, `X-Forwarded-For` is never trusted and `getRemoteAddr()` returns the *proxy's* IP for every request — every login rate-limit bucket, audit-log IP, and refresh-token session IP collapses onto one shared value, and lockout/rate-limiting stops discriminating between real clients (a different failure mode than the original spoofing bug, but still broken). Not yet measured against a live OCI+Caddy deployment — SYSTEM 05's provisioning work must record the actual proxy IP/CIDR here once it exists. |

## Open

- Actual `TRUSTED_PROXY_CIDR` value for the OCI+Caddy deployment — not set yet, no instance
  provisioned (see `docs/INFRA-CURRENT.md`). Whoever runs SYSTEM 05's provisioning task must come
  back and fill this in, then re-verify `ClientIpResolver.resolve()` actually returns real client
  IPs (not Caddy's) against the live deployment.
- The rest of SYSTEM 04 TASK 4.1's variable inventory.
