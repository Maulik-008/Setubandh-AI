# Issue tracker: local Markdown (`docs/specs/`)

Specs and implementation issues live as Markdown in `docs/specs/`, versioned with the code. The milestone plans in `docs/plan/` stay the source of truth for ticket scope; a spec expands one ticket (or a pair of tightly linked tickets).

## Conventions

- One directory per ticket: `docs/specs/<ticket-id>-<slug>/` (for example `docs/specs/m1-01-monorepo-and-tooling/`).
- The spec is `spec.md` in that directory. Its top lines carry `Ticket:`, `Status:` (a triage label from `triage-labels.md`) and `Plan:` (link to the plan ticket).
- Implementation issues, when a spec is split, are one file each at `issues/<NN>-<slug>.md`, numbered from `01`.
- Discussion appends to the bottom of the file under `## Comments`.
- Link each spec from its ticket in `docs/plan/` with a `**Spec:**` line.

## When a skill says "publish to the issue tracker"

Create the directory and file above. Do not create GitHub issues.

## When a skill says "fetch the relevant ticket"

Read `docs/specs/<ticket-id>-*/spec.md`, then the ticket in `docs/plan/`.
