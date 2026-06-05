// ============================================================
// Data layer — every Supabase read the app needs.
// READ ONLY. No writes from the browser. (Off-universe writes
// happen inside n8n Workflow 3 via the service_role key.)
// ============================================================
import { supabase } from './supabaseClient';
import type { AnalysisRow } from './types';

// Freshness window for cached off-universe analyses (days).
export const CACHE_FRESH_DAYS = 30;

// --- the latest scan date present in the analyses table -------------
async function latestScanDate(): Promise<string | null> {
  const { data, error } = await supabase
    .from('analyses')
    .select('analyzed_at')
    .order('analyzed_at', { ascending: false })
    .limit(1);
  if (error || !data || !data.length) return null;
  return data[0].analyzed_at;
}

// --- Dashboard: top-5 per sector from the most recent scan ---------
// Dedupes to the most-recent analyses row PER company, so multiple
// scan runs on the same day never double the cards.
export async function getTopPicks(): Promise<AnalysisRow[]> {
  const latest = await latestScanDate();
  if (!latest) return [];
  const day = latest.slice(0, 10);

  // Pull all of today's in_top5 rows, newest first (may span >1 run).
  const base = await supabase
    .from('analyses')
    .select(
      `id, company_id, sector, track, analyzed_at, adjusted_score, total_score,
       fa_score, fa_max, ta_score, ta_max, verdict, verdict_action,
       rank_in_sector, in_top5, flags, ai_narrative, technical_data`
    )
    .gte('analyzed_at', day + 'T00:00:00')
    .eq('in_top5', true)
    .order('analyzed_at', { ascending: false });

  if (base.error || !base.data) {
    console.error('getTopPicks error', base.error);
    return [];
  }

  // DEDUPE: keep only the most-recent row per company (rows are newest-first).
  const seen = new Set<string>();
  const latestPer = base.data.filter((r: any) => {
    if (seen.has(r.company_id)) return false;
    seen.add(r.company_id);
    return true;
  });

  // Attach company name/symbol via a second query (no FK dependency).
  const ids = Array.from(new Set(latestPer.map((r: any) => r.company_id)));
  const { data: comps } = await supabase
    .from('companies')
    .select('id, symbol, name')
    .in('id', ids);
  const byId: Record<string, any> = {};
  (comps || []).forEach((c: any) => { byId[c.id] = c; });

  const rows: AnalysisRow[] = latestPer.map((r: any) => {
    const c = byId[r.company_id] || {};
    const out: any = { ...r, symbol: c.symbol, name: c.name };
    if (out.technical_data && out.technical_data.current_price != null) {
      out.current_price = Number(out.technical_data.current_price);
    }
    return out as AnalysisRow;
  });

  // Sort for display: sector, then rank within sector.
  rows.sort((a, b) => {
    if (a.sector !== b.sector) return a.sector < b.sector ? -1 : 1;
    return (a.rank_in_sector || 99) - (b.rank_in_sector || 99);
  });
  return rows;
}

// --- Full latest analysis for one company (by symbol) --------------
export async function getLatestForSymbol(symbol: string): Promise<AnalysisRow | null> {
  const sym = symbol.trim().toUpperCase();
  const { data: comp } = await supabase
    .from('companies')
    .select('id, symbol, name, fa_updated_at, is_adhoc')
    .ilike('symbol', sym)
    .limit(1)
    .maybeSingle();
  if (!comp) return null;
  const { data, error } = await supabase
    .from('analyses')
    .select(
      `id, company_id, sector, track, analyzed_at, adjusted_score, total_score,
       fa_score, fa_max, ta_score, ta_max, verdict, verdict_action,
       rank_in_sector, in_top5, flags, fa_breakdown, ta_breakdown,
       fa_reasons, ta_reasons, gate_results, gate_penalties, gate_score_cap,
       hard_filter_passed, hard_filter_reason, ai_narrative,
       fundamental_data, technical_data`
    )
    .eq('company_id', comp.id)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const out: any = { ...data, symbol: comp.symbol, name: comp.name };
  if (out.technical_data && out.technical_data.current_price != null) {
    out.current_price = Number(out.technical_data.current_price);
  }
  return out as AnalysisRow;
}

// --- Search the universe by symbol or name -------------------------
export async function searchCompanies(q: string): Promise<
  { symbol: string; name: string; sector: string; is_active: boolean; is_adhoc: boolean }[]
> {
  const term = q.trim();
  if (!term) return [];
  const { data, error } = await supabase
    .from('companies')
    .select('symbol, name, sector, is_active, is_adhoc')
    .or(`symbol.ilike.%${term}%,name.ilike.%${term}%`)
    .limit(15);
  if (error) {
    console.error('searchCompanies error', error);
    return [];
  }
  return (data || []) as any;
}

// --- Is a given symbol cached & fresh? -----------------------------
export async function cacheState(symbol: string): Promise<'fresh' | 'stale' | 'absent'> {
  const sym = symbol.trim().toUpperCase();
  const { data } = await supabase
    .from('companies')
    .select('fa_updated_at')
    .ilike('symbol', sym)
    .limit(1)
    .maybeSingle();
  if (!data) return 'absent';
  if (!data.fa_updated_at) return 'stale';
  const ageDays = (Date.now() - new Date(data.fa_updated_at).getTime()) / 86400000;
  return ageDays <= CACHE_FRESH_DAYS ? 'fresh' : 'stale';
}
