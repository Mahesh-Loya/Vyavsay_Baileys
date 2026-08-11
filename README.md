# 🚀 VyavsayAssist — AI WhatsApp Sales Copilot

🌐 **Live Demo:** [https://vyavsayassist.app/](https://vyavsayassist.app/)

🔐 **Test Credentials:**
- **Email:** `loyamahesh11@gmail.com`
- **Password:** `VyavsayAssist`

A multi-tenant AI-powered WhatsApp Sales Assistant SaaS for Indian SMB showrooms (car dealers, saree/textile shops, jewellery stores, etc.). It automatically replies to customer inquiries in Hindi/English/Hinglish, matches questions against live inventory, scores leads, captures walk-in visits via voice note, and gives the owner a CRM dashboard — all through WhatsApp.

## 🏗️ Architecture

```
 Customer's WhatsApp
        │  message
        ▼
 Meta WhatsApp Cloud API  ───────────────────┐
        │  HMAC-signed webhook POST          │  reply (HTTP send)
        ▼                                    │
┌────────────────────────────────────────────────────────┐
│                Backend (Fastify + Node) — :3005          │
│                                                            │
│  • webhook-routes.ts   — Meta webhook in/out              │
│  • pipeline-service.ts — AI orchestrator                   │
│  • ai-router.ts        — Groq (text) + Gemini (vision)     │
│  • rag-service.ts      — Jina embeddings + pgvector search  │
│  • catalog-service.ts  — inventory search                  │
│  • cron-service.ts / reminder-service.ts — follow-ups       │
└───────────────────────┬──────────────────────────────────┘
                         │
                 ┌───────┴────────┐
                 │  Supabase       │
                 │  Postgres +     │
                 │  pgvector +     │
                 │  Auth + Storage │
                 └────────────────┘
                         ▲
                         │ REST + Supabase JWT
┌────────────────────────────────────────────────────────┐
│         Frontend (Vite + React), served by nginx        │
│         nginx also reverse-proxies /api/* → :3005 (:8080)│
│  Dashboard · Conversations · Leads · Customers ·          │
│  Analytics · Settings · Onboarding                        │
└────────────────────────────────────────────────────────┘
```

> **Evolution note:** this project did not start here. WhatsApp connectivity originally ran on **Baileys** (an unofficial, QR-code-paired library) and was migrated to the **official Meta WhatsApp Business Cloud API** in May 2026, because Baileys risks account bans and has no contractual footing for a paid SaaS. AI text/analysis originally ran on **GPT-4o via GitHub Models**; GitHub fully retired that product on **July 30, 2026**, so text generation moved to **Groq**, vision to **Gemini**, and embeddings to **Jina**. Both migrations are kept intact in git history rather than rewritten away.

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Fastify 5, TypeScript, tsx |
| WhatsApp | Official **Meta WhatsApp Business Cloud API** (webhook-based) — *previously Baileys (unofficial), migrated May 2026* |
| AI — text (analysis, replies, summaries, follow-ups) | **Groq** (`llama-3.3-70b-versatile`) — *previously GPT-4o via GitHub Models, migrated after GitHub Models' retirement on July 30, 2026* |
| AI — vision (car-photo identification) | **Gemini** (`gemini-flash-latest`) — Groq has no vision model |
| AI — embeddings (RAG / catalog search) | **Jina** (`jina-embeddings-v4`, truncated to 1536-dim to match the existing `pgvector` schema) — *previously OpenAI `text-embedding-3-small` via GitHub Models* |
| Voice transcription | Groq Whisper (primary) + OpenAI Whisper (fallback) |
| Voice replies (TTS) | Groq / OpenAI TTS |
| Database | Supabase (PostgreSQL + `pgvector`) |
| Auth | Supabase Auth (email/password), verified server-side per request |
| Deployment | Docker Compose (backend + nginx/frontend) on AWS EC2 |

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project with the `pgvector` extension enabled
- A Meta Developer app with WhatsApp Business Cloud API access (phone number ID, system user token, app secret) — see [Meta's Cloud API docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- A free [Groq](https://console.groq.com) API key (text generation + Whisper transcription)
- A free [Gemini](https://aistudio.google.com/apikey) API key (car-photo identification)
- A free [Jina](https://jina.ai/embeddings) API key (embeddings/RAG)

### 1. Clone & Install
```bash
git clone https://github.com/Vyavsay-Assist/Vyavsay_Assist-.git
cd Vyavsay_Assist-

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3005
NODE_ENV=development
FRONTEND_URL=http://localhost:3004
OWNER_EMAILS=your.email@example.com

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=catalog-images

# AI
GROQ_API_KEY=your-groq-key          # text generation + Whisper transcription
GEMINI_API_KEY=your-gemini-key      # car-photo identification (vision)
JINA_API_KEY=your-jina-key          # embeddings (RAG / catalog search)

# WhatsApp Cloud API (Meta)
META_APP_SECRET=your-meta-app-secret
META_WEBHOOK_VERIFY_TOKEN=any-string-you-invent
META_PHONE_NUMBER_ID=your-phone-number-id
META_SYSTEM_USER_TOKEN=your-system-user-token
META_WABA_ID=your-waba-id
```

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:3005/api
VITE_OWNER_EMAILS=loyamahesh3@gmail.com
```

### 3. Owner Dashboard Access
Use the owner email `loyamahesh3@gmail.com` in both backend and frontend env files.

After starting the app:
1. Sign in with `loyamahesh3@gmail.com`.
2. Open **Settings**.
3. Click **Open owner dashboard** under **Owner tools**.
4. You can also open `http://localhost:3004/owner/dashboard` directly while logged in.

If you see a 403 error, the email is not present in `OWNER_EMAILS` on the backend or `VITE_OWNER_EMAILS` on the frontend.

### 4. Database Setup
Run each migration in `backend/database/migrations/` in order (001 → 011) via the Supabase SQL Editor — there's no automated migration runner, so these are pasted in manually:

```
001-schema.sql                    # core tables: wb_users, wb_conversations, wb_messages, wb_leads, wb_tasks, wb_knowledge_base
002-inventory-and-rag-fixes.sql   # wb_catalog_items, wb_source_files, HNSW vector indexing
003-location-fields.sql
004-domain-fields.sql             # negotiation/funnel state for vertical-specific flows
006-appointment-slots.sql
007-customers-and-visits.sql      # channel-agnostic customers + walk-in visits
008-visits-items-text.sql
009-waba-accounts.sql             # per-tenant WhatsApp Cloud API credentials + webhook dedup
010-message-media.sql             # voice note / image persistence
011-agent-reasoning-trace.sql
```
(There is no `005` — a renumbering artifact; not a gap you need to fill.)

### 5. Run
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

In production, both run as Docker containers behind nginx — see `docker-compose.yml`.

## 📱 How It Works

1. **Onboarding** → New users fill in their Business Name, Industry, and Services.
2. **Connect WhatsApp** → Business owner's number is registered with Meta's WhatsApp Business Cloud API (requires Meta Business Verification — no QR scanning, no unofficial library).
3. **Knowledge Base & Catalog** → Upload FAQs, pricing, and inventory. Each entry is chunked and embedded (Jina) for RAG/semantic search.
4. **Product Images** → Add product photos from the dashboard; stored in Supabase Storage as public URLs on each catalog item.
5. **Auto-Reply** → When a customer messages the business on WhatsApp:
   - Meta POSTs a signed webhook to the backend, which analyzes intent/lead-score via Groq.
   - If the customer sent a photo, Gemini vision identifies the item and matches it to inventory.
   - RAG (Jina embeddings + `pgvector`) retrieves relevant knowledge-base/catalog entries.
   - Groq generates a context-aware reply (Hindi/English/Hinglish) using the business profile + retrieved context.
   - Reply is sent back via the Cloud API.
6. **Voice Notes** → Staff can log walk-in visits with a short voice note; Groq Whisper transcribes it and extracts customer name, items shown, and follow-up details.
7. **CRM Dashboard** → Track conversations, leads, customers, tasks, appointments, and analytics.

## 📂 Project Structure

```
Vyavsay_Assist-/
├── backend/
│   ├── src/
│   │   ├── config/environment.ts       # env var loading + validation
│   │   ├── plugins/                     # Fastify plugins (auth, Supabase, CORS)
│   │   ├── domains/                     # per-vertical prompts/config (generic, used-cars)
│   │   ├── agent/                       # experimental LangGraph agent PoC (flagged off by default)
│   │   ├── routes/
│   │   │   ├── webhook-routes.ts        # Meta Cloud API webhook (in + out)
│   │   │   ├── conversation-routes.ts   # chat history
│   │   │   ├── customer-routes.ts       # customers + walk-in visits
│   │   │   ├── catalog-routes.ts        # inventory CRUD
│   │   │   ├── lead-routes.ts           # lead scoring
│   │   │   ├── task-routes.ts           # extracted to-dos
│   │   │   ├── knowledge-routes.ts      # knowledge base CRUD
│   │   │   ├── voice-routes.ts          # walk-in voice capture
│   │   │   ├── health-routes.ts         # health + analytics
│   │   │   └── owner-routes.ts          # owner-only cross-tenant dashboard
│   │   ├── services/
│   │   │   ├── whatsapp-cloud-client.ts # Meta Graph API HTTP client
│   │   │   ├── pipeline-service.ts      # AI orchestrator (the core message flow)
│   │   │   ├── ai-router.ts             # Groq (text) + Gemini (vision) integration
│   │   │   ├── rag-service.ts           # Jina embeddings + pgvector search
│   │   │   ├── catalog-service.ts       # inventory search (structured + vector)
│   │   │   ├── sheets-sync-service.ts   # Google Sheets inventory sync
│   │   │   ├── cron-service.ts          # scheduled follow-ups/reports
│   │   │   └── reminder-service.ts      # appointment reminders
│   │   ├── utils/webhook-signature.ts   # HMAC verification for Meta webhooks
│   │   └── server.ts                    # entry point
│   ├── database/migrations/             # 001 → 011, run manually via Supabase SQL Editor
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/client.ts      # Axios client (attaches Supabase JWT)
│   │   ├── context/           # Auth context
│   │   ├── components/        # Sidebar, shared UI
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Conversations.tsx
│   │   │   ├── Leads.tsx
│   │   │   ├── Customers.tsx / CustomerDetail.tsx
│   │   │   ├── Tasks.tsx / Appointments.tsx
│   │   │   ├── KnowledgeBase.tsx
│   │   │   ├── VoiceCalls.tsx
│   │   │   ├── AIBrain.tsx / OwnerDashboard.tsx
│   │   │   ├── Analytics.tsx / Settings.tsx / Onboarding.tsx
│   │   │   ├── landing/       # public marketing site (built for Meta verification)
│   │   │   └── Login.tsx
│   │   └── App.tsx
│   └── package.json
│
├── docker-compose.yml
└── .gitignore
```

## ⚠️ WhatsApp Cloud API Notes

This runs on Meta's **official** WhatsApp Business Cloud API, not an unofficial library:
- **Business Verification required** — until your app is published, only pre-registered test numbers can message the bot.
- **Webhook signature verification** — every inbound webhook is HMAC-SHA256 verified against `META_APP_SECRET` before processing.
- **Conversation-based pricing** — Meta bills per 24-hour conversation window, not per message.
- **Messaging tiers** — new numbers start capped at a limited number of unique recipients/day; the cap rises with a good quality rating.
- **Dedicated number required** — the WhatsApp number used for the Cloud API cannot already be active on regular WhatsApp/Business app.

## 📜 License

Private — All Rights Reserved.
