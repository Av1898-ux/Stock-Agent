import React from 'react';

const s = (p: any) => ({ width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', ...p });

export const IconDash = (p: any) => (
  <svg {...s(p)}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
  <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
);
export const IconSearch = (p: any) => (
  <svg {...s(p)}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
);
export const IconChart = (p: any) => (
  <svg {...s(p)}><path d="M3 3v18h18"/><path d="m7 14 3-4 4 3 5-7"/></svg>
);
export const IconBack = (p: any) => (
  <svg {...s(p)}><path d="m15 18-6-6 6-6"/></svg>
);
export const IconFlag = (p: any) => (
  <svg {...s({ width: 14, height: 14, ...p })}><path d="M4 22V4a1 1 0 0 1 1-1h12l-2 4 2 4H5"/></svg>
);
export const IconChevron = (p: any) => (
  <svg {...s({ width: 14, height: 14, ...p })}><path d="m9 18 6-6-6-6"/></svg>
);
