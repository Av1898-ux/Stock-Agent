import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { TopBar, BottomNav } from '../../components/Nav';
import { VerdictPill } from '../../components/StockCard';
import { IconBack, IconFlag } from '../../components/icons';
import { getLatestForSymbol } from '../../lib/data';
import {
  AnalysisRow, sectorLabel, verdictTone, scorePct, fmtPrice, timeAgo,
} from '../../lib/types';

const toneColor: Record<string, string> = {
  strong: 'var(--strong)', buy: 'var(--buy)', dips: 'var(--dips)',
  watch: 'var(--watch)', avoid: 'var(--avoid)', neutral: 'var(--neutral)',
};

// Render a JSONB breakdown object {module: points} as rows.
function Breakdown({ obj, title }: { obj: any; title: string }) {
  if (!obj || typeof obj !== 'object' || !Object.keys(obj).length) {
    return (
      <div className="panel">
        <h3>{title}</h3>
        <div className="narrative-empty">No breakdown stored for this run.</div>
      </div>
    );
  }
  return (
    <div className="panel">
      <h3>{title}</h3>
      {Object.entries(obj).map(([k, v]) => (
        <div className="kv" key={k}>
          <span className="k">{k.replace(/_/g, ' ')}</span>
          <span className="v">{typeof v === 'number' ? v : String(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function StockDetail() {
  const router = useRouter();
  const { symbol } = router.query;
  const [row, setRow] = useState<AnalysisRow | null | undefined>(undefined);

  useEffect(() => {
    if (!symbol || typeof symbol !== 'string') return;
    getLatestForSymbol(symbol).then(setRow);
  }, [symbol]);

  if (row === undefined) {
    return (
      <>
        <TopBar />
        <div className="shell"><div className="loading"><span className="spin" /> loading analysis…</div></div>
        <BottomNav />
      </>
    );
  }

  if (row === null) {
    return (
      <>
        <TopBar />
        <div className="shell">
          <Link href="/search" className="result-row" style={{ marginTop: 16, justifyContent: 'flex-start', gap: 8 }}>
            <IconBack /> Back to search
          </Link>
          <div className="empty">No analysis found for {String(symbol)}.</div>
        </div>
        <BottomNav />
      </>
    );
  }

  const tone = verdictTone(row.verdict);
  const pct = scorePct(row.adjusted_score);
  const capApplied = row.gate_score_cap != null && row.adjusted_score !== row.total_score;

  return (
    <>
      <TopBar stamp={'scan ' + timeAgo(row.analyzed_at)} />
      <div className="shell">
        <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--text-dim)', fontSize: 13, margin: '14px 4px 0', fontFamily: 'var(--mono)' }}>
          <IconBack /> back
        </Link>

        <div className="detail-head">
          <div className="sym">{row.symbol} · {sectorLabel(row.sector)} · {row.track === 'A' ? 'Track A' : 'Track B'}</div>
          <h1>{row.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <VerdictPill verdict={row.verdict} />
            <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{row.verdict_action}</span>
            {row.current_price != null ? (
              <span className="mono" style={{ color: 'var(--text)', fontSize: 14 }}>{fmtPrice(row.current_price)}</span>
            ) : null}
          </div>
        </div>

        {/* Score panel */}
        <div className="panel" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div className="bigscore mono" style={{ fontSize: 40, color: toneColor[tone] }}>
                {pct}<span className="slash" style={{ fontSize: 20 }}>/100</span>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                {capApplied ? `raw ${Math.round(row.total_score)} · capped ${pct}` : 'adjusted score'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="metric"><div className="k">FA</div><div className="v" style={{ fontSize: 16 }}>{row.fa_score}/{row.fa_max}</div></div>
              <div className="metric" style={{ marginTop: 8 }}><div className="k">TA</div><div className="v" style={{ fontSize: 16 }}>{row.ta_score}/{row.ta_max}</div></div>
            </div>
          </div>
          <div className="bar" style={{ marginTop: 14 }}><i style={{ width: pct + '%', background: toneColor[tone] }} /></div>
        </div>

        {/* Hard filter / gates */}
        {row.hard_filter_passed === false ? (
          <div className="notice" style={{ borderLeftColor: 'var(--avoid)' }}>
            <strong style={{ color: 'var(--avoid)' }}>Hard filter:</strong> {row.hard_filter_reason || 'failed'}
          </div>
        ) : null}

        {capApplied ? (
          <div className="notice">
            <strong style={{ color: 'var(--dips)' }}>Gate cap applied.</strong> Score capped at {row.gate_score_cap}
            {row.gate_penalties ? ` · penalties ${row.gate_penalties}` : ''}.
          </div>
        ) : null}

        {/* Flags */}
        {row.flags && row.flags.length ? (
          <div className="panel" style={{ marginBottom: 12 }}>
            <h3>Flags</h3>
            {row.flags.map((f, i) => (
              <div className="flag" key={i} style={{ marginTop: i ? 8 : 0 }}>
                <IconFlag className="ico" /><span>{f}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* FA / TA breakdowns */}
        <div className="detail-grid">
          <Breakdown obj={row.fa_breakdown} title="Fundamental Breakdown" />
          <Breakdown obj={row.ta_breakdown} title="Technical Breakdown" />
        </div>

        {/* Gate results */}
        {row.gate_results && Object.keys(row.gate_results || {}).length ? (
          <div className="panel" style={{ marginTop: 12 }}>
            <h3>Evidence Gates</h3>
            {Object.entries(row.gate_results).map(([k, v]: any) => (
              <div className="kv" key={k}>
                <span className="k">{k.replace(/_/g, ' ')}</span>
                <span className="v" style={{ color: v ? 'var(--strong)' : 'var(--avoid)' }}>
                  {v === true ? 'PASS' : v === false ? 'FAIL' : String(v)}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Narrative */}
        <div className="panel" style={{ marginTop: 12 }}>
          <h3>AI Narrative</h3>
          {row.ai_narrative ? (
            <div className="narrative">{row.ai_narrative}</div>
          ) : (
            <div className="narrative-empty">
              No narrative generated for this run. Narratives are written for daily top-5 picks;
              this row was scored without one.
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </>
  );
}
