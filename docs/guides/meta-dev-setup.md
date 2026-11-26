# Meta app setup for development (M1-08)

How to create the Meta app, test it in **development mode** with your own test assets, and hand the results to the build. This covers plan §5, weeks 1 to 2, and requirements §10.1. Going Live (App Review) is a later step, at the end of this page.

Checked against Meta's developer docs on 2026-11-26. Meta renames dashboard labels often: if a label differs, look for the closest match and update this page.

## What you will have at the end

| Value | Where it goes | Secret? |
|---|---|---|
| App ID | `META_APP_ID` | No |
| App secret | `META_APP_SECRET` | **Yes** |
| Webhook verify token (a random string you choose) | `META_VERIFY_TOKEN` | **Yes** |
| Graph API version (`v26.0` today) | `META_GRAPH_VERSION` | No |
| Embedded Signup configuration ID | `META_ES_CONFIG_ID` | No |
| WhatsApp Business Account (WABA) ID, phone number ID and test display number | Test notes (see "What to send") | No |
| System user access token (WhatsApp) | Test secret `META_TEST_WA_TOKEN` | **Yes** |
| Facebook Page ID and Instagram professional account ID | Test notes | No |
| Page access token | Test secret `META_TEST_PAGE_TOKEN` | **Yes** |

Secrets never go in chat, commits, tickets or screenshots (rule 7). Where they go is in "What to send", at the end.

## 0. Before you start (about 30 minutes, then waiting)

1. Use a personal Facebook account with **two-factor authentication** turned on. Meta requires it for developer and business admin access.
2. Create or open your **Meta Business portfolio** at business.facebook.com, as your company.
3. **Start business verification now** (Business settings → Security centre → Start verification). It takes days to weeks, and Tech Provider onboarding and going Live both need it. Development-mode testing does not, so continue below while it runs.
4. Have ready:
   - a phone with WhatsApp to receive test messages;
   - a test Facebook Page you admin (create one called "Setubandh Test Shop");
   - an Instagram account you can switch to a professional account;
   - a second Facebook account and a second Instagram account, to play the customer.

## 1. Create the app (10 minutes)

1. Go to developers.facebook.com → **My Apps** → **Create app**.
2. Name it `Setubandh AI (dev)` and give your contact email.
3. Add these **use cases** (current names; pick the closest match):
   - *Connect with customers through WhatsApp*
   - *Engage with customers on Messenger from Meta*
   - *Manage messaging & content on Instagram*. When it asks, choose the API setup **with Facebook Login** (requirements §10.3: Instagram comes through the linked Page).
4. Connect the app to your **Business portfolio**.
5. Open **App settings → Basic** and note the **App ID**. Click **Show** on **App secret** and store it as a secret right away (see "What to send"). Fill in the privacy policy URL, terms URL, app icon and category now if you have them; they are required before going Live.
6. Leave the app in **Development** mode. In development mode only people with a role on the app (Admins, Developers, Testers) can message it or connect assets.

## 2. WhatsApp with the free test number (20 minutes)

1. In the app dashboard open **WhatsApp → API Setup** (or *Quickstart*). Meta creates a **test WhatsApp Business Account** and a **test phone number** for you.
2. Note the **WhatsApp Business Account ID** and the **Phone number ID** shown on that page.
3. Under **To**, add your own WhatsApp number (up to 5 recipients) and confirm it with the code WhatsApp sends.
4. Click **Send message**. You should receive the `hello_world` template on your phone.
5. **Reply from your phone** ("Hi"). This opens the 24-hour window, so free-text replies become possible. Once webhooks are on (step 4 below), it also produces your first inbound webhook.
6. **Make a token that does not expire.** The token on the API Setup page lasts under 24 hours, so make a system user token instead:
   1. Business settings → **Users → System users** → **Add**. Name it `setubandh-dev`, role **Admin**.
   2. **Assign assets**: the app (full control) and the test WhatsApp account (full control).
   3. **Generate token**. Choose the app, set expiry to **Never**, and tick `whatsapp_business_messaging`, `whatsapp_business_management` and `business_management`.
   4. Store it as the secret `META_TEST_WA_TOKEN`.

Calling is off on test numbers. Leave it off: it is not in MVP 1.

## 3. Facebook Page for Messenger (15 minutes)

1. In the dashboard open **Messenger → Messenger API Settings**. Connect your test Page and **Generate** a Page access token. Store it as the secret `META_TEST_PAGE_TOKEN`, and note the **Page ID**.
2. **App roles → Roles → Add people**: add your second Facebook account as a **Tester**. That person must accept the invite at developers.facebook.com → *My Apps* → requests.
3. From the second account, send the Page a message on Messenger. In development mode, messages only flow to and from people with an app role.

## 4. Instagram professional account (15 minutes)

1. In the Instagram app: **Settings → Account type and tools → Switch to professional account** (Business).
2. Link it to the test Page: Facebook Page settings → **Linked accounts → Instagram → Connect**.
3. Allow apps to read messages: Instagram app → **Settings → Messages and story replies → Message controls → Connected tools → Allow access to messages** (on).
4. In the app dashboard, add the Instagram accounts that will test (yours and the "customer" account) under **App roles → Instagram testers**. Each account accepts the invite in Instagram (Settings → Apps and websites → Tester invites).
5. Note the **Instagram professional account ID**. The Messenger / Instagram settings page shows it next to the linked Page.
6. Send a DM to the professional account from the second Instagram account.

## 5. Webhooks (choose the verify token now; point them at Setubandh after M1-15)

Meta delivers events to one public **HTTPS** URL and checks it first with your verify token.

1. Create the verify token: any random string of 32 or more characters (for example the output of `openssl rand -hex 24`). Store it as the secret `META_VERIFY_TOKEN`.
2. The receiving endpoint is built in **M1-15** (`<HOOKS_URL>/webhooks/meta`). Until then, there is nothing of ours to point Meta at. After M1-15 you will:
   - run the stack locally (`pnpm dev`) and expose it with a tunnel (`cloudflared tunnel --url http://localhost:<api port>` or ngrok);
   - put `https://<tunnel host>/webhooks/meta` and the verify token in **WhatsApp → Configuration → Webhook**, and in the **Messenger** and **Instagram** webhook settings;
   - subscribe the fields below.

| Object | Fields to subscribe (plan §5) |
|---|---|
| WhatsApp Business Account | `messages`, `message_template_status_update`, `phone_number_quality_update`, `account_update` |
| Page | `messages`, `messaging_postbacks`, `message_reads`, `message_deliveries`, `message_echoes`, `message_reactions` |
| Instagram | `messages`, `messaging_postbacks`, `message_reactions` |

3. **Sample payloads are available today.** Next to each webhook field in the dashboard there is a **Test** button that sends or shows a sample payload. Copy those JSON samples (see "What to send"). They are not real traffic, but they show Meta's exact current shape.

## 6. Embedded Signup configuration (15 minutes; needed for M1-16)

Embedded Signup is the popup in which a business connects its own WhatsApp number to Setubandh (requirements §10.2).

1. Add the product **Facebook Login for Business** to the app if it is not there yet.
2. **Facebook Login for Business → Configurations → Create configuration.**
   - Login variation: **WhatsApp Embedded Signup**.
   - Permissions: `whatsapp_business_management`, `whatsapp_business_messaging` and `business_management`.
3. Copy the **Configuration ID**. This is `META_ES_CONFIG_ID`; it is not secret.
4. Under **Facebook Login for Business → Settings**, add the domains the popup is opened from:
   - the dev tunnel host (HTTPS);
   - later, the staging and production app domains.
   Facebook Login requires HTTPS, so test the popup through the tunnel rather than plain `localhost`.
5. Version: build against **Embedded Signup v4**. Meta deprecates v2 and v3 on 15 October 2026.
6. **Tech Provider onboarding:** in the WhatsApp section of the dashboard, follow *Become a Tech Provider*. It needs the business verification from step 0. Until it completes, Embedded Signup works only for people with a role on the app. That is enough for building and for our own test business.

## 7. Graph API version

Use **`v26.0`** (`META_GRAPH_VERSION=v26.0`). It is the latest version on Meta's versioning page as of this writing; v27.0 has started appearing in some changelogs. Each version is supported for about two years, and the code reads the version from config, so moving later is a one-line change.

## What to send for building and testing

I (the coding assistant) work in a cloud container that **cannot receive webhooks**. Right now it also **cannot reach `graph.facebook.com`**. So the most useful test data is recorded data, plus secrets kept where only the environment can read them.

### A. Secrets: environment settings, never chat

In the cloud session: the environment menu in the session's title bar → **Edit**. Add these as environment variables:

`META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_TEST_WA_TOKEN`, `META_TEST_PAGE_TOKEN`

A new session picks them up. On your own machine they go in your local `.env` (never committed).

If you want me to make **live calls** to Meta (for example, send a WhatsApp test message from an integration test), also add `graph.facebook.com` under **Network access → Allowed domains** in the same settings. Without it, I build against recorded payloads only, and you run the live checks locally.

### B. IDs: fine in chat, or as a file

Create `packages/testing/fixtures/meta/test-assets.json` (I can create it if you paste the values in chat):

```json
{
  "graphVersion": "v26.0",
  "appId": "...",
  "esConfigId": "...",
  "whatsapp": { "wabaId": "...", "phoneNumberId": "...", "displayNumber": "+1 555 ..." },
  "messenger": { "pageId": "..." },
  "instagram": { "accountId": "..." }
}
```

### C. Recorded payloads: the most valuable test data

Save each webhook body as its own JSON file under `packages/testing/fixtures/meta/<channel>/<event>.json`, exactly as Meta sent it. Before saving, replace real people's phone numbers, names and message text with obvious fakes (for example `+15550000001`, "Test Customer", "hello"). Keep the IDs and structure unchanged.

| Channel | Events to capture |
|---|---|
| `whatsapp/` | `text-inbound`, `image-inbound`, `status-sent`, `status-delivered`, `status-read`, `status-failed`, `template-status-update`, `phone-quality-update` |
| `messenger/` | `text-inbound`, `postback`, `echo`, `read`, `delivery`, `reaction` |
| `instagram/` | `text-inbound`, `story-reply`, `reaction`, `echo` |

Plus three **API responses** (paste the JSON; it contains no secrets):
- the send-message response (`POST /<phone-number-id>/messages`);
- the phone number details (`GET /<phone-number-id>?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier`);
- the token check (`GET /debug_token?input_token=...`), with the `input_token` removed from what you paste.

How to capture:
- **Today:** the dashboard's webhook **Test** buttons (sample shapes).
- **After M1-15:** the real thing. Our API stores every raw webhook in `webhook_events`, and they can be exported from there.
- **Not recommended:** third-party request-bin sites. They work, but they see the data. If you use one, use it only with the test number and test accounts.

## Later: going Live (weeks 5 to 10, plan §5)

1. Business verification approved (step 0) and Tech Provider onboarding complete (step 6).
2. App settings complete: privacy policy, terms, data deletion callback URL (`https://api.<domain>/meta/data-deletion`), icon and contact email.
3. **App Review**, submission 1: WhatsApp permissions. Submission 2: Pages and Instagram messaging permissions (the permission list is in plan §5). Each permission needs a screen recording of the real flow in Setubandh, plus a reviewer login.
4. While review runs, pilot businesses can be added as app **Testers** and use the app as in development mode.
5. Switch the app to **Live**.

## Sources

- [WhatsApp Cloud API: Get started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started)
- [Embedded Signup: implementation](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation/)
- [Onboarding customers as a Tech Provider](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-customers-as-a-tech-provider/)
- [Get started with Instagram Messaging](https://developers.facebook.com/documentation/business-messaging/instagram-messaging/get-started)
- [Instagram webhooks](https://developers.facebook.com/documentation/instagram-platform/webhooks)
- [Graph API versions](https://developers.facebook.com/docs/graph-api/changelog/versions/)
