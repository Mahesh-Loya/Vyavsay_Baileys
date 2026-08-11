# VyavsayAssist — Complete Project Handoff

> **Purpose of this document:** This is a full context dump for a new Claude session/account taking over the VyavsayAssist project. Read this top to bottom before doing anything. It covers what the product is, the full tech stack, what was built, how it's deployed, every credential location, what's done, what's pending, and the gotchas learned the hard way.
>
> **Last updated:** 2026-08-06
> **Current status:** Phase 1 COMPLETE. Business Verification APPROVED, live on the real business number. On 2026-08-06, GitHub Models' full retirement (2026-07-30) was discovered to have silently killed all AI replies; the AI provider was migrated to Groq (text) + Gemini (vision) + Jina (embeddings) — see §3 and gotcha #10. Everything else in this doc from before that date is unchanged and still accurate.

---

## 1. WHAT THIS PRODUCT IS

**VyavsayAssist** is a WhatsApp AI chatbot SaaS for Indian SMB showrooms (car dealerships, saree/textile shops, jewellery stores, furniture, electronics, real estate, etc.).

The pitch: a showroom connects their WhatsApp Business number, and the AI:
- Auto-replies to customer inquiries 24/7 in **Hindi, English, and Hinglish** (auto-detects language)
- Matches customer questions against the showroom's **live inventory catalog** (with prices, photos)
- **Scores leads** as Hot / Warm / Cold
- Captures **walk-in visits** via voice notes (staff records a 10-sec note, AI extracts customer name, items shown, follow-up)
- Sends **daily sales reports** and **automated follow-ups** to the owner
- Provides a **dashboard** (web app) for the owner to see conversations, leads, tasks, analytics

**Business entity / legal structure:**
- Legal business name: **Vitthal Technologies** (registered MSME in India, Udyam registration; Parbhani, Maharashtra 431401)
- Brand / product name (what customers see): **VyavsayAssist**
- Website footer says: "VyavsayAssist is a product of Vitthal Technologies"
- These are intentionally separate: legal entity = Vitthal Technologies (used for Meta verification/billing only, NEVER shown to customers); the WhatsApp Display Name customers see = "VyavsayAssist"

---

## 2. THE BIG MIGRATION (what this phase of work was about)

The product was originally built on **Baileys** (an unofficial/reverse-engineered WhatsApp library that uses a persistent WebSocket + QR-code login). This phase **migrated it to the official Meta WhatsApp Business Cloud API** (webhook-based, HTTP sends, no persistent socket).

**Why we migrated:** Baileys violates WhatsApp ToS and gets numbers banned — unacceptable for a production SaaS sold to paying clients. The official Cloud API is the only sustainable path.

**Two-repo strategy chosen by the user:**
- `Vyavsay_Baileys_Snapshot` — a FROZEN archive of the Baileys version (all branches + `baileys-final` tag). Do not touch.
- `Vyavsay_Assist-` (the active GitHub repo, note trailing dash) — the live codebase, now running the Cloud API. **This is the one we work in.** Local folder is still named `A:\WebDev\Vyavsay_Baileys` (folder name wasn't changed, only the GitHub remote).
  - GitHub remote: `https://github.com/Mahesh-Loya/Vyavsay_Assist-.git`

---

## 3. TECH STACK

**Backend** (`/backend`)
- Node.js + TypeScript, **Fastify** web framework
- **Supabase** (PostgreSQL) for database — accessed via `@supabase/supabase-js` service-role client
- AI — text (message analysis, replies, summaries, follow-ups): **Groq** (`llama-3.3-70b-versatile`), authenticated by `GROQ_API_KEY`.
- AI — vision (car-photo identification): **Gemini** (`gemini-flash-latest`), authenticated by `GEMINI_API_KEY`. Groq has no vision model, so this call stays on a separate client.
- AI — embeddings (RAG / catalog search): **Jina** (`jina-embeddings-v4`), authenticated by `JINA_API_KEY`, truncated to 1536-dim to match the existing `pgvector` schema.
- ⚠️ **History:** all three originally ran on **GitHub Models** (Azure-hosted, `https://models.inference.ai.azure.com`, `GITHUB_PAT`, GPT-4o family / `text-embedding-3-small`). GitHub **fully retired GitHub Models on 2026-07-30** (playground, model catalog, inference API, and BYOK all shut down permanently) — every AI call started silently failing and falling back to generic canned replies. Migrated off it on 2026-08-06. See the new gotcha #10 below before ever pointing this codebase back at `models.inference.ai.azure.com` — it is gone, not rate-limited.
- Voice transcription: **Groq Whisper** (primary, free) + **OpenAI** (fallback)
- TTS (voice replies): OpenAI TTS
- Vapi: voice-calling agent (separate feature, has its own webhook)
- Google Sheets sync (service account) for inventory
- Runs on port **3005**

**Frontend** (`/frontend`)
- React + Vite + TypeScript + Tailwind CSS
- Design system: cream/ink color palette, "Satoshi" display font, "Instrument Sans" body. Pastel accent colors (lavender, sage, peach, sky, honey, mint). Border radius tokens: card=20px, input=16px, pill=100px.
- Supabase Auth for login
- Runs on port 8080 in production (nginx serves the built static files)

**Deployment**
- **AWS EC2**, **Stockholm region (eu-north-1)**, instance name `vyavsay-server` (instance ID `i-0828cd1d1a2d17488`, type t3.micro, Ubuntu 24.04)
- Public IP: **51.20.19.169** | Domain: **vyavsayassist.app** (DNS A record → 51.20.19.169)
- Runs via **docker-compose**: two containers — `vyavsay_baileys-backend-1` (port 3005) and `vyavsay_baileys-frontend-1` (port 8080), behind nginx
- ⚠️ **The server is in a FRIEND'S AWS account** ("ani", account ID 016365604769). The user does NOT have SSH keys. Access is via **AWS Console → EC2 → select instance → Connect → EC2 Instance Connect** (browser-based terminal, no key needed). The user logs into this friend's AWS console.

---

## 4. KEY FILES (the Cloud API migration)

New files created during migration:
- `backend/src/services/whatsapp-cloud-client.ts` — HTTP client for Meta Graph API. Methods: `sendMessage`, `sendImage`, `sendVoiceNote`, `markRead`. Resolves per-tenant credentials from `wb_waba_accounts` table, falls back to env vars (`META_PHONE_NUMBER_ID` + `META_SYSTEM_USER_TOKEN`) for single-tenant. Exported as `cloudClient`.
- `backend/src/routes/webhook-routes.ts` — the webhook endpoint. GET `/api/webhook/whatsapp` = Meta verification handshake. POST `/api/webhook/whatsapp` = receives messages. Uses a raw-body buffer parser (Fastify destroys raw body otherwise) for HMAC verification, returns 200 immediately, processes async via `setImmediate`. Handles text/audio/image/interactive messages, dedups via `wb_webhook_events` table.
- `backend/src/utils/webhook-signature.ts` — `verifyMetaSignature()`, HMAC-SHA256 with `crypto.timingSafeEqual`.
- `backend/database/migrations/009-waba-accounts.sql` — creates `wb_waba_accounts` + `wb_webhook_events` tables.

Files modified:
- `backend/src/server.ts` — removed Baileys init + session restore; registers `webhookRoutes` at `/api/webhook`.
- `backend/src/config/environment.ts` — added `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_PHONE_NUMBER_ID`, `META_SYSTEM_USER_TOKEN`, `META_WABA_ID`.
- `backend/src/plugins/auth-plugin.ts` — added `/api/webhook/whatsapp` to PUBLIC_ROUTES (no auth).
- `pipeline-service.ts`, `reminder-service.ts`, `voice-service.ts`, `cron-service.ts`, `conversation-routes.ts` — all `baileysAdapter.*` calls swapped to `cloudClient.*` (aliased as `baileysAdapter` in pipeline-service to minimize diff).
- `health-routes.ts` — removed the old Baileys `sessions` field from health response.

Files DELETED (Baileys-specific):
- `backend/src/services/baileys-adapter.ts`
- `backend/src/services/session-manager.ts`
- `backend/src/routes/session-routes.ts`

**How to tell if the live server is running the NEW code:** `curl https://vyavsayassist.app/api/health` — the NEW code returns `{"status":"ok","uptime":"...","activeReminders":N}` with **NO `sessions` field**. If you see a `sessions` field, it's still the old Baileys code.

Landing page (built for Meta verification — needed a real website, not a dummy vercel URL):
- `frontend/src/pages/landing/` — `LandingLayout.tsx`, `LandingPage.tsx`, `PricingPage.tsx`, `PrivacyPage.tsx`, `TermsPage.tsx`, `ContactPage.tsx`
- Public routes added in `frontend/src/App.tsx`: `/`, `/pricing`, `/privacy`, `/terms`, `/contact` work WITHOUT login.

---

## 5. DATABASE (Supabase)

Supabase project URL: `https://qcahdvbzfhqmdpfiquzc.supabase.co`

Relevant tables (prefix `wb_` for WhatsApp-bot legacy, plus `customers`/`customer_visits`):
- `wb_users` — tenant/business owner accounts
- `wb_conversations` — WhatsApp conversation threads
- `wb_messages` — individual messages
- `wb_leads` — scored leads
- `wb_tasks` — extracted to-dos
- `customers` — unified customer record (one per real person per tenant). Created in migration 007.
- `customer_visits` — walk-in visit records. **NOTE:** `items_shown` column was changed from `UUID[]` to `TEXT[]` in migration 008 (voice extraction sends item *names* like "Fortuner", not catalog UUIDs — the UUID[] type caused silent INSERT failures).
- `wb_waba_accounts` — **NEW** (migration 009): per-tenant WhatsApp Cloud API credentials (`user_id`, `waba_id`, `phone_number_id`, `display_phone_number`, `access_token_encrypted`, `status`). For multi-tenant future; currently the system uses env-var fallback.
- `wb_webhook_events` — **NEW** (migration 009): dedup log for incoming webhook message IDs (`wh_message_id` unique), prevents duplicate replies when Meta retries.

Migrations live in `backend/database/migrations/`. They are run MANUALLY by pasting the SQL into the Supabase SQL Editor (no automated migration runner). Migrations 007, 008, 009 have all been run on production.

---

## 6. CREDENTIALS & IDS

**Non-secret identifiers (safe to reference):**
- Meta App ID: `923340970463232`
- WhatsApp PHONE_NUMBER_ID (current = Meta TEST number): `1069989236196057`
- WABA_ID: `1503311804548563`
- Business Portfolio ID: `825532426546728`
- Meta test "From" number: `+91 72181 84663`
- Webhook verify token: `vyavsay_webhook_2025`
- Webhook callback URL: `https://vyavsayassist.app/api/webhook/whatsapp`

**Secrets — DO NOT reprint; they live in `.env` files:**
- Local: `A:\WebDev\Vyavsay_Baileys\backend\.env`
- Server: `~/Vyavsay_Baileys/backend/.env` (on the AWS instance — SEPARATE file, not in git)
- Secret env vars: `META_APP_SECRET`, `META_SYSTEM_USER_TOKEN` (permanent System User token, starts with `EAA...`), `GROQ_API_KEY` (text generation + Whisper transcription), `GEMINI_API_KEY` (vision), `JINA_API_KEY` (embeddings), `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` (TTS/vision fallback only — account currently has no credits, see gotcha #10), `GOOGLE_SA_KEY`, `VAPI_API_KEY`. `GITHUB_PAT` (the old GitHub Models key) can stay in `.env` harmlessly but is no longer used by any code path.
- ⚠️ `.env` is gitignored. The server's `.env` must be edited directly on the server; `git pull` does NOT update it.

**System User (for the permanent token):** Meta Business Suite → Settings → Users → System Users → "VyavsayAssist Bot" (Admin access, VyavsayAssist app assigned with Full control). Token can be regenerated here if it ever breaks.

---

## 7. WHAT'S BEEN COMPLETED ✅

1. ✅ Baileys code fully removed; Cloud API code built (client, webhook, signature verify)
2. ✅ Multi-tenant DB tables created (migration 009 run on prod)
3. ✅ Landing page built + live at vyavsayassist.app (Home, Pricing, Privacy, Terms, Contact)
4. ✅ All code committed + pushed to `Vyavsay_Assist-` repo (commit `cb21b26`)
5. ✅ Deployed to AWS Stockholm via `git pull` + `sudo docker compose up -d --build`
6. ✅ Server `.env` updated with all Meta vars + system token + fresh GITHUB_PAT
7. ✅ Webhook verified in Meta + subscribed to the `messages` field
8. ✅ **END-TO-END TEST PASSED** — sent "Hi" from a phone to the test number, saw `📩 ... "Hi"` in logs, AI processed it, reply sent back (`✅ WhatsApp msg → ...`). The full round-trip works.
9. ✅ **Meta Business Verification APPROVED** (verified 2026-05-21 as "Vitthal Technologies")
10. ✅ **AI provider migrated off retired GitHub Models** (2026-08-06): text → Groq, vision → Gemini, embeddings → Jina. Verified end-to-end in production — real text replies, a full voice-note round-trip (transcription → analysis → TTS voice reply), and photo-based car identification all confirmed working from live WhatsApp messages. See gotcha #10 for the deploy trap hit along the way.

---

## 8. WHAT'S PENDING / IMMEDIATE NEXT STEPS ⏳

**Task #52 — Go live with the real business number** (IN PROGRESS, the user is doing this within ~15 min of this doc being written):

1. **Get a dedicated business number** that is NOT currently on regular WhatsApp or WhatsApp Business app. (Either a fresh SIM, or delete WhatsApp from an existing number first.) Must be able to receive an SMS/voice OTP.
2. **Add the number in Meta:** developers.facebook.com → VyavsayAssist app → WhatsApp → API Setup → "Add phone number". Set Display Name = `VyavsayAssist`. Verify via OTP.
3. **Grab the new Phone Number ID** Meta assigns to this number (different from the test number's `1069989236196057`).
4. **Update the server `.env`:** change `META_PHONE_NUMBER_ID` to the new ID, then restart the backend:
   ```
   cd ~/Vyavsay_Baileys && sudo docker compose up -d --force-recreate backend
   ```
5. **Publish the app:** App Dashboard → toggle from "Unpublished" → "Live". (Until published, only verified test recipients can message the bot.)
6. **Submit the WhatsApp Display Name** "VyavsayAssist" for approval if prompted.
7. **Test from a non-test phone** — confirm a real customer number can message and get an AI reply.

---

## 9. ROADMAP (the bigger plan)

- **Phase 1 (DONE):** Migrate to Cloud API, get ONE WABA live (own number). ← we are here, finishing
- **Phase 2 (next, 1-3 months):** First 5 paying showrooms. Manual onboarding — help each owner get their WABA approved, store their `phone_number_id` + token in `wb_waba_accounts`. Charge ~₹2,499/mo Pro plan. Validate AI retains customers.
- **Phase 3 (3-6 months):** Build **Embedded Signup** (clients click a button → Meta popup → WABA auto-created → token auto-saved to `wb_waba_accounts`). Requires becoming a **Meta Tech Provider** (separate, harder verification). Self-service signup + Razorpay billing. This is the scaling inflection point.
- **Phase 4 (6-12 months):** White-label for dealer associations, multi-region, per-vertical AI tuning.

**BSP decision (important):** The user evaluated routing through **AiSensy** (an Indian WhatsApp BSP). Decision = **stay direct with Meta.** AiSensy is a competitor selling to the same SMB showrooms; routing through them means paying a competitor, per-account fees, lock-in, and no AI advantage (Meta sets identical conversation rates for all BSPs). If Embedded Signup/Tech Provider verification becomes a brick wall at scale, the better fallback BSP is **360Dialog** (developer-friendly, no competing chatbot product) — NOT AiSensy. Re-evaluate only at Phase 3.

---

## 10. GOTCHAS / LESSONS LEARNED (save yourself the pain)

1. **AWS EC2 Instance Connect (browser terminal) corrupts long pastes.** Any paste longer than ~120 characters gets a newline injected mid-string, breaking tokens. **Fix:** split long tokens (system user token, GitHub PAT) into <120-char chunks and append with `echo -n "chunk1" >> file` then `echo "chunk2" >> file`. Always verify with `grep` that the value landed on ONE line.
2. **The verify token is NOT an access token.** `META_WEBHOOK_VERIFY_TOKEN` is just a random string YOU invent (we used `vyavsay_webhook_2025`), set identically in `.env` AND the Meta webhook form. Early on it was mistakenly set to an `EAA...` access token, which made verification fail.
3. **Server `.env` ≠ local `.env`.** `git pull` never touches `.env` (it's gitignored). Edits must be made directly on the server. When changing a credential, update BOTH if you want local dev to match.
4. **`GITHUB_PAT`/GitHub Models is retired, permanently — not a token expiry.** *(Historical note: this used to say "regenerate the PAT if you see 401s." As of 2026-07-30 GitHub Models is fully shut down — no token will ever fix a `404`/`410` from `models.inference.ai.azure.com` or `models.github.ai` again.)* The symptom is identical either way: WhatsApp send still works, but every reply is the generic fallback text ("Thank you for your message. We will get back to you shortly.") because the AI call throws. See gotcha #10.
5. **Deploy is Docker, not PM2/systemd.** Deploy = `cd ~/Vyavsay_Baileys && git pull origin main && sudo docker compose up -d --build`. To restart only backend after an `.env` change: `sudo docker compose up -d --force-recreate backend`. View logs: `sudo docker compose logs -f backend`.
6. **`docker-compose.yml` has an obsolete `version:` key** that prints a harmless WARN on every command. Can be removed but isn't critical.
7. **WhatsApp business number must NOT be on regular WhatsApp** when registering it for the Cloud API.
8. **Customers never see the legal entity name.** "Vitthal Technologies" is only for Meta's backend/billing. The customer-facing name is the WhatsApp Display Name ("VyavsayAssist"), set separately in API Setup.
9. **The local folder is named `Vyavsay_Baileys` but it's the ACTIVE Cloud API repo** — don't confuse it with the frozen `Vyavsay_Baileys_Snapshot` archive folder/repo.
10. **GitHub Models retirement (2026-07-30) — AI provider migration, and a real deploy trap.** GitHub fully retired GitHub Models; `ai-router.ts` and `rag-service.ts` now use Groq (text), Gemini (vision, `gemini-flash-latest`), and Jina (embeddings, `jina-embeddings-v4` truncated to 1536-dim). Three things worth knowing if this ever needs touching again:
    - **`--force-recreate` alone does NOT rebuild the Docker image.** After a code change (not just an `.env` change), `sudo docker compose up -d --force-recreate backend` will happily restart the container running the *old compiled `dist/`* — the exact bug that made this migration look broken in production even after `git pull` succeeded. Always use `sudo docker compose up -d --build backend` when the source changed.
    - **Gemini's free tier is capped at 20 requests/day per model.** That's why vision (car-photo ID) is the *only* thing left on Gemini — text volume would blow through it in minutes. If `identifyCarFromImage` starts returning `is_car:false`/`"unknown"` for real photos, check the logs for a `429` before assuming vision itself is broken.
    - **Gemini's OpenAI-compat endpoint has real quirks**, if another provider swap ever revisits it: it rejects system-only message arrays (needs at least one `user` turn), rejects `frequency_penalty` outright (400), and runs hidden "thinking" that silently eats `max_tokens` unless `reasoning_effort: 'low'` is set — all fixed in `ai-router.ts`, but easy to reintroduce by copy-pasting a "normal" OpenAI-shaped call.

---

## 11. HOW TO RESUME / USEFUL COMMANDS

**Connect to the server:** AWS Console (friend's account "ani") → EC2 → region **Europe (Stockholm) eu-north-1** → instance `vyavsay-server` → select → **Connect** → **EC2 Instance Connect** tab → Connect. Black terminal opens; you're `ubuntu@ip-172-31-24-88`.

**Quick health check (from anywhere):**
```
curl https://vyavsayassist.app/api/health
```

**Deploy latest code:**
```
cd ~/Vyavsay_Baileys && git pull origin main && sudo docker compose up -d --build
```

**Restart backend only (after .env change):**
```
cd ~/Vyavsay_Baileys && sudo docker compose up -d --force-recreate backend
```

**Watch live logs (to debug incoming messages):**
```
sudo docker compose logs -f backend
```

**Check an env var landed correctly:**
```
grep VAR_NAME ~/Vyavsay_Baileys/backend/.env
```

**Run a DB migration:** copy the SQL from `backend/database/migrations/00X-*.sql` → paste into Supabase SQL Editor → Run.

---

## 12. CONTEXT ON THE USER

- The user (Mahesh Loya) is the founder, building this as a real SaaS business for Indian showrooms.
- Not a deep DevOps person — needs **clear, exact, step-by-step instructions** with where-to-click detail and screenshots-driven guidance. Don't assume CLI fluency.
- The AWS server was set up by a friend; the user navigates the friend's AWS console to reach it.
- The user often says "yolo" to mean "go ahead / proceed." They move fast and trust the guidance but appreciate verification ("send me a screenshot so I can confirm").
- Email on file: s.gillespie@gecslabs.com (Claude account); business owner email in app: loyamahesh3@gmail.com.

---

*End of handoff. The new session should: (1) confirm the live server is on the new code via the health check, (2) finish Task #52 (connect real number + publish app), (3) then move toward Phase 2 onboarding. Everything needed is above or in the repo.*
