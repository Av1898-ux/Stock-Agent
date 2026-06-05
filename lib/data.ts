export async function getTopPicks(): Promise<AnalysisRow[]> {
  const latest = await latestScanDate();
  if (!latest) return [];
  const day = latest.slice(0, 10);

  // pull all of today's in_top5 rows (may include >1 scan run)
  const base = await supabase
    .from('analyses')
    .select(
      `id, company_id, sector, track, analyzed_at, adjusted_score, total_score,
       fa_score, fa_max, ta_score, ta_max, verdict, verdict_action,
       rank_in_sector, in_top5, flags, ai_narrative`
    )
    .gte('analyzed_at', day + 'T00:00:00')
    .eq('in_top5', true)
    .order('analyzed_at', { ascending: false });
  if (base.error || !base.data) {
    console.error('getTopPicks error', base.error);
    return [];
  }

  // DEDUPE: keep only the most-recent row per company (rows are newest-first)
  const seen = new Set<string>();
  const latestPer = base.data.filter((r: any) => {
    if (seen.has(r.company_id)) return false;
    seen.add(r.company_id);
    return true;
  });

  // attach company name/symbol
  const ids = Array.from(new Set(latestPer.map((r: any) => r.company_id)));
  const { data: comps } = await supabase
    .from('companies')
    .select('id, symbol, name')
    .in('id', ids);
  const byId: Record<string, any> = {};
  (comps || []).forEach((c: any) => { byId[c.id] = c; });

  const rows = latestPer.map((r: any) => {
    const c = byId[r.company_id] || {};
    return { ...r, symbol: c.symbol, name: c.name } as AnalysisRow;
  });

  // sort for display: sector, then rank
  rows.sort((a, b) => {
    if (a.sector !== b.sector) return a.sector < b.sector ? -1 : 1;
    return (a.rank_in_sector || 99) - (b.rank_in_sector || 99);
  });
  return rows;
}
