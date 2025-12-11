# 🔄 Database Migration Guide

## Current Setup
- **Database:** Neon PostgreSQL
- **Issue:** Connection problems on Vercel
- **PostgreSQL Features Used:** JSONB, SERIAL, TIMESTAMPTZ

---

## ✅ Recommended: Vercel Postgres

### Why Vercel Postgres?
- ✅ **Native Integration** - Automatic DATABASE_URL setup
- ✅ **No Code Changes** - Same PostgreSQL, works immediately
- ✅ **No Connection Issues** - Built for Vercel serverless
- ✅ **Free Tier** - 256 MB storage, perfect for development
- ✅ **Easy Migration** - Just swap connection strings

### Setup Steps

1. **Add Vercel Postgres:**
   - Go to: Vercel Dashboard → Storage → Create Database
   - Select: **Postgres**
   - Choose: **Hobby** (Free tier)
   - Region: Choose closest to you

2. **DATABASE_URL is Auto-Set:**
   - Vercel automatically adds `POSTGRES_URL` and `POSTGRES_PRISMA_URL`
   - Your code uses `DATABASE_URL`, so you may need to add:
     ```
     DATABASE_URL = ${POSTGRES_URL}
     ```
   - Or update `lib/db.ts` to use `POSTGRES_URL` as fallback

3. **Run Migrations:**
   - Visit: `https://spx-iota.vercel.app/api/db/migrate`
   - Or use Vercel CLI: `vercel env pull` then `npm run db:migrate`

4. **Migrate Data (Optional):**
   - Export from Neon
   - Import to Vercel Postgres
   - Or just re-seed with your seed script

### Code Changes Needed
**Minimal** - Just update connection string handling:

```typescript
// lib/db.ts
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
```

---

## Option 2: Supabase (PostgreSQL)

### Why Supabase?
- ✅ **Better Free Tier** - 500 MB storage
- ✅ **Excellent Dashboard** - Great UI for managing data
- ✅ **Same PostgreSQL** - No code changes needed
- ✅ **Additional Features** - Auth, storage, real-time subscriptions

### Setup Steps

1. **Create Supabase Project:**
   - Go to: https://supabase.com
   - Create new project
   - Choose region closest to you

2. **Get Connection String:**
   - Project Settings → Database
   - Copy **Connection String** (URI format)
   - Use **Connection Pooling** string for serverless

3. **Update Vercel:**
   - Add `DATABASE_URL` with Supabase connection string
   - Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true`

4. **Run Migrations:**
   - Same as before: `https://spx-iota.vercel.app/api/db/migrate`

### Code Changes Needed
**None** - Works with existing code!

---

## Option 3: PlanetScale (MySQL)

### Why PlanetScale?
- ✅ **Serverless MySQL** - Great for serverless functions
- ✅ **Branching** - Database branching like Git
- ✅ **Free Tier** - 1 database, 1 GB storage

### Setup Steps

1. **Create PlanetScale Database:**
   - Go to: https://planetscale.com
   - Create database
   - Get connection string

2. **SQL Migration Required:**
   - PostgreSQL → MySQL conversion needed:
     - `JSONB` → `JSON`
     - `SERIAL` → `AUTO_INCREMENT`
     - `TIMESTAMPTZ` → `DATETIME`
     - `BIGINT` → `BIGINT` (same)
     - Remove `REFERENCES` (PlanetScale doesn't support foreign keys)

3. **Code Changes:**
   - Change `pg` library to `mysql2`
   - Update all queries for MySQL syntax
   - Update JSON handling

### Code Changes Needed
**Significant** - Would require refactoring multiple files

---

## Option 4: Turso (SQLite)

### Why Turso?
- ✅ **Edge-Optimized** - Very fast, global distribution
- ✅ **Free Tier** - 500 MB storage
- ✅ **SQLite-Based** - Simple, reliable

### Setup Steps

1. **Create Turso Database:**
   - Go to: https://turso.tech
   - Create database
   - Get connection string

2. **Major Migration Required:**
   - SQLite doesn't support:
     - JSONB (use TEXT with JSON)
     - SERIAL (use INTEGER PRIMARY KEY AUTOINCREMENT)
     - Complex joins (limited)
   - Would need schema redesign

3. **Code Changes:**
   - Change `pg` to `@libsql/client`
   - Rewrite all queries
   - Update JSON handling

### Code Changes Needed
**Major** - Significant refactoring required

---

## 📊 Comparison Table

| Feature | Vercel Postgres | Supabase | PlanetScale | Turso |
|---------|----------------|----------|-------------|-------|
| **Code Changes** | Minimal | None | Significant | Major |
| **Free Tier** | 256 MB | 500 MB | 1 GB | 500 MB |
| **Setup Time** | 5 min | 10 min | 2+ hours | 4+ hours |
| **Vercel Integration** | Native | Manual | Manual | Manual |
| **PostgreSQL Compatible** | ✅ Yes | ✅ Yes | ❌ No (MySQL) | ❌ No (SQLite) |
| **Recommended** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐ |

---

## 🎯 My Recommendation

**Use Vercel Postgres** because:
1. ✅ Solves your connection issues immediately
2. ✅ Zero code changes needed
3. ✅ Native Vercel integration (automatic setup)
4. ✅ Free tier is sufficient for development
5. ✅ Can upgrade later if needed

**Setup Time:** ~5 minutes  
**Code Changes:** 1 line (optional fallback)

---

## 🚀 Quick Start: Vercel Postgres

1. Vercel Dashboard → Storage → Create → Postgres
2. Select Hobby (Free) plan
3. Add to your project
4. Update `lib/db.ts` to use `POSTGRES_URL` as fallback
5. Redeploy
6. Run migrations
7. Done! ✅

Your connection issues will be solved immediately!

