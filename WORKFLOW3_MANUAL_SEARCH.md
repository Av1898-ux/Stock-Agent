# Workflow 3 — Manual Search (n8n)

Off-universe single-stock analysis, triggered by the web app's search box.
Runs the full pipeline for ONE stock, writes it to Supabase (cached), returns it.

This needs n8n **active** (paid plan or trial). The app calls it only on a cache miss.

---

## Trigger & contract

- **Webhook** node (trigger):
  - HTTP Method: `POST`
  - Path: e.g. `manual-search`
  - Respond: **Using 'Respond to Webhook' node** (so we return after the work is done).
- The app POSTs: `{ "symbol": "TATAPOWER" }`
- The webhook's **Production URL** is what goes in Vercel's `NEXT_PUBLIC_SEARCH_WEBHOOK_URL`.

---

## Chain (reuse existing nodes wherever possible)

```
Webhook
  -> Normalize Symbol (Code: uppercase, trim, read $json.body.symbol)
  -> Check Cache (Supabase: companies where symbol ilike :symbol, limit 1)
  -> Cache Fresh? (IF: fa_updated_at within 30 days)
        true  -> Respond (already cached; app will read Supabase)   [no spend]
        false -> continue to live run
  -> Classify One (Code or single Claude call: sector/track for this symbol)
  -> Resolve Ticker (same logic as Resolve Yahoo Tickers, single item)
  -> Calculate TA (reuse the daily TA node, single item)
  -> Build FA Prompt (single) -> Call Claude FA (synchronous Messages API, NOT batch)
  -> Parse FA (single)
  -> Score One (reuse the Score node logic)
  -> Upsert Company (Supabase: insert/update companies,
        is_adhoc = true, is_active = false, fa_data, fa_updated_at = now())
  -> Save Analysis (Supabase: insert into analyses, match by company id)
  -> Respond to Webhook ({ status: 'ran', symbol })
```

### Why synchronous FA here (not the batch API)
Batch is for the 81-company nightly/quarterly jobs (cheap, async, ~30 min).
A single on-demand search must return in seconds, so use the normal
`POST https://api.anthropic.com/v1/messages` call, not the batch endpoint.

### is_adhoc / is_active
- `is_adhoc = true`, `is_active = false` → the stock is stored and searchable,
  but the **daily ranking scan ignores it** (it filters `is_active = true`),
  so a one-off search never pollutes your sector top-5.

### Caching
- The `Cache Fresh?` IF mirrors the app's check. Even though the app pre-checks,
  the workflow re-checks so direct calls are also safe.
- On a fresh hit, respond immediately and **do not call Claude** — no spend.

### GVT&D-class fix (do it here, since these save nodes are fresh)
- In `Parse FA` carry `company_id` (from the Upsert Company result) and make
  `Save Analysis` match on **id**, not symbol. This permanently avoids the
  `&`-in-symbol skip we patched in the daily flow. Worth doing here because
  these nodes are new — no retrofit risk.

---

## Test plan (before wiring to the app)

1. With n8n active, open Workflow 3 and use **Listen for test event**.
2. From a terminal or Postman: `POST <test-webhook-url>` with `{ "symbol": "TATAPOWER" }`.
   - First call → full run, writes to Supabase, returns `{ status: 'ran' }`.
   - Second call (same symbol, immediately) → `Cache Fresh?` true → returns `{ status: 'cached' }`, no Claude call.
3. Check Supabase: `SELECT symbol, is_adhoc, is_active, fa_updated_at FROM companies WHERE symbol='TATAPOWER';`
   - Should be is_adhoc = true, is_active = false, fresh timestamp.
4. Confirm it does NOT appear in the dashboard (because is_active = false).
5. Switch the webhook to **Production URL**, put it in Vercel env, redeploy.

---

## Standing hazards
- Workflow 3 must stay **isolated** from the daily/quarterly chains — it shares
  node *logic* (copies) but must not be wired into those triggers, or a search
  could fire a daily-style run.
- The webhook URL changes if the n8n workspace is recreated (e.g. trial → paid
  could regenerate it). If off-universe search breaks after you pay, re-copy the
  Production webhook URL into Vercel and redeploy.
- Synchronous FA call cost: ~1 Claude call per uncached off-universe search.
  Caching keeps repeat searches free for 30 days.
