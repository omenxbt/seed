/* ==========================================================================
   BACKERS ADAPTER: who backed a raise, and after seeding who holds the token.
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
      if (!r) by.set(b.wallet, r = { wallet: b.wallet, amount: 0, first: b.at, last: b.at, fundedBy: b.fundedBy, isFresh: !!b.isFresh, firstTxAt: b.firstTxAt, tags: b.tags || [], you: isMe(b.wallet), refundClaimed: b.refundClaimed, tokensClaimed: b.tokensClaimed, from: isRealAddr(b.wallet) ? 'chain' : 'demo' });
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

  /* how many accounts hold the token (the pool's and Seed's vaults among them), from the first DAS page */
  async holderCount(p) {   // the same count the Holders tab shows: one per owner, the labelled accounts included
    const mint = mintOf(p); if (!(p.live && isRealAddr(mint))) return null;
    try { return (await chainHolders(p, mint)).count; } catch (e) { return null; }
  },
  /* holders after seeding: every token account of the mint when the raise is on chain, otherwise derived from the demo crowd */
  async holders(p) {
    const pr = profileOf(p), supply = SUPPLY, mint = mintOf(p);
    if (p.live && isRealAddr(mint)) { const h = await chainHolders(p, mint); return withSrc(h.rows, 'chain', { count: h.count }); }
    const r = rng('holders/' + p.id), split = splitOf(p.teamBps), backerTok = split.backers, rows = this.rows(p);
    const list = [{ wallet: fakeAddr('pool/' + p.id), amount: split.pool * (0.9 + r() * 0.2), label: 'Meteora DAMM v2 pool, LP locked' }];
    if (split.team) { const u = unlockState(p); list.push({ wallet: fakeAddr(`vest/${p.id}`), amount: split.team - u.unlocked, label: `Team tokens, unlocking on schedule` }); if (u.unlocked) list.push({ wallet: p.payoutWallet, amount: u.unlocked, label: 'Payout wallet, unlocked team tokens' }); }
    rows.slice(0, 40).forEach(b => { const sold = r() < 0.3 ? r() * 0.7 : 0; list.push({ wallet: b.wallet, amount: backerTok * b.pct / 100 * (1 - sold), label: b.tags.includes('kol') ? 'KOL' : '', tags: b.tags }); });
    list.sort((a, b) => b.amount - a.amount);
    return withSrc(list.slice(0, 30).map(h => Object.assign(h, { pct: h.amount / supply * 100 })), 'demo', { count: Math.round(rows.length * 1.35) });
  }
};
/* the token's mint: the chain's for a raise that seeded on chain, the demo's placeholder otherwise */
const mintOf = p => (p.live && p.mint) || profileOf(p).mint || '';
/* every holder of a live token, largest first. Helius DAS lists every token account of the mint in pages; a plain RPC
   (localhost) falls back to the twenty largest. The accounts Seed itself opened are named: the locked pool, the backers' vault
   that claims come out of, the team's vesting vault, Seed's treasury and the founder's payout wallet. */
async function chainHolders(p, mint) {
  const labels = await knownHolders(p, mint), rows = [];
  let count = null;
  try {
    for (let page = 1; page <= 10; page++) {   // ten pages of a thousand: more holders than a devnet token will see
      const r = await dasTokenAccounts(mint, page);
      if (page === 1) count = r.total;
      for (const a of r.token_accounts) rows.push({ account: a.address, owner: a.owner, raw: Number(a.amount) });
      if (r.token_accounts.length < 1000) break;
    }
    if (!(count >= 0)) count = rows.length;
  } catch (e) {   // not a DAS endpoint: the largest twenty, with their owners read separately
    const big = (await rpc('getTokenLargestAccounts', [mint])).value, owners = big.length ? (await rpc('getMultipleAccounts', [big.map(a => a.address), { encoding: 'jsonParsed' }])).value : [];
    big.forEach((a, i) => { const info = owners[i] && owners[i].data && owners[i].data.parsed && owners[i].data.parsed.info; rows.push({ account: a.address, owner: info ? info.owner : a.address, amount: Number(a.uiAmountString) }); });
    count = null;
  }
  const scale = 1e6, by = new Map();   // the program mints every token with six decimals
  for (const r of rows) {   // one row per owner: a wallet with two accounts of the token is still one holder
    const amount = r.amount != null ? r.amount : r.raw / scale, label = labels[r.account] || labels[r.owner] || '';
    const k = label ? r.account : r.owner, cur = by.get(k) || { wallet: r.owner, account: r.account, amount: 0, label };
    cur.amount += amount; by.set(k, cur);
  }
  const list = [...by.values()].filter(h => h.amount > 0).sort((a, b) => b.amount - a.amount).map(h => Object.assign(h, { pct: h.amount / SUPPLY * 100, you: isMe(h.wallet) }));
  return { rows: list, count: count == null ? list.length : by.size };
}
/* Helius names the field `mint`; the public devnet endpoint's DAS wants `mintAddress`, so the other spelling is tried on a field error */
async function dasTokenAccounts(mint, page) {
  try { return await rpc('getTokenAccounts', { mint, page, limit: 1000, options: { showZeroBalance: false } }); }
  catch (e) { if (!/unknown field/.test(e.message)) throw e; return rpc('getTokenAccounts', { mintAddress: mint, page, limit: 1000, options: { showZeroBalance: false } }); }
}
async function knownHolders(p, mint) {
  const out = {};
  if (typeof chain === 'undefined' || !p.address) return out;
  try {
    await chain.init(); const raise = chain.pk(p.address), m = chain.pk(mint);
    out[chain.ata(raise, m).toBase58()] = 'Backers, unclaimed';
    out[chain.pda.teamVault(raise).toBase58()] = 'Team vesting';
    out[chain.pda.poolVault(raise).toBase58()] = 'Pool staging';
    if (p.pool) out[chain.pda.dammVault(m, chain.pk(p.pool)).toBase58()] = 'Locked pool';
    if (chain.cfg && chain.cfg.seedTreasury) out[chain.cfg.seedTreasury.toBase58()] = 'Seed';
    if (p.payoutWallet) out[p.payoutWallet] = 'Founder payout';
  } catch (e) { console.warn('holder labels:', e.message); }
  return out;
}
function applyOrigin(r, o) {
  if (o.firstTxAt) r.isFresh = r.first - o.firstTxAt < RISK.freshWalletDays * D;
  else if (!o.complete) r.isFresh = false;
  if (o.fundedBy) r.fundedBy = o.fundedBy;
  r.from = 'chain';
}

/* ---- on-chain safety facts for a token that seeded on chain: read once per page visit, graded like the other checks.
   Mint and freeze authority from the mint account; the LP lock from the position (all of its liquidity permanently
   locked, its NFT in the raise PDA's account); metadata immutability from the Token Metadata account; holder
   concentration from the token accounts, the pool's and Seed's vaults left out. */
async function chainChecks(p) {
  if (!(p.live && p.status === 'seeded' && p.mint)) return null;
  await chain.init(); const out = [], add = (id, label, level, reason) => out.push({ id, label, level, reason, from: 'chain' });
  const conn = chain.conn, mint = chain.pk(p.mint);
  try {
    const m = (await conn.getParsedAccountInfo(mint)).value, info = m && m.data && m.data.parsed && m.data.parsed.info;
    if (info) {
      add('mint-auth', 'Mint authority', info.mintAuthority ? 'fail' : 'pass', info.mintAuthority ? `Still held by ${shortMint(info.mintAuthority)}: more tokens could be minted.` : 'Revoked. The supply is fixed at 1,000,000,000.');
      add('freeze-auth', 'Freeze authority', info.freezeAuthority ? 'fail' : 'pass', info.freezeAuthority ? `Still held by ${shortMint(info.freezeAuthority)}: wallets could be frozen.` : 'Revoked. No wallet can be frozen.');
    }
  } catch (e) { add('mint-auth', 'Mint authority', 'pending', 'Could not be read right now.'); }
  try {
    if (p.position && typeof damm !== 'undefined') {
      await damm.init(); const pos = await damm.amm.fetchPositionState(chain.pk(p.position));
      const unlocked = Number(pos.unlockedLiquidity.toString()), perm = Number(pos.permanentLockedLiquidity.toString()), vested = Number((pos.vestedLiquidity || 0).toString());
      const nftAcc = (await conn.getParsedAccountInfo(chain.pda.dammNftAccount(pos.nftMint))).value, owner = nftAcc && nftAcc.data && nftAcc.data.parsed && nftAcc.data.parsed.info && nftAcc.data.parsed.info.owner;
      const locked = perm > 0 && unlocked === 0 && vested === 0, held = owner === p.address;
      add('lp-lock', 'Liquidity lock', locked && held ? 'pass' : 'fail', locked && held ? 'The whole position is permanently locked and its NFT sits in the raise account, which no instruction can move.' : !locked ? 'Part of the position is not permanently locked.' : `The position NFT is held by ${shortMint(owner || '?')}, not the raise account.`);
    }
  } catch (e) { add('lp-lock', 'Liquidity lock', 'pending', 'Could not be read right now.'); }
  try {
    const md = (await conn.getAccountInfo(chain.pda.metadata(mint)));
    if (md) { const im = metadataImmutable(md.data); add('metadata', 'Token metadata', im ? 'pass' : 'fail', im ? 'Immutable: the name, symbol and image cannot change.' : 'Mutable: the name, symbol or image could change.'); }
    else add('metadata', 'Token metadata', 'fail', 'No Metaplex metadata: wallets show the token as unknown.');
  } catch (e) { add('metadata', 'Token metadata', 'pending', 'Could not be read right now.'); }
  try {
    const h = await chainHolders(p, p.mint), wallets = h.rows.filter(r => !r.label), circ = wallets.reduce((a, r) => a + r.amount, 0) || 1, top = wallets.slice(0, 10).reduce((a, r) => a + r.amount, 0) / circ * 100;
    add('top10h', 'Top 10 holders', wallets.length < 2 ? 'info' : top > RISK.top10FailPct ? 'fail' : top > RISK.top10WarnPct ? 'warn' : 'pass', wallets.length < 2 ? `${plural(wallets.length, 'wallet holds', 'wallets hold')} the token so far.` : `The 10 largest wallets hold ${pctTxt(top)} of the tokens outside the pool and Seed's vaults.`);
  } catch (e) { add('top10h', 'Top 10 holders', 'pending', 'Could not be read right now.'); }
  return out;
}
/* Token Metadata's account: key, update authority, mint, three length-prefixed strings, a fee, optional creators, two flags */
function metadataImmutable(data) {
  let o = 1 + 32 + 32; const u32 = () => { const n = data[o] | (data[o + 1] << 8) | (data[o + 2] << 16) | (data[o + 3] << 24); o += 4; return n >>> 0; };
  for (let i = 0; i < 3; i++) { const n = u32(); o += n; } o += 2;   // (o += u32() would read o before the call moved it)
  if (data[o++]) { const n = u32(); o += n * 34; }
  o += 1; return data[o] === 0;
}
