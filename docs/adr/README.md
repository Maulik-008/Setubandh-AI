# Architecture Decision Records

One file per new decision, named `NNNN-short-title.md` (next number: `0011`). Each record states context, decision, alternatives considered, and consequences. Update the docs first when a decision changes, then the code.

## Settled decisions (ADR-01 to ADR-10)

These are recorded in [requirements §4.4](../requirements.md) and must not be reopened inside a ticket.

| ID | Decision |
|---|---|
| ADR-01 | Node.js + NestJS for the backend, not Go |
| ADR-02 | Modular monolith + worker, not microservices |
| ADR-03 | Shared database and schema, `tenant_id` + PostgreSQL RLS |
| ADR-04 | Build our own inbox, not Chatwoot |
| ADR-05 | No n8n in the core product |
| ADR-06 | One platform Meta app as Tech Provider; tenants connect via Embedded Signup |
| ADR-07 | AI cost included in plans as an AI reply quota; no tenant API keys |
| ADR-08 | Astryx components themed with Paper & Pastel tokens |
| ADR-09 | Webhook ingress only verifies, stores and enqueues |
| ADR-10 | Prices, stock and totals always come from the database through tools |

## Template

```markdown
# NNNN. Title

- Status: proposed | accepted | superseded by NNNN
- Date: YYYY-MM-DD

## Context
## Decision
## Alternatives considered
## Consequences
```
