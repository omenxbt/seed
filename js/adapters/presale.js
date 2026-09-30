/* ==========================================================================
   PRESALE ADAPTER: the vault, and after seeding the pool (price, market cap, liquidity, candles).
   Demo: the raise from state and a price series generated from the presale price.
   Real: the vault's token balance from Solana RPC, the pool from GeckoTerminal (keyless, cached 60s per request).
   ========================================================================== */
const GECKO = 'https://api.geckoterminal.com/api/v2/networks/solana/pools/';
const CANDLE_TTL = 60e3;
const TIMEFRAMES = { '1m': ['minute', 1], '5m': ['minute', 5], '1h': ['hour', 1], '1D': ['day', 1] };

async function geckoGet(path) {
  const hit = cacheGet('gecko/' + path, CANDLE_TTL); if (hit !== undefined) return hit;
  const r = await fetch(GECKO + path, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('GeckoTerminal ' + r.status);
  const j = await r.json(); cacheSet('gecko/' + path, j); return j;
}
/* the presale price: what one token costs in the pair asset */
const priceOf = p => p.target / (SUPPLY * presaleShare(p));

const presaleAdapter = {
  vaultAddress(p) { const v = profileOf(p).vault || {}; return v.address || ''; },
  vaultIsStandin(p) { return !!(profileOf(p).vault || {}).presale; },

  /* live from Solana when the vault is a real account; the demo raise otherwise */
  async vaultBalance(p) {
    const v = profileOf(p).vault || {}, from = v.presale ? 'standin' : 'chain';
    if (!isRealAddr(v.address)) return withSrc(p.status === 'seeded' ? 0 : p.status === 'refunded' ? r6(p.raised * refundLeftShare(p)) : p.raised, 'demo');
    const key = 'vault/' + v.address, hit = cacheGet(key, 30e3);
    if (hit !== undefined) return withSrc(hit, from);
    const res = await rpcPaced('getTokenAccountBalance', [v.address]), amt = Number(res.value.uiAmountString);
    cacheSet(key, amt); return withSrc(amt, from, { asset: v.asset });
  },

  /* pool facts after seeding */
  async pool(p) {
    const pr = profileOf(p), pool = pr.pool;
    if (pool && isRealAddr(pool.address)) {
      const a = (await geckoGet(pool.address)).data.attributes, price = Number(a.base_token_price_usd);
      return withSrc({ address: pool.address, pair: pool.pair, dex: pool.dex, price, quote: 'USD', mcap: Number(a.market_cap_usd || a.fdv_usd), fdv: Number(a.fdv_usd), liquidity: Number(a.reserve_in_usd),
        change24h: Number((a.price_change_percentage || {}).h24 || 0), volume24h: Number((a.volume_usd || {}).h24 || 0), supply: Number(a.fdv_usd) / price, url: `https://app.meteora.ag/dammv2/${pool.address}` }, 'standin');
    }
    const s = demoSeries(p, '1h', 48), last = s[s.length - 1][4], supply = SUPPLY;
    return withSrc({ address: fakeAddr('pool/' + p.id), pair: `${p.ticker}/${Q(p).sym}`, dex: DEX, price: last, quote: Q(p).sym, mcap: last * supply, fdv: last * supply,
      liquidity: p.target * 2, change24h: (last / s[Math.max(0, s.length - 25)][4] - 1) * 100, volume24h: p.target * 0.4, supply, url: 'https://app.meteora.ag' }, 'demo');
  },

  /* candles: [time, open, high, low, close, volume], oldest first */
  async candles(p, tf) {
    const pool = profileOf(p).pool;
    if (pool && isRealAddr(pool.address)) {
      const [unit, agg] = TIMEFRAMES[tf], j = await geckoGet(`${pool.address}/ohlcv/${unit}?aggregate=${agg}&limit=120&currency=usd`);
      return withSrc(j.data.attributes.ohlcv_list.map(c => [c[0] * 1000, +c[1], +c[2], +c[3], +c[4], +c[5]]).reverse(), 'standin');
    }
    return withSrc(demoSeries(p, tf, 120), 'demo');
  }
};
/* a seeded demo presale trades around its presale price: a seeded random walk from the moment it seeded */
function demoSeries(p, tf, n) {
  const step = { '1m': 60e3, '5m': 300e3, '1h': H, '1D': D }[tf], r = rng('px/' + p.id + '/' + tf), out = [];
  let px = priceOf(p), t = Math.max(p.resolvedAt || Date.now(), Date.now() - step * n);
  for (let i = 0; i < n; i++, t += step) {
    const o = px, drift = (r() - 0.47) * 0.06, c = Math.max(o * 0.2, o * (1 + drift)), hi = Math.max(o, c) * (1 + r() * 0.02), lo = Math.min(o, c) * (1 - r() * 0.02);
    out.push([t, o, hi, lo, c, p.target * (0.002 + r() * 0.02)]); px = c;
  }
  return out;
}
/* share of a refunded raise still waiting to be claimed */
const refundLeftShare = p => { const b = p.buys || []; const tot = b.reduce((a, x) => a + x.amount, 0) || 1; return b.filter(x => !x.refundClaimed).reduce((a, x) => a + x.amount, 0) / tot; };
