// ============================================================
// Shared types + display helpers for the Stock Agent app.
// ============================================================

export type Sector =
  | 'infra_capex'
  | 'capital_goods'
  | 'defence'
  | 'semiconductor_electronics'
  | 'ai_infrastructure';

export interface AnalysisRow {
  id: string;
  company_id: string;
  symbol: string;
  name: string;
  sector: Sector;
  track: 'A' | 'B';
  analyzed_at: string;
  adjusted_score: number;
  total_score: number;
  fa_score: number;
  fa_max: number;
  ta_score: number;
  ta_max: number;
  verdict: string | null;
  verdict_action: string | null;
  rank_in_sector: number | null;
  in_top5: boolean | null;
  flags: string[] | null;
  fa_breakdown: any;
  ta_breakdown: any;
  fa_reasons: any;
  ta_reasons: any;
  gate_results: any;
  gate_penalties: number | null;
  gate_score_cap: number | null;
  hard_filter_passed: boolean | null;
  hard_filter_reason: string | null;
  ai_narrative: string | null;
  fundamental_data: any;
  technical_data: any;
  current_price?: number | null;
}

export const SECTORS: { key: Sector; label: string; track: 'A' | 'B' }[] = [
  { key: 'infra_capex', label: 'Infrastructure & EPC', track: 'A' },
  { key: 'capital_goods', label: 'Capital Goods', track: 'A' },
  { key: 'defence', label: 'Defence', track: 'A' },
  { key: 'semiconductor_electronics', label: 'Semiconductors & Electronics', track: 'B' },
  { key: 'ai_infrastructure', label: 'AI Infrastructure', track: 'B' },
];

export function sectorLabel(s: string): string {
  return SECTORS.find((x) => x.key === s)?.label ?? s;
}

// Verdict -> color token (CSS var names defined in globals.css)
export function verdictTone(verdict: string | null): string {
  if (!verdict) return 'neutral';
  const v = verdict.toUpperCase();
  if (v.includes('STRONG BUY')) return 'strong';
  if (v === 'BUY' || v.includes('BUY ')) {
    if (v.includes('DIPS')) return 'dips';
    return 'buy';
  }
  if (v.includes('WATCHLIST')) return 'watch';
  if (v.includes('AVOID')) return 'avoid';
  return 'neutral';
}

export function scorePct(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function fmtPrice(p: number | null | undefined): string {
  if (p === null || p === undefined || isNaN(Number(p))) return '—';
  return '\u20B9' + Number(p).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}
