# Stock Agent — Web App

Dark terminal-style dashboard for your NSE-500 dual-track stock agent.
Reads from Supabase. Mobile + desktop.

- **Dashboard** — daily top-5 per sector, scores, verdicts, flags.
- **Search** — any tracked company (instant, from Supabase) + off-universe live analysis (via n8n, cached 30 days).
- **Stock detail** — full score, FA/TA breakdown, gates, flags, narrative.

---

## STEP 0 — Run the Supabase setup (2 min)

1. Open Supabase → **SQL Editor**.
2. Paste the contents of `SUPABASE_SETUP.sql` and **Run**.
   - Adds the `is_adhoc` column.
   - Turns on read-only public access (so the app can read but nobody can write via the browser).
   - Your n8n workflows are unaffected (they use the service key, which bypasses these rules).

---

## STEP 1 — Put the code on GitHub (web UI, no terminal needed)

1. Go to https://github.com/new → create a repo, e.g. `stock-agent-app` (Private is fine).
2. On the new empty repo page, click **uploading an existing file**.
3. Drag in **all** files and folders from this project (keep the folder structure: `pages/`, `lib/`, `components/`, `styles/`).
   - Do NOT upload `node_modules`, `.next`, or `.env.local` (none are included here anyway).
4. Commit.

> Terminal alternative (if you prefer): `git init && git add . && git commit -m "init" && git branch -M main && git remote add origin <your-repo-url> && git push -u origin main`

---

## STEP 2 — Deploy on Vercel (3 min)

1. Go to https://vercel.com → sign in with GitHub.
2. **Add New… → Project** → import your `stock-agent-app` repo.
3. Framework preset: **Next.js** (auto-detected). Leave build settings default.
4. **Before deploying**, expand **Environment Variables** and add these three:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase **anon public** key |
   | `NEXT_PUBLIC_SEARCH_WEBHOOK_URL` | leave **blank** for now (set after Workflow 3) |

   Find the first two in Supabase → **Settings → API**.
   **Never** use the `service_role` key here.

5. Click **Deploy**. After ~1 min you get a live URL (e.g. `stock-agent-app.vercel.app`). Open it on your phone.

---

## STEP 3 — Off-universe live search (after you build Workflow 3 in n8n)

Off-universe search calls an n8n webhook. Until that webhook exists, the app works fully for
your tracked universe; off-universe just shows a "needs n8n" message.

When Workflow 3 is live (see `WORKFLOW3_MANUAL_SEARCH.md`):
1. Copy its **Production webhook URL** from n8n.
2. In Vercel → your project → **Settings → Environment Variables**, set
   `NEXT_PUBLIC_SEARCH_WEBHOOK_URL` to that URL.
3. **Redeploy** (Vercel → Deployments → ⋯ → Redeploy) so the new env var takes effect.

---

## How caching works (so you don't pay for repeat searches)

- Searching a tracked company → reads Supabase. No n8n, no cost.
- Searching an off-universe stock:
  - If it was searched before and its FA is < 30 days old → reads Supabase. **No new FA call.**
  - If new or stale (> 30 days) → calls n8n once, which re-analyzes and saves it. Next searches within 30 days are free again.
- The freshness window is `CACHE_FRESH_DAYS = 30` in `lib/data.ts` and `pages/api/search-live.ts` (change both if you want a different window).

---

## Local development (optional, needs terminal)

```
cp .env.local.example .env.local   # fill in your values
npm install
npm run dev                         # http://localhost:3000
```
