# Vyavsay — Database Migration Guide

## Prerequisites
- Access to the Supabase project dashboard
- Admin/owner role on the project

---

## Step 1: Verify pgvector Extension Exists

Go to **SQL Editor** → New Query → Run:

```sql
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

Should say "Success". If vector extension fails, go to **Database → Extensions** and enable `vector` from there.

---

## Step 2: Check if Migration 001 Was Already Applied

Run this query:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'wb_%';
```

**If you see these 7 tables** → 001 is already done, skip to Step 3:
- wb_users, wb_sessions, wb_conversations, wb_messages, wb_leads, wb_tasks, wb_knowledge_base

**If you see nothing** → Run the entire `001-schema.sql` file first:
- Open the file at `backend/database/migrations/001-schema.sql`
- Copy ALL contents → Paste in SQL Editor → Run

---

## Step 3: Run Migration 002

- Open the file at `backend/database/migrations/002-inventory-and-rag-fixes.sql`
- Copy ALL contents → Paste in SQL Editor → **Run**

### What Migration 002 Does:
1. **Fixes RAG** — Adds deduplication (content_hash), file tracking (source_file_id), drops broken IVFFlat index, updates similarity threshold from 0.1 → 0.4
2. **Creates `wb_source_files` table** — Tracks uploaded Excel/CSV/PDF files
3. **Creates `wb_catalog_items` table** — Dynamic inventory with JSONB attributes, VECTOR embeddings, HNSW index, GIN index for JSON filtering
4. **Adds `inventory_schema` to `wb_users`** — Stores each business owner's custom field definitions
5. **Creates `wb_search_catalog()` RPC** — Hybrid vector + SQL search function
6. **Creates `wb_search_catalog_structured()` RPC** — Pure SQL filtered search with pagination

---

## Step 4: Verify Migration 002 Succeeded

Run this query:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'wb_%'
ORDER BY table_name;
```

**Should now show 9 tables:**
| Table | Status |
|-------|--------|
| wb_catalog_items | NEW |
| wb_conversations | Existing |
| wb_knowledge_base | Updated |
| wb_leads | Existing |
| wb_messages | Existing |
| wb_sessions | Existing |
| wb_source_files | NEW |
| wb_tasks | Existing |
| wb_users | Updated |

---

## Step 5: Verify New Columns Were Added

```sql
-- Check wb_users has inventory_schema
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'wb_users' AND column_name = 'inventory_schema';

-- Check wb_knowledge_base has content_hash
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'wb_knowledge_base' AND column_name = 'content_hash';
```

Both should return 1 row each.

---

## Step 6: Verify RPC Functions Exist

```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE 'wb_%';
```

**Should show 4 functions:**
| Function | Status |
|----------|--------|
| wb_match_knowledge | Updated (threshold 0.4) |
| wb_search_catalog | NEW |
| wb_search_catalog_structured | NEW |
| wb_update_timestamp | Existing |

---

## Step 7: Create Storage Bucket for Images

1. Go to **Storage** in the left sidebar
2. Click **New Bucket**
3. Name: `inventory-images`
4. Public bucket: **ON**
5. Click **Create bucket**

---

## Step 8: Share Credentials with Dev Team

Go to **Settings → API** and share these values:

| Value | Where to Find |
|-------|--------------|
| Project URL | `https://xxxxx.supabase.co` — top of the API page |
| anon public key | Under "Project API keys" → `anon` `public` |
| service_role key | Under "Project API keys" → `service_role` `secret` (click reveal) |

---

## Troubleshooting

### "relation already exists" error
That part was already applied. Safe to ignore. The migration uses `IF NOT EXISTS` for tables, but some ALTER statements may error if run twice.

### "extension vector does not exist"
Go back to Step 1. Enable pgvector from **Database → Extensions** in the Supabase dashboard.

### "permission denied"
Make sure you're logged in as the project owner, not a read-only role.

### Running migration twice
Safe to re-run. Tables use `IF NOT EXISTS`, functions use `CREATE OR REPLACE`. Only the `ALTER TABLE` statements may show errors on second run — these are harmless.

---

## Migration Files

| File | Location | Description |
|------|----------|-------------|
| 001-schema.sql | `backend/database/migrations/001-schema.sql` | Original 7 tables, indexes, triggers |
| 002-inventory-and-rag-fixes.sql | `backend/database/migrations/002-inventory-and-rag-fixes.sql` | Inventory system, RAG fixes, search functions |
