import React, { useEffect, useState } from 'react';
import { TopBar, BottomNav } from '../components/Nav';
import { StockCard } from '../components/StockCard';
import { getTopPicks } from '../lib/data';
import { SECTORS, sectorLabel, timeAgo } from '../lib/types';
import type { AnalysisRow } from '../lib/types';

export default function Dashboard() {
  const [rows, setRows] = useState<AnalysisRow[] | null>(null);
  const [stamp, setStamp] = useState<string>('');

  useEffect(() => {
    getTopPicks().then((r) => {
      setRows(r);
      if (r.length) setStamp('scan ' + timeAgo(r[0].analyzed_at));
    });
  }, []);

  const bySector = (key: string) => (rows || []).filter((r) => r.sector === key);

  return (
    <>
      <TopBar stamp={stamp} />
      <div className="shell">
        <div className="section-head">
          <h2>Daily Top Picks</h2>
          <span className="meta">top 5 / sector</span>
        </div>

        {rows === null ? (
          <div className="loading"><span className="spin" /> loading latest scan…</div>
        ) : rows.length === 0 ? (
          <div className="empty">No scan data yet. Run the daily workflow to populate picks.</div>
        ) : (
          SECTORS.map((s) => {
            const list = bySector(s.key);
            if (!list.length) return null;
            return (
              <div className="sector-block" key={s.key}>
                <div className="sector-title">
                  <span className="name">{sectorLabel(s.key)}</span>
                  <span className="track">{s.track === 'A' ? 'TRACK A · 60+40' : 'TRACK B · 90+10'}</span>
                </div>
                <div className="grid">
                  {list.map((row) => <StockCard key={row.id} row={row} />)}
                </div>
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </>
  );
}
