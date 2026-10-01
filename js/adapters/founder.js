/* ==========================================================================
   FOUNDER ADAPTER: the founder's X account, deployer wallet funding and past launches.
   Demo: the profile. Real: when the deployer wallet is a real address, its first funding is read live from Solana (who funded it,
   through which program, how long before launch) and its past launches are the other Seed raises it opened.
   X account age stays self-reported: reading it needs the paid X API.
   ========================================================================== */
const founderAdapter = {
  /* synchronous view: the profile plus whatever live lookup is already cached */
  get(p) {
    const pr = profileOf(p), f = pr.founder || {}, w = f.wallet;
    const out = { name: f.name, x: f.x, xAgeDays: f.xAgeDays, wallet: w, funding: f.funding || null, pastLaunches: (f.pastLaunches || []).slice(), from: pr.demo ? 'demo' : 'self', xFrom: pr.demo ? 'demo' : 'self' };
    if (isRealAddr(w)) {
      const o = cacheGet('origin/' + w, RISK.lookupCacheMs);
      if (o) { out.funding = o.fundedBy ? Object.assign({}, o.fundedBy, { hoursBeforeLaunch: o.firstTxAt ? (p.openedAt - o.firstTxAt) / H : null }) : { kind: 'unknown', hoursBeforeLaunch: o.firstTxAt ? (p.openedAt - o.firstTxAt) / H : null }; out.from = 'chain'; }
      // the Seed raises this wallet opened before this one
      const mine = state.presales.filter(x => x.id !== p.id && x.profile && x.profile.founder && x.profile.founder.wallet === w && x.openedAt < p.openedAt);
      mine.forEach(x => out.pastLaunches.push({ name: x.name, platform: 'Seed', outcome: x.status === 'live' ? 'active' : x.status, daysAgo: (Date.now() - x.openedAt) / D }));
    }
    return out;
  },
  /* live lookup of the deployer wallet's funding; resolves true when it learned something */
  async refresh(p) {
    const w = (profileOf(p).founder || {}).wallet;
    if (!isRealAddr(w) || cacheGet('origin/' + w, RISK.lookupCacheMs)) return false;
    try { await walletOrigin(w); return true; } catch (e) { return false; }
  }
};
