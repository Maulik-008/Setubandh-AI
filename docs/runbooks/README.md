# Runbooks

Operational procedures. These are placeholders; each is written in the ticket that introduces the thing it covers.

| Runbook | Purpose | Written in |
|---|---|---|
| `restore.md` | Restore Postgres and MinIO from backup into staging; verification script | M1-34 (requirements §15.5) |
| `meta-token-expiry.md` | A channel token expired or was revoked; how to reconnect and what tenants see | M1-26 |
| `webhook-replay.md` | Replay stored Meta webhook events after an outage | M1-15 / M1-30 |
| `incident-response.md` | Severity levels, who to notify, status page updates | M1-34 |
| `deploy-and-rollback.md` | Production deploy with migrations (expand/contract) and rollback | M1-06 |
