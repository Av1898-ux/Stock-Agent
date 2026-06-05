// ============================================================
// Data layer — every Supabase read the app needs.
// READ ONLY. No writes from the browser. (Off-universe writes
// happen inside n8n Workflow 3 via the service_role key.)
// ============================================================
import { supabase } from './supabaseClient';
import type { AnalysisRow, Sector } from './types';

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
// Returns rows already joined with company name/symbol.
export async function getTopPicks(): Promise<AnalysisRow[]> {
  const latest = await latestScanDate();
  if (!latest) return [];
  // analyzed_at is a full timestamp; compare by date so all rows from
  // the latest run are included even if their timestamps differ slightly.
  const day = latest.slice(0, 10);
  // Try the embedded join first (works if the FK relationship is declared).
  const embedded = await supabase
    .from('analyses')
    .select(
      `id, company_id, sector, track, analyzed_at, adjusted_score, total_score,
       fa_score, fa_max, ta_score, ta_max, verdict, verdict_action,
       rank_in_sector, in_top5, flags, ai_narrative,
       companies ( symbol, name )`
    )
    .gte('analyzed_at', day + 'T00:00:00')
    .eq('in_top5', true)
    .order('sector', { ascending: true })
    .order('rank_in_sector', { ascending: true });

  if (!embedded.error && embedded.data) {
    return embedded.data.map(flatten);
  }

  // Fallback: FK not declared -> two-query manual join.
  console.warn('getTopPicks: embedded join failed, using manual join', embedded.error);
  const base = await supabase
    .from('analyses')
    .select(
      `id, company_id, sector, track, analyzed_at, adjusted_score, total_score,
       fa_score, fa_max, ta_score, ta_max, verdict, verdict_action,
       rank_in_sector, in_top5, flags, ai_narrative`
    )
    .gte('analyzed_at', day + 'T00:00:00')
    .eq('in_top5', true)
    .order('sector', { ascending: true })
    .order('rank_in_sector', { ascending: true });
  if (base.error || !base.data) {
    console.error('getTopPicks error', base.error);
    return [];
  }
  const ids = Array.from(new Set(base.data.map((r: any) => r.company_id)));
  const { data: comps } = await supabase
    .from('companies')
    .select('id, symbol, name')
    .in('id', ids);
  const byId: Record<string, any> = {};
  (comps || []).forEach((c: any) => { byId[c.id] = c; });
  return base.data.map((r: any) => {
    const c = byId[r.company_id] || {};
    return { ...r, symbol: c.symbol, name: c.name } as AnalysisRow;
  });
}

// --- Full latest analysis for one company (by symbol) --------------
export async function getLatestForSymbol(symbol: string): Promise<AnalysisRow | null> {
  const sym = symbol.trim().toUpperCase();
  // find the company first
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
  // attach company identity (already fetched above) + price from technical_data
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
// Returns: 'fresh' (read from Supabase), 'stale' (re-run), 'absent' (off-universe, run live)
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

// --- helper: flatten the joined companies object onto the row ------
function flatten(row: any): AnalysisRow {
  // Supabase may return the embed as an object or a 1-element array.
  let c = row.companies || {};
  if (Array.isArray(c)) c = c[0] || {};
  const out: any = { ...row, symbol: c.symbol, name: c.name };
  delete out.companies;
  // pull current_price out of technical_data if present
  if (out.technical_data && out.technical_data.current_price != null) {
    out.current_price = Number(out.technical_data.current_price);
  }
  return out as AnalysisRow;
}
