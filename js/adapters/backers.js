/* ==========================================================================
   BACKERS ADAPTER: who backed a presale, and after seeding who holds the token.
   Demo: the generated crowd in state. Real: for backers whose wallets are real addresses, the largest RISK.liveLookupCap of them
   get a live fresh-wallet and funding-source lookup (cached). Holders read getTokenLargestAccounts when the mint is real.
   ========================================================================== */
const walletId = () => state.wallet ? (state.wallet.pk || 'demo:' + state.wallet.addr) : null;
const isMe = w => !!state.wallet && (w === walletId() || w === state.wallet.pk);

const backersAdapter = {
  /* one row per wallet, largest first */
  rows(p) {
    const by = new Map(), raised = p.raised || 1;
    for (const b of p.buys || []) {
      let r = by.get(b.wallet);
      if (!r) by.set(b.wallet, r = { wallet: b.wallet, amount: 0, first: b.at, last: b.at, fundedBy: b.fundedBy, isFresh: !!b.isFresh, firstTxAt: b.firstTxAt, tags: b.tags || [], you: !!b.you, refundClaimed: b.refundClaimed, from: isRealAddr(b.wallet) ? 'chain' : 'demo' });
      r.amount = r6(r.amount + b.amount); r.first = Math.min(r.first, b.at); r.last = Math.max(r.last, b.at);
    }
    const rows = [...by.values()].sort((a, b) => b.amount - a.amount);
    rows.forEach(r => { r.pct = r.amount / raised * 100; const o = cacheGet('origin/' + r.wallet, RISK.lookupCacheMs); if (o) applyOrigin(r, o); });
    return rows;
  },

  /* the numbers the risk checks and the summary row read */
  summary(p, rows = this.rows(p)) {
    const raised = p.raised || 1, n = rows.length;
    const top10 = rows.slice(0, 10).reduce((a, r) => a + r.amount, 0) / raised * 100;
    const groups = new Map();
    rows.forEach(r => { const f = r.fundedBy; if (f && f.kind === 'wallet' && f.addr) { const g = groups.get(f.addr) || []; g.push(r); groups.set(f.addr, g); } });
    const bundles = [...groups.entries()].filter(([, g]) => g.length >= RISK.bundleMinWallets).map(([funder, g]) => ({ funder, wallets: g.length, amount: g.reduce((a, r) => a + r.amount, 0) }));
    const bundled = bundles.reduce((a, b) => a + b.amount, 0) / raised * 100;
    const fresh = n ? rows.filter(r => r.isFresh).length / n * 100 : 0;
    return { n, top10, bundled, bundles, fresh, kol: rows.filter(r => r.tags.includes('kol')).length, tracked: rows.filter(r => r.tags.includes('tracked')).length,
      repeat: rows.filter(r => r.tags.includes('repeat-backer')).length, from: rows.some(r => r.from === 'demo') ? 'demo' : 'chain' };
  },

  /* live lookups for the largest real backers; resolves true if anything new was learned */
  async enrich(p) {
    const real = this.rows(p).filter(r => isRealAddr(r.wallet)).slice(0, RISK.liveLookupCap);
    let learned = false;
    for (const r of real) { if (cacheGet('origin/' + r.wallet, RISK.lookupCacheMs)) continue; try { await walletOrigin(r.wallet); learned = true; } catch (e) { break; } }
    return learned;
  },

  /* holders after seeding: live when the mint is real, otherwise derived from the demo crowd */
  async holders(p) {
    const pr = profileOf(p), supply = SUPPLY;
    if (isRealAddr(pr.mint)) {
      const res = await rpcPaced('getTokenLargestAccounts', [pr.mint]);
      return withSrc(res.value.map(a => ({ wallet: a.address, amount: Number(a.uiAmountString), pct: Number(a.uiAmountString) / supply * 100, label: '' })), 'chain');
    }
    const r = rng('holders/' + p.id), backerTok = supply * presaleShare(p), rows = this.rows(p);
    const list = [{ wallet: fakeAddr('pool/' + p.id), amount: supply * (pr.tokenomics.allocations.find(a => a.kind === 'lp') || { pct: 50 }).pct / 100 * (0.9 + r() * 0.2), label: 'Meteora DAMM v2 pool, LP locked' }];
    pr.tokenomics.allocations.filter(a => a.kind === 'team' || a.kind === 'treasury').forEach(a => list.push({ wallet: a.wallet || fakeAddr(`vest/${p.id}/${a.label}`), amount: supply * a.pct / 100, label: `${a.label}${a.vesting ? ', vesting' : ''}` }));
    rows.slice(0, 40).forEach(b => { const sold = r() < 0.3 ? r() * 0.7 : 0; list.push({ wallet: b.wallet, amount: backerTok * b.pct / 100 * (1 - sold), label: b.tags.includes('kol') ? 'KOL' : '', tags: b.tags }); });
    list.sort((a, b) => b.amount - a.amount);
    return withSrc(list.slice(0, 30).map(h => Object.assign(h, { pct: h.amount / supply * 100 })), 'demo', { count: Math.round(rows.length * 1.35) });
  }
};
function applyOrigin(r, o) {
  if (o.firstTxAt) r.isFresh = r.first - o.firstTxAt < RISK.freshWalletDays * D;
  else if (!o.complete) r.isFresh = false;
  if (o.fundedBy) r.fundedBy = o.fundedBy;
  r.from = 'chain';
}
