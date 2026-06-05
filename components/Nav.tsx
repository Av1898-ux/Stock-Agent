import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { IconDash, IconSearch } from './icons';

export function TopBar({ stamp }: { stamp?: string }) {
  return (
    <div className="topbar">
      <div className="brand">
        <span className="dot" />
        <div>
          <h1>Stock Agent</h1>
          <div className="sub">NSE-500 · dual-track</div>
        </div>
      </div>
      {stamp ? <div className="stamp">{stamp}</div> : null}
    </div>
  );
}

export function BottomNav() {
  const r = useRouter();
  const is = (p: string) => (r.pathname === p ? 'active' : '');
  return (
    <nav className="nav">
      <Link className={is('/')} href="/"><IconDash /><span>PICKS</span></Link>
      <Link className={is('/search')} href="/search"><IconSearch /><span>SEARCH</span></Link>
    </nav>
  );
}
