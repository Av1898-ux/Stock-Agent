// ============================================================
// /api/search-live  — off-universe live analysis via n8n.
// Flow:
//   1. Check cache (companies.fa_updated_at). If fresh -> tell client to read Supabase.
//   2. If absent/stale AND webhook configured -> POST symbol to n8n Workflow 3.
//      n8n runs the single-stock pipeline, WRITES to Supabase, returns the analysis.
//   3. If no webhook configured -> graceful message (off-universe disabled).
// This route runs server-side so the webhook URL isn't required to be public,
// and so we never expose write credentials to the browser.
// ============================================================
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const WEBHOOK = process.env.NEXT_PUBLIC_SEARCH_WEBHOOK_URL || '';
const CACHE_FRESH_DAYS = 30;

const sb = createClient(url, anon, { auth: { persistSession: false } });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  const symbolRaw = (req.body?.symbol || '').toString().trim().toUpperCase();
  if (!symbolRaw) return res.status(400).json({ error: 'symbol required' });

  // 1. cache check
  const { data: comp } = await sb
    .from('companies')
    .select('symbol, fa_updated_at')
    .ilike('symbol', symbolRaw)
    .limit(1)
    .maybeSingle();

  if (comp && comp.fa_updated_at) {
    const ageDays = (Date.now() - new Date(comp.fa_updated_at).getTime()) / 86400000;
    if (ageDays <= CACHE_FRESH_DAYS) {
      // fresh — client should just read from Supabase, no n8n call, no cost.
      return res.status(200).json({ status: 'cached', symbol: comp.symbol });
    }
  }

  // 2. needs a live run
  if (!WEBHOOK) {
    return res.status(200).json({
      status: 'webhook_disabled',
      message:
        'Live analysis for stocks outside your tracked universe needs the n8n Manual Search workflow active. Add NEXT_PUBLIC_SEARCH_WEBHOOK_URL once Workflow 3 is live.',
    });
  }

  try {
    const r = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ symbol: symbolRaw }),
    });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ status: 'error', message: 'n8n returned ' + r.status, detail: txt.slice(0, 300) });
    }
    const out = await r.json().catch(() => ({}));
    // n8n is expected to have written to Supabase; tell client to read it.
    return res.status(200).json({ status: 'ran', symbol: symbolRaw, n8n: out });
  } catch (e: any) {
    return res.status(502).json({ status: 'error', message: e.message });
  }
}
