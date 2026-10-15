/* ==========================================================================
   PRESALE ADAPTER: the pool after seeding (price, market cap, liquidity, candles).
   Demo: the raise from state and a price series generated from the raise price.
   Real: the pool from GeckoTerminal (keyless, cached 60s per request) when the profile names a real pool address.
   ========================================================================== */
const GECKO = 'https://api.geckoterminal.com/api/v2/networks/solana/pools/';
const CANDLE_TTL = 60e3;
const TIMEFRAMES = { '1m': ['minute', 1], '5m': ['minute', 5], '1h': ['hour', 1], '1D': ['day', 1] };

/* fresh for 60s; if GeckoTerminal refuses (its keyless limit is a few calls a minute per visitor), the last copy up to a day old is shown */
async function geckoGet(path) {
  const hit = cacheGet('gecko/' + path, CANDLE_TTL); if (hit !== undefined) return hit;
  try {
    const r = await fetch(GECKO + path, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('GeckoTerminal ' + r.status);
    const j = await r.json(); cacheSet('gecko/' + path, j); return j;
  } catch (e) {
    const stale = cacheGet('gecko/' + path, D); if (stale !== undefined) return stale;
    throw new Error('GeckoTerminal is rate limiting this browser');
  }
}
/* the raise price: what one token costs in the pair asset */

const presaleAdapter = {
  /* pool facts after seeding */
  async pool(p) {
    const pr = profileOf(p), pool = pr.pool;
    if (pool && isRealAddr(pool.address)) {
      const a = (await geckoGet(pool.address)).data.attributes, price = Number(a.base_token_price_usd);
      return withSrc({ address: pool.address, pair: pool.pair, dex: pool.dex, price, quote: 'USD', mcap: Number(a.market_cap_usd || a.fdv_usd), fdv: Number(a.fdv_usd), liquidity: Number(a.reserve_in_usd),
        change24h: Number((a.price_change_percentage || {}).h24 || 0), volume24h: Number((a.volume_usd || {}).h24 || 0), supply: Number(a.fdv_usd) / price, url: `https://app.meteora.ag/dammv2/${pool.address}` }, 'standin');
    }
    if (p.live && p.pool) {   // a raise seeded on chain: the pool is DAMM's, at the raise price until someone trades (the page does not read DAMM's reserves yet)
      const price = priceOf(p), supply = SUPPLY, sol = SEED.network === 'devnet' ? '?cluster=devnet' : '';
      return withSrc({ address: p.pool, pair: `${p.ticker}/${Q(p).sym}`, dex: DEX, price, quote: Q(p).sym, mcap: price * supply, fdv: price * supply, raisePrice: price, liquidity: p.target * 2, change24h: 0, volume24h: 0, supply, url: `https://app.meteora.ag/dammv2/${p.pool}${sol}` }, 'chain');
    }
    const s = demoSeries(p, '1h', 48), amm = ammOf(p), last = amm.x / amm.y, supply = SUPPLY;   // the price is the in-app pool's, so a trade made here moves it
    return withSrc({ address: fakeAddr('pool/' + p.id), pair: `${p.ticker}/${Q(p).sym}`, dex: DEX, price: last, quote: Q(p).sym, mcap: last * supply, fdv: last * supply, raisePrice: priceOf(p),
      liquidity: amm.x * 2, change24h: (last / s[Math.max(0, s.length - 25)][4] - 1) * 100, volume24h: ((p.fees || {}).volume || 0) / Math.max(1, (Date.now() - (p.seededAt || Date.now())) / D), supply, url: 'https://app.meteora.ag' }, 'demo');
  },

  /* candles: [time, open, high, low, close, volume], oldest first */
  async candles(p, tf) {
    const pool = profileOf(p).pool;
    if (pool && isRealAddr(pool.address)) {
      const [unit, agg] = TIMEFRAMES[tf], j = await geckoGet(`${pool.address}/ohlcv/${unit}?aggregate=${agg}&limit=120&currency=usd`);
      return withSrc(j.data.attributes.ohlcv_list.map(c => [c[0] * 1000, +c[1], +c[2], +c[3], +c[4], +c[5]]).reverse(), 'standin');
    }
    if (p.live) return withSrc(flatSeries(p, tf), 'chain');   // a pool on chain: until its trades are indexed, the chart holds the raise price
    const ser = demoSeries(p, tf, 120), c = ser[ser.length - 1], px = spotOf(p);   // the newest candle closes where the in-app pool is
    c[4] = px; c[2] = Math.max(c[2], px); c[3] = Math.min(c[3], px);
    return withSrc(ser, 'demo');
  }
};
/* a seeded demo raise's chart: a seeded random walk from the raise price at the moment it seeded, bent so it ends where the
   pool is now (the raise price times p.poolX, moved further by any in-app trade) */
function demoSeries(p, tf, n) {
  const step = { '1m': 60e3, '5m': 300e3, '1h': H, '1D': D }[tf], r = rng('px/' + p.id + '/' + tf), walk = [];
  const p0 = priceOf(p), end = spotOf(p), t0 = Math.max(p.seededAt || p.resolvedAt || Date.now(), Date.now() - step * n);
  let px = p0;
  for (let i = 0; i < n; i++) { const drift = (r() - 0.5) * 0.05; px = Math.max(p0 * 0.05, px * (1 + drift)); walk.push(px); }
  const k = Math.log(end / walk[n - 1]) / n, out = []; let t = t0, o = p0;   // the geometric bend that lands the last close on the pool price
  for (let i = 0; i < n; i++, t += step) {
    const c = walk[i] * Math.exp(k * (i + 1)), hi = Math.max(o, c) * (1 + r() * 0.015), lo = Math.min(o, c) * (1 - r() * 0.015);
    out.push([t, o, hi, lo, c, p.target * (0.002 + r() * 0.02)]); o = c;
  }
  return out;
}
/* a live pool with no indexed trades: flat candles at the raise price from seeding to now, no volume */
function flatSeries(p, tf) {
  const step = { '1m': 60e3, '5m': 300e3, '1h': H, '1D': D }[tf], px = priceOf(p), t0 = p.seededAt || p.resolvedAt || Date.now(), out = [];
  for (let t = Math.max(t0, Date.now() - step * 120); t <= Date.now(); t += step) out.push([t, px, px, px, px, 0]);
  return out.length ? out : [[t0, px, px, px, px, 0]];
}
/* share of a refunded raise still waiting to be claimed */
const refundLeftShare = p => { const b = p.buys || []; const tot = b.reduce((a, x) => a + x.amount, 0) || 1; return b.filter(x => !x.refundClaimed).reduce((a, x) => a + x.amount, 0) / tot; };
