## Ticket

<!-- e.g. M1-09 Auth core. Link: docs/plan/01-mvp-1-unified-inbox.md -->

## What changed

## How each acceptance criterion is tested

<!-- One line per criterion: test file / name -->

## Definition of Done

- [ ] All acceptance criteria implemented and covered by tests
- [ ] Lint, typecheck, unit, integration and tenant-isolation suites pass
- [ ] New tenant tables have `tenant_id`, RLS (USING + WITH CHECK), FORCE RLS and isolation tests
- [ ] UI: light and dark checked; `ui:audit` 0 errors; empty / loading / error states; keyboard path works
- [ ] API: Zod schemas, `@RequirePermission`, error codes, OpenAPI updated
- [ ] Audit log entries for sensitive actions
- [ ] No secrets, tokens, message bodies or PII in logs
- [ ] Docs / ADR updated if behaviour or a decision changed
- [ ] Diff is small (about 600 changed lines or fewer) or split

## Not verified / open questions
