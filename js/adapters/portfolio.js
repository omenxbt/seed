/* ==========================================================================
   PORTFOLIO ADAPTER: a real wallet's record on Seed, from the chain and the indexer. Its buys into raises and what became
   of them (contributions), its swaps on the pools (trades), its token balances (the chain), and from those: lots at
   cost, realised results by day, the open positions' unrealised result, and a history of everything, newest first.
   Results are in the pair asset (SOL or USDC) per raise; the day totals add only SOL raises, USDC ones are shown apart.
   ========================================================================== */
const portfolioAdapter = {
  wallet: null, at: 0, loading: null, data: null,
  /* loads once per wallet, refreshed on demand (after a swap or a claim); resolves the data */
  async load(force) {
    const me = isReal() ? state.wallet.pk : null; if (!me) { this.data = null; return null; }
    if (!force && this.wallet === me && Date.now() - this.at < 30e3) return this.data;
    if (this.loading && this.wallet === me) return this.loading;
    this.wallet = me;
    this.loading = (async () => {
      if (!(await supa.init())) return null;
      const [{ data: tr }, { data: cs }, { data: vc }] = await Promise.all([
        supa.client.from('trades').select('signature,raise_id,side,pair_amount,token_amount,price,at').eq('trader', me).order('at', { ascending: true }).limit(2000),
        supa.client.from('contributions').select('raise_id,amount,fee,at,refunded_at,claimed_at').eq('wallet', me).order('at', { ascending: true }),
        supa.client.from('vested_claims').select('tx,raise_id,tokens,at').eq('payout_wallet', me).order('at', { ascending: true })]);
      if (!isReal() || state.wallet.pk !== me) return null;
      await this.balances(me);
      const d = this.build(tr || [], cs || [], vc || []); this.data = d; this.at = Date.now(); this.loading = null; return d;
    })();
    return this.loading;
  },
  /* every token balance of the wallet that is a live raise's mint, kept where the page keeps holdings */
  async balances(me) {
    try {
      const byMint = {}; state.presales.forEach(p => { if (p.live && p.mint) byMint[p.mint] = p; });
      const res = await rpc('getTokenAccountsByOwner', [me, { programId: PROG.TOKEN }, { encoding: 'jsonParsed' }]);
      state.tokens = state.tokens || {}; Object.values(byMint).forEach(p => { state.tokens[p.id] = 0; });
      for (const a of res.value) { const i = a.account.data.parsed.info, p = byMint[i.mint]; if (p) state.tokens[p.id] = r6((state.tokens[p.id] || 0) + Number(i.tokenAmount.uiAmountString)); }
    } catch (e) { console.warn('token balances:', e.message); }
  },
  /* lots at average cost per raise; sells realise against it; refunds realise nothing; claims move a lot from the raise to tokens */
  build(trades, cs, vested = []) {
    const lots = {}, history = [], days = {};
    const lot = id => lots[id] || (lots[id] = { tokens: 0, cost: 0, realised: 0, bought: 0, sold: 0, proceeds: 0 });
    const day = (t, v, q) => { if (q !== 'SOL') return; const k = dayKey(t); days[k] = days[k] || { t: new Date(t).setHours(0, 0, 0, 0), v: 0 }; days[k].v += v; };
    const events = [];
    cs.forEach(c => { const p = find(c.raise_id); if (!p) return; const paid = Number(c.amount) + Number(c.fee);
      events.push({ t: Date.parse(c.at), kind: 'back', p, pair: paid, amount: Number(c.amount) });
      if (c.refunded_at) events.push({ t: Date.parse(c.refunded_at), kind: 'refund', p, pair: paid });
      if (c.claimed_at) events.push({ t: Date.parse(c.claimed_at), kind: 'claim', p, tokens: tokensFor(p, Number(c.amount)), pair: paid }); });
    trades.forEach(x => { const p = find(x.raise_id); if (!p) return; events.push({ t: Date.parse(x.at), kind: x.side, p, pair: Number(x.pair_amount), tokens: Number(x.token_amount), sig: x.signature }); });
    vested.forEach(x => { const p = find(x.raise_id); if (!p) return; events.push({ t: Date.parse(x.at), kind: 'vested', p, tokens: Number(x.tokens), sig: x.tx }); });
    events.sort((a, b) => a.t - b.t);
    for (const e of events) {
      const l = lot(e.p.id);
      if (e.kind === 'claim') { l.tokens += e.tokens; l.cost += e.pair; l.bought += e.pair; }   // the raise buy becomes a lot of tokens at what was paid
      else if (e.kind === 'vested') { l.tokens += e.tokens; }   // team tokens arrive at no cost
      else if (e.kind === 'buy') { l.tokens += e.tokens; l.cost += e.pair; l.bought += e.pair; }
      else if (e.kind === 'sell') { const avg = l.tokens > 0 ? l.cost / l.tokens : 0, basis = Math.min(l.tokens, e.tokens) * avg, pnl = e.pair - basis; l.tokens = Math.max(0, l.tokens - e.tokens); l.cost = Math.max(0, l.cost - basis); l.realised += pnl; l.sold += e.tokens; l.proceeds += e.pair; e.pnl = pnl; day(e.t, pnl, e.p.q); }
      history.push(e);
    }
    /* the open positions: tokens still held (the chain's balance, which includes any the wallet received elsewhere) at the pool's price */
    Object.keys(state.tokens || {}).forEach(id => { const p = find(id); if (p && p.live && state.tokens[id] > 0 && !lots[id]) lots[id] = { tokens: 0, cost: 0, realised: 0, bought: 0, sold: 0, proceeds: 0, free: true }; });   // held with no lot: a team unlock or a transfer in
    const open = Object.entries(lots).map(([id, l]) => { const p = find(id), held = heldOf(p), spot = p.spot || priceOf(p), value = held * spot, unreal = held > 0 ? value - (l.tokens > 0 ? l.cost * Math.min(1, held / l.tokens) : 0) : 0; return { p, held, value, cost: l.cost, realised: l.realised, unrealised: unreal, free: !!l.free }; }).filter(x => x.held > 0 || x.realised);
    return { lots, history: history.reverse(), days: Object.values(days).sort((a, b) => a.t - b.t), open };
  }
};
