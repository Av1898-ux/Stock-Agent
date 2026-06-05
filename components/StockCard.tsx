import React from 'react';
import Link from 'next/link';
import type { AnalysisRow } from '../lib/types';
import { verdictTone, scorePct, fmtPrice } from '../lib/types';
import { IconFlag, IconChevron } from './icons';

const toneColor: Record<string, string> = {
  strong: 'var(--strong)', buy: 'var(--buy)', dips: 'var(--dips)',
  watch: 'var(--watch)', avoid: 'var(--avoid)', neutral: 'var(--neutral)',
};

export function VerdictPill({ verdict }: { verdict: string | null }) {
  const tone = verdictTone(verdict);
  return <span className={`pill ${tone}`}>{verdict || 'UNSCORED'}</span>;
}

export function StockCard({ row }: { row: AnalysisRow }) {
  const tone = verdictTone(row.verdict);
  const pct = scorePct(row.adjusted_score);
  return (
    <Link href={`/stock/${encodeURIComponent(row.symbol)}`} className="card fade-in">
      <div className="card-top">
        <div>
          {row.rank_in_sector ? <span className="rank">#{row.rank_in_sector}</span> : null}
          <div className="cname">{row.name}</div>
          <div className="sym">{row.symbol} · {row.track === 'A' ? 'Track A' : 'Track B'}</div>
        </div>
        <VerdictPill verdict={row.verdict} />
      </div>

      <div className="scorewrap">
        <div className="row">
          <div className="bigscore mono">{pct}<span className="slash">/100</span></div>
          <div className="metric" style={{ textAlign: 'right' }}>
            <div className="k">verdict</div>
            <div className="v" style={{ color: toneColor[tone] }}>{row.verdict_action || '—'}</div>
          </div>
        </div>
        <div className="bar"><i style={{ width: pct + '%', background: toneColor[tone] }} /></div>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="k">FA</div>
          <div className="v">{row.fa_score}/{row.fa_max}</div>
        </div>
        <div className="metric">
          <div className="k">TA</div>
          <div className="v">{row.ta_score}/{row.ta_max}</div>
        </div>
        {row.current_price != null ? (
          <div className="metric">
            <div className="k">price</div>
            <div className="v">{fmtPrice(row.current_price)}</div>
          </div>
        ) : null}
      </div>

      {row.flags && row.flags.length ? (
        <div className="flag">
          <IconFlag className="ico" />
          <span>{row.flags[0]}</span>
        </div>
      ) : null}
    </Link>
  );
}
