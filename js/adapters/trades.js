/* ==========================================================================
   TRADES ADAPTER: the swaps on a live raise's pool, indexed by the webhook into Supabase, and the candles and figures
   built from them. Live through Supabase Realtime: every new trade reaches the open page within a second or two.
   ========================================================================== */
const TF_SECS = { '1m': 60, '5m': 300, '1h': 3600, '1D': 86400 };
const tradesAdapter = {
  /* candles [time ms, open, high, low, close, volume] oldest first. The first candle opens at the raise price, and each
     candle opens where the last one closed, so a quiet hour is a flat step, not a gap. */
  async candles(p, tf, limit = 300) {
    if (!(await supa.init())) return [];
    const { data, error } = await supa.client.rpc('candles', { p_raise_id: p.id, p_tf: TF_SECS[tf] || 3600, p_limit: limit });
    if (error) throw new Error(error.message);
    const step = (TF_SECS[tf] || 3600) * 1000, p0 = priceOf(p), out = [], truncated = data.length >= limit;
    let prev = data.length && data[0].prev_close != null ? Number(data[0].prev_close) : p0, t0 = p.seededAt ? Math.floor(p.seededAt / step) * step : null;
    if (!truncated && t0 != null && (!data.length || Date.parse(data[0].t) > t0)) out.push([t0, p0, p0, p0, p0, 0]);   // seeding: the pool opened at the raise price
    for (const r of data) {
      const t = Date.parse(r.t), o = prev, h = Math.max(Number(r.high), o), l = Math.min(Number(r.low), o), c = Number(r.close);
      out.push([t, o, h, l, c, Number(r.volume)]); prev = c;
    }
    const last = out[out.length - 1], now = Math.floor(Date.now() / step) * step;
    if (last && now > last[0]) out.push([now, prev, prev, prev, prev, 0]);   // the current, still-empty bucket
    return out;
  },
  /* the latest trades, newest first */
  async list(p, limit = 50) {
    if (!(await supa.init())) return [];
    const { data, error } = await supa.client.from('trades').select('signature,side,pair_amount,token_amount,price,trader,slot,at').eq('raise_id', p.id).order('at', { ascending: false }).order('signature', { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return data.map(rowTrade);
  },
  /* volume and trade count over the last day, the last price */
  async stats(p) {
    if (!(await supa.init())) return null;
    const { data, error } = await supa.client.rpc('trade_stats', { p_raise_id: p.id });
    if (error) throw new Error(error.message);
    const s = Array.isArray(data) ? data[0] : data;
    return s ? { volume24h: Number(s.volume_24h), trades24h: Number(s.trades_24h), lastPrice: s.last_price != null ? Number(s.last_price) : null, lastAt: s.last_at ? Date.parse(s.last_at) : null } : null;
  },
  /* every wallet that traded or claimed the token, with its result: lots at average cost from claims (at what the raise
     buy cost) and buys, sells realised against them, what is still held valued at the pool's price. Largest result first. */
  async traders(p) {
    if (!(await supa.init())) return [];
    const { data, error } = await supa.client.from('trades').select('trader,side,pair_amount,token_amount,at,signature').eq('raise_id', p.id).order('at', { ascending: true }).limit(5000);
    if (error) throw new Error(error.message);
    const ev = data.map(x => ({ t: Date.parse(x.at), w: x.trader, kind: x.side, pair: Number(x.pair_amount), tokens: Number(x.token_amount) }));
    (p.buys || []).forEach(b => { if (b.tokensClaimed) ev.push({ t: b.at, w: b.wallet, kind: 'claim', pair: b.paid != null ? b.paid : paidFor(b.amount), tokens: tokensFor(p, b.amount) }); });
    ev.sort((a, b) => a.t - b.t);
    const by = {}, spot = p.spot || priceOf(p);
    for (const e of ev) {
      const l = by[e.w] || (by[e.w] = { wallet: e.w, tokens: 0, cost: 0, bought: 0, sold: 0, realised: 0, buys: 0, sells: 0, last: 0 }); l.last = e.t;
      if (e.kind === 'sell') { const avg = l.tokens > 0 ? l.cost / l.tokens : 0, basis = Math.min(l.tokens, e.tokens) * avg; l.realised += e.pair - basis; l.tokens = Math.max(0, l.tokens - e.tokens); l.cost = Math.max(0, l.cost - basis); l.sold += e.pair; l.sells++; }
      else { l.tokens += e.tokens; l.cost += e.pair; l.bought += e.pair; if (e.kind === 'buy') l.buys++; else l.claims = (l.claims || 0) + 1; }
    }
    return Object.values(by).map(l => Object.assign(l, { value: l.tokens * spot, unrealised: l.tokens * spot - l.cost, pnl: l.realised + l.tokens * spot - l.cost })).sort((a, b) => b.pnl - a.pnl);
  },
  /* every new trade on the raise, as it is indexed; returns the unsubscribe */
  watch(p, onTrade) {   // the channel opens once the client is up; unsubscribing before that just cancels
    let ch = null, off = false;
    supa.init().then(ok => { if (!ok || off) return; ch = supa.client.channel('trades-' + p.id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades', filter: `raise_id=eq.${p.id}` }, x => onTrade(rowTrade(x.new))).subscribe(); });
    return () => { off = true; if (ch) supa.client.removeChannel(ch); };
  }
};
const rowTrade = r => ({ signature: r.signature, side: r.side, pair: Number(r.pair_amount), tokens: Number(r.token_amount), price: Number(r.price), trader: r.trader, slot: Number(r.slot), at: Date.parse(r.at) });
/* a trade folded into its candle: the newest one, a new one after it, or (a swap that landed just before the page
   loaded its series) an older bucket, in which case the later candles' opens are chained again and the caller redraws
   the series. Returns { c, redraw }. */
function foldTrade(series, tf, t) {
  const step = (TF_SECS[tf] || 3600) * 1000, b = Math.floor(t.at / step) * step, last = series[series.length - 1];
  const into = c => { c[2] = Math.max(c[2], t.price); c[3] = Math.min(c[3], t.price); c[4] = t.price; c[5] += t.pair; };
  if (last && last[0] === b) { into(last); return { c: last, redraw: false }; }
  if (!last || b > last[0]) { const o = last ? last[4] : t.price, c = [b, o, Math.max(o, t.price), Math.min(o, t.price), t.price, t.pair]; series.push(c); return { c, redraw: false }; }
  let i = series.findIndex(c => c[0] >= b);
  if (series[i][0] === b) into(series[i]);
  else { const o = i > 0 ? series[i - 1][4] : t.price; series.splice(i, 0, [b, o, Math.max(o, t.price), Math.min(o, t.price), t.price, t.pair]); }
  for (let j = i + 1; j < series.length; j++) { const c = series[j], o = series[j - 1][4]; if (c[5] === 0) { c[1] = c[2] = c[3] = c[4] = o; } else { c[1] = o; c[2] = Math.max(c[2], o); c[3] = Math.min(c[3], o); } }
  return { c: series[i], redraw: true };
}
