---
description: Load a ticket (e.g. M1-09) with its referenced sections and propose a plan. No code yet.
argument-hint: <ticket-id, e.g. M1-09>
---

We are working on ticket **$ARGUMENTS**.

1. Find the ticket in `docs/plan/` (`M1-*` in `01-mvp-1-unified-inbox.md`, `M2-*` in `02-mvp-2-ai-answers.md`, `M3`–`M6` in `03-later-milestones-m3-m6.md`). If it is not found, say so and stop.
2. Read the ticket and **only** the sections of `docs/requirements.md` it references (FR-/P-ticket IDs and § numbers), plus `CLAUDE.md`.
3. Confirm the ticket's scope. List anything in the ticket that conflicts with, or is missing from, the requirements; do not resolve it silently.
4. Propose a plan: files to touch, migrations, API changes, UI components, and one test per acceptance criterion. Note anything out of scope.
5. **Stop and wait for my approval before writing any code.**
