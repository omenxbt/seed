// The preview image for a raise (1200×630): ticker, opening cap, fill, time left and the pair, in the brand's charcoal and
// blue. Rendered at the edge with @vercel/og from plain element objects (no JSX). /api/og with no id draws the site's card.
import { ImageResponse } from '@vercel/og';
import { raiseById, pairSymbol, fmtMcap, timeLeft } from './_cfg.js';
export const config = { runtime: 'edge' };
/* a childless div gets no children at all: satori takes even an empty array as children and then wants display: flex */
const h = (type, props, ...children) => ({ type, props: { ...props, children: children.length > 1 ? children : children[0] } });
/* the fonts, 400 and 600, in a format satori reads (TTF, OTF or WOFF, never WOFF2); kept per isolate. Google Fonts picks the
   format by user agent: WOFF2 to a browser it knows, TTF to an agent it doesn't (an old Firefox, which this asked as, now gets
   WOFF and the .ttf match failed: QA P1-F24 again), so ask as a plain agent and take any of the three.
   Without a font @vercel/og throws ("No fonts are loaded"), which once answered every preview with an empty 200 (QA P1-F24) */
let fontP = null;
const font = () => fontP || (fontP = (async () => {
  const css = await (await fetch('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600', { headers: { 'User-Agent': 'seed-og' } })).text();
  const faces = new Map();
  for (const [, w, url] of css.matchAll(/font-weight:\s*(\d+);[^}]*?url\((https:[^)]+)\)\s*format\('(?:truetype|opentype|woff)'\)/g)) if (!faces.has(w)) faces.set(w, url);
  if (!faces.size) throw new Error('no TTF, OTF or WOFF in the stylesheet');
  return Promise.all([...faces].map(async ([w, url]) => {
    const res = await fetch(url); if (!res.ok) throw new Error(`font ${res.status}`);
    return { name: 'Instrument Sans', data: await res.arrayBuffer(), weight: Number(w), style: 'normal' };
  }));
})().catch(e => { fontP = null; throw e; }));
export default async function handler(req) {
  const id = new URL(req.url).searchParams.get('id') || '', r = id ? await raiseById(id) : null;
  const pct = !r ? 0 : r.status === 'filled' || r.status === 'seeded' ? 100 : Number(r.target) > 0 ? Math.min(100, Number(r.raised) / Number(r.target) * 100) : 0;
  const cap = r ? fmtMcap(Number(r.cap_usd || r.target_usd * 2 || 0)) : '', pair = r ? await pairSymbol(r.pair_mint) : '';
  const state = r ? (r.status === 'live' ? timeLeft(r.ends_at) : r.status === 'filled' ? 'seeding' : r.status) : '';
  let fonts; try { fonts = await font(); } catch (e) { return new Response(`preview image unavailable: ${e.message}`, { status: 500, headers: { 'cache-control': 'no-store' } }); }   // a plain 500, never an empty image
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
  return new ImageResponse(body, { width: 1200, height: 630, fonts, headers: { 'cache-control': 'public, max-age=120, s-maxage=120' } });
}
