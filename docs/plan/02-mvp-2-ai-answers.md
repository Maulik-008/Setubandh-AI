# MVP 2: AI answers

> **Product:** Orbit (working name)
> **Milestone:** MVP 2 of 2, followed by growth milestones M3 to M6
> **Status:** Starts when MVP 1 build is complete (can overlap with the Meta review wait)
> **Indicative dates:** build 18 Jan to 21 Feb 2027 (5 weeks); release to beta users from 22 Feb 2027
> **Source of truth for details:** `docs/requirements.md` (Sections 7.6, 7.7, 9 and Phase 3 tickets)
> **Previous / next files:** `01-mvp-1-unified-inbox.md`, `03-later-milestones-m3-m6.md`

---

## Roadmap at a glance

| Milestone | What a business gets | Build | Price | File |
|---|---|---|---|---|
| MVP 1: Unified inbox | One shared inbox for WhatsApp, Instagram and Messenger | 8 weeks + Meta approval | Free beta | `01-mvp-1-unified-inbox.md` |
| **MVP 2: AI answers** | The AI replies from the business’s products, FAQs and documents | 5 weeks | Free beta with AI allowance | **this file** |
| M3: Get paid | Plans, billing, limits, full Super Admin | 3 weeks | Paid launch | `03-later-milestones-m3-m6.md` |
| M4 to M6 | Sell in chat, automate, insights and scale | | | `03-…` |

---

## How to work from this file with Claude Code

Same rules as MVP 1: tickets in Section 9 in order, one ticket per branch and session, every acceptance criterion becomes a test, Definition of Done from `01-mvp-1-unified-inbox.md` Section 11 applies, plus: **every new AI behaviour needs an eval case** (Section 10).

Session prompt: *“We are working on ticket M2-xx in `docs/plan/02-mvp-2-ai-answers.md`. Read the ticket, the referenced sections of `docs/requirements.md` and `CLAUDE.md`. Propose a plan and wait for approval.”*

Update `CLAUDE.md` scope line to: *“Scope: MVP 1 + MVP 2 (see docs/plan/02-mvp-2-ai-answers.md).”*

---

## 1. Goal

A business feeds Orbit its products, FAQs and documents. The AI then answers customers on WhatsApp, Instagram and Messenger in the shared inbox, in the customer’s language, using only that data. It hands over to a person whenever it should, and the team can watch, take over or let the AI draft replies at any moment.

### Launch definition

MVP 2 is released to beta users when a workspace can, without help:

1. Import products from CSV and add FAQs (and optionally upload documents).
2. Set the assistant’s name, tone and languages, and test it in the sandbox.
3. Turn the AI on for a channel.
4. See the AI answer real customers with correct prices, hand off when asked for a person, and let an agent take over and hand back.

### Success measures (first 4 weeks after release)

| Measure | Target |
|---|---|
| Beta workspaces that turn the AI on for at least one channel | 50% or more |
| Conversations fully handled by the AI (no handoff, no agent message) | 50% or more in workspaces using AI |
| Price or stock answers that do not match the database | 0 (checked by the post-check and evals) |
| Agent thumbs-down rate on AI replies | Under 5% |
| AI reply time, last customer message to reply sent (p95) | Under 10 seconds |
| Median time from first CSV upload to AI live on a channel | Under 30 minutes |

---

## 2. Before you start

- MVP 1 build complete (all M1 tickets merged), even if Meta review is still pending.
- No new Meta permissions are needed for MVP 2: the AI sends messages through the same messaging permissions. **No second App Review.**
- Anthropic API account with billing set up; API key in staging and production secrets; spend alert configured in the Claude Console.
- Embeddings provider chosen in M2-04 (account and key ready).
- Meta’s WhatsApp Business policy for AI: the assistant must serve the business only, not act as a general-purpose chatbot. The guardrails in Section 4.6 enforce this.

---

## 3. Scope

| In MVP 2 | Not in MVP 2 (milestone) |
|---|---|
| **Products:** CRUD, variants (size / colour), stock, images, CSV import with mapping and preview, update by SKU | Google Sheets sync (M6), Shopify / WooCommerce sync (M6) |
| **FAQs:** CRUD, bulk paste (“Q: / A:”), CSV import | Website crawl (M6) |
| **Documents:** PDF, DOCX, TXT upload; text extraction, chunking, embeddings; indexing status | |
| **Search test** for knowledge | |
| **AI agent settings:** name, tone, reply length, languages, AI disclosure, custom instructions, business info (address, hours, delivery, payment, returns), versions with rollback | Per-channel overrides (M6) |
| **Modes per conversation:** AI, Assist, Human; take over; hand back with a note | |
| **AI switch per channel** + **pause AI everywhere** | |
| **Handoff rules:** asked for a person, complaint, discount request, AI not sure twice; summary; routing to online agents (round robin, capacity) | Large-order rule (M4), business-hours-aware routing (M5) |
| **Guardrails** enforced in code | |
| **Sandbox** chat with tools and facts shown | |
| **Thumbs-down** on AI replies + **review queue** + “add as FAQ” | Clustered unanswered questions (M6) |
| **Image understanding** (customer sends a photo) | Voice-note transcription (M6) |
| **AI reply allowance** per workspace (free beta) + usage counter + admin grant | Paid quotas and add-ons (M3) |
| **AI numbers** on Home (AI-handled %, handoffs) and AI labels in the inbox | Full AI report (M6) |
| **AI cost per workspace** in Admin lite | Full usage and margin dashboard (M3) |
| | Order taking, lead stages, booking tools (M4) |
| | AI follow-ups, AI comment replies (M5) |

---

## 4. Feature specifications

### 4.1 Knowledge (`FR-KB`)

New sidebar item **Knowledge** with tabs Products, FAQs, Documents, Search test (layout as in the prototype).

**Products**
- Fields: SKU (unique per workspace), name, description, category, price, sale price (optional), currency, variants (option name + value, own SKU, own price optional, stock), in-stock flag when stock is not tracked, up to 5 images, tags, product URL, active flag.
- Table with inline price and stock edit; product drawer for full edit.
- **CSV import wizard:** download template → upload → column mapping (auto-matched by header names) → preview first 20 rows with row-level errors → import. Existing SKU = update; new SKU = create. Import runs as a job with progress; a summary at the end (“812 updated, 41 created, 3 rows skipped: see errors”).
- Beta limit: 2,000 products.

**FAQs**
- Question, answer, category, active flag.
- Bulk paste in “Q: … / A: …” format; CSV import.
- Beta limit: 500 FAQs.

**Documents**
- Upload PDF, DOCX, TXT up to 20 MB; extracted, chunked (about 500 tokens with overlap), embedded.
- Status: queued → processing → ready, or failed with the reason (“Scanned PDF without text: upload a text PDF”).
- Delete removes chunks immediately.
- Beta limit: 50 documents.

**Search test**
- Type a customer question; see the top 5 FAQ / document / product matches with scores. Used to check why the AI answered something.

### 4.2 AI agent settings (`FR-AI-01..08`)

New sidebar item **AI agent** with tabs Setup, Handoff rules, Sandbox, Review queue.

| Setting | Detail |
|---|---|
| Assistant name | Default “Assistant”; shown in the first reply when disclosure is on |
| Tone | Friendly / Professional / Concise |
| Reply length | Short / Medium |
| Languages | Multi-select; the AI replies in the customer’s language if it is in the list, otherwise in the first language |
| Say it is an AI | Toggle, default on (“I am the store’s AI assistant”) |
| Business info | Short description, address, opening hours, delivery areas and times, payment methods, return policy (structured fields, used by `get_business_info`) |
| Custom instructions | Free text, max 2,000 characters |
| What the AI may do | Answer from Knowledge · Recommend products · Ask qualifying questions (saved to contact fields) · Share a booking link (if provided) |
| Handoff message | Text sent to the customer at handoff (default provided) |
| Fallback message | Text sent when the AI is unavailable (default provided) |

- Every save creates a new version; **Versions** list with one-click rollback; each AI reply records the version that produced it.
- Guardrails card (read-only, “Enforced by Orbit”).

### 4.3 Modes in the inbox (`FR-INBOX-30..37`)

- Thread header gets the **AI / Assist / Human** segmented control.
- **AI:** the AI replies on its own. Agents can still read and add notes.
- **Assist:** when a customer message arrives, the AI writes a draft into the composer area (“AI draft” card with Use draft, Shorter, Regenerate). Nothing is sent until the agent presses Send.
- **Human:** the AI is silent.
- **Take over:** switching to Human, or sending any manual message, sets Human, assigns to the sender if unassigned, cancels any pending AI reply, and writes a system event.
- **Hand back:** switching to AI opens a dialog with an optional note for the AI; the note is added to the AI context for that conversation.
- **Default mode for new conversations** per channel (Settings, Channels): AI, Assist or Human. Default Human until the business turns AI on.
- **Auto-return to AI** (workspace setting): Never (default) / When resolved.
- Messages from the AI show the “AI · {name}” label; the list shows the mode pill; new view **AI** and **Needs human** added to the inbox views.

### 4.4 Channel switch and pause

- Settings, Channels: per channel “AI replies” toggle + default mode.
- AI agent page and top bar: **Pause AI everywhere** (Owner / Admin). While paused, new customer messages in AI-mode conversations hand off with reason “AI paused”.

### 4.5 Handoff rules and routing (`FR-AI-05`, `FR-INBOX-33`)

| Rule (toggle) | Trigger |
|---|---|
| Customer asks for a person | Multilingual keyword list (“human”, “agent”, “talk to someone”, “insaan”, “manager”…) checked **before** the model call, plus model judgement |
| Complaint or problem | Late, damaged, wrong item, refund, angry tone |
| Discount or custom price | “discount”, “best price”, “bulk”, “less”, negotiation |
| AI not sure | Two consecutive turns without a confident answer |
| Always on (not a toggle) | AI paused, AI quota reached, AI unavailable after retries |

At handoff:
1. Mode becomes Human; system event “Handed to a person: {reason}” with a 2 to 3 line summary for the team.
2. The tenant’s handoff message is sent to the customer.
3. Routing: round robin among **online** agents with fewer than N open conversations (workspace setting, default 8); if nobody is online, the conversation stays unassigned in **Needs human** and Owners / Admins get a push.
4. Notification to the assignee.

### 4.6 Guardrails (enforced in code)

- Prices, stock and product facts only from tool results in the same turn. **Post-check:** every currency amount in the reply must appear in this turn’s tool results; otherwise regenerate once, then hand off with “AI not sure”.
- Discounts, refunds and custom deals always hand off.
- Business topics only; politely declines anything else; hands off if off-topic continues for 3 turns.
- Never asks for card numbers, passwords or OTPs; masks such strings before they reach the model and logs.
- Customer text is treated as data; messages claiming to be from staff or the system are customer text.
- Max one AI reply per inbound burst; max 30 AI replies per conversation per day; stops if the other side looks like a bot (identical repeated messages).
- Never sends free text outside the 24-hour window.

### 4.7 Sandbox

- Chat panel on the AI agent page; nothing is sent to any channel; counts against a separate sandbox allowance (200 per month).
- Right panel “How the AI answered”: model, tools called with arguments and results, knowledge sources used, whether it would hand off and why.
- Starter prompts generated from the workspace’s own products and FAQs.

### 4.8 Feedback and review queue (`FR-AI-40`)

- Thumbs-down icon on every AI message in the inbox, with an optional reason (Wrong fact · Should have handed off · Tone · Other).
- Review queue lists flagged replies with the customer’s question, the AI reply, tools and sources.
- Actions: **Add the right answer as an FAQ** (prefilled form), **Edit product**, **Add instruction**, **Dismiss**. Fixed items are marked resolved.

### 4.9 AI allowance and usage

| Item | Beta value |
|---|---|
| AI replies per workspace per month | 1,000 (Assist drafts count; sandbox does not) |
| Sandbox replies per month | 200 |
| Warning | In-app and email at 80% and 100% |
| At 100% | New conversations default to Human; AI-mode conversations hand off with “AI allowance reached” |
| More | You grant extra replies per workspace from Admin lite |
| Model | `claude-haiku-5-5` only during the beta (Sonnet escalation switched off) |

Estimated cost at about 4,000 input tokens (mostly cached) and 200 output tokens per reply: about ₹0.04 per reply with Claude Haiku 5.5, so a full 1,000-reply allowance costs about ₹40 per workspace per month.

### 4.10 Home, inbox and Admin lite additions

- **Home:** new tiles “Handled by AI” (% of conversations closed or quiet without a handoff, last 7 days) and “Handoffs today”; the “Waiting for a reply” list now highlights Needs human first; checklist gains “Add products or FAQs”, “Test the AI”, “Turn on AI for a channel”.
- **Inbox:** views AI and Needs human; mode pills; AI typing indicator (“{name} is typing…”); handoff summary card in the thread; contact panel shows the AI summary.
- **Admin lite:** per-workspace AI replies used, tokens and estimated cost this month; grant extra replies; global pause of AI for one workspace (abuse or incident).

---

## 5. AI design for MVP 2

Full design in `requirements.md` §9. MVP 2 implements this subset.

### 5.1 Runtime (worker job `ai.reply`)

1. `message.received` subscriber: if conversation mode is `ai` (or `assist`) and the channel has AI enabled, schedule `ai.reply` with job id `ai:{conversationId}`, delay 3 s; later messages within the burst replace the job (max wait 8 s).
2. Lock `t:{tenant}:conv:{id}:ai` in Redis (TTL 60 s).
3. Pre-checks: mode, AI paused, allowance, channel healthy, window open, contact not blocked.
4. Hard handoff check (keyword list) before any model call.
5. Build context (5.2) and call Claude with tools; loop on `tool_use` (max 6 tool calls, 20 s budget).
6. Post-checks (guardrails, price check), format for the channel (5.5).
7. Send through the channel adapter (or, in Assist, store as the draft); store message with `sender_type = ai` and `ai_run_id`.
8. Write `ai_runs` (model, config version, tokens incl. cache, cost, latency, tools, sources, outcome); increment `usage_counters` (`ai_reply`).
9. Errors: retry twice with backoff → hand off with “AI unavailable” and send the fallback message.

### 5.2 Context blocks (ordered for prompt caching)

| Block | Cached |
|---|---|
| Platform rules (Orbit’s fixed system prompt, requirements §9.9) | Yes |
| Tool definitions | Yes |
| Workspace profile: business info, persona, tone, languages, goals, instructions (per config version) | Yes |
| Contact: name, language, saved fields, past conversation summary | No |
| Retrieved knowledge: top 5 FAQ / document chunks for the last 1 to 3 customer messages (max 1,500 tokens) | No |
| Conversation: rolling summary + last 20 messages (or 6,000 tokens); hand-back notes from agents | No |
| Time, business-hours status (informational), minutes left in the 24-hour window | No |

### 5.3 Tools v1

| Tool | Arguments | Returns / effect |
|---|---|---|
| `search_products` | `query`, `category?`, `min_price?`, `max_price?`, `in_stock_only?` (default true), `limit?` (max 5) | Product summaries: id, name, price, stock by variant, has image |
| `get_product` | `product_id` | Full product with variants, prices, stock, description, URL |
| `search_knowledge` | `query` | FAQ and document snippets with source ids |
| `get_business_info` | none | Address, hours, delivery, payment, returns |
| `send_product_card` | `product_id`, `variant_id?` | Sends image + caption on WhatsApp, generic template on Messenger / Instagram |
| `save_contact_details` | `name?`, `email?`, `city?`, `language?`, `answers?` (qualifying answers as key / value) | Updates the contact |
| `handoff_to_human` | `reason` (`asked_for_human`, `complaint`, `pricing_negotiation`, `out_of_scope`, `low_confidence`, `other`), `summary`, `urgency` (`normal`, `high`) | Hands off (Section 4.5) |

Example schema (Zod in `packages/ai`, converted to JSON Schema for the API):

```json
{
  "name": "handoff_to_human",
  "description": "Hand the conversation to a human teammate. Use when the customer asks for a person, complains, negotiates price, or when you are not sure of the answer.",
  "input_schema": {
    "type": "object",
    "properties": {
      "reason": { "type": "string", "enum": ["asked_for_human", "complaint", "pricing_negotiation", "out_of_scope", "low_confidence", "other"] },
      "summary": { "type": "string", "description": "2 to 3 sentences for the teammate: who, what they want, what is already known." },
      "urgency": { "type": "string", "enum": ["normal", "high"] }
    },
    "required": ["reason", "summary"]
  }
}
```

All tool calls run inside `withTenant`, validate arguments with Zod (invalid → error result, model retries once), and are logged in `ai_runs.tool_calls`.

### 5.4 Models and configuration

| Setting | Value (stored in `system_settings`, editable in Admin lite) |
|---|---|
| Default model | `claude-haiku-5-5` |
| Escalation model | `claude-sonnet-5-5` (disabled during beta) |
| Max output tokens | 400 |
| Debounce | 3 s, max 8 s |
| Prices per million tokens | Stored for cost estimates; update when Anthropic’s pricing changes |

### 5.5 Formatting per channel

| Channel | Rules |
|---|---|
| WhatsApp | WhatsApp formatting only (`*bold*`, `_italic_`, plain dashes for lists); max 4,096 characters, aim under 600; up to 3 reply buttons when offering choices |
| Messenger | Plain text, max 2,000 characters; quick replies for choices |
| Instagram | Plain text, keep under 1,000 characters (verify current limit); quick replies |

Long answers split at sentence boundaries into at most 3 messages, 800 ms apart.

---

## 6. Technical scope

### 6.1 New tables (tenant scope, RLS)

`ai_configs` (versioned), `business_info` (or part of `ai_configs`), `products`, `product_variants`, `product_images`, `faqs`, `kb_sources`, `kb_chunks` (`vector(N)` + `tsvector`, HNSW + GIN indexes), `ai_runs` (monthly partitions), `ai_feedback`, `import_jobs`.

**Changes to MVP 1 tables:** `channels.settings.ai_enabled` and `default_mode`; `conversations.ai_turns_today`, `conversations.summary` now filled; `contacts.custom_fields` used for qualifying answers; `plans.limits` gains `ai_replies_per_month`, `sandbox_replies_per_month`, `products_max`, `faqs_max`, `documents_max`; `usage_counters` meter `ai_reply`, `sandbox_reply`.

### 6.2 New API endpoints

| Area | Endpoints |
|---|---|
| Products | CRUD `/products`, CRUD `/products/:id/variants`, `POST /products/import` (upload → `GET /import-jobs/:id` preview → `POST /import-jobs/:id/commit`) |
| FAQs | CRUD `/faqs`, `POST /faqs/import`, `POST /faqs/bulk-paste` |
| Documents | CRUD `/kb/sources`, `POST /kb/sources/:id/reindex` |
| Search test | `POST /kb/search-test` |
| AI | `GET/PUT /ai/config`, `GET /ai/config/versions`, `POST /ai/config/rollback`, `POST /ai/sandbox/messages`, `GET /ai/review-queue`, `POST /ai/feedback`, `PATCH /ai/review-queue/:id`, `POST /ai/pause`, `POST /ai/resume` |
| Inbox | `POST /conversations/:id/mode` (with optional note), `POST /conversations/:id/draft` (regenerate / shorter) |
| Channels | `PATCH /channels/:id` (`ai_enabled`, `default_mode`) |
| Admin lite | `GET /admin/ai-usage`, `POST /admin/tenants/:id/ai-credits`, `POST /admin/tenants/:id/ai-pause` |

### 6.3 New realtime events and jobs

- Events: `ai.drafting` (started / done), `conversation.updated` (mode), `usage.updated`, `kb.source.updated`, `import.progress`.
- Jobs: `ai.reply`, `ai.draft`, `ai.summary` (every 20 messages and at handoff), `kb.extract`, `kb.embed`, `products.import`.

---

## 7. Week-by-week plan

| Week | Dates (indicative) | Build | Tickets |
|---|---|---|---|
| 1 | 18 to 24 Jan | Products, FAQs, documents, embeddings, retrieval | M2-01 to M2-05 |
| 2 | 25 to 31 Jan | AI settings with versions; agent runtime | M2-06, M2-07 |
| 3 | 1 to 7 Feb | Tools, handoff engine, guardrails, formatting, images | M2-08 to M2-11 |
| 4 | 8 to 14 Feb | Modes in the inbox, channel switch and pause, feedback and review queue, sandbox | M2-12 to M2-15 |
| 5 | 15 to 21 Feb | Allowance and usage, Home / inbox / admin additions, evals, pilot rollout | M2-16 to M2-19 |

Release to all beta workspaces from **22 February 2027**, AI off by default; each workspace turns it on per channel.

---

## 8. Ticket overview

| ID | Ticket | Week | Requirements refs |
|---|---|---|---|
| M2-01 | Products and variants | 1 | P3-01, FR-KB-01 |
| M2-02 | Product CSV import | 1 | P3-01, FR-KB-02 |
| M2-03 | FAQs | 1 | FR-KB-05 |
| M2-04 | Documents and embeddings | 1 | P3-02, FR-KB-06, 08 |
| M2-05 | Hybrid retrieval and search test | 1 | P3-03, FR-KB-10 |
| M2-06 | AI settings with versions | 2 | P3-04, FR-AI-01..08, 10 |
| M2-07 | Agent runtime | 2 | P3-05, §9.1, §9.2 |
| M2-08 | Tools v1 | 3 | P3-06 (subset), §9.3 |
| M2-09 | Handoff engine and routing | 3 | P3-07, FR-AI-05, 30, FR-INBOX-33, 42 |
| M2-10 | Guardrails and channel formatting | 3 | P3-08, §9.5, §9.6 |
| M2-11 | Image understanding | 3 | FR-AI-26 (images) |
| M2-12 | Modes in the inbox | 4 | P2-10, FR-INBOX-30..36 |
| M2-13 | AI switch per channel and pause | 4 | FR-CH-06, FR-AI-32 |
| M2-14 | Feedback and review queue | 4 | P3-09, FR-INBOX-37, FR-AI-40 |
| M2-15 | Sandbox | 4 | P3-10, FR-ONB-06, FR-AI-42 |
| M2-16 | AI allowance and usage | 5 | P3-12, FR-AI-31 |
| M2-17 | Home, inbox and Admin lite additions | 5 | Section 4.10 |
| M2-18 | Eval harness and golden sets | 5 | P3-11, §9.8 |
| M2-19 | Pilot rollout and tuning | 5 | |

---

## 9. Tickets

### Week 1: Knowledge

#### M2-01 Products and variants
**Build:** tables, CRUD API, Knowledge, Products tab with table, inline price / stock edit, product drawer, images via file storage, beta limit.
**Acceptance:**
- [ ] SKU unique per workspace; duplicate returns a field error.
- [ ] Editing a price is reflected in the next AI reply (verified after M2-08).
- [ ] Limit reached shows “2,000 products is the beta limit”.

#### M2-02 Product CSV import
**Build:** template download, upload, header auto-mapping, preview of 20 rows with errors, background import job with progress events, summary, update by SKU.
**Acceptance:**
- [ ] 2,000-row CSV imports in under 30 seconds.
- [ ] Rows with errors are skipped and listed with row number and reason; valid rows import.
- [ ] Re-importing the same file creates nothing new and updates changed rows only.

#### M2-03 FAQs
**Build:** CRUD, bulk paste parser (“Q: / A:”), CSV import, beta limit; each FAQ becomes a `kb_sources` record and chunk(s).
**Acceptance:**
- [ ] Pasting 30 Q/A pairs creates 30 FAQs and they are searchable within 60 seconds.

#### M2-04 Documents and embeddings
**Build:** ADR choosing the embeddings provider (criteria: Hindi, Gujarati and English quality, cost, latency, data terms; candidates: Voyage AI, OpenAI embeddings, a self-hosted multilingual model); provider interface; upload, extraction (PDF, DOCX, TXT), chunking with overlap, `kb.embed` job, statuses and failure reasons, delete.
**Acceptance:**
- [ ] A 30-page PDF reaches `ready` with chunks stored.
- [ ] A scanned PDF without text fails with a plain-language reason.
- [ ] Deleting a document removes its chunks immediately.

#### M2-05 Hybrid retrieval and search test
**Build:** pgvector similarity + full-text search with rank fusion, tenant-scoped; `search_knowledge` service; Search test tab.
**Acceptance:**
- [ ] For the golden queries (20 per preset), the expected FAQ is in the top 3.
- [ ] Results never include another workspace’s chunks (isolation suite extended).

### Week 2: AI settings and runtime

#### M2-06 AI settings with versions
**Build:** `ai_configs` versioning, business info fields, Setup tab, Handoff rules tab (toggles from Section 4.5), handoff and fallback messages, versions list with rollback, guardrails card.
**Acceptance:**
- [ ] Each save creates a version; rollback restores all fields.
- [ ] Every `ai_runs` row records the config version used.

#### M2-07 Agent runtime
**Build:** `message.received` subscriber, debounce with replaceable job id, Redis lock, pre-checks, hard handoff check, context builder with prompt caching, Claude client via `@anthropic-ai/sdk`, tool loop with limits, `ai_runs`, retries and fallback, rolling summary job.
**Acceptance:**
- [ ] Three customer messages within 3 seconds produce one AI reply.
- [ ] The second turn of a conversation records cache read tokens.
- [ ] Two workers never reply to the same burst (lock test).
- [ ] With the API key revoked, the conversation hands off with “AI unavailable” and the fallback message is sent once.

### Week 3: Tools, handoff, guardrails

#### M2-08 Tools v1
**Build:** the seven tools in Section 5.3 with Zod schemas, tenant scoping, compact JSON results; product card sending per channel.
**Acceptance:**
- [ ] Invalid tool arguments return an error result and the model retries once.
- [ ] Asking “price of {product}” returns exactly the database price in the golden set.
- [ ] Product cards render correctly on WhatsApp, Messenger and Instagram test accounts.

#### M2-09 Handoff engine and routing
**Build:** keyword pre-check (multilingual list in config), rule toggles, `handoff_to_human` tool effects, summary, handoff message, round robin among online agents with capacity, fallback to unassigned + push to Owners / Admins, notifications.
**Acceptance:**
- [ ] “I want to talk to a person” in English, Hindi and Gujarati hands off without a model call.
- [ ] With all agents away, the conversation lands in Needs human unassigned and Owners get a push.
- [ ] Turning off the discount rule makes the AI answer discount questions without handing off.

#### M2-10 Guardrails and channel formatting
**Build:** price post-check with one regeneration, PII masking, off-topic counter, per-conversation daily cap, bot-loop detection, channel formatting and message splitting, window check.
**Acceptance:**
- [ ] A reply containing a price not present in the turn’s tool results is never sent (unit test with a mocked model).
- [ ] A card-number-like string never appears in the model request or logs.
- [ ] WhatsApp replies contain no Markdown headings or bracket links.

#### M2-11 Image understanding
**Build:** pass customer images (from MinIO, resized) to the model as image input; the AI can describe and match them to products through `search_products`.
**Acceptance:**
- [ ] A photo of a catalogue item returns a matching product in the golden set at least 7 times out of 10.

### Week 4: Inbox modes, controls, feedback, sandbox

#### M2-12 Modes in the inbox
**Build:** mode control in thread header, take over on send, hand back dialog with note, Assist draft card (Use, Shorter, Regenerate), AI labels, AI typing indicator, AI and Needs human views, auto-return setting, default mode per channel.
**Acceptance:**
- [ ] Sending a manual message in AI mode cancels the pending AI job, switches to Human and assigns the sender if unassigned (requirements FR-INBOX-31 AC).
- [ ] In Assist, nothing is sent until the agent presses Send; drafts count as AI replies.
- [ ] A hand-back note appears in the next AI context (verified in `ai_runs`).

#### M2-13 AI switch per channel and pause
**Build:** channel settings (AI on / off, default mode), Pause AI everywhere (top bar + AI page), banner while paused.
**Acceptance:**
- [ ] Pausing stops all AI replies within 5 seconds; new messages hand off with “AI paused”.
- [ ] A channel with AI off never triggers `ai.reply`.

#### M2-14 Feedback and review queue
**Build:** thumbs-down with reasons, review queue tab, fix actions (FAQ prefilled, edit product, add instruction), dismiss, resolved state.
**Acceptance:**
- [ ] A flagged reply appears in the queue with tools and sources.
- [ ] “Add as FAQ” creates an FAQ that the search test finds for the original question.

#### M2-15 Sandbox
**Build:** sandbox chat using the same runtime with a sandbox flag (no sending, no side effects on contacts), “How the AI answered” panel, starter prompts from the workspace’s data, sandbox allowance; onboarding checklist items.
**Acceptance:**
- [ ] Sandbox messages never reach a channel or change contacts.
- [ ] Panel shows model, tools with arguments and results, sources, and handoff decision.

### Week 5: Allowance, additions, evals, rollout

#### M2-16 AI allowance and usage
**Build:** `ai_reply` and `sandbox_reply` meters, warnings at 80% and 100%, behaviour at 100%, admin grant of extra replies, usage card in Settings.
**Acceptance:**
- [ ] At 100%, new conversations default to Human and AI conversations hand off with “AI allowance reached”.
- [ ] Granting 500 replies in Admin lite resumes AI within 60 seconds.

#### M2-17 Home, inbox and Admin lite additions
**Build:** everything in Section 4.10.
**Acceptance:**
- [ ] “Handled by AI” matches a raw-count query in tests.
- [ ] Admin lite shows tokens and estimated cost per workspace matching `ai_runs` totals.

#### M2-18 Eval harness and golden sets
**Build:** runner in `packages/ai/evals`; golden sets for retail, services and clinics (50 conversations each) with exact assertions (price equality, tool called, handoff fired, refused off-topic, language matched) and a rubric judged by `claude-sonnet-5-5`; CI job on changes to `packages/ai`, plus nightly.
**Acceptance:**
- [ ] Any failing exact assertion blocks the merge.
- [ ] Rubric score drop of more than 5% vs. the stored baseline blocks the merge.

#### M2-19 Pilot rollout and tuning
**Do:** enable AI for the MVP 1 pilot workspaces first; review 100% of AI replies for the first 3 days, then 10%; tune platform rules, keyword lists and defaults; publish help articles *Set up your AI*, *Import products*, *When the AI hands over*, *Assist mode*.
**Acceptance:**
- [ ] Pilot workspaces reach 50% AI-handled conversations with under 5% thumbs-down for 5 consecutive days.

---

## 10. Testing focus for MVP 2

| Area | How |
|---|---|
| AI correctness | Eval harness (M2-18) on every AI change and nightly |
| Runtime robustness | Unit tests with a mocked Claude client: tool loops, invalid arguments, timeouts, API errors, lock contention, debounce |
| Isolation | Isolation suite extended to products, FAQs, chunks, AI runs; retrieval test with two workspaces sharing similar content |
| Cost | Load test of 1,000 AI replies on staging against the real API with prompt caching; confirm cost per reply matches the estimate within 30% |
| Real channels | Before release: full AI conversation on each channel from a real phone, including handoff, take over and hand back |

---

## 11. Release checklist

- [ ] Evals green on the release commit; baseline stored
- [ ] Anthropic spend alert set; Admin lite AI cost view verified
- [ ] AI off by default for every existing workspace; announcement explains how to turn it on
- [ ] Guardrails tested on all three channels
- [ ] Help articles published
- [ ] Rollback plan: global AI kill switch in Admin lite tested

---

## 12. Running the AI beta

| Topic | Plan |
|---|---|
| Price | Still free. 1,000 AI replies per workspace per month; more on request. |
| Your cost | About ₹40 per workspace per month at full allowance (Claude Haiku 5.5) plus embeddings; watch the Admin lite cost view weekly. |
| Quality loop | Weekly: read the review queue across workspaces, fix platform rules or presets, re-run evals. |
| Communication | In-product note: “The AI answers only from your products, FAQs and documents. It hands over to your team when it is not sure.” |

---

## 13. Risks and open questions for MVP 2

| Risk / question | Mitigation / owner |
|---|---|
| Wrong prices or invented policies | Tools-only facts, price post-check, evals, review queue |
| Indian-language quality (Hindi, Gujarati, Hinglish) | Golden sets in each language; embeddings chosen for multilingual quality (M2-04) |
| AI replies feel robotic or too long | Tone and length settings; short default; pilot tuning (M2-19) |
| Cost spikes from a heavy workspace | Allowance cap, per-conversation daily cap, spend alert, admin pause |
| Meta policy on AI in WhatsApp | Business-only scope, disclosure on by default, handoff always available |
| Open: embeddings provider and dimension | Decide in M2-04 (engineering) |
| Open: booking link field in business info now, booking tools in M4? | Proposed: link only in MVP 2 (product owner) |

