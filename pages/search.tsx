import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { TopBar, BottomNav } from '../components/Nav';
import { IconSearch, IconChevron } from '../components/icons';
import { searchCompanies } from '../lib/data';

type Hit = { symbol: string; name: string; sector: string; is_active: boolean; is_adhoc: boolean };

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [liveMsg, setLiveMsg] = useState<string>('');
  const [liveBusy, setLiveBusy] = useState(false);
  const debounce = useRef<any>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) { setHits([]); setLiveMsg(''); return; }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      const r = await searchCompanies(q);
      setHits(r);
      setSearching(false);
    }, 250);
  }, [q]);

  // Off-universe: user typed something with no in-universe match -> offer live run.
  async function runLive() {
    const sym = q.trim().toUpperCase();
    if (!sym) return;
    setLiveBusy(true);
    setLiveMsg('');
    try {
      const res = await fetch('/api/search-live', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symbol: sym }),
      });
      const data = await res.json();
      if (data.status === 'cached') {
        router.push(`/stock/${encodeURIComponent(data.symbol)}`);
      } else if (data.status === 'ran') {
        // n8n wrote to Supabase; go view it.
        router.push(`/stock/${encodeURIComponent(data.symbol)}`);
      } else if (data.status === 'webhook_disabled') {
        setLiveMsg(data.message);
      } else {
        setLiveMsg(data.message || 'Live analysis failed. Try again.');
      }
    } catch (e: any) {
      setLiveMsg('Network error: ' + e.message);
    } finally {
      setLiveBusy(false);
    }
  }

  const exactMatch = hits.some((h) => h.symbol.toUpperCase() === q.trim().toUpperCase());
  const showLiveOffer = q.trim().length >= 2 && !searching && !exactMatch;

  return (
    <>
      <TopBar />
      <div className="shell">
        <div className="section-head">
          <h2>Search</h2>
          <span className="meta">universe + live</span>
        </div>

        <div className="searchbar">
          <IconSearch className="mag" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search symbol or company…"
          />
        </div>

        {searching ? (
          <div className="loading"><span className="spin" /> searching…</div>
        ) : null}

        {hits.length ? (
          <div className="results">
            {hits.map((h) => (
              <div
                key={h.symbol}
                className="result-row"
                onClick={() => router.push(`/stock/${encodeURIComponent(h.symbol)}`)}
              >
                <div className="l">
                  <span className="n">{h.name}</span>
                  <span className="s">{h.symbol} · {h.sector?.replace(/_/g, ' ')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {h.is_adhoc ? <span className="badge adhoc">ad-hoc</span> : null}
                  {!h.is_active && !h.is_adhoc ? <span className="badge exit">inactive</span> : null}
                  <IconChevron />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {showLiveOffer ? (
          <div className="notice">
            No tracked match for <strong className="mono">{q.trim().toUpperCase()}</strong>.{' '}
            Run a live off-universe analysis? It fetches fundamentals + technicals, scores it,
            and caches the result for 30 days so repeat searches are free.
            <div style={{ marginTop: 12 }}>
              <button
                onClick={runLive}
                disabled={liveBusy}
                style={{
                  background: 'var(--accent)', color: '#04160d', border: 'none',
                  borderRadius: 8, padding: '10px 16px', fontFamily: 'var(--mono)',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: liveBusy ? 0.6 : 1,
                }}
              >
                {liveBusy ? 'Running…' : `Analyze ${q.trim().toUpperCase()} live`}
              </button>
            </div>
            {liveMsg ? <div style={{ marginTop: 10, color: 'var(--text-faint)' }}>{liveMsg}</div> : null}
          </div>
        ) : null}
      </div>
      <BottomNav />
    </>
  );
}
