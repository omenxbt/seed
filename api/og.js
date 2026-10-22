// The preview image for a raise (1200×630): ticker, opening cap, fill, time left and the pair, in the brand's charcoal and
// blue. Rendered at the edge with @vercel/og from plain element objects (no JSX). /api/og with no id draws the site's card.
import { ImageResponse } from '@vercel/og';
import { raiseById, PAIR_SYMBOL, fmtMcap, timeLeft } from './_cfg.js';
export const config = { runtime: 'edge' };
const h = (type, props, ...children) => ({ type, props: { ...props, children: children.length === 1 ? children[0] : children } });
let fontP = null;
const font = () => fontP || (fontP = fetch('https://fonts.gstatic.com/s/instrumentsans/v3/pximypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8ToedPibnr0She1I.ttf').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null));
export default async function handler(req) {
  const id = new URL(req.url).searchParams.get('id') || '', r = id ? await raiseById(id) : null;
  const pct = r && Number(r.target) > 0 ? Math.min(100, Number(r.raised) / Number(r.target) * 100) : 0;
  const cap = r ? fmtMcap(Number(r.cap_usd || r.target_usd * 2 || 0)) : '', pair = r ? (PAIR_SYMBOL[r.pair_mint] || 'allowed asset') : '';
  const state = r ? (r.status === 'live' ? timeLeft(r.ends_at) : r.status === 'filled' ? 'seeding' : r.status) : '';
  const fontData = await font();
  const stat = (k, v) => h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, h('div', { style: { fontSize: 22, color: '#8C92A3' } }, k), h('div', { style: { fontSize: 44, fontWeight: 600, color: '#E6E8EC' } }, v));
  const body = r
    ? h('div', { style: { display: 'flex', flexDirection: 'column', width: 1200, height: 630, background: '#16171A', color: '#E6E8EC', padding: 64, fontFamily: 'Instrument Sans, sans-serif', justifyContent: 'space-between' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 20 } }, h('div', { style: { width: 44, height: 44, borderRadius: 12, background: '#2E63E7' } }), h('div', { style: { fontSize: 30, color: '#8C92A3' } }, 'Seed · a raise on Solana')),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, h('div', { style: { fontSize: 96, fontWeight: 700, letterSpacing: -3 } }, `$${r.ticker}`), h('div', { style: { fontSize: 40, color: '#B7BCC9' } }, r.name)),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 18 } },
          h('div', { style: { display: 'flex', height: 14, borderRadius: 999, background: '#2A2D34', overflow: 'hidden' } }, h('div', { style: { width: `${pct}%`, background: '#2E63E7' } })),
          h('div', { style: { display: 'flex', gap: 64 } }, stat('Opens at', `${cap} market cap`), stat('Filled', `${pct.toFixed(0)}%`), stat('Status', state), stat('Pair', pair))),
        h('div', { style: { fontSize: 24, color: '#8C92A3' } }, 'Seeded in full, or refunded in full.'))
    : h('div', { style: { display: 'flex', flexDirection: 'column', width: 1200, height: 630, background: '#16171A', color: '#E6E8EC', padding: 64, fontFamily: 'Instrument Sans, sans-serif', justifyContent: 'space-between' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 20 } }, h('div', { style: { width: 44, height: 44, borderRadius: 12, background: '#2E63E7' } }), h('div', { style: { fontSize: 30, color: '#8C92A3' } }, 'Seed')),
        h('div', { style: { fontSize: 84, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 } }, 'Seeded in full, or refunded in full.'),
        h('div', { style: { fontSize: 30, color: '#B7BCC9' } }, 'Raises on Solana, built on Meteora. Pick an opening market cap; the pool opens there, locked for good.'));
  return new ImageResponse(body, { width: 1200, height: 630, fonts: fontData ? [{ name: 'Instrument Sans', data: fontData, weight: 400, style: 'normal' }] : [], headers: { 'cache-control': 'public, max-age=120, s-maxage=120' } });
}
