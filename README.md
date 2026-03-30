# 🚀 Vyavsay — AI WhatsApp Sales Copilot

A multi-tenant AI-powered WhatsApp Sales Assistant SaaS that automatically handles customer inquiries, scores leads, extracts tasks, and schedules appointments — all through WhatsApp.

## 🏗️ Architecture

```
┌──────────────────────────────┐     ┌─────────────────────────────────┐
│   Frontend (Vite + React)    │     │    Backend (Fastify + Node)     │
│   Port: 3003                 │────▶│    Port: 3005                   │
│                              │     │                                 │
│  • Dashboard                 │     │  • Session Manager (Baileys)    │
│  • QR Scanner                │     │  • AI Pipeline (GPT-4o)         │
│  • Conversations             │     │  • RAG Service (pgvector)       │
│  • Leads Management          │     │  • Cron Service (Follow-ups)    │
│  • Knowledge Base            │     │  • Reminder Service             │
│  • Analytics                 │     │                                 │
│  • Settings                  │     │        ┌────────────────┐       │
│  • Onboarding                │     │        │  Supabase DB   │       │
└──────────────────────────────┘     │        └────────────────┘       │
                                     │        ┌────────────────┐       │
                                     │        │  WhatsApp Web  │       │
                                     │        │  (via Baileys) │       │
                                     │        └────────────────┘       │
                                     └─────────────────────────────────┘
```

## ⚙️ Tech Stack

| Layer       | Technology                                  |
|-------------|---------------------------------------------|
| Frontend    | React 18, Vite 6, TypeScript, Framer Motion |
| Backend     | Fastify 5, TypeScript, tsx                   |
| WhatsApp    | @whiskeysockets/baileys (v7 rc9)             |
| AI          | GPT-4o via GitHub Models (Azure endpoint)    |
| Database    | Supabase (PostgreSQL + pgvector)             |
| Auth        | Supabase Auth (email/password)               |
| Styling     | Custom CSS + Lucide Icons                    |

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project with pgvector enabled
- A GitHub PAT with access to GitHub Models (GPT-4o)

### 1. Clone & Install
```bash
git clone https://github.com/YourUser/Vyavsay_Baileys.git
cd Vyavsay_Baileys

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3005
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GITHUB_PAT=your-github-pat-for-ai
AUTH_SESSIONS_DIR=./auth_sessions_v2/
FRONTEND_URL=http://localhost:3003
NODE_ENV=development
```

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:3005/api
```

### 3. Database Setup
Run the migration SQL in Supabase SQL Editor:
```bash
# File: backend/database/migrations/001-schema.sql
```
This creates all tables (`wb_users`, `wb_conversations`, `wb_messages`, `wb_leads`, `wb_tasks`, `wb_knowledge_base`) with pgvector indexes and the `wb_match_knowledge` RPC function.

### 4. Run
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

## 📱 How It Works

1. **Onboarding** → New users fill in their Business Name, Industry, and Services.
2. **QR Scan** → Link your WhatsApp number via QR code (Baileys).
3. **Knowledge Base** → Upload your business FAQs, pricing, and services. Each entry is chunked and vectorized.
4. **Auto-Reply** → When a customer messages you on WhatsApp:
   - Message is analyzed by GPT-4o for **intent** and **lead score**.
   - RAG retrieves relevant **knowledge base** entries.
   - AI generates a **context-aware reply** using your business profile + knowledge.
   - Reply is sent automatically via Baileys.
5. **CRM Dashboard** → Track conversations, leads, tasks, and analytics in real-time.

## 📂 Project Structure

```
Vyavsay_Baileys/
├── backend/
│   ├── src/
│   │   ├── config/           # Environment config
│   │   ├── plugins/          # Fastify plugins (CORS, Supabase)
│   │   ├── routes/           # API endpoints
│   │   │   ├── session-routes.ts      # QR & session management
│   │   │   ├── conversation-routes.ts # Chat history
│   │   │   ├── lead-routes.ts         # Lead scoring
│   │   │   ├── task-routes.ts         # Extracted tasks
│   │   │   ├── knowledge-routes.ts    # Knowledge base CRUD
│   │   │   ├── user-routes.ts         # User profile
│   │   │   └── health-routes.ts       # Analytics & health
│   │   ├── services/
│   │   │   ├── session-manager.ts     # Baileys socket management
│   │   │   ├── baileys-adapter.ts     # Message bridge
│   │   │   ├── pipeline-service.ts    # AI orchestrator
│   │   │   ├── ai-router.ts          # GPT-4o integration
│   │   │   ├── rag-service.ts        # Vector search (pgvector)
│   │   │   ├── cron-service.ts       # Scheduled follow-ups
│   │   │   └── reminder-service.ts   # Appointment reminders
│   │   ├── utils/             # Rate limiter
│   │   └── server.ts          # Entry point
│   ├── database/
│   │   └── migrations/001-schema.sql
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/client.ts      # Axios API client
│   │   ├── context/           # Auth context
│   │   ├── components/        # Sidebar, shared UI
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── QRScanner.tsx
│   │   │   ├── Conversations.tsx
│   │   │   ├── Leads.tsx
│   │   │   ├── Tasks.tsx
│   │   │   ├── KnowledgeBase.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Onboarding.tsx
│   │   │   └── Login.tsx
│   │   └── App.tsx
│   └── package.json
│
└── .gitignore
```

## ⚠️ Baileys Safety Notes

Baileys uses an **unofficial WhatsApp Web API** — use with caution:
- **Rate Limit**: Built-in rate limiter ensures messages are spaced out.
- **Don't spam**: Only reply to incoming messages. Never send unsolicited bulk messages.
- **Use a dedicated number**: Don't use your personal WhatsApp for this.
- **Session Persistence**: Auth sessions are stored in `auth_sessions_v2/` — no need to re-scan QR after server restart if sessions are preserved.

## 📜 License

Private — All Rights Reserved.
