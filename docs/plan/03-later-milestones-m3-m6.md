# Later milestones: M3 to M6

> **Product:** Orbit (working name)
> **Covers:** everything after MVP 1 and MVP 2
> **Status:** Planned. Expand each milestone into its own ticket-level file (like `01-…` and `02-…`) in the week before it starts.
> **Indicative dates:** M3 22 Feb to 14 Mar 2027 · M4 15 Mar to 4 Apr 2027 · M5 5 Apr to 25 Apr 2027 · M6 from 26 Apr 2027 (ongoing)
> **Source of truth for details:** `docs/requirements.md` (ticket and requirement ids referenced below)
> **Previous files:** `01-mvp-1-unified-inbox.md`, `02-mvp-2-ai-answers.md`

---

## Roadmap at a glance

| Milestone | What a business gets | Build | Business outcome |
|---|---|---|---|
| MVP 1: Unified inbox | Shared inbox for WhatsApp, Instagram, Messenger | 8 weeks + Meta approval | Free beta, real usage |
| MVP 2: AI answers | AI replies from the business’s own data | 5 weeks | Free beta with AI allowance |
| **M3: Get paid** | Plans, trial, billing, limits; full Super Admin | 3 weeks | **Paid launch**, revenue starts |
| **M4: Sell in chat** | Pipeline, AI order taking, bookings, payment links | 3 weeks | Higher value per workspace, upsell to Growth |
| **M5: Automate** | Follow-ups, comment-to-DM, broadcasts, hours | 3 weeks + Meta review round 2 | More conversions per lead; strong marketing hook |
| **M6: Insights and scale** | Reports, team power tools, integrations, API, web chat, mobile | Ongoing | Retention, larger customers, partners |

### Why this order

1. **M3 before new features:** MVP 2 gives away AI replies; billing must exist before usage grows, and beta users need a clear paid path while they are engaged.
2. **M4 next:** turning chats into orders and revenue is what businesses pay more for, and the AI tools for orders reuse MVP 2’s runtime.
3. **M5 after M4:** follow-ups and comment-to-DM need leads and stages (M4) to be useful, and they need a second Meta App Review for comment permissions.
4. **M6 by demand:** order its groups by what paying customers ask for most.

### Recurring work in every milestone

- Quarterly review of the pinned Meta Graph API version and changelog.
- Astryx upgrades in a dedicated ticket (pin all `@astryxdesign/*` to the same release).
- New Claude model releases: run evals, update model ids and prices in system settings.
- Monthly restore drill and margin review (AI cost vs. revenue per plan).

---

## M3: Get paid

**Dates:** 22 Feb to 14 Mar 2027 (3 weeks) · **Paid launch:** 15 Mar 2027

**Goal:** every workspace is on a plan with clear limits, pays automatically, and you can run the business from a full Super Admin panel.

### Before you start

| Prerequisite | Owner | Requirements ref |
|---|---|---|
| Razorpay account with KYC done and **Subscriptions** enabled | You | §4.3 |
| GST registration, invoice entity, SAC code and place-of-supply rules confirmed | Accountant | Q-07 |
| Decide India-only or international at launch (Stripe now or later) | You | Q-02 |
| Pricing validated with 5 to 10 beta workspaces | You | Q-09, §8 |
| Updated Terms with billing, renewal and refund policy | Legal | §14.4 |
| Beta-user offer decided (for example 50% off for 3 months) | You | |

### Scope

| In M3 | Later |
|---|---|
| Plans Starter / Growth / Pro with limits and features (requirements §8.2), Enterprise as “Contact us” | Per-seat pricing experiments |
| 14-day trial for new signups (Growth features, capped) | |
| Beta migration: every beta workspace picks a plan by a date, with a coupon | |
| Razorpay Subscriptions: checkout, UPI Autopay and cards, webhooks, GST invoices | Stripe Billing for international (M3b if Q-02 says yes) |
| Add-ons: +5,000 AI replies, extra seat, extra WhatsApp number | |
| Billing page: usage meters, plan cards, add-ons, invoices, billing details (GSTIN) | |
| Lifecycle: trialing → active → past_due → suspended → cancelled → pending_deletion → deleted, with dunning emails | |
| Limit enforcement as requirements §8.4 (never drop an inbound message) | |
| Manager and Viewer roles; workspace-wide two-step sign-in requirement | Custom roles (M6) |
| Self-serve data export and workspace deletion (30-day grace) | |
| Sonnet escalation turned on for Growth and Pro with the escalation ratio cap | |
| **Full Super Admin**: overview (MRR, ARR, trials, churn, AI cost vs. revenue), tenant actions, impersonation (read / write, reason, 30 minutes, banner, dual audit), plans / prices / coupons editor with grandfathering, subscriptions, invoices, refunds, usage and cost dashboard, feature flags, announcements | Support inbox (M6) |

### Tickets

| ID | Ticket | Refs | Key acceptance criteria |
|---|---|---|---|
| M3-01 | Plans, prices, add-ons and entitlements | P8-01, §8 | Entitlement changes apply within 60 s; locked features show a plan badge and upgrade prompt |
| M3-02 | `BillingProvider` interface + Razorpay Subscriptions | P8-02 | Test-mode checkout activates the workspace; failed renewal sets `past_due`; webhooks verified and idempotent |
| M3-03 | GST invoices and billing details | P8-02, FR-SET-05 | Invoice shows GSTIN, SAC, correct CGST / SGST or IGST split |
| M3-04 | Billing page and add-ons | P8-04, FR-SET-05, 06 | Upgrade prorates; downgrade blocked with a list when over limits; add-on raises limits at once |
| M3-05 | Trial and lifecycle state machine with dunning | P8-05, P8-06, §5.3 | Suspended: AI and sending paused, inbound stored; emails on day 1, 3, 5 |
| M3-06 | Beta migration and coupons | new | Every beta workspace lands on a plan or `expired` by the deadline; coupon applied automatically |
| M3-07 | Limit enforcement everywhere | §8.4 | Each limit in §8.4 behaves as specified; isolation and limits tests green |
| M3-08 | Manager and Viewer roles, workspace 2FA requirement | §6.1, FR-AUTH-05 | Role matrix test from §6.2 passes |
| M3-09 | Self-serve export and deletion | P10-01, FR-SET-07 | Export ZIP of one workspace only; deletion leaves only billing records after 30 days |
| M3-10 | Sonnet escalation with ratio cap | §9.4 | Escalation never exceeds the plan’s ratio in a billing period |
| M3-11 | Super Admin: overview and tenants | P9-02, P9-03 | MRR equals the sum of active subscriptions in tests; every action audited with reason |
| M3-12 | Super Admin: impersonation | P9-04 | Write mode expires at 30 minutes; owner sees the session in their audit log |
| M3-13 | Super Admin: plans, coupons, subscriptions, refunds | P9-05 | Plan edit offers “new subscribers only”; refund goes through Razorpay |
| M3-14 | Super Admin: usage, cost, flags, announcements | P9-06, FR-ADM-08, 12, 13 | AI cost per workspace matches `ai_runs`; flag rollout by percentage works |
| M3-15 (optional) | Stripe Billing for international | P8-03 | Same tests as M3-02 against Stripe test mode |

### Exit criteria

- [ ] A new signup can start a trial, pay by UPI Autopay, and receive a GST invoice.
- [ ] All beta workspaces migrated; no surprise lockouts.
- [ ] Super Admin shows correct MRR and AI margin per plan.
- [ ] Razorpay live mode tested with a real purchase and refund.

---

## M4: Sell in chat

**Dates:** 15 Mar to 4 Apr 2027 (3 weeks)

**Goal:** every conversation becomes a lead in a pipeline, and the AI can take an order or book a call end to end, with an optional payment link.

### Before you start

| Prerequisite | Owner | Requirements ref |
|---|---|---|
| Decide booking integrations: Cal.com, Calendly or both | You | Q-04 |
| Check how tenants connect their own Razorpay / Stripe account for payment links (API keys vs. partner OAuth) | Engineering | Q-05, FR-COM-04 |

### Scope

| In M4 | Later |
|---|---|
| Pipelines and stages (New → Contacted → Qualified → Won / Lost), editable; up to the plan’s pipeline count | Pipeline automations beyond AI moves (M6) |
| Automatic lead per contact (one open lead per pipeline), activity log | |
| Kanban board, list view, lead drawer, keyboard move | Tasks and reminders (M6) |
| AI lead tools: `update_lead`, `set_lead_stage`, qualification scoring | |
| Orders: model, AI tools `create_order_draft` and `confirm_order` (prices computed server-side), order page, statuses, notifications | Inventory sync back to stores (M6) |
| Large-order handoff rule (above a set value) | |
| Bookings: link mode plus Cal.com / Calendly webhooks; AI booking tools (slots and create) | Booking reminders by template (M5) |
| Payment links on the tenant’s own Razorpay or Stripe account; payment webhook marks the order Paid and the lead Won | |
| Contacts page: list, filters, tags, CSV import and export | Contact merge suggestions (M6) |
| Home: pipeline tiles and “orders from chat” | Full pipeline report (M6) |

### Tickets

| ID | Ticket | Refs | Key acceptance criteria |
|---|---|---|---|
| M4-01 | Pipelines and stages | P4-01, FR-CRM-01, 02 | Won / Lost cannot be deleted; reorder persists |
| M4-02 | Leads, auto-creation, activity log | P4-02, FR-CRM-03, 07, 10 | One open lead per contact per pipeline |
| M4-03 | Pipeline board, list and lead drawer | P4-03, FR-CRM-04..06 | Drag is optimistic with rollback; keyboard alternative works |
| M4-04 | AI lead tools and scoring | P4-04, FR-AI-03, 24, FR-CRM-08 | Qualified set only when the workspace rule is met; evals extended |
| M4-05 | Orders and AI order tools | P4-05, FR-COM-01..03, 05, FR-AI-22 | Totals always server-side; confirm requires explicit customer confirmation |
| M4-06 | Large-order handoff rule | FR-AI-05 | Orders above the threshold hand off with a summary |
| M4-07 | Bookings | P4-06, FR-COM-06, FR-AI-23 | Booking webhook links to the right lead; AI offers real slots |
| M4-08 | Payment links on the tenant’s account | FR-COM-04 | Paid webhook moves order to Paid and lead to Won within 10 s |
| M4-09 | Contacts page with CSV import / export | FR-CON-04..06 | 10,000-row import with row-level errors; export of one workspace only |
| M4-10 | Home and inbox updates for leads and orders | §7.12 | Lead card in the contact panel; Home tiles match raw counts |

### Exit criteria

- [ ] In a pilot workspace, the AI takes at least 20 orders end to end with no price or total errors.
- [ ] Payment links work on a real Razorpay account in live mode.
- [ ] Evals cover order and booking flows in all presets.

---

## M5: Automate

**Dates:** 5 Apr to 25 Apr 2027 (3 weeks) · **Meta App Review round 2** submitted at the start (or end of M4)

**Goal:** quiet leads get timely follow-ups, comments like “price?” turn into private DMs and leads, and businesses can send opt-in broadcasts safely.

### Before you start

| Prerequisite | Owner | Requirements ref |
|---|---|---|
| Submit comment permissions for App Review: `pages_read_engagement`, `pages_manage_engagement`, `instagram_manage_comments` (verify names) | You | §10.8 |
| Request the Human Agent feature for 7-day replies on Messenger / Instagram | You | FR-INBOX-15 |
| Subscribe webhooks: Page `feed`, Instagram `comments` and `mentions` | Engineering | §10.3 |
| Load Meta’s per-country template rates into the rate card | You | FR-ADM-16 |

### Scope

| In M5 | Later |
|---|---|
| Follow-up sequences: trigger on quiet leads in chosen stages, steps with delays, window-aware (free text inside 24 h, approved template outside), exit on reply / takeover / opt-out / stage change, final move to Lost | AI-written follow-up text (M6) |
| Template builder: create and submit WhatsApp templates in Orbit, status updates, starter library | |
| Business hours, holidays, away message, hours-aware handoff routing | |
| Comments: ingestion from Facebook posts and Instagram media, a Comments view in the inbox | |
| Comment-to-DM rules: keywords or AI intent, one private reply per comment (within Meta’s window), optional public reply variants, lead with source “Comment”, daily caps, circuit breaker on Meta spam errors | |
| Instagram story mention and story reply auto-response | |
| Broadcasts: segments (tags, stage, fields; opt-in only), template, schedule, throttling to the number’s tier, Meta cost estimate, results, replies into the inbox | A/B testing (M6) |
| Human Agent tag for 7-day replies on Messenger / Instagram | |
| Auto-resolve after X days without activity; automation run log | Visual workflow builder (M6) |

### Tickets

| ID | Ticket | Refs | Key acceptance criteria |
|---|---|---|---|
| M5-01 | Follow-up engine | P6-01, FR-AUTO-01, 02 | Requirements FR-AUTO-01 AC with a fake clock; never free text outside the window |
| M5-02 | Follow-up editor and run log | P6-02, FR-AUTO-11 | Editing a running sequence only affects future steps |
| M5-03 | Template builder and submission | FR-TPL-02, 03 | Submitted template status updates via webhook |
| M5-04 | Business hours, away message, hours-aware routing | P6-03, FR-AUTO-07, FR-AI-06 | Away message once per conversation per closed period |
| M5-05 | Comment ingestion and Comments view | P5-04 | New comment visible within 5 s |
| M5-06 | Comment-to-DM rules | P5-05, FR-AUTO-04, 05, §10.7 | “price?” on a selected post sends exactly one private reply and creates a lead |
| M5-07 | Story mention and reply auto-response | FR-AUTO-06 | Responds once per story per contact |
| M5-08 | Broadcasts | FR-TPL-05..07 | Opted-out contacts excluded; throttled to tier; cost estimate shown before sending |
| M5-09 | Human Agent tag | FR-INBOX-15 | Agents can reply up to 7 days on Messenger / Instagram; AI never uses the tag |
| M5-10 | Auto-resolve and auto-return rules | FR-AUTO-10, FR-INBOX-34 | Rules fire on schedule and are logged |

### Exit criteria

- [ ] Comment permissions approved; comment-to-DM live for pilot workspaces.
- [ ] Follow-ups raise the reply rate of quiet leads in pilots (target: 20% of followed-up leads reply).
- [ ] No WhatsApp number drops to red quality because of Orbit automations during the first month.

---

## M6: Insights and scale (ongoing, from 26 Apr 2027)

Work in groups, ordered by what paying customers request. Re-rank at the end of each month. Expand the chosen group into its own plan file before starting.

| Group | Contents | Refs | Suggested order |
|---|---|---|---|
| **A. Reports** | Overview, conversations, response times, agents, AI (handoff reasons, unanswered questions clustered), pipeline funnel, automations; CSV export; weekly email to Owners | P7-01, P7-02, FR-AN-01..09, FR-AI-43 | 1 |
| **B. Team and inbox power** | Labels, priority, snooze, SLA timers, advanced auto-assignment, saved views, bulk actions, command palette, contact merge with suggestions, contact timeline, custom roles, sessions list | FR-INBOX-06, 07, 44..46, FR-CON-03, 09, FR-AUTH-08 | 2 |
| **C. Knowledge and AI** | Google Sheets product sync, website crawl, Shopify / WooCommerce / Meta catalog sync, voice-note transcription, per-channel AI overrides, AI translation in the composer, “teach from this answer”, AI-written follow-ups | FR-KB-03, 04, 07, FR-AI-09, 26, 41, FR-INBOX-20, FR-AUTO-03 | 3 |
| **D. Access and enterprise** | Google login, SAML / OIDC SSO, audit log viewer for tenants, data residency options, DPA self-serve | FR-AUTH-09, 10, FR-SET-09, Q-11 | By demand |
| **E. Platform and channels** | Public API with scoped keys, outbound webhooks, Zapier / Make / n8n app, website chat widget, PWA then native apps, white-label and custom domains, Hindi (and Gujarati) UI | FR-API-01..03, FR-CH-10, FR-NOT-05, §1.4 | By demand |
| **F. Scale and operations** | Dedicated database server and read replica, split webhook ingress into its own service (Go option, ADR-01), Redis on its own node, off-site multi-region backups, external penetration test, security policies for larger customers | §14, §15, ADR-01 | When load or customers require |

### Signals that should move a group up

| Signal | Move up |
|---|---|
| Owners ask “how is my team doing?” | A. Reports |
| More than 5 agents per workspace on average | B. Team and inbox power |
| Many review-queue items are “not in knowledge” | C. Knowledge and AI |
| Deals blocked by security or login questions | D. Access and enterprise |
| Agencies or developers ask to integrate | E. Platform and channels |
| Queue age alerts, database CPU over 70% at peak, or over 100 active workspaces | F. Scale and operations |

---

## Pricing evolution across milestones

| Stage | Pricing |
|---|---|
| MVP 1 beta | Free |
| MVP 2 beta | Free with 1,000 AI replies per month |
| M3 paid launch | Starter ₹2,999 · Growth ₹7,999 · Pro ₹19,999 per month (requirements §8.2); beta coupon |
| After M4 | Review Growth vs. Pro split now that orders and payment links exist |
| After M5 | Consider broadcasts and comment-to-DM as Growth-only features if not already |

## Meta App Review rounds

| Round | When | Permissions |
|---|---|---|
| 1 | MVP 1 weeks 5 and 7 | WhatsApp management and messaging, Pages list / metadata / messaging, Instagram basic and messages, business management |
| 2 | Start of M5 | Pages engagement (read and manage), Instagram comments, Human Agent feature |
| 3 (if needed) | M6 | Anything for catalog sync or new channels |
