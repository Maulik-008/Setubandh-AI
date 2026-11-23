# MVP 1: Unified inbox

> **Product:** Orbit (working name)
> **Milestone:** MVP 1 of 2, followed by growth milestones M3 to M6
> **Status:** Ready to start
> **Indicative dates:** build 23 Nov 2026 to 17 Jan 2027 (8 weeks); public beta when Meta approves the app (target end of January 2027)
> **Source of truth for details:** `docs/requirements.md` (section and ticket references below point to it)
> **Next files:** `02-mvp-2-ai-answers.md`, `03-later-milestones-m3-m6.md`

---

## Roadmap at a glance

| Milestone | What a business gets | Build | Price | File |
|---|---|---|---|---|
| **MVP 1: Unified inbox** | One shared inbox for WhatsApp, Instagram and Messenger | 8 weeks + Meta approval | Free beta | **this file** |
| MVP 2: AI answers | The AI replies from the business's products, FAQs and documents | 5 weeks | Free beta with AI allowance | `02-mvp-2-ai-answers.md` |
| M3: Get paid | Plans, billing, limits, full Super Admin | 3 weeks | Paid launch | `03-later-milestones-m3-m6.md` |
| M4: Sell in chat | Pipeline, orders, bookings, payment links | 3 weeks | | `03-…` |
| M5: Automate | Follow-ups, comment-to-DM, broadcasts | 3 weeks | | `03-…` |
| M6: Insights and scale | Reports, API, web chat, mobile, white-label | Ongoing | | `03-…` |

---

## How to work from this file with Claude Code

1. Work the tickets in Section 9 **in order**. One ticket per branch and per Claude Code session.
2. Start each session with: *“We are working on ticket M1-xx in `docs/plan/01-mvp-1-unified-inbox.md`. Read the ticket, the referenced sections of `docs/requirements.md` and `CLAUDE.md`. Propose a plan and wait for approval.”*
3. Every acceptance criterion becomes a test. A ticket is done only when the Definition of Done in Section 11 is met.
4. Anything not listed in this file is **out of scope for MVP 1**, even if it is in `requirements.md`. If you need it, add it here first.

---

## 1. Goal

Any business can sign up, create a workspace, connect its own WhatsApp number, Facebook Page and Instagram account, invite its team, and read and reply to every DM from one real-time inbox.

**Who it is for:** small and mid-size businesses that sell or support customers over WhatsApp and Instagram today, using personal phones and three separate apps.

**Why this is worth launching without AI:** a shared, multi-agent inbox for WhatsApp + Instagram + Messenger, with assignment and history, already removes the biggest daily pain (phones passed around, missed messages, no record when staff change). It also gets real businesses connected and real message data flowing, which MVP 2’s AI needs.

### Launch definition

MVP 1 is launched when a stranger can do all of this **without help from you**, on the production app approved by Meta:

1. Sign up, verify email, create a workspace.
2. Connect a WhatsApp number through Meta’s popup.
3. Connect a Facebook Page and its Instagram account.
4. Invite a teammate.
5. Receive customer messages from all three channels in one inbox, in real time, and reply.

### Success measures for the beta (first 4 weeks after launch)

| Measure | Target |
|---|---|
| New workspaces that connect at least one channel within 24 h | 60% or more |
| Workspaces with a message sent from Orbit on 5+ days in a week | 40% or more |
| Median time from signup to first reply sent from Orbit | Under 15 minutes |
| Inbound message to inbox delay (p95) | Under 3 seconds |
| Cross-workspace data incidents | 0 |

---

## 2. Scope

| In MVP 1 | Not in MVP 1 (milestone) |
|---|---|
| Sign up, email verification, login, logout, password reset | Google login, SSO (M6) |
| Optional two-step sign-in (TOTP) for users; mandatory for platform admin | Workspace-wide 2FA enforcement (M3) |
| Create several workspaces per user, switch between them | Workspace deletion self-serve (export + delete request by email in MVP 1) |
| Invitations by email; roles **Owner, Admin, Agent** | Manager and Viewer roles (M3), custom roles (M6) |
| Connect WhatsApp via Meta Embedded Signup | Creating WhatsApp templates inside Orbit (M5) |
| Connect Facebook Pages (Messenger) and linked Instagram professional accounts (DMs) | Comments on posts (M5) |
| Channel health and reconnect | WhatsApp business profile editing (M6) |
| **Home** screen | Reports (M6) |
| **Inbox**: views, filters, search, real-time, all message types, replies with text, emoji and attachments | AI replies, Assist drafts (MVP 2) |
| Send approved WhatsApp templates when the 24-hour window is closed | Broadcasts (M5) |
| Assignment, open / resolved status, private notes with @mentions, saved replies, “who is viewing” | Snooze, labels, priority, SLA, auto-assignment rules (M6) |
| Contact panel: name, identifiers, tags, past conversations | Contacts page, CSV import / export, merge (M6; CSV export in M3) |
| In-app notifications, sound, browser push | Email digests, scheduled reports (M6) |
| Admin lite (for you): tenants, suspend, signup mode, webhook log + replay, channel health, audit | Full Super Admin: plans, coupons, impersonation, billing (M3) |
| Fixed **beta limits** per workspace, adjustable by you | Plans, prices, billing (M3) |
| Privacy policy, terms, Meta data deletion callback, data export on request | Self-serve export (M3) |

---

## 3. Roles and permissions (MVP 1)

| Permission | Owner | Admin | Agent |
|---|:-:|:-:|:-:|
| See all conversations | ✓ | ✓ | Setting* |
| See unassigned conversations | ✓ | ✓ | ✓ |
| Reply, add notes, use saved replies | ✓ | ✓ | ✓ |
| Assign to anyone | ✓ | ✓ | Self only |
| Resolve / reopen | ✓ | ✓ | ✓ |
| Edit contact name and tags | ✓ | ✓ | ✓ |
| Manage saved replies (shared) | ✓ | ✓ | Own only |
| Connect / disconnect channels | ✓ | ✓ | |
| Invite, change role, remove members | ✓ | ✓ (not Owner) | |
| Workspace settings (name, time zone, agent visibility) | ✓ | ✓ | |
| Transfer ownership | ✓ | | |

\* Workspace setting “Agents can see all conversations”, default **off** (agents see unassigned + assigned to them).

Permissions are constants in `packages/shared/permissions.ts`; roles map to sets. The M3 roles (Manager, Viewer) are added to the same map later without schema changes.

---

## 4. Feature specifications

### 4.1 Accounts and workspaces (`FR-AUTH`, `FR-ONB`)

- **Sign up:** name, email, password (min 10 characters, breached-password check), workspace name. Email verification link valid 24 h. Unverified users can browse the empty app but **cannot connect channels**.
- **Login:** generic error message; lockout after 10 failed attempts in 15 minutes per account and per IP.
- **Sessions:** 15-minute access token in memory; 30-day rotating refresh token in an `httpOnly` cookie; reuse detection revokes the whole family.
- **Password reset:** link valid 1 hour, single use; all sessions revoked.
- **Two-step sign-in (optional):** TOTP with 10 recovery codes.
- **Workspaces:** a user can create more workspaces (beta cap: 3 per user) and switch from the header. Last used workspace remembered.
- **Invitations:** email + role (Admin or Agent). Valid 7 days, resend and revoke. Accepting creates the user if needed.
- **Signup mode (controlled by you in Admin lite):** `open` (anyone) or `invite_code` (needs a code you hand out). Default `invite_code` during the private pilot, `open` at public beta.
- **Workspace profile:** name, time zone, country, logo (optional).
- **Data export / deletion:** Owner requests by email in MVP 1; you run the scripted export / deletion (see M1-32).

### 4.2 Channels (`FR-CH`, requirements §10)

**Connect WhatsApp (Embedded Signup)**
1. Owner or Admin clicks **Connect WhatsApp** on Home or in Settings, Channels.
2. Meta’s popup opens: Facebook login, choose or create Business portfolio and WhatsApp Business Account, add phone number, verify by OTP, set display name.
3. Orbit exchanges the returned code for a business token (server side), registers the number for Cloud API with a generated PIN, subscribes the app to the WABA’s webhooks, reads number details (display number, verified name, quality rating, messaging limit) and syncs templates.
4. Orbit shows **Connected** and a reminder card: *“Add a payment method in WhatsApp Manager. Meta bills message fees to your WhatsApp Business Account.”* with a link.

Explain on the connect screen, before the popup: the number must not be active on the regular WhatsApp app, or it must use Meta’s coexistence option where Meta supports it **(verify current Meta rules before launch)**.

**Connect Facebook and Instagram (Facebook Login for Business)**
1. **Connect Facebook** → Meta login with the MVP 1 permissions.
2. Orbit lists Pages the person manages; they pick one or more (within beta limits).
3. For each Page: store the Page token, subscribe the Page to messaging webhooks, and detect the linked Instagram professional account. Offer **Connect Instagram** for it.
4. If the Instagram account is personal or not linked to the Page, show the exact steps to fix it in the Instagram app.

**Channel health**
- States: `connected`, `needs_attention`, `disconnected`.
- Shown on Home and in Settings: last message received, token status, WhatsApp quality rating (green / yellow / red) and messaging limit.
- A daily job checks tokens and number status. A send that fails with an auth error flips the channel to `needs_attention`, notifies Owners and Admins, and shows **Reconnect**.
- **Disconnect:** unsubscribes webhooks, keeps history read-only.

**Beta limits (per workspace, editable by you):**

| Limit | Beta default |
|---|---|
| Members (Owner + Admin + Agent) | 5 |
| WhatsApp numbers | 1 |
| Facebook Pages | 2 |
| Instagram accounts | 2 |
| Message history kept | 12 months |
| Attachment size | Meta’s per-type limits (WhatsApp: images 5 MB, documents 100 MB, verify) |

### 4.3 Home

Layout: page title + one ink action (“Open inbox”), then:

1. **Setup checklist** (until complete): verify email · connect WhatsApp · connect Facebook / Instagram · invite a teammate · send your first reply from Orbit. Each item links to the place it is done.
2. **Four numbers (today, workspace time zone):**

   | Tile | Definition |
   |---|---|
   | Open conversations | Status `open` now |
   | Unassigned | Status `open` and no assignee |
   | New chats today | Conversations whose first inbound message is today |
   | Median first reply | Median of (first human reply − first inbound) for conversations started in the last 7 days, business hours not applied in MVP 1 |
3. **Waiting for a reply:** open conversations where the last message is from the customer, oldest first, with wait time pills (amber after 15 min, coral after 60 min).
4. **Channels:** one card per connected channel with health state.

Empty state (no channels): icon, “Connect your first channel”, ink button **Connect WhatsApp**, secondary “Connect Facebook or Instagram”.

### 4.4 Inbox

Three panes as in the prototype and requirements §13.5: conversation list (340 px), thread (flexible), contact panel (300 px at 2xl, drawer below). On mobile, list and thread are separate screens.

**List**
- Views: **All** (open), **Mine**, **Unassigned**, **Resolved**, each with a count.
- Channel filter chips; search across contact name, phone, Instagram handle and message text (Postgres full-text + trigram).
- Row: avatar with channel badge, name, time, last message snippet (bold when unread), status, assignee avatar, unread count, “Window closed” chip when relevant.
- Real-time: new messages move the conversation to the top; unread counts update; no reload needed.
- Virtualised list: smooth with 5,000 conversations.

**Thread**
- Messages labelled by sender: customer, named teammate, system event (assigned, resolved, reopened, window closed).
- Rendered inbound types:

  | Channel | Types |
  |---|---|
  | WhatsApp | text, image, video, audio / voice note, document, sticker, location, contact card, reaction, button and list replies, template echoes, unsupported (shown as “Message type not supported, open WhatsApp”) |
  | Instagram | text, image, video, audio, story reply (with story preview link), story mention, reaction, shared post |
  | Messenger | text, image, video, audio, file, quick reply, postback, reaction |

- Outbound status ticks: queued, sent, delivered, read, failed. Failed shows Meta’s error in plain words and a **Retry**.
- 24-hour window chip with countdown (amber under 2 h).
- “Riya is viewing” / “Riya is typing” presence line.

**Composer**
- Reply / Note toggle. Notes are visible to the team only and support `@mentions` (notifies the mentioned member).
- Text with emoji; attachments (image, document, video, audio) within channel limits; saved replies via `/` and quick chips.
- Enter to send, Shift + Enter for a new line.
- **WhatsApp window closed:** composer is replaced by the approved template list (synced from the WABA) with variable fields; sending a template is the only option.
- **Instagram / Messenger window closed:** composer disabled with “The customer has to write first. Replies are allowed for 24 hours after their last message.”

**Ownership and status**
- Assign menu (Agents: assign to self only). Assignment writes a system event and notifies the assignee.
- **Resolve** / **Reopen**. A new customer message reopens a resolved conversation.
- Optional “Assign to me when I reply” behaviour: replying to an unassigned conversation assigns it to the replier (default on).

**Contact panel**
- Name (editable), phone / Instagram handle / Messenger name, channel badges, tags (free text), first seen, past conversations on any channel of the same contact (same contact only when identifiers match exactly; merge is M6).

### 4.5 Notifications

| Event | In-app | Sound | Browser push |
|---|:-:|:-:|:-:|
| New conversation, unassigned (Owners, Admins; Agents opt in) | ✓ | ✓ | opt-in |
| New message in a conversation assigned to me | ✓ | ✓ | ✓ |
| Conversation assigned to me | ✓ | | ✓ |
| @mention in a note | ✓ | | ✓ |
| Channel needs attention (Owners, Admins) | ✓ | | ✓ + email |

Per-user preferences in Profile. Web Push uses VAPID keys.

### 4.6 Admin lite (platform side, only you)

Separate login realm at `admin.yourdomain.com`, mandatory TOTP.

| Screen | Contents |
|---|---|
| Tenants | List with members, channels, messages last 7 days, last active, status; search; **Suspend / Unsuspend** (suspended: login allowed, sending blocked, inbound still stored) |
| Tenant detail | Owner, members, channels with health, beta limit overrides, internal note |
| Signup | Signup mode (`open` / `invite_code`), invite codes list and create |
| Webhooks | Raw Meta events by tenant / channel / time, payload view, **Replay** one or a range |
| Channel health | All channels needing attention across tenants |
| Audit | Every admin action with reason |

### 4.7 Launch must-haves

- Privacy policy, Terms of Service, Acceptable Use (incl. WhatsApp opt-in responsibility) on your domain; consent checkbox at signup with the accepted version stored.
- Meta **data deletion callback** and instructions URL.
- Meta tokens encrypted at rest (AES-256-GCM); no message bodies or tokens in logs.
- Off-site backups and one completed restore drill.
- Error tracking, uptime monitor, queue-age and webhook-error alerts to your phone.
- Status page.
- Help articles: *Connect WhatsApp*, *Connect Facebook and Instagram*, *Invite your team*, *Why can’t I reply after 24 hours?*

---

## 5. Meta track (runs in parallel with the build)

| Week | Task | Output |
|---|---|---|
| 1 | Business verification of your company in Meta Business Manager (legal name, address, website, domain verification) | Verified business |
| 1 | Create the Meta app (Business type); add WhatsApp, Messenger, Instagram, Facebook Login for Business, Webhooks | App ID, secret |
| 1 to 2 | Start WhatsApp **Tech Provider** onboarding; create the Embedded Signup (Facebook Login for Business) configuration | Configuration ID |
| 1 | Create test assets: your WABA + test number, a test Page, a linked Instagram professional account | Test assets |
| 3 to 5 | Build and test the connect flows in development mode with your own assets | Working flows |
| 5 | Submit **WhatsApp** permissions for App Review | Submission 1 |
| 6 to 7 | Submit **Pages and Instagram** messaging permissions | Submission 2 |
| 7 to 10 | Answer reviewer feedback; private pilot uses businesses added as app testers meanwhile | Approval, app set to Live |

**Permissions requested in MVP 1 (verify names at submission):**
`whatsapp_business_management`, `whatsapp_business_messaging`, `business_management`, `pages_show_list`, `pages_manage_metadata`, `pages_messaging`, `instagram_basic`, `instagram_manage_messages`.
Comment permissions (`pages_read_engagement`, `pages_manage_engagement`, `instagram_manage_comments`) are **not** requested until M5.

**Webhook subscriptions (verify field names):**

| Object | Fields |
|---|---|
| `whatsapp_business_account` | `messages` (includes statuses), `message_template_status_update`, `phone_number_quality_update`, `account_update` |
| `page` | `messages`, `messaging_postbacks`, `message_reads`, `message_deliveries`, `message_echoes`, `message_reactions` |
| `instagram` | `messages`, `messaging_postbacks`, `message_reactions` |

**App Review pack (prepare in week 4):**
- A reviewer workspace with a test login (reviewers must be able to sign in).
- One screen recording per permission showing: sign in to Orbit → connect the asset → a customer message arriving → replying from Orbit → the reply arriving on the phone. Narrate or caption why each permission is needed.
- Privacy policy URL, data deletion URL, app icon, business contact email.
- Short written use-case description: *“Orbit is a shared inbox. Businesses connect their own WhatsApp number, Page and Instagram account to read and reply to customer messages with their team.”*

**Pilot during review:** add 3 to 5 pilot businesses’ Facebook users as app **testers** so they can connect their real assets before approval (verify current development-mode rules for WhatsApp Embedded Signup).

---

## 6. Technical scope

Stack exactly as `requirements.md` §4.3 and ADR 0011: Node.js 26 LTS + NestJS 12 (Fastify), PostgreSQL 18 (+ pgvector installed now, used in MVP 2), Valkey 8.1 + BullMQ v6, Socket.IO, Cloudflare R2 (S3 API), React 19 + Vite 8 + Astryx themed with Paper & Pastel, Tailwind v4 bridge, pnpm + Turborepo.

### 6.1 Apps and modules built in MVP 1

| App | Modules / areas |
|---|---|
| `apps/api` | `auth`, `tenancy`, `users`, `channels`, `webhooks` (ingress), `inbox` (conversations, messages, notes, saved replies), `contacts` (panel only), `notifications`, `files`, `audit`, `platform-admin` (lite), `health` |
| `apps/worker` | `meta.event` processor, `outbound.send`, `media.download`, `channels.health` (daily), `templates.sync`, `notifications.push`, `retention` (nightly), `metrics.home` (5-minute rollup for Home tiles) |
| `apps/web` | Auth screens, workspace switcher, Home, Inbox, Settings (Workspace, Members, Channels, Saved replies, Profile and notifications) |
| `apps/admin` | Admin lite (Section 4.6) |
| `packages/*` | `shared`, `db`, `channels` (WhatsApp, Messenger, Instagram adapters), `ui`, `config` |

### 6.2 Database tables in MVP 1

All tenant tables carry `tenant_id` with forced row-level security (requirements §5.2, §11).

| Group | Tables |
|---|---|
| Platform | `tenants`, `plans` (one row: `beta`), `entitlement_overrides`, `usage_counters`, `users`, `memberships`, `invitations`, `refresh_tokens`, `platform_admins`, `channel_routes`, `webhook_events` (monthly partitions), `feature_flags`, `system_settings`, `platform_audit_logs`, `invite_codes` |
| Tenant | `channels`, `wa_templates`, `contacts`, `contact_identities`, `conversations`, `messages` (monthly partitions), `message_external_ids`, `attachments`, `conversation_events`, `notes`, `canned_responses`, `notifications`, `notification_prefs`, `push_subscriptions`, `audit_logs`, `metrics_daily` |

**Columns that exist now for later milestones (do not skip):**
- `conversations.mode text not null default 'human'` with check `('ai','assist','human')`. MVP 1 never shows the selector.
- `messages.sender_type` allows `contact`, `agent`, `system`, `ai`, `automation`; `messages.ai_run_id uuid null`.
- `conversations.summary text null`, `conversations.source text` (`dm` now, `comment` in M5).
- `channels.settings jsonb` (will hold `ai_enabled` in MVP 2).
- `tenants.status` with the full lifecycle enum (only `active` and `suspended` used in MVP 1).
- `usage_counters` with meter names (`messages_in`, `messages_out` tracked now; `ai_reply` added in MVP 2).

### 6.3 API in MVP 1 (subset of requirements §12.2)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `/auth/verify-email`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/2fa/setup`, `/auth/2fa/verify`, `/auth/2fa/disable`; `GET/PATCH /me` |
| Workspaces | `GET /workspaces`, `POST /workspaces`, `GET/PATCH /workspace`, `POST /workspace/transfer-owner` |
| Members | `GET /members`, `PATCH /members/:id`, `DELETE /members/:id`, `POST /invitations`, `DELETE /invitations/:id`, `POST /invitations/:token/accept`, `PATCH /me/availability` |
| Channels | `GET /channels`, `POST /channels/whatsapp/embedded-signup`, `POST /channels/facebook/connect`, `POST /channels/facebook/pages`, `POST /channels/:id/instagram`, `DELETE /channels/:id`, `GET /channels/:id/health`, `POST /channels/:id/templates/sync` |
| Inbox | `GET /conversations`, `GET /conversations/:id`, `PATCH /conversations/:id` (status), `POST /conversations/:id/assign`, `POST /conversations/:id/read`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages` (text, media, template), `POST /conversations/:id/messages/:mid/retry`, `POST /conversations/:id/notes` |
| Contacts | `GET /contacts/:id`, `PATCH /contacts/:id`, `GET /contacts/:id/conversations` |
| Saved replies | CRUD `/canned-responses` |
| Home | `GET /home/summary` |
| Notifications | `GET /notifications`, `POST /notifications/read`, `GET/PUT /notification-prefs`, `POST /push-subscriptions` |
| Files | `POST /files/upload-url`, `GET /files/:id` |
| Webhooks (public) | `GET/POST /webhooks/meta`, `POST /meta/data-deletion` |
| Admin lite | `GET /admin/tenants`, `GET /admin/tenants/:id`, `POST /admin/tenants/:id/(suspend\|unsuspend\|limits)`, `GET/PUT /admin/signup`, CRUD `/admin/invite-codes`, `GET /admin/webhook-events`, `POST /admin/webhook-events/replay`, `GET /admin/channels/health`, `GET /admin/audit-logs` |

### 6.4 Realtime events in MVP 1

`conversation.created`, `conversation.updated`, `message.created`, `message.status`, `conversation.viewing`, `conversation.typing`, `notification.created`, `channel.health`.

### 6.5 Hooks for MVP 2 (build the seam now)

- The worker emits an internal `message.received` domain event after an inbound message is stored. MVP 1 has two subscribers (notifications, home metrics); MVP 2 adds the AI subscriber.
- `ChannelAdapter` interface includes `sendInteractive`, `sendProductCard`, `sendTyping`, `markRead` (MVP 1 implements `markRead` and `sendTyping` for WhatsApp; the rest throw `NotImplemented`).
- Entitlements service reads limits from `plans` + `entitlement_overrides`; MVP 2 adds `ai_replies_per_month` to the same JSON.

---

## 7. Week-by-week plan

Week 1 starts Monday 23 November 2026. One developer working full time with Claude Code. Late December holidays are not included; add a week of buffer if you take them.

| Week | Dates (indicative) | Build | Tickets | Meta track |
|---|---|---|---|---|
| 1 | 23 to 29 Nov | Foundations | M1-01 to M1-07 | M1-08 starts |
| 2 | 30 Nov to 6 Dec | Accounts and workspaces | M1-09 to M1-14 | Tech Provider onboarding |
| 3 | 7 to 13 Dec | Webhooks and WhatsApp connect | M1-15 to M1-17 | Test on own number |
| 4 | 14 to 20 Dec | Inbound pipeline, realtime, inbox list | M1-18 to M1-20 | Prepare review pack |
| 5 | 21 to 27 Dec | Thread, composer, templates, ownership | M1-21 to M1-23 | **Submit WhatsApp review** |
| 6 | 28 Dec to 3 Jan | Facebook and Instagram | M1-24 to M1-26 | |
| 7 | 4 to 10 Jan | Home, contact panel, notifications, admin lite, legal | M1-27 to M1-32 | **Submit Pages / Instagram review** |
| 8 | 11 to 17 Jan | Hardening and private pilot | M1-33 to M1-35 | Answer feedback |
| 9 to 10 | 18 to 31 Jan | Buffer for Meta; MVP 2 work starts in parallel | M1-36 | Approval, app Live |

**Public beta target:** end of January 2027, the week Meta approves both submissions.

---

## 8. Ticket overview

| ID | Ticket | Week | Requirements refs |
|---|---|---|---|
| M1-01 | Monorepo and tooling | 1 | P0-01 |
| M1-01a | Test harness (backend + real-browser frontend) | 1 | §16 |
| M1-02 | Local stack and typed config | 1 | P0-02 |
| M1-03 | API and worker skeletons | 1 | P0-03 |
| M1-04 | Database foundation with row-level security | 1 | P0-04 |
| M1-05 | Design system spike (Astryx + Paper & Pastel) | 1 | P0-05 |
| M1-06 | CI pipeline and Docker images | 1 | P0-06 |
| M1-07 | Claude Code setup | 1 | P0-07 |
| M1-08 | Meta platform setup (non-code) | 1 to 10 | P0-08, §10.1 |
| M1-09 | Auth core | 2 | P1-01, FR-AUTH-01..04, 11 |
| M1-10 | Optional two-step sign-in | 2 | P1-02, FR-AUTH-05 |
| M1-11 | Workspaces, members, invitations, roles | 2 | P1-03, FR-AUTH-06, 07 |
| M1-12 | Tenant isolation suite and audit log | 2 | P1-04, P1-05 |
| M1-13 | App shell, auth screens, settings shell | 2 | P1-06 |
| M1-14 | Email service and file storage | 2 | P1-08, P1-09 |
| M1-15 | Webhook ingress | 3 | P2-01, §10.4 |
| M1-16 | Connect WhatsApp (Embedded Signup) | 3 | P2-02, FR-CH-01, §10.2 |
| M1-17 | WhatsApp adapter | 3 | P2-03, §10.5 |
| M1-18 | Inbound pipeline: contacts, conversations, messages, media | 4 | P2-04 |
| M1-19 | Realtime gateway | 4 | P2-05, §12.4 |
| M1-20 | Inbox list | 4 | P2-06, FR-INBOX-01..05, 08 |
| M1-21 | Thread and composer | 5 | P2-07, FR-INBOX-10..13, 16, 47 |
| M1-22 | 24-hour window and templates | 5 | P2-08, FR-INBOX-14, 15, FR-TPL-01, 04 |
| M1-23 | Assignment, status, presence | 5 | P2-09 (subset), FR-INBOX-19, 40, 41 |
| M1-24 | Connect Facebook Pages and Instagram | 6 | P5-01, FR-CH-02, 03, §10.3 |
| M1-25 | Messenger and Instagram adapters | 6 | P5-02, P5-03 |
| M1-26 | Channel health | 6 | P2-11, FR-CH-04, 05 |
| M1-27 | Contact panel | 7 | FR-CON-01, 02 (subset), FR-INBOX-48 |
| M1-28 | Home | 7 | new (Section 4.3) |
| M1-29 | Notifications | 7 | P7-03 (subset), FR-NOT-01..04 |
| M1-30 | Admin lite | 7 | P9-01, P9-03, P9-06 (subsets) |
| M1-31 | Beta limits and signup mode | 7 | P8-01 (subset) |
| M1-32 | Legal pages, data deletion and export | 7 | P10-01, P10-06 |
| M1-33 | Security pass | 8 | P10-02 |
| M1-34 | Backups, monitoring, load test | 8 | P10-03, P10-04 |
| M1-35 | Help articles and private pilot | 8 | P10-07 |
| M1-36 | App Review completion and public beta | 9 to 10 | P10-08 |

---

## 9. Tickets

### Week 1: Foundations

> **Week 1 decisions (2026-11-23, agreed with the developer):**
> - Server config lives in a new server-only package `packages/env` (`@setubandh/env`); web and admin may not import it (lint rule).
> - Every variable in requirements §15.6 is required at boot from M1-02 on. `pnpm env:init` writes a local `.env` with safe placeholder values.
> - M1-04 proves RLS on a test-only tenant table built with the policy helper; `tenants`, `users`, `memberships` stay platform scope as in §11.2. The first real RLS table comes with M1-12.
> - If Astryx does not work with Vite 8, `apps/web` and `apps/admin` fall back to Vite 7 (recorded in an ADR).
> - CI is **GitHub Actions** with images on GitHub Container Registry (the repo is on GitHub). The staging deploy job is written but stays off until a staging server exists (Q-08); "staging updates automatically" moves to a follow-up ticket.
> - Week 1 tickets are delivered as separate commits on one branch.

#### M1-01 Monorepo and tooling
**Build:** pnpm workspaces + Turborepo with `apps/api`, `apps/worker`, `apps/web`, `apps/admin`, `packages/shared`, `packages/db`, `packages/channels`, `packages/ui`, `packages/config`. Strict TypeScript, ESLint with `eslint-plugin-boundaries` (module rules from requirements §4.5), Prettier, Vitest.
**Acceptance:**
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass on the empty apps.
- [x] Importing another module’s internals (not its service) fails lint.

**Spec:** [docs/specs/m1-01-monorepo-and-tooling/spec.md](../specs/m1-01-monorepo-and-tooling/spec.md)

#### M1-01a Test harness (backend + real-browser frontend)
*Added 2026-11-22 so every later ticket can ship tests from day one (requirements §16).*
**Build:** backend unit tests (Vitest) and integration tests against real Postgres 18 + pgvector and Valkey 8.1 started by Testcontainers; a NestJS (Fastify) test-app helper using `inject`. Frontend: a minimal plain React + Vite shell in `apps/web` (no Astryx; that stays M1-05); component tests in a real browser (Vitest browser mode + Playwright + Testing Library) with MSW for API mocks; Playwright E2E across Chromium, Firefox and WebKit, desktop and phone viewports, light and dark mode, with axe accessibility checks, screenshot comparison, and traces on failure.
**Acceptance:**
- [x] `pnpm test` runs unit tests without Docker; `pnpm test:integration` starts Postgres + Valkey containers and proves pgvector is available.
- [x] A NestJS test app boots on Fastify and answers an injected request.
- [x] `pnpm test:browser` runs a React component test in real Chromium with an MSW-mocked API call.
- [x] `pnpm test:e2e` loads the web shell, passes axe with 0 serious or critical issues in light and dark mode, and matches its screenshot baseline.
- [x] A failing E2E test keeps a trace and screenshot.

**Spec:** [docs/specs/m1-01-monorepo-and-tooling/spec.md](../specs/m1-01-monorepo-and-tooling/spec.md)

#### M1-02 Local stack and typed config
**Spec:** [docs/specs/m1-02-local-stack-and-config/spec.md](../specs/m1-02-local-stack-and-config/spec.md)
**Build:** `docker-compose.dev.yml` with Postgres 18 + pgvector, Valkey 8.1, a local S3-compatible container (SeaweedFS), Mailpit. Config module (`packages/env`) validates every env var with Zod at boot; `pnpm env:init` creates a local `.env`.
**Acceptance:**
- [ ] `pnpm dev` starts all services and apps.
- [ ] Missing env var stops boot with a message naming it.

#### M1-03 API and worker skeletons
**Build:** NestJS on Fastify; Pino logs with `requestId` and `tenantId`; `AppError` + error filter with the response shape from requirements §12.1; `/health/live`, `/health/ready`; OpenAPI in non-production; worker app bootstrapping BullMQ.
**Acceptance:**
- [ ] `/health/ready` checks Postgres and Redis.
- [ ] Every error response has `code`, `message`, `requestId`.

#### M1-04 Database foundation with row-level security
**Build:** Drizzle + migrations; roles `orbit_app` (NOBYPASSRLS) and `orbit_admin`; `withTenant(tenantId, userId, fn)` helper using `SET LOCAL`; RLS policy helper; first tables `tenants`, `users`, `memberships`.
**Acceptance:**
- [ ] A query on a tenant table outside `withTenant` returns zero rows.
- [ ] Inserting a row with another tenant’s id inside `withTenant` fails.

#### M1-05 Design system spike (Astryx + Paper & Pastel)
**Build:** `apps/web` and `apps/admin` on React 19 + Vite 8; install `@astryxdesign/core`, `@stylexjs/stylex`, theme, CLI; `npx @astryxdesign/cli init`; Paper & Pastel theme via `defineTheme`; cascade layers and Tailwind v4 bridge as requirements §13.3.2; Geist; Lucide; light / dark toggle through Astryx `Theme`; demo page with button, input, select, card, table, dialog, badge, toast.
**Acceptance:**
- [ ] Both modes match the prototype’s look (white paper / ink, one ink button, pastel chips).
- [ ] Tailwind utilities override Astryx component defaults (layer order proven).
- [ ] Paper & Pastel `contrast.py` passes; `audit.py` 0 errors; axe 0 serious issues.
- [ ] Decision note in `docs/adr/` confirming token names and button variant mapping (answers requirements Q-12).

#### M1-06 CI pipeline and Docker images
**Build:** GitHub Actions stages: install, lint, typecheck, unit, integration (Testcontainers), UI audit, build, E2E, Docker images tagged with commit SHA and pushed to GitHub Container Registry; staging deploy job present but disabled until a staging server exists (Q-08).
**Acceptance:**
- [ ] Pipeline green on `main`; images pushed.
- [ ] (Follow-up, needs a server) staging updates automatically.

#### M1-07 Claude Code setup
**Build:** root `CLAUDE.md` (requirements §17.2, plus “MVP 1 scope only: see docs/plan/01-mvp-1-unified-inbox.md”), `.claude/skills/paper-pastel-studio`, merged Astryx agent docs, `.claude/commands/ticket.md`, `docs/adr/`, `docs/runbooks/`.
**Acceptance:**
- [ ] `/ticket M1-09` loads the ticket and asks for a plan.

#### M1-08 Meta platform setup (non-code, weeks 1 to 10)
**Do:** everything in Section 5 in order.
**Acceptance:**
- [ ] Business verified; app created; Embedded Signup configuration ID stored in staging config.
- [ ] Test number delivers a webhook to staging through the dev tunnel.
- [ ] Both App Review submissions approved; app Live.

### Week 2: Accounts and workspaces

#### M1-09 Auth core
**Build:** signup, email verification, login, refresh rotation with reuse detection, logout, forgot / reset password, breached-password check, lockout, `GET/PATCH /me`.
**Acceptance:**
- [ ] Reused refresh token revokes the family and writes a security audit entry.
- [ ] 11th failed login in 15 minutes is rejected for that account and IP.
- [ ] Reset revokes all sessions.
- [ ] Unverified user gets `EMAIL_NOT_VERIFIED` when trying to connect a channel.

#### M1-10 Optional two-step sign-in
**Build:** TOTP setup with QR, verify, 10 recovery codes, disable with password.
**Acceptance:**
- [ ] Login asks for the code when enabled; a recovery code works once.

#### M1-11 Workspaces, members, invitations, roles
**Build:** create workspace (cap 3 per user), switcher, invitations (Admin / Agent), accept flow, change role, remove member, transfer ownership, `@RequirePermission` guard, `X-Workspace-Id` tenant guard, setting “Agents can see all conversations”.
**Acceptance:**
- [ ] Table-driven test: each role can call exactly the endpoints in Section 3.
- [ ] Removed member loses access immediately (next request returns `WORKSPACE_NOT_MEMBER`).
- [ ] A user in two workspaces only sees data of the active one.

#### M1-12 Tenant isolation suite and audit log
**Build:** isolation suite (two seeded tenants, every repository and endpoint asserted); lint rule against raw pool use; tenant and platform audit services with append-only grants.
**Acceptance:**
- [ ] Suite runs in CI on every merge and fails if a new tenant table lacks RLS.
- [ ] Update / delete on audit tables is denied for `orbit_app`.

#### M1-13 App shell, auth screens, settings shell
**Build:** sidebar (Home, Inbox, Settings) with workspace switcher and connected channels list; top bar with notifications bell placeholder, theme toggle, profile menu with availability; mobile pill row; auth screens; Settings layout with Workspace, Members, Channels, Saved replies, Profile tabs.
**Acceptance:**
- [ ] `audit.py` and axe clean in both modes at 375 and 1280.
- [ ] Every screen has a URL; browser back works.

#### M1-14 Email service and file storage
**Build:** templated emails (verify, invite, reset, channel needs attention) via SMTP / provider, Mailpit locally; S3 signed upload / download (R2 in prod) with permission checks and `tenants/{id}/` prefixes.
**Acceptance:**
- [ ] All email links work end to end locally.
- [ ] Tenant A cannot obtain a signed URL for tenant B’s file.

### Week 3: Webhooks and WhatsApp

#### M1-15 Webhook ingress
**Build:** `GET /webhooks/meta` verification; `POST` with `X-Hub-Signature-256` check on the raw body; store in `webhook_events`; enqueue `meta.event`; return 200. Separate host `hooks.yourdomain.com`.
**Acceptance:**
- [ ] Invalid signature returns 401 and stores nothing.
- [ ] p99 acknowledgement under 300 ms at 100 requests per second locally.
- [ ] Unknown asset ids are stored with `tenant_id = null` and visible in Admin lite.

#### M1-16 Connect WhatsApp (Embedded Signup)
**Build:** Facebook JS SDK launch with configuration ID; session info listener; `POST /channels/whatsapp/embedded-signup` exchanging the code, registering the number with a generated PIN (stored encrypted), subscribing `subscribed_apps`, reading number details, syncing templates; `channel_routes` row; beta limit check; payment-method reminder card.
**Acceptance:**
- [ ] Your test number connects from the UI and receives a message in staging.
- [ ] Token and PIN stored encrypted; never returned by any endpoint.
- [ ] Second WhatsApp number is refused with `PLAN_LIMIT_REACHED` under beta limits.
- [ ] Cancelling the popup leaves no half-created channel.

#### M1-17 WhatsApp adapter
**Build:** parse every inbound type and status in Section 4.4 into the normalised content shape (requirements Appendix A); send text, media (upload from object storage), template with variables; `markRead`; error mapping (131047, 131026, 131048, 131056, template errors, Graph 190) to plain-language messages.
**Acceptance:**
- [ ] Fixture test for every inbound type and status passes.
- [ ] Each mapped error produces the agreed message and the right channel state.

### Week 4: Inbound pipeline and inbox list

#### M1-18 Inbound pipeline
**Build:** `meta.event` processor: resolve tenant by `channel_routes`, upsert contact + identity, find or create the open conversation for contact + channel, insert message idempotently (`message_external_ids`), update `last_inbound_at`, `window_expires_at`, unread counts; `media.download` job saving to object storage; statuses update message rows (retry up to 5 times if the message row is not there yet); emit `message.received`.
**Acceptance:**
- [ ] The same webhook delivered twice creates one message.
- [ ] A status arriving before its message is applied once the message exists.
- [ ] Voice notes and images play / show from object storage.
- [ ] A suspended tenant still stores inbound messages.

#### M1-19 Realtime gateway
**Build:** Socket.IO `/rt` with the Redis Streams adapter on Valkey; auth on connect; `workspace:join` with membership check; rooms `tenant:`, `user:`, `conversation:`; client event bus that patches TanStack Query caches; reconnect refetch.
**Acceptance:**
- [ ] A second browser sees a new message within 2 seconds.
- [ ] An Agent without “see all” does not receive events for conversations assigned to others.

#### M1-20 Inbox list
**Build:** `GET /conversations` with views, channel filter, search, cursor pagination; list UI with virtualisation, counts, unread state, filters in URL.
**Acceptance:**
- [ ] 5,000 conversations scroll smoothly.
- [ ] Search finds a conversation by a word from a message.
- [ ] Opening a conversation clears its unread count for that user.

### Week 5: Thread, composer, ownership

#### M1-21 Thread and composer
**Build:** thread rendering for all types with sender labels and status ticks; failed message with reason + Retry; composer with Reply / Note, emoji, attachments, saved replies (`/` and chips), Enter to send; notes with `@mentions`; saved replies CRUD (shared and personal).
**Acceptance:**
- [ ] Every inbound type from M1-17 renders.
- [ ] An outbound message moves queued → sent → delivered → read live.
- [ ] A note never reaches the customer; a mention notifies the member.

#### M1-22 24-hour window and templates
**Build:** shared `canSendFreeform(conversation)` in `packages/channels`; header countdown; WhatsApp closed-window template picker with variable inputs and preview; template sync on connect and on `message_template_status_update`; Instagram / Messenger closed-window state.
**Acceptance:**
- [ ] Free text is impossible outside the window (UI and API both enforce; API returns `CONVERSATION_WINDOW_CLOSED`).
- [ ] A template with variables sends and appears in the thread labelled “Template”.
- [ ] A customer reply reopens the window and the composer returns.

#### M1-23 Assignment, status, presence
**Build:** assign / unassign, resolve / reopen, “assign to me when I reply”, system events, viewing / typing presence, availability (online / away).
**Acceptance:**
- [ ] Agents can only assign to themselves.
- [ ] New inbound message reopens a resolved conversation.
- [ ] Two agents in the same conversation see each other’s presence.

### Week 6: Facebook and Instagram

#### M1-24 Connect Facebook Pages and Instagram
**Build:** Facebook Login for Business with MVP 1 permissions; long-lived token exchange; Page picker; Page tokens stored encrypted; Page `subscribed_apps` for messaging fields; linked Instagram account detection and connect; fix-it guidance for personal or unlinked Instagram accounts; beta limits.
**Acceptance:**
- [ ] Test Page and its Instagram account connect and receive messages in staging.
- [ ] A personal Instagram account shows the guidance instead of an error.

#### M1-25 Messenger and Instagram adapters
**Build:** parse and send per Section 4.4; echoes of messages sent from Meta’s own inbox stored as “Sent outside Orbit”; story replies with preview link; reactions.
**Acceptance:**
- [ ] Fixture tests for every listed type pass.
- [ ] A reply typed in Meta Business Suite appears in Orbit labelled “Sent outside Orbit”.

#### M1-26 Channel health
**Build:** daily `channels.health` job (token debug, number status, quality, limit); auth-error flip to `needs_attention`; notifications; Reconnect flow; Disconnect with webhook unsubscribe.
**Acceptance:**
- [ ] Revoking the Page token in Meta flips the channel and notifies Owners and Admins within one failed send or the next daily check.
- [ ] Reconnect restores `connected` without losing history.

### Week 7: Home, contacts, notifications, admin, legal

#### M1-27 Contact panel
**Build:** contact panel and drawer: editable name, identifiers, tags, first seen, past conversations of the same contact.
**Acceptance:**
- [ ] Editing the name updates the list and thread header live.

#### M1-28 Home
**Build:** `metrics.home` 5-minute rollup; `GET /home/summary`; Home screen per Section 4.3 including empty state and checklist.
**Acceptance:**
- [ ] Tiles match raw counts in tests.
- [ ] Checklist items tick themselves as the actions happen.

#### M1-29 Notifications
**Build:** notification centre, sound, Web Push (VAPID), preferences, events per Section 4.5, email for channel problems.
**Acceptance:**
- [ ] Assigning a conversation pushes a browser notification to the assignee within 3 seconds.
- [ ] Turning an event off stops it on that channel only.

#### M1-30 Admin lite
**Build:** admin auth realm with mandatory TOTP; screens in Section 4.6; every action audited with reason.
**Acceptance:**
- [ ] Admin token is rejected by the tenant API and vice versa.
- [ ] Suspending a tenant blocks sending within 60 seconds; inbound keeps storing.
- [ ] Replaying an event processes idempotently.

#### M1-31 Beta limits and signup mode
**Build:** `beta` plan row with limits from Section 4.2; entitlement service with 60-second cache; overrides per tenant; signup mode and invite codes.
**Acceptance:**
- [ ] Changing a limit in Admin lite applies within 60 seconds.
- [ ] With `invite_code` mode, signup without a valid code is refused with a clear message.

#### M1-32 Legal pages, data deletion and export
**Build:** Terms, Privacy, Acceptable Use pages; consent stored at signup; Meta data deletion callback with status URL; admin scripts for workspace export (ZIP of CSV + JSON) and deletion; nightly retention job (12 months).
**Acceptance:**
- [ ] Data deletion callback returns a confirmation code and the status URL works.
- [ ] Export contains contacts, conversations and messages of one workspace only.

### Week 8: Hardening and pilot

#### M1-33 Security pass
**Build:** CSP and security headers on both apps (allowing Meta’s SDK domain for the signup popup), CORS allowlist, rate limits per IP / user / tenant, ASVS L2 checklist review, `pnpm audit`, Trivy and Semgrep in CI.
**Acceptance:**
- [ ] No high or critical findings open.

#### M1-34 Backups, monitoring, load test
**Build:** WAL archiving + daily base backup to off-site storage; media already off-server in R2; Sentry; Prometheus + Grafana dashboards; Uptime Kuma + status page; alerts (queue age > 60 s, webhook 5xx, disk > 80%, backup failure); k6 test of webhook ingress and inbox API.
**Acceptance:**
- [ ] Restore drill completed and timed (runbook updated).
- [ ] 100 webhooks per second for 10 minutes with p99 ack under 300 ms; inbox list p95 under 300 ms with 300 virtual agents.

#### M1-35 Help articles and private pilot
**Do:** write the four help articles; onboard 3 to 5 pilot businesses as Meta testers; daily check-ins for one week; fix top issues.
**Acceptance:**
- [ ] Each pilot has replied to real customers from Orbit on at least 5 days.

#### M1-36 App Review completion and public beta (weeks 9 to 10)
**Do:** answer reviewer feedback; set app Live; switch signup mode to `open`; announce.
**Acceptance:**
- [ ] Launch checklist (Section 12) fully ticked.

---

## 10. Testing focus for MVP 1

| Area | How |
|---|---|
| Tenant isolation | Isolation suite on every merge (M1-12) |
| Meta payloads | Sanitised real payload fixtures for every message type and status in `packages/channels/fixtures`; Graph API mocked with MSW |
| End to end | Playwright: signup → workspace → (mocked) connect → inbound message → reply → assign → resolve; invite + accept; window closed → template |
| Real devices | Before each production release: send every message type from a real phone on WhatsApp, Instagram and Messenger to staging and back |
| Accessibility | axe in Playwright on Home, Inbox, Settings in both modes; keyboard-only pass through the inbox |
| Load | k6 (M1-34) |

---

## 11. Definition of Done (every ticket)

- [ ] All acceptance criteria implemented and covered by tests
- [ ] Lint, typecheck, unit, integration and isolation suites pass
- [ ] New tenant tables have RLS and isolation tests
- [ ] UI checked in light and dark; `audit.py` 0 errors; empty, loading and error states present; keyboard path works
- [ ] Zod schemas, permission decorator, error codes, OpenAPI updated
- [ ] No secrets, tokens or message bodies in logs
- [ ] This file updated if scope changed
- [ ] Reviewed and merged by you

---

## 12. Launch checklist

- [ ] Meta app Live; WhatsApp, Pages and Instagram messaging permissions approved
- [ ] Webhooks subscribed for all three objects; signature check on
- [ ] Production secrets set; encryption key backed up offline
- [ ] Backups running; restore drill passed this month
- [ ] Alerts reach your phone; status page live
- [ ] Legal pages live; consent stored
- [ ] Help articles published; support email working
- [ ] Isolation suite, end-to-end tests green on the release commit
- [ ] Signup mode switched to `open`
- [ ] Rollback plan written

---

## 13. Running the beta

| Topic | Plan |
|---|---|
| Price | Free during beta. Tell users that paid plans arrive with M3 and beta users get a launch discount. |
| Your costs | Your own server, off-site backup storage (a few dollars a month), email sending. No AI cost in MVP 1. Meta bills WhatsApp message fees to each business directly. |
| Support | One support email and a WhatsApp number of your own, connected to your own Orbit workspace (dogfooding). Reply within 4 business hours. |
| Feedback | 20-minute call with each pilot after week 1; in-app “Send feedback” link to email. |
| What to watch | Connection failures by step, time to first reply, daily active workspaces, webhook errors, Meta quality ratings of connected numbers. |

---

## 14. Risks and open questions for MVP 1

| Risk / question | Mitigation / owner |
|---|---|
| Meta review takes longer than 4 weeks or is rejected | Submit early (weeks 5 and 7), clear recordings, reviewer login ready; keep piloting with testers |
| Tech Provider or Embedded Signup steps change | Start in week 1; follow Meta’s changelog; keep a manual “connect with token” fallback in Admin lite for pilots |
| Customers’ numbers already on the WhatsApp app | Explain before the popup; check Meta’s current coexistence option (engineering, week 3) |
| Astryx is in beta | Pin versions, wrap components in `packages/ui`, spike in M1-05 |
| Holidays in late December | Add one buffer week if needed; the Meta track keeps moving |
| Open: one staging server or staging on production? | Recommended: a small separate staging server (decide before M1-06) |

