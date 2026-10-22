// A raise's link preview: /r/<id> serves the og/twitter meta a crawler reads (the site itself is a hash router, which
// crawlers do not follow) and sends a browser straight on to the raise page.
import { SITE, raiseById, PAIR_SYMBOL, fmtMcap, timeLeft } from './_cfg.js';
export const config = { runtime: 'edge' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export default async function handler(req) {
  const url = new URL(req.url), id = url.searchParams.get('id') || url.pathname.split('/').pop() || '';
  const r = await raiseById(id);
  const target = r ? `${SITE}/#/presale/${encodeURIComponent(r.id)}` : `${SITE}/`;
  const title = r ? `${r.name} ($${r.ticker}) raise on Seed` : 'Seed';
  const pct = r && Number(r.target) > 0 ? Math.min(100, Number(r.raised) / Number(r.target) * 100) : 0;
  const desc = r ? `Opens at ${fmtMcap(Number(r.cap_usd || r.target_usd * 2 || 0))} market cap · ${pct.toFixed(0)}% filled · ${r.status === 'live' ? timeLeft(r.ends_at) : r.status} · paired with ${PAIR_SYMBOL[r.pair_mint] || 'an allowed asset'}. Seeded in full, or refunded in full.` : 'Seeded in full, or refunded in full. Raises on Solana, built on Meteora.';
  const img = `${SITE}/api/og?id=${encodeURIComponent(r ? r.id : '')}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Seed"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(target)}"><meta property="og:image" content="${esc(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(img)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}"><link rel="canonical" href="${esc(target)}"></head>
<body style="font-family:system-ui;background:#16171A;color:#E6E8EC;padding:40px"><p>Opening <a style="color:#7FA6FF" href="${esc(target)}">${esc(title)}</a>…</p><script>location.replace(${JSON.stringify(target)})</script></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=60' } });
}
