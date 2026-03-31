# Vyavsay AI WhatsApp Sales Copilot — Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2026-03-31
**Author:** Aniruddha + Claude
**Status:** Draft — Ready for Review
**First Client:** Used Car Dealer (200-1000+ inventory items)

---

## 1. Product Overview

### 1.1 What is Vyavsay?

Vyavsay is a **business-agnostic AI WhatsApp Sales Copilot** — a SaaS platform that lets any business (car dealer, salon, bakery, clinic, real estate agent) connect their WhatsApp number, upload their inventory/catalog, and let an AI assistant handle customer inquiries 24/7.

The AI reads from a **live inventory database** and a **general knowledge base**, so every reply is grounded in real, up-to-date business data — not hallucinated.

### 1.2 One-Line Pitch

> "Your smartest salesperson — on WhatsApp, 24/7, always knows your inventory."

### 1.3 Core Value Proposition

| For the Business Owner | For the Customer |
|------------------------|------------------|
| Never miss a lead — AI replies in seconds | Instant answers, no waiting on hold |
| Inventory-accurate replies — no wrong info | Feels like texting a real person |
| Zero training needed — AI learns from your data | Gets product photos + details on WhatsApp |
| Works while you sleep | Natural conversation, not a menu bot |

### 1.4 Key Differentiator

Most WhatsApp bots are **menu-driven** ("Press 1 for Sales, Press 2 for Support"). Vyavsay is **conversation-driven** — the customer just talks naturally, and the AI understands what they want, checks the live inventory, and replies like a human salesperson would.

---

## 2. User Personas

### Persona 1: Business Owner (Primary User)

**Name:** Rajesh — Used Car Dealer
**Context:** Runs a used car showroom with 300+ cars. Gets 50-100 WhatsApp inquiries daily. Has 2 salespeople who can't keep up.
**Pain Points:**
- Misses leads because salespeople are busy or it's after hours
- Customers ask "Is this car available?" but inventory changes daily
- Spends 2 hours/day answering repetitive questions (price, EMI, location)
- Can't track which leads are hot vs cold

**What Vyavsay does for Rajesh:**
- AI answers all WhatsApp inquiries instantly, 24/7
- Replies are accurate because AI reads from Rajesh's live inventory
- Hot leads are auto-scored and surfaced on the dashboard
- Rajesh only steps in for serious buyers or complaints

### Persona 2: Customer (End User on WhatsApp)

**Name:** Priya — Looking for a used Honda City
**Context:** Browsing WhatsApp for a used car. Wants quick answers without visiting the showroom.
**Expectation:** Feels like she's texting a real salesperson. Gets instant, accurate info.

**Example Conversation:**
```
Priya: Hi, do you have any Honda City?
AI:    Hey! Yes, we have 3 Honda City in stock right now, starting
       from 5.5L. Want me to share details on any specific one?
Priya: Ya, anything under 7 lakhs in white?
AI:    We have a 2021 Honda City SV in White, 35K km driven,
       single owner, priced at 6.4L. Here's a photo...
       [sends car image]
       Want to schedule a test drive?
Priya: Is EMI available?
AI:    Yes, we work with HDFC and ICICI for car loans. EMI starts
       around 12-13K/month for this one. I can connect you with
       our finance team if you'd like?
```

### Persona 3: SaaS Admin (Future — Vyavsay Team)

**Context:** Manages multiple business tenants, monitors platform health, handles billing.
**Not in scope for v1** — but architecture should support this.

---

## 3. Current State Assessment

### 3.1 What's Built (Working)

| Component | Status | Quality |
|-----------|--------|---------|
| WhatsApp Connection (Baileys) | Working | Good — multi-session, auto-reconnect |
| AI Pipeline (GPT-4o) | Working | Good — intent detection, lead scoring |
| Text-only Knowledge Base | Working | Needs rework — poor chunking, low threshold |
| Auto-Reply System | Working | Good — confidence-gated, rate-limited |
| CRM Dashboard (9 pages) | Working | Good UI, some search inputs unwired |
| Lead Scoring & Pipeline | Working | Good — 5-stage kanban |
| Task Extraction | Working | Good — AI extracts from conversations |
| Cron Automation | Working | Good — follow-ups, daily reports |
| Supabase Auth (Frontend) | Working | Frontend only — backend has NO auth |

### 3.2 What's Missing (Critical Gaps)

| Gap | Severity | Impact |
|-----|----------|--------|
| No inventory/catalog system | CRITICAL | Can't serve structured product data |
| No file upload (Excel/PDF/Image) | CRITICAL | Dealers can't bulk-load inventory |
| No backend authentication | CRITICAL | All APIs are publicly accessible |
| No image sending via WhatsApp | HIGH | Can't send product photos |
| RAG poorly tuned (threshold 0.1, 500-word chunks) | HIGH | Returns noisy, irrelevant results |
| No input validation on any route | HIGH | Security vulnerability |
| Knowledge Base search not wired | MEDIUM | Frontend search input is decorative |
| No tests | MEDIUM | No regression safety |
| No Docker/CI-CD | MEDIUM | Can't deploy to production |
| No billing/subscription | LOW (v2) | Can monetize later |

### 3.3 Architecture Changes Required

```
CURRENT ARCHITECTURE:
  WhatsApp → AI Analysis → Text RAG Search → GPT Reply

NEW ARCHITECTURE:
  WhatsApp → AI Analysis (with entity extraction)
    ↓
  Is it a product/inventory query?
    ├── YES → Hybrid Query Engine
    │         ├── Structured DB lookup (exact match)
    │         ├── Vector search (semantic fallback)
    │         ├── Filter: only active items with quantity > 0
    │         └── Merge + rank results
    └── NO  → General Knowledge RAG (FAQs, policies, hours)
    ↓
  GPT generates human-like reply with real data
    ↓
  Send text + image (if product query) via WhatsApp
```

---

## 4. Feature Specifications

### 4.1 FEATURE: AI Brain Page (Merged Inventory + Knowledge)

**Replaces:** Current "Knowledge Base" page
**Location:** Dashboard sidebar → "AI Brain"

#### 4.1.1 Page Layout

```
┌──────────────────────────────────────────────────────┐
│  AI Brain                                             │
│  "Everything your AI knows about your business"       │
│                                                       │
│  ┌──────────────┐  ┌──────────────────┐               │
│  │  Products     │  │  General Knowledge│               │
│  │  (active tab) │  │                  │               │
│  └──────────────┘  └──────────────────┘               │
│                                                       │
│  [+ Add Item]  [Upload Excel/CSV]  [Search...]        │
│                                                       │
│  ┌─ Filters ────────────────────────────────────┐     │
│  │ Category: [All ▼]  Status: [All ▼]           │     │
│  │ Price: [Min] - [Max]  Sort: [Newest ▼]       │     │
│  └──────────────────────────────────────────────┘     │
│                                                       │
│  ┌─ Inventory Table ────────────────────────────┐     │
│  │ IMG │ Name        │ Price  │ Qty │ Status    │     │
│  │ 🚗  │ Honda City  │ ₹6.4L │  1  │ Available │     │
│  │ 🚗  │ Creta SX    │ ₹12L  │  2  │ Available │     │
│  │ 🚗  │ Swift VXi   │ ₹4.8L │  0  │ Sold      │     │
│  │ ...                                          │     │
│  │              Page 1 of 12  [< 1 2 3 ... >]   │     │
│  └──────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

#### 4.1.2 Products Tab Features

| Feature | Description |
|---------|-------------|
| **Add Item** | Modal form with dynamic fields. Business owner fills in whatever fields they've defined. |
| **Edit Item** | Click row → edit modal. Changes reflect immediately in WhatsApp responses. |
| **Delete Item** | Soft delete (is_active = false). Item stops appearing in AI responses. |
| **Mark as Sold** | Quick action button. Sets quantity = 0, status = "Sold". |
| **Upload Excel/CSV** | Bulk import. System auto-detects columns, asks user to map them. |
| **Upload Image** | Per item — drag-drop or file picker. Stored in Supabase Storage. |
| **Search** | Full-text search across item names and attributes. |
| **Filter** | By category, price range, status (Available/Sold/All). |
| **Pagination** | 25 items per page. Essential for 1000+ item inventories. |
| **Sort** | By name, price, date added, quantity. |

#### 4.1.3 General Knowledge Tab Features

| Feature | Description |
|---------|-------------|
| **Add Text** | Paste business info — FAQs, policies, hours, EMI details, etc. |
| **Upload PDF** | Extract text from PDF, chunk, embed, store. |
| **List Entries** | Show all knowledge chunks with source tracking. |
| **Delete Entry** | Remove specific knowledge chunk. |
| **Search** | Search across knowledge entries (wire the existing input). |

#### 4.1.4 Column/Schema Management

Since schema is fully dynamic, the business owner needs to define what fields their inventory has:

```
┌── Manage Fields ──────────────────────────────────┐
│                                                    │
│  Field Name      Type        Required   Visible    │
│  ──────────      ────        ────────   ───────    │
│  Item Name       Text        Yes        Yes        │
│  Category        Text        No         Yes        │
│  Price           Number      Yes        Yes        │
│  Quantity        Number      Yes        Yes        │
│  Image           Image       No         Yes        │
│  ── Custom Fields ──                               │
│  Year            Number      No         Yes        │
│  Fuel Type       Dropdown    No         Yes        │
│  Color           Text        No         Yes        │
│  KM Driven       Number      No         Yes        │
│                                                    │
│  [+ Add Field]                                     │
└────────────────────────────────────────────────────┘
```

**Field Types Supported:**
- Text (free text)
- Number (integer or decimal)
- Dropdown (predefined options — e.g., Fuel: Petrol/Diesel/CNG/Electric)
- Date
- Boolean (yes/no — e.g., "Sunroof: Yes")
- Image (file upload)

---

### 4.2 FEATURE: Dynamic Schema System

#### 4.2.1 How It Works

Each business owner defines their own "schema" — the columns/fields their inventory has. This is stored as a JSONB configuration:

```json
// Example: Used Car Dealer schema
{
  "fields": [
    { "key": "brand", "label": "Brand", "type": "text", "required": true },
    { "key": "model", "label": "Model", "type": "text", "required": true },
    { "key": "year", "label": "Year", "type": "number", "required": false },
    { "key": "fuel_type", "label": "Fuel Type", "type": "dropdown", "options": ["Petrol", "Diesel", "CNG", "Electric"] },
    { "key": "km_driven", "label": "KM Driven", "type": "number" },
    { "key": "color", "label": "Color", "type": "text" },
    { "key": "owners", "label": "No. of Owners", "type": "dropdown", "options": ["1st", "2nd", "3rd", "4th+"] },
    { "key": "reg_state", "label": "Registration", "type": "text" },
    { "key": "transmission", "label": "Transmission", "type": "dropdown", "options": ["Manual", "Automatic"] }
  ]
}
```

```json
// Example: Bakery schema
{
  "fields": [
    { "key": "item", "label": "Item", "type": "text", "required": true },
    { "key": "category", "label": "Category", "type": "dropdown", "options": ["Cakes", "Pastries", "Bread", "Cookies"] },
    { "key": "weight", "label": "Weight", "type": "text" },
    { "key": "eggless", "label": "Eggless", "type": "boolean" },
    { "key": "prep_time", "label": "Prep Time", "type": "text" }
  ]
}
```

#### 4.2.2 Schema Storage

The schema definition lives in the `wb_users` table as a new JSONB column:

```sql
ALTER TABLE wb_users ADD COLUMN inventory_schema JSONB DEFAULT '{"fields":[]}';
```

#### 4.2.3 Auto-Detection from Excel Upload

When a dealer uploads an Excel file:
1. System reads the header row → extracts column names
2. Auto-detects types (numbers, dates, text)
3. Presents a mapping UI: "We found these columns: [Model, Year, Price, ...]. Confirm or adjust?"
4. Saves as the user's `inventory_schema`
5. Future uploads with same headers auto-map

---

### 4.3 FEATURE: Excel/CSV Bulk Import

#### 4.3.1 Upload Flow

```
Step 1: Dealer clicks "Upload Excel/CSV"
    ↓
Step 2: File uploaded to Supabase Storage + parsed on backend
    ↓
Step 3: System reads headers → shows preview of first 5 rows
    ↓
Step 4: If first upload → show column mapping UI
         If schema exists → auto-map, show confirmation
    ↓
Step 5: Dealer confirms → backend processes all rows:
         - For each row:
           ├── Generate text description from all fields
           ├── Create embedding of description
           └── Insert into wb_catalog_items
    ↓
Step 6: Show results: "Imported 287 items. 3 skipped (missing required fields)."
```

#### 4.3.2 Re-Upload (Update) Flow

```
Dealer uploads updated Excel (same format)
    ↓
System detects: same column structure as existing schema
    ↓
DIFF logic:
  - Match rows by item_name (or configurable "primary key" field)
  - Changed fields → UPDATE row + re-embed description
  - Missing rows → Mark is_active = false (soft delete)
  - New rows → INSERT
    ↓
Show results: "Updated 15 items, added 8 new, marked 3 as sold."
```

#### 4.3.3 Processing Architecture

```
Excel file (300 rows)
    ↓
Parse all rows → array of objects
    ↓
Generate descriptions (batch):
  Row 1 → "Honda City SV 2021, White, Petrol, Manual, 35000 km, 1st owner, MH reg, priced at 6.4 lakhs"
  Row 2 → "Hyundai Creta SX 2023, Blue, Diesel, Automatic, 12000 km, 1st owner, DL reg, priced at 14.2 lakhs"
  ...
    ↓
Batch embed (OpenAI supports array input — 1 API call for all 300):
  openai.embeddings.create({ input: [desc1, desc2, ..., desc300] })
    ↓
Batch insert into wb_catalog_items (single Supabase call)
    ↓
Done in ~5-10 seconds for 300 items
```

---

### 4.4 FEATURE: Hybrid Query Engine

This is the **core intelligence** — how the AI finds the right product when a customer asks a question.

#### 4.4.1 Query Types

| Customer Message | Query Type | Strategy |
|------------------|-----------|----------|
| "Do you have Honda City?" | Entity lookup | Structured: `item_name ILIKE '%Honda City%'` |
| "Cars under 7 lakhs" | Range query | Structured: `price <= 700000 AND quantity > 0` |
| "Any white automatic SUV?" | Multi-filter | Structured: `attributes->>'color' = 'White' AND attributes->>'transmission' = 'Automatic'` + category filter |
| "Something good for a family" | Semantic | Vector: embed query → similarity search on descriptions |
| "Compare Creta and Seltos" | Multi-entity | Structured: fetch both → format comparison |
| "What's your best car?" | Subjective | Vector: semantic search → sort by price or rating |

#### 4.4.2 Query Pipeline

```
Customer message: "Any white car under 8 lakhs?"
    ↓
Step 1: AI Entity Extraction (enhanced analyzeMessage)
  {
    intent: "inventory_inquiry",
    entities: {
      color: "white",
      price_max: 800000,
      category: null,
      model: null
    },
    query_type: "structured"
  }
    ↓
Step 2: Structured Query
  SELECT * FROM wb_catalog_items
  WHERE user_id = $1
    AND is_active = true
    AND quantity > 0
    AND price <= 800000
    AND (attributes->>'color') ILIKE '%white%'
  ORDER BY price ASC
  LIMIT 10
    ↓
  Results: 4 cars found
    ↓
Step 3: Format for GPT
  "Found 4 white cars under 8L:
   1. Maruti Swift VXi 2023, White, ₹4.8L
   2. Honda Amaze S 2022, White, ₹5.9L
   3. Hyundai i20 Asta 2021, White, ₹6.7L
   4. Honda City SV 2021, White, ₹6.4L"
    ↓
Step 4: GPT generates human-like reply
  "We have 4 white cars under 8 lakhs right now!
   Starting from a Maruti Swift at 4.8L. Want me
   to share details on any of these?"
```

#### 4.4.3 Sold Item Handling

When a customer asks for a sold item:

```
Customer: "Do you have the red Honda City?"
    ↓
Structured query → finds Honda City Red → quantity = 0, is_active = true (sold, not deleted)
    ↓
Also runs: "Find similar active items"
  SELECT * FROM wb_catalog_items
  WHERE user_id = $1 AND is_active = true AND quantity > 0
    AND item_name ILIKE '%Honda City%'
  LIMIT 5
    ↓
GPT context: "Honda City Red is sold out. Similar available: Honda City White 2022 at 6.4L, Honda Amaze Silver 2023 at 5.9L"
    ↓
AI reply: "The red Honda City just got sold unfortunately.
           But we have a white Honda City 2022 at 6.4L and
           a Honda Amaze 2023 at 5.9L. Want to check those out?"
```

#### 4.4.4 Fallback to Vector Search

When structured search returns no results (customer uses vague language):

```
Customer: "Something sporty and fun to drive"
    ↓
Entity extraction: no specific model, color, or price
    ↓
Structured query: no useful filters → 0 results
    ↓
FALLBACK → Vector search on wb_catalog_items.embedding:
  Embed "sporty and fun to drive" → cosine similarity search
  → Returns: i20 N Line, Polo GT, Swift Sport (based on description embeddings)
    ↓
Filter: only active items with quantity > 0
    ↓
GPT generates reply with these results
```

---

### 4.5 FEATURE: WhatsApp Image Sending

#### 4.5.1 How It Works

When the AI replies about a specific product that has an image:

```
Customer asks about Honda City
    ↓
Query engine finds the item → has image_url
    ↓
AI generates text reply
    ↓
Baileys sends TWO messages:
  1. Image message (with caption = brief description)
  2. Text reply (with availability, price, CTA)
    ↓
Customer sees: car photo + sales pitch
```

#### 4.5.2 Baileys Image Sending API

```typescript
// Current: text only
await socket.sendMessage(jid, { text: replyText });

// New: image + caption
await socket.sendMessage(jid, {
  image: { url: imageUrl },       // Supabase Storage URL
  caption: "Honda City SV 2021 — White, 35K km, ₹6.4L"
});

// Then follow-up text
await socket.sendMessage(jid, { text: replyText });
```

#### 4.5.3 Image Storage

- Stored in **Supabase Storage** bucket: `inventory-images/{userId}/{itemId}.jpg`
- Thumbnail generated for dashboard (optional v2)
- Max file size: 5MB (WhatsApp limit for images)
- Formats: JPG, PNG, WebP

---

### 4.6 FEATURE: Human-Like Conversation Style

**This is a core product requirement, not a nice-to-have.**

#### 4.6.1 Conversation Principles

| Principle | Example |
|-----------|---------|
| **Brief first, detail on ask** | "We have 3 Honda City from 5.5L. Want details?" — NOT a wall of text |
| **Texting style** | Short sentences. Use "..." for natural pauses. No formal language. |
| **No bot patterns** | Never say "I'd be happy to assist" or "As an AI assistant" |
| **Mirror customer energy** | If they text "yo got any cars??" reply casually. If they're formal, be professional. |
| **Always have a CTA** | End with a question — "Want to see it?", "Should I share more?", "When works for a visit?" |
| **Acknowledge + redirect** | "That one just sold actually... but we have a similar one at a great price, check this out" |
| **Use natural filler** | "let me check...", "oh yeah we have that one!", "hmm that one's actually a really good deal" |

#### 4.6.2 Updated System Prompt (for generateReply)

```
You are a friendly salesperson texting a customer on WhatsApp for "{business_name}".

RULES:
1. Text like a real human — short sentences, casual tone, natural pauses with "..."
2. NEVER say "I'm an AI" or "As an assistant" or "I'd be happy to help"
3. Keep replies to 1-3 short sentences. No walls of text.
4. If you have product data, mention 1-2 key details max, then ask if they want more
5. Always end with a question or next step
6. Match the customer's vibe — casual if they're casual, polite if they're formal
7. Use natural expressions: "oh nice", "yeah we have that", "hmm let me check"
8. No bullet points, no numbered lists, no markdown — pure text
9. No sign-offs like "Best regards" or business name
10. If something is sold out, acknowledge naturally and suggest alternatives
```

---

### 4.7 FEATURE: Backend Authentication (Security Fix)

**This blocks production deployment. Must be done.**

#### 4.7.1 Auth Middleware

Every API route (except `/api/health`) must verify the Supabase JWT:

```
Request with Authorization: Bearer <supabase_jwt>
    ↓
Auth middleware:
  1. Extract token from header
  2. Call supabase.auth.getUser(token)
  3. Verify user exists
  4. Attach user.id to request
  5. All routes use request.user.id (NOT userId from body/query)
    ↓
Route handler executes with verified user context
```

#### 4.7.2 What Changes

| Current (Broken) | Fixed |
|-------------------|-------|
| `userId` from query param — anyone can pass any ID | `request.user.id` from verified JWT |
| No auth header checked | Every route checks `Authorization: Bearer` |
| Service role key for everything | Anon key + RLS for frontend, service role only for backend-internal |
| Error messages leak DB schema | Sanitized error responses |

---

### 4.8 FEATURE: Enhanced AI Analysis (Entity Extraction)

#### 4.8.1 Updated Analysis Prompt

The `analyzeMessage()` function needs a new field — `entities` — for structured inventory queries:

```json
{
  "intent": "inventory_inquiry",
  "entities": {
    "product_name": "Honda City",
    "category": "sedan",
    "brand": "Honda",
    "color": "white",
    "price_min": null,
    "price_max": 800000,
    "attributes": {
      "fuel_type": "petrol",
      "transmission": "automatic",
      "year_min": 2020
    }
  },
  "query_type": "structured",
  "lead_score": "high",
  "confidence": 0.92,
  "should_auto_reply": true,
  "language_detected": "en",
  ...
}
```

#### 4.8.2 New Intent Types

Add to existing intents:
- `inventory_inquiry` — asking about specific product/availability
- `inventory_browse` — browsing/filtering ("show me SUVs under 10L")
- `inventory_compare` — comparing products ("Creta vs Seltos")
- `price_negotiation` — haggling on price (should escalate to human)

---

## 5. Database Schema

### 5.1 New Tables

#### `wb_source_files` — Track uploaded files

```sql
CREATE TABLE wb_source_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES wb_users(id) ON DELETE CASCADE,
  filename VARCHAR NOT NULL,
  file_type VARCHAR NOT NULL,                        -- 'excel', 'csv', 'pdf', 'image', 'text'
  storage_path TEXT,                                  -- Supabase Storage path
  file_hash VARCHAR,                                  -- SHA256 for change detection
  data_type VARCHAR DEFAULT 'unstructured',           -- 'structured' or 'unstructured'
  row_count INTEGER DEFAULT 0,
  processing_status VARCHAR DEFAULT 'pending',        -- pending | processing | completed | failed
  error_message TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_source_files_user ON wb_source_files(user_id);
```

#### `wb_catalog_items` — Dynamic inventory/product data

```sql
CREATE TABLE wb_catalog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES wb_users(id) ON DELETE CASCADE,
  source_file_id UUID REFERENCES wb_source_files(id) ON DELETE SET NULL,

  -- Core fixed fields (common to ALL businesses)
  item_name VARCHAR NOT NULL,
  category VARCHAR,
  description TEXT,                     -- Auto-generated from all fields for embedding
  price NUMERIC,
  quantity INTEGER DEFAULT 1,
  images JSONB DEFAULT '[]',              -- Array of {url, caption, order} — max 5 per item

  -- Dynamic fields (business-specific — stores ALL custom columns)
  attributes JSONB DEFAULT '{}',

  -- Vector embedding of description
  embedding VECTOR(1536),

  -- State
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for structured queries
CREATE INDEX idx_catalog_user_active ON wb_catalog_items(user_id, is_active);
CREATE INDEX idx_catalog_name ON wb_catalog_items(user_id, item_name);
CREATE INDEX idx_catalog_category ON wb_catalog_items(user_id, category) WHERE is_active = true;
CREATE INDEX idx_catalog_price ON wb_catalog_items(user_id, price) WHERE is_active = true;
CREATE INDEX idx_catalog_attrs ON wb_catalog_items USING gin(attributes);
CREATE INDEX idx_catalog_quantity ON wb_catalog_items(user_id, quantity) WHERE is_active = true;

-- Vector index (HNSW — better than IVFFlat for dynamic data)
CREATE INDEX idx_catalog_embedding ON wb_catalog_items
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Auto-update timestamp trigger
CREATE TRIGGER wb_catalog_updated
  BEFORE UPDATE ON wb_catalog_items
  FOR EACH ROW EXECUTE FUNCTION wb_update_timestamp();
```

### 5.2 Modified Tables

#### `wb_users` — Add inventory schema

```sql
ALTER TABLE wb_users ADD COLUMN inventory_schema JSONB DEFAULT '{"fields":[]}';
```

#### `wb_knowledge_base` — Add source file tracking

```sql
ALTER TABLE wb_knowledge_base
  ADD COLUMN source_file_id UUID REFERENCES wb_source_files(id) ON DELETE CASCADE,
  ADD COLUMN chunk_index INTEGER DEFAULT 0;
```

### 5.3 New RPC Functions

#### `wb_search_catalog` — Hybrid catalog search

```sql
CREATE OR REPLACE FUNCTION wb_search_catalog(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.35,
  match_count INT DEFAULT 10,
  p_user_id UUID DEFAULT NULL,
  p_category VARCHAR DEFAULT NULL,
  p_price_min NUMERIC DEFAULT NULL,
  p_price_max NUMERIC DEFAULT NULL,
  p_name_filter VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  item_name VARCHAR,
  category VARCHAR,
  description TEXT,
  price NUMERIC,
  quantity INTEGER,
  images JSONB,
  attributes JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id, ci.item_name, ci.category, ci.description,
    ci.price, ci.quantity, ci.images, ci.attributes,
    1 - (ci.embedding <=> query_embedding) AS similarity
  FROM wb_catalog_items ci
  WHERE ci.user_id = p_user_id
    AND ci.is_active = true
    AND ci.quantity > 0
    AND (p_category IS NULL OR ci.category ILIKE '%' || p_category || '%')
    AND (p_price_min IS NULL OR ci.price >= p_price_min)
    AND (p_price_max IS NULL OR ci.price <= p_price_max)
    AND (p_name_filter IS NULL OR ci.item_name ILIKE '%' || p_name_filter || '%')
    AND 1 - (ci.embedding <=> query_embedding) > match_threshold
  ORDER BY ci.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 6. API Endpoints

### 6.1 New Endpoints

#### Inventory/Catalog CRUD

```
GET    /api/catalog                      — List items (paginated, filtered, sorted)
       Query: userId, page, limit, category, status, priceMin, priceMax, search, sort
       
GET    /api/catalog/:id                  — Get single item

POST   /api/catalog                      — Add single item
       Body: { itemName, category, price, quantity, attributes, imageUrl }

PATCH  /api/catalog/:id                  — Update item (any fields)
       Body: { price?, quantity?, attributes?, is_active?, imageUrl? }

PATCH  /api/catalog/:id/sold             — Quick mark as sold (quantity = 0)

DELETE /api/catalog/:id                  — Soft delete (is_active = false)

GET    /api/catalog/stats                — Inventory summary (total, available, sold, by category)
```

#### Schema Management

```
GET    /api/schema                       — Get user's inventory schema
PATCH  /api/schema                       — Update schema (add/remove/edit fields)
```

#### File Upload & Processing

```
POST   /api/files/upload                 — Upload file (multipart)
       Returns: { fileId, filename, type, columns (if Excel), preview }

POST   /api/files/:id/process            — Process uploaded file with column mapping
       Body: { columnMapping: { "A": "item_name", "B": "price", ... } }

GET    /api/files                        — List uploaded files
DELETE /api/files/:id                    — Delete file + associated items
```

#### Enhanced Knowledge Base

```
GET    /api/knowledge                    — List knowledge entries (existing, enhanced)
POST   /api/knowledge                    — Add text knowledge (existing, keep)
POST   /api/knowledge/upload             — Upload PDF → extract, chunk, embed
DELETE /api/knowledge/:id                — Delete entry (existing, keep)
```

### 6.2 Modified Endpoints

```
GET    /api/analytics                    — Add: inventory stats (total items, sold, categories)
GET    /api/health                       — Add: file processing queue status
```

---

## 7. Frontend Changes

### 7.1 New Pages/Components

| Component | Type | Description |
|-----------|------|-------------|
| `AIBrain.tsx` | Page | Replaces KnowledgeBase.tsx. Tabs: Products + General Knowledge |
| `InventoryTable.tsx` | Component | Paginated, sortable, filterable table for catalog items |
| `ItemModal.tsx` | Component | Add/Edit modal with dynamic fields based on schema |
| `SchemaManager.tsx` | Component | Field configuration UI (add/edit/remove columns) |
| `FileUpload.tsx` | Component | Drag-drop zone + Excel column mapping wizard |
| `ColumnMapper.tsx` | Component | Map Excel columns to schema fields |
| `ImageUploader.tsx` | Component | Image upload with preview for catalog items |
| `InventoryFilters.tsx` | Component | Filter bar (category, price, status, search) |

### 7.2 Modified Pages

| Page | Changes |
|------|---------|
| `Sidebar.tsx` | Replace "Knowledge Base" link with "AI Brain" |
| `Dashboard.tsx` | Add inventory stats card (total items, available, sold) |
| `App.tsx` | Replace `/knowledge-base` route with `/ai-brain` |
| `Analytics.tsx` | Add inventory metrics (most inquired items, sold rate) |
| `Settings.tsx` | Add inventory schema management link |

### 7.3 Removed Pages

| Page | Reason |
|------|--------|
| `KnowledgeBase.tsx` | Replaced by AIBrain.tsx (Products + General Knowledge tabs) |

---

## 8. Backend Service Changes

### 8.1 New Services

| Service | File | Responsibility |
|---------|------|---------------|
| `CatalogService` | `catalog-service.ts` | CRUD on wb_catalog_items, hybrid query engine |
| `FileProcessorService` | `file-processor.ts` | Excel/CSV/PDF parsing, column detection |
| `ImageService` | `image-service.ts` | Supabase Storage upload/delete, URL generation |

### 8.2 Modified Services

| Service | Changes |
|---------|---------|
| `pipeline-service.ts` | Add entity extraction routing, catalog query integration, image sending |
| `ai-router.ts` | Add entity extraction to analyzeMessage(), new inventory-specific intents |
| `rag-service.ts` | Fix chunking (200 words), raise threshold (0.4), batch embeddings |
| `baileys-adapter.ts` | Add `sendImage()` method alongside `sendMessage()` |
| `session-manager.ts` | No changes needed |
| `cron-service.ts` | Add: daily inventory summary in sales report |

### 8.3 New Middleware

| Middleware | File | Responsibility |
|------------|------|---------------|
| `auth-middleware.ts` | `plugins/auth-plugin.ts` | Verify Supabase JWT on all routes |
| `validation-middleware.ts` | `plugins/validation-plugin.ts` | Zod schema validation on request bodies |

---

## 9. NPM Packages to Add

### Backend

```
exceljs              — Excel (.xlsx) parsing and generation
csv-parse            — CSV parsing
pdf-parse            — PDF text extraction
@fastify/multipart   — File upload support for Fastify
zod                  — Input validation schemas
```

### Frontend

```
react-dropzone       — Drag-and-drop file upload
@tanstack/react-table — Powerful table component for inventory
```

---

## 10. Development Phases

### Phase 1: Foundation (Week 1) — MUST SHIP

**Goal:** Inventory page works, dealer can add/view/edit items manually.

| Task | Est. | Priority |
|------|------|----------|
| Database migration: `wb_catalog_items`, `wb_source_files`, alter `wb_users` | 0.5d | P0 |
| Backend: `CatalogService` — CRUD operations | 1d | P0 |
| Backend: Catalog API routes (GET, POST, PATCH, DELETE) | 1d | P0 |
| Backend: Auth middleware (Supabase JWT verification) | 1d | P0 |
| Frontend: `AIBrain.tsx` page with tabs | 0.5d | P0 |
| Frontend: `InventoryTable.tsx` with pagination, sort, search | 1.5d | P0 |
| Frontend: `ItemModal.tsx` — add/edit with dynamic fields | 1d | P0 |
| Frontend: Schema management UI | 1d | P0 |
| Fix existing RAG: chunk size 200, threshold 0.4, batch embed | 0.5d | P0 |

**Deliverable:** Dealer can log in, define schema, manually add items, view inventory table.

---

### Phase 2: Intelligence (Week 2) — MUST SHIP

**Goal:** WhatsApp AI reads from inventory, replies accurately.

| Task | Est. | Priority |
|------|------|----------|
| Backend: Hybrid query engine (structured + vector) in CatalogService | 1.5d | P0 |
| Backend: Enhanced AI analysis — entity extraction, new intents | 1d | P0 |
| Backend: Modified pipeline — route inventory queries to catalog | 1d | P0 |
| Backend: Sold item handling — acknowledge + suggest alternatives | 0.5d | P0 |
| Backend: Generate item descriptions for embedding automatically | 0.5d | P0 |
| Backend: `wb_search_catalog` RPC function | 0.5d | P0 |
| Update AI prompts — human-like conversation style | 0.5d | P0 |
| Integration test: end-to-end WhatsApp → inventory → reply | 0.5d | P0 |

**Deliverable:** Customer asks about a product on WhatsApp → gets accurate, human-like reply from live inventory.

---

### Phase 3: Bulk Import + Images (Week 3) — MUST SHIP

**Goal:** Dealer can upload Excel to populate inventory, items can have photos.

| Task | Est. | Priority |
|------|------|----------|
| Install exceljs, csv-parse, @fastify/multipart | 0.5d | P0 |
| Backend: `FileProcessorService` — Excel/CSV parsing | 1.5d | P0 |
| Backend: File upload API endpoint (multipart) | 0.5d | P0 |
| Backend: Column auto-detection + mapping logic | 1d | P0 |
| Backend: Batch embedding (single API call for all rows) | 0.5d | P0 |
| Backend: Re-upload diff/sync logic | 1d | P1 |
| Frontend: `FileUpload.tsx` — drag-drop zone | 0.5d | P0 |
| Frontend: `ColumnMapper.tsx` — map columns wizard | 1d | P0 |
| Backend: Image upload to Supabase Storage | 0.5d | P0 |
| Backend: `sendImage()` in Baileys adapter | 0.5d | P0 |
| Frontend: `ImageUploader.tsx` per item | 0.5d | P0 |

**Deliverable:** Dealer uploads Excel → 300 cars appear in inventory. Cars have photos. WhatsApp sends photos to customers.

---

### Phase 4: Polish + Deploy (Week 4) — MUST SHIP

**Goal:** Production-ready for the first client.

| Task | Est. | Priority |
|------|------|----------|
| Backend: Input validation (Zod) on all routes | 1d | P0 |
| Backend: Security headers (helmet) | 0.5d | P0 |
| Backend: Error sanitization (no DB schema leaks) | 0.5d | P0 |
| Frontend: Wire search inputs (inventory, knowledge) | 0.5d | P1 |
| Frontend: Inventory filters (category, price, status) | 0.5d | P1 |
| Frontend: Dashboard — inventory stats card | 0.5d | P1 |
| PDF upload + text extraction for knowledge tab | 1d | P1 |
| Docker + docker-compose for deployment | 1d | P0 |
| Environment configs for production | 0.5d | P0 |
| Deploy to Railway/Render (backend) + Vercel (frontend) | 0.5d | P0 |
| End-to-end testing with real WhatsApp number | 1d | P0 |
| Bug fixes and QA | 1d | P0 |

**Deliverable:** Live production system. Used car dealer is using it with real customers.

---

### Phase 5: Growth (Post-Launch — v2)

| Feature | Priority | Est. |
|---------|----------|------|
| Billing + Stripe/Razorpay integration | P1 | 2w |
| Multi-user teams (invite salespeople) | P1 | 1w |
| Official WhatsApp Cloud API migration | P1 | 2w |
| Advanced analytics (most asked items, conversion funnel) | P2 | 1w |
| Inline inventory editing from dashboard (spreadsheet view) | P2 | 1w |
| API webhooks for DMS integration | P2 | 1w |
| Multi-channel (Instagram, Telegram) | P3 | 2w |
| Mobile app for dealer | P3 | 4w |

---

## 11. Success Metrics

### Launch Criteria (Must hit before going live)

- [ ] Dealer can add 300+ items to inventory (manually or Excel upload)
- [ ] Customer asks about a car → gets accurate reply with photo in <5 seconds
- [ ] Dealer marks car as sold → next WhatsApp query reflects it immediately
- [ ] AI replies feel human (pass the "show it to 5 people" test)
- [ ] No security vulnerabilities (auth on all routes, input validation)
- [ ] System handles 100+ WhatsApp conversations/day without crashing
- [ ] Runs 24/7 on cloud (not dealer's laptop)

### Post-Launch KPIs

| Metric | Target |
|--------|--------|
| Response time (WhatsApp) | < 5 seconds |
| Inventory accuracy | 100% (no hallucinated products) |
| Lead capture rate | > 80% of inquiries create a lead |
| Customer satisfaction | > 70% continue conversation (don't drop off) |
| Dealer time saved | > 3 hours/day on WhatsApp replies |

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| WhatsApp bans number (Baileys is unofficial) | Medium | Critical | Rate limiting, dedicated number, plan Cloud API migration for v2 |
| GPT-4o latency spikes | Medium | High | Cache common queries, set 10s timeout with fallback reply |
| Excel format inconsistency (dealer sends messy files) | High | Medium | Robust parser with error reporting, preview before import |
| Customer asks about item not in DB | High | Medium | Fallback: "Let me check with the team" + escalate to human |
| Large inventory slows vector search | Low | Medium | HNSW index + structured query first, vector as fallback only |
| Supabase free tier limits | Medium | High | Monitor usage, upgrade plan before launch |

---

## 13. Resolved Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | WhatsApp API | **Baileys for v1.** Cloud API migration planned for v2/Phase 5. |
| 2 | Pricing model | **Skip billing for v1.** Free pilot to prove value, monetize later. |
| 3 | Data backup / Excel export | **Yes in v1.** Dealer can download inventory as Excel anytime. |
| 4 | Images per item | **Multiple (up to 5).** Used cars need front, interior, mileage, etc. |
| 5 | Language | **Full multilingual.** English, Hindi, Hinglish, Marathi, and other regional languages. AI detects and responds in customer's language. |

---

## 14. Additional Specifications (from resolved decisions)

### 14.1 Excel Export

```
GET /api/catalog/export?userId={userId}
  → Returns: .xlsx file with all active inventory items
  → Columns match the user's inventory_schema
  → Frontend: "Download Excel" button on AI Brain → Products tab
```

### 14.2 Multiple Images Per Item

**Database change:**
```sql
-- Replace single image_url with images array
-- In wb_catalog_items, image_url becomes:
images JSONB DEFAULT '[]'
-- Format: [
--   { "url": "https://storage.../img1.jpg", "caption": "Front view", "order": 1 },
--   { "url": "https://storage.../img2.jpg", "caption": "Interior", "order": 2 },
--   ...
-- ]
-- Max 5 images per item
```

**WhatsApp behavior:**
- First image sent with caption (item name + price + key detail)
- If customer asks "show me more photos" → send remaining images
- Gallery preview not possible in WhatsApp — sent as individual image messages

**Frontend:**
- Image gallery component per item in edit modal
- Drag to reorder (first image = primary/thumbnail)
- Upload up to 5 images per item

### 14.3 Multilingual Conversation

**Supported languages:** English, Hindi, Marathi, Hinglish (mixed), + any language GPT-4o supports.

**How it works:**
- AI auto-detects language from customer's message (existing feature)
- Replies in the SAME language the customer used
- Inventory data (product names, descriptions) stays in original language
- AI translates/adapts naturally in the reply

**Example (Marathi):**
```
Customer: "Honda City available ahe ka?"
AI:       "Ho! Amchya kade 3 Honda City available ahet,
           5.5 lakh pasun suruvat. Details pahayche ka?"
```

**Example (Hinglish):**
```
Customer: "bhai koi white car hai 8 lakh ke under?"
AI:       "haan bhai, 4 white cars hai under 8L!
           Sabse sasta Maruti Swift 4.8L mein.
           Details bhejun kya?"
```

**Prompt update for generateReply:**
```
LANGUAGE RULE:
- Detect the customer's language from their message
- Reply in the EXACT same language and style
- If they mix Hindi+English (Hinglish), reply in Hinglish
- If they use Marathi, reply in Marathi
- NEVER force English on a non-English speaker
- Use informal/casual style matching their tone
```

---

*This PRD is a living document. Update as decisions are made and requirements evolve.*
