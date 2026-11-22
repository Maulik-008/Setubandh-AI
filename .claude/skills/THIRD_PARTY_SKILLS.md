# Third-party skills

Copied (not linked) so they are versioned with the repo. Update by re-copying from the source. Local edits are limited to a short "Setubandh AI overrides" note at the top of a skill.

| Skill folder | Source | Commit (date) | Licence |
|---|---|---|---|
| `ask-matt`, `codebase-design`, `code-review`, `diagnosing-bugs`, `domain-modeling`, `grill-me`, `grill-with-docs`, `grilling`, `handoff`, `implement`, `implement-spec`, `improve-codebase-architecture`, `pr`, `prototype`, `research`, `retro`, `setup-matt-pocock-skills`, `tdd`, `teach`, `to-questionnaire`, `to-spec`, `to-tickets`, `triage`, `wait-what`, `wayfinder`, `wizard`, `writing-for-agents`, `git-guardrails-claude-code`, `migrate-to-shoehorn`, `scaffold-exercises`, `setup-pre-commit` | [mattpocock/skills](https://github.com/mattpocock/skills) | 2026-11 | MIT |
| `postgres-best-practices` | [supabase/agent-skills](https://github.com/supabase/agent-skills) `skills/supabase-postgres-best-practices` | c9be0e9 (2026-10-02) | MIT (`LICENSE` in folder) |
| `playwright-cli` | [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) `skills/playwright-cli` | c872a33 (2026-11-18) | Apache-2.0 (`LICENSE` in folder) |
| `nestjs-best-practices` | [kadajett/agent-nestjs-skills](https://github.com/kadajett/agent-nestjs-skills) | 3986e0c (2026-07-22) | MIT (per SKILL.md) |
| `react-composition-patterns` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) `skills/composition-patterns` | 5a37a63 (2026-11-20) | MIT (per SKILL.md) |
| `differential-review`, `supply-chain-risk-auditor`, `property-based-testing` | [trailofbits/skills](https://github.com/trailofbits/skills) © Trail of Bits | 149d7b2 (2026-11-12) | CC BY-SA 4.0 (`LICENSE` in each folder). Copies and changes must keep this licence and attribution. |

Not installed, and why: Vercel `react-best-practices` (Next.js / server-component focused), Anthropic `webapp-testing` (Python), community WhatsApp skills (outdated Graph API, no signature verification). We will write our own skills for Meta webhooks, BullMQ worker idempotency and `withTenant` + isolation tests when those tickets start.
