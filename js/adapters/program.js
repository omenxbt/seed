/* ==========================================================================
   PROGRAM ADAPTER (live). The Seed program on the chain named in js/config/seed.js, for real wallets. The demo wallet
   keeps its simulation; a real wallet sends real transactions, signed in its own wallet app, and the page is then
   refreshed from the chain (the Raise account) and from Supabase (the indexed tables, for the lists and the buys).
   Anchor's browser build arrives through esm.sh the first time it is needed; the IDL is js/idl/seed.json.
   What a raise says about itself (description, links, art) is not on chain: it lives in raise_profiles,
   written by the founder's wallet through the seed function.
   ========================================================================== */
const ANCHOR_URL = 'https://esm.sh/@coral-xyz/anchor@0.30.1?bundle';
const PROG = {
  TOKEN: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', TOKEN_2022: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', ATA: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  SYSTEM: '11111111111111111111111111111111', DAMM: 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG', DAMM_AUTH: 'HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC',
  SOL_FEED: '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE', INSTRUCTIONS: 'Sysvar1nstructions1111111111111111111111111', RENT: 'SysvarRent111111111111111111111111111111111',
  METADATA: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
};
const PAIR_DP = { SOL: 9, USDC: 6 };
const enc = s => new TextEncoder().encode(s);
const le8 = n => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, BigInt(n), true); return b; };

var chain = {
  lib: null, program: null, cfg: null, conn: null, loading: null, profiles: {}, artTried: {}, ready: false, dry: false,
  on() { return !!(SEED.programId && SEED.rpc); },
  /* Anchor, the IDL, a read-only program and the config; once */
  init() {
    if (!this.on()) return Promise.resolve(false);
    if (this.ready) return Promise.resolve(true);
    return this.loading || (this.loading = (async () => {
      try {
        const [lib, idl] = await Promise.all([import(ANCHOR_URL), fetch('js/idl/seed.json').then(r => r.json())]);
        this.lib = lib; this.w = lib.web3; this.idl = idl;
        // the config from the first RPC on the list that answers: a browser key at its quota (429 "max usage reached") is not the end (QA P1-F16)
        let lastErr = null;
        for (const url of this.rpcs()) {
          try { this.useRpc(url); this.cfg = await this.program.account.config.fetch(this.pda.config()); lastErr = null; break; }
          catch (e) { lastErr = e; console.warn('RPC', url.replace(/api-key=[^&]+/, 'api-key=…'), 'failed:', e.message); }
        }
        if (lastErr) throw lastErr;
        this.ready = true; return true;
      } catch (e) { console.warn('Seed program unavailable:', e.message); this.program = null; this.loading = null; return false; }
    })());
  },
  /* the RPCs to try, in order: the site's, then the network's public one (index.html's RPCS) */
  rpcs() { return typeof RPCS !== 'undefined' ? RPCS : [SEED.rpc]; },
  useRpc(url) { this.rpcUrl = url; this.conn = new this.w.Connection(url, 'confirmed'); this.program = new this.lib.Program(this.idl, { connection: this.conn }); this.pid = this.program.programId; },
  /* after a quota or rate-limit error: the next RPC on the list, at most once a minute */
  rotate(e) {
    if (!/429|max usage|rate/i.test(String(e && e.message || e)) || !this.lib) return false;
    if (this.rotatedAt && Date.now() - this.rotatedAt < 60e3) return false;
    const list = this.rpcs(), i = list.indexOf(this.rpcUrl), next = list[(i + 1) % list.length]; if (next === this.rpcUrl) return false;
    this.rotatedAt = Date.now(); this.useRpc(next); console.warn('RPC moved to', next.replace(/api-key=[^&]+/, 'api-key=…')); return true;
  },
  pk(s) { return new this.w.PublicKey(s); },
  find(seeds, pid) { return this.w.PublicKey.findProgramAddressSync(seeds, pid || this.pid)[0]; },
  pda: {
    config() { return chain.find([enc('config')]); },
    raise(founder, nonce) { return chain.find([enc('raise'), founder.toBytes(), le8(nonce)]); },
    contribution(raise, wallet) { return chain.find([enc('contrib'), raise.toBytes(), wallet.toBytes()]); },
    blacklist(subject) { return chain.find([enc('blacklist'), subject instanceof Uint8Array ? subject : subject.toBytes()]); },   // a wallet, or a handle's hash
    founderState(founder) { return chain.find([enc('founder'), founder.toBytes()]); },
    raiseMeta(raise) { return chain.find([enc('meta'), raise.toBytes()]); },
    metadata(mint) { return chain.find([enc('metadata'), chain.pk(PROG.METADATA).toBytes(), mint.toBytes()], chain.pk(PROG.METADATA)); },
    poolVault(raise) { return chain.find([enc('pool'), raise.toBytes()]); },
    teamVault(raise) { return chain.find([enc('team'), raise.toBytes()]); },
    stage(raise) { return chain.find([enc('stage'), raise.toBytes()]); },
    poolPayer(raise) { return chain.find([enc('payer'), raise.toBytes()]); },
    dammPool(a, b) { const [x, y] = [a.toBytes(), b.toBytes()], big = cmpBytes(x, y) > 0; return chain.find([enc('cpool'), big ? x : y, big ? y : x], chain.pk(PROG.DAMM)); },
    dammPosition(nft) { return chain.find([enc('position'), nft.toBytes()], chain.pk(PROG.DAMM)); },
    dammNftAccount(nft) { return chain.find([enc('position_nft_account'), nft.toBytes()], chain.pk(PROG.DAMM)); },
    dammVault(mint, pool) { return chain.find([enc('token_vault'), mint.toBytes(), pool.toBytes()], chain.pk(PROG.DAMM)); },
    dammEvent() { return chain.find([enc('__event_authority')], chain.pk(PROG.DAMM)); }
  },
  ata(owner, mint, tokenProgram = PROG.TOKEN) { return this.find([owner.toBytes(), this.pk(tokenProgram).toBytes(), mint.toBytes()], this.pk(PROG.ATA)); },
  /* the few SPL instructions the flows need, built by hand (no token library in the browser) */
  ixAtaIdem(payer, ata, owner, mint, tokenProgram = this.pk(PROG.TOKEN)) {
    const k = (p, s, w) => ({ pubkey: p, isSigner: s, isWritable: w });
    return new this.w.TransactionInstruction({ programId: this.pk(PROG.ATA), data: Uint8Array.of(1), keys: [k(payer, true, true), k(ata, false, true), k(owner, false, false), k(mint, false, false), k(this.pk(PROG.SYSTEM), false, false), k(tokenProgram, false, false)] });
  },
  ixSync(ata) { return new this.w.TransactionInstruction({ programId: this.pk(PROG.TOKEN), data: Uint8Array.of(17), keys: [{ pubkey: ata, isSigner: false, isWritable: true }] }); },
  ixClose(ata, dest, owner) { return new this.w.TransactionInstruction({ programId: this.pk(PROG.TOKEN), data: Uint8Array.of(9), keys: [{ pubkey: ata, isSigner: false, isWritable: true }, { pubkey: dest, isSigner: false, isWritable: true }, { pubkey: owner, isSigner: true, isWritable: false }] }); },
  units(p, amount) { return new this.lib.BN(Math.round(amount * 10 ** PAIR_DP[p.q]).toString()); },
  pairMint(p) { const m = SEED.pairMints[p.q] || (this.registry[p.q] && this.registry[p.q].mint); if (!m) throw new Error(`Unknown pair asset ${p.q}.`); return this.pk(m); },
  pairProgram(p) { const r = this.registry[p.q]; return this.pk(r ? r.tokenProgram : PROG.TOKEN); },   // Token-2022 for a tokenized stock, Token otherwise
  registry: {},   // by symbol: { mint, decimals, tokenProgram, stable, paused, feed }
  /* the admin's pair allowlist, read once: each entry becomes an asset the Launch form offers and the page can price in */
  async loadPairs() {
    if (!(await this.init()) || (this.pairsAt && Date.now() - this.pairsAt < 120e3) || (this.pairsTriedAt && Date.now() - this.pairsTriedAt < 15e3)) return this.registry;
    this.pairsTriedAt = Date.now();   // pairsAt is set only when the read worked: at boot the public RPC rate-limits, and an empty list must not be kept for two minutes
    try {
      const all = await this.viaRpc(() => this.program.account.pairAsset.all());
      this.pairsAt = Date.now();   // re-read every two minutes after that, so a pair the admin adds shows up without a reload
      for (const { account: a } of all) {
        const sym = String(a.symbol), mint = a.mint.toBase58();
        this.registry[sym] = { mint, decimals: a.decimals, tokenProgram: a.tokenProgram.toBase58(), stable: !!a.stable, paused: !!a.paused, feed: a.feed.toBase58(), addedAt: Number(a.addedAt) * 1000 };
        PAIR_DP[sym] = a.decimals; SEED.pairMints[sym] = mint;
        if (!ASSETS[sym]) ASSETS[sym] = { sym, mint, dp: a.decimals >= 6 ? 2 : a.decimals, decimals: a.decimals, chips: a.stable ? [10, 50, 250] : [0.5, 2, 10], stable: !!a.stable, verified: true, allowed: true, paused: !!a.paused };
        else Object.assign(ASSETS[sym], { allowed: true, paused: !!a.paused, decimals: a.decimals, stable: !!a.stable });
      }
    } catch (e) { console.warn('pairs not read:', e.message); }
    return this.registry;
  },
  /* the admin (or, on a devnet build, the upgrade authority) allows, pauses or resumes a pair asset */
  async setPair(mint, { symbol, feed, feedId, stable, paused }) {
    await this.init(); const me = this.me(), m = this.pk(mint), programData = this.find([this.pid.toBytes()], this.pk('BPFLoaderUpgradeab1e11111111111111111111111'));
    const ix = await this.program.methods.setPair({ symbol, feedId: feedId ? Array.from(feedId) : new Array(32).fill(0), stable: !!stable, paused: !!paused })
      .accounts({ config: this.pda.config(), signer: me, programData: this.cfg.admin.equals(me) ? null : programData, mint: m, feed: stable || !feed ? null : this.pk(feed), pair: this.find([enc('pair'), m.toBytes()]), systemProgram: this.pk(PROG.SYSTEM) }).instruction();
    await this.send([ix]); this.pairsAt = 0; await this.loadPairs();
  },
  me() { return this.pk(state.wallet.pk); },
  raiseKey(p) { return this.pk(p.address); },

  /* ---- sending. The wallet app signs; confirmation is by polling, so any RPC works. */
  /* the lookup table from js/config/seed.js, read once: with it a transaction is v0 and every fixed account costs one byte,
     which is what lets open_raise at its largest (24 tranches, X linked, a 200-character URI) fit the 1232-byte packet */
  async table() {
    if (!SEED.lookupTable) return null;
    if (this.alt === undefined) { try { this.alt = (await this.conn.getAddressLookupTable(this.pk(SEED.lookupTable))).value || null; } catch (e) { this.alt = null; console.warn('lookup table not read:', e.message); } }
    return this.alt;
  },
  async send(ixs, signers = [], units = 0) {
    const prov = providerOf(state.wallet.kind); if (!this.dry && !(prov && prov.signTransaction)) throw new Error('This wallet cannot sign transactions here.');
    const me = this.me(), [{ blockhash, lastValidBlockHeight }, table] = await this.viaRpc(() => Promise.all([this.conn.getLatestBlockhash('confirmed'), this.table()]));
    const all = units ? [this.w.ComputeBudgetProgram.setComputeUnitLimit({ units }), ...ixs] : ixs;
    const msg = new this.w.TransactionMessage({ payerKey: me, recentBlockhash: blockhash, instructions: all });
    const tx = new this.w.VersionedTransaction(table ? msg.compileToV0Message([table]) : msg.compileToLegacyMessage());   // legacy only if the table could not be read
    if (signers.length) tx.sign(signers);
    if (this.dry) {   // a rehearsal: the chain simulates the transaction as this wallet, nothing is signed or sent
      const sim = await this.conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
      if (sim.value.err) throw new Error(this.explain((sim.value.logs || []).join('\n')) + ' [dry run]');
      return 'dry-run:' + (sim.value.unitsConsumed || 0) + 'cu';
    }
    let signed;
    try { signed = await prov.signTransaction(tx); }
    catch (e) { throw new Error(e && (e.code === 4001 || /rejected/i.test(e.message || '')) ? 'Cancelled in the wallet. Nothing was sent.' : (e && e.message) || 'The wallet did not sign.'); }   // Phantom's "User rejected the request." said plainly (QA P2-84)
    let sig;
    try { sig = await this.conn.sendRawTransaction(signed.serialize(), { preflightCommitment: 'confirmed' }); }
    catch (e) { throw new Error(this.explain(e)); }
    for (;;) {
      const st = (await this.conn.getSignatureStatuses([sig])).value[0];
      if (st && st.err) throw new Error(`The transaction failed on chain (${sig.slice(0, 8)}…).`);
      if (st && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) return sig;
      if ((await this.conn.getBlockHeight('confirmed')) > lastValidBlockHeight) throw new Error('The transaction expired before it was confirmed. Try again.');
      await wait(1200);
    }
  },
  /* the program's own message out of a simulation failure, or the wallet's, or the raw text */
  explain(e) {
    const s = String(e && e.message || e);
    const m = /Error Message: ([^.]+)\./.exec(s) || /Error Code: (\w+)/.exec(s);
    if (m) return m[1] + '.';
    if (/User rejected|rejected the request/i.test(s)) return 'Cancelled in the wallet. Nothing was sent.';
    if (/insufficient lamports|Insufficient funds|insufficient funds/i.test(s)) return 'Not enough SOL in the wallet for this transaction.';
    return s.length > 180 ? s.slice(0, 180) + '…' : s;
  },

  /* ---- reads. A Raise account onto the page's raise object. */
  apply(p, a) {
    const dp = PAIR_DP[p.q], f = v => Number(v.toString()) / 10 ** dp, t = v => Number(v.toString()) * 1000, key = o => o ? Object.keys(o)[0] : null;
    p.target = f(a.target); p.raised = f(a.raised); p.backers = Number(a.backers); p.status = key(a.status); p.seedStep = key(a.seedStep);
    p.refundReason = key(a.refundReason); p.openedAt = t(a.openedAt); p.endsAt = t(a.endsAt); p.filledAt = Number(a.filledAt) ? t(a.filledAt) : null; p.seededAt = Number(a.seededAt) ? t(a.seededAt) : null;
    p.dayMs = Number(a.timeUnit) * 1000 || D; p.teamBps = a.teamBps; p.feeBps = a.feeBps; p.creatorShareBps = a.creatorShareBps;
    p.teamSchedule = !a.teamBps ? null : a.even ? { cliffDays: a.even.cliffDays, intervalDays: a.even.intervalDays, count: a.even.count } : { tranches: a.schedule.map(x => ({ dayOffset: x.dayOffset, bps: x.bps })) };
    p.payoutWallet = a.payoutWallet.toBase58(); p.pendingPayoutWallet = a.pendingPayout ? a.pendingPayout.toBase58() : null; p.payoutEffectiveAt = a.pendingPayout ? t(a.payoutEffectiveAt) : null;
    p.targetUsd = Number(a.targetUsdCents) / 100; p.solUsdAtOpen = Number(a.solUsdCents) ? Number(a.solUsdCents) / 100 : p.solUsdAtOpen;
    if (a.capUsdCents != null && Number(a.capUsdCents)) { p.capUsd = Number(a.capUsdCents) / 100; p.preset = a.preset; }   // the opening market cap preset (a raise from before the presets keeps its FDV)
    if (a.minBuy != null && p.profile) { const mn = f(a.minBuy), mx = f(a.maxBuy); if (mn) p.profile.minBuy = mn; if (mx) p.profile.maxBuy = mx; }
    p.teamClaimed = Number(a.teamClaimed.toString()) / 1e6; p.blacklisted = !!a.blacklisted;
    if (!a.xHandleHash && p.xAccount && p.xAccount.handle && p.live) p.xAccount = { handle: '', verified: false, createdAt: null, followers: null };
    p.mint = a.mint && !a.mint.equals(this.w.PublicKey.default) ? a.mint.toBase58() : null; p.pool = a.pool && !a.pool.equals(this.w.PublicKey.default) ? a.pool.toBase58() : null;
    p.position = a.position && !a.position.equals(this.w.PublicKey.default) ? a.position.toBase58() : null; p.positionNftMint = a.positionNftMint && !a.positionNftMint.equals(this.w.PublicKey.default) ? a.positionNftMint.toBase58() : null;
    if (p.status === 'seeded' && !p.fees) p.fees = { volume: 0, founderClaimed: 0, seedClaimed: 0 };
    if (p.status === 'refunded' && !p.resolvedAt) p.resolvedAt = Date.now();
    if (a.flaggedAt && Number(a.flaggedAt)) p.flag = p.flag || { at: t(a.flaggedAt), by: null, reportId: null };
    if (a.takeoverTo && !a.takeoverTo.equals(this.w.PublicKey.default)) p.takeover = p.takeover || { from: null, to: a.takeoverTo.toBase58(), at: t(a.takeoverAt), reportId: null, by: null, label: null };
    return p;
  },
  /* a pair asset the registry has not named (not read yet, or since removed): a placeholder symbol from its address, 6 decimals
     (every SPL mint Seed allows other than SOL is 6), unpriced; the next registry read replaces it */
  unknownPair(mint) {
    const sym = mint.slice(0, 4) + '…' + mint.slice(-4);
    if (!ASSETS[sym]) { ASSETS[sym] = { sym, mint, dp: 2, decimals: 6, chips: [10, 50, 250], verified: false, allowed: false, paused: false }; PAIR_DP[sym] = 6; }
    return sym;
  },
  /* an indexed row (Supabase) onto a raise object; the chain fills in the rest when the page is opened */
  fromRow(r, prof) {
    // the registry adds its pairs to SEED.pairMints (loadLive reads it first); a mint still unknown is shown by its address, never as SOL
    const q = Object.keys(SEED.pairMints).find(k => SEED.pairMints[k] === r.pair_mint) || this.unknownPair(r.pair_mint), me = state.wallet && state.wallet.pk, pr = prof && prof.profile || {}, m = pr.model || {};
    const p = { id: r.id, address: r.address, live: true, name: r.name, ticker: r.ticker, q, target: Number(r.target), targetUsd: Number(r.target_usd), solUsdAtOpen: r.sol_usd_at_open ? Number(r.sol_usd_at_open) : SEED.demoSolUsd,
      raised: Number(r.raised), backers: r.backers, openedAt: Date.parse(r.opened_at), endsAt: Date.parse(r.ends_at), status: r.status, seedStep: r.seed_step, refundReason: r.refund_reason, filledAt: r.filled_at ? Date.parse(r.filled_at) : null, seededAt: r.seeded_at ? Date.parse(r.seeded_at) : null, resolvedAt: r.resolved_at ? Date.parse(r.resolved_at) : null,
      feeBps: r.fee_bps, creatorShareBps: r.creator_share_bps, teamBps: r.team_bps, teamSchedule: r.team_schedule, capUsd: r.cap_usd != null ? Number(r.cap_usd) : undefined, preset: r.preset, minBuy: r.min_buy != null ? Number(r.min_buy) : undefined, maxBuy: r.max_buy != null ? Number(r.max_buy) : undefined, tokenUseCase: m.tokenUseCase || 'none', xAccount: r.x_id ? (m.xAccount && m.xAccount.handle ? m.xAccount : { handle: String(r.x_id).replace(/^dev:/, ''), verified: !String(r.x_id).startsWith('dev:'), typed: String(r.x_id).startsWith('dev:'), createdAt: null, followers: null }) : { handle: '', verified: false, createdAt: null, followers: null }, pastRaises: [],
      payoutWallet: r.payout_wallet, pendingPayoutWallet: r.pending_payout, payoutEffectiveAt: r.payout_effective_at ? Date.parse(r.payout_effective_at) : null, reports: [], blacklisted: r.blacklisted, flag: r.flag, takeover: r.takeover,
      mint: r.mint, pool: r.pool, position: r.position, fees: r.status === 'seeded' ? { volume: Number(r.fees_volume), founderClaimed: Number(r.fees_founder_claimed), seedClaimed: Number(r.fees_seed_claimed) } : undefined, teamClaimed: Number(r.team_claimed),
      founderWallet: r.founder, mine: !!me && r.founder === me, creator: r.founder, metadataUri: r.metadata_uri || '', hist: [], buys: [], profile: pr.profile || { description: '', links: {}, team: [], founder: { name: 'Founder', wallet: r.founder, pastLaunches: [] }, updates: [], chat: [] }, dayMs: m.dayMs || (this.cfg && this.cfg.testMode ? 60e3 : D) };   // a raise without a saved page record still keeps the config's unit
    if (p.profile && !p.profile.founder) p.profile.founder = { name: 'Founder', wallet: r.founder, pastLaunches: [] };
    return p;
  },
  /* the live raises: rows, their profiles and their buys, merged into the page's list (a live raise replaces its own older copy) */
  /* a chain read that moves to the next RPC and tries once more when the current one is at its quota */
  async viaRpc(fn) { try { return await fn(); } catch (e) { if (this.rotate(e)) return fn(); throw e; } },
  async loadLive() {
    if (!supa.configured() || !(await supa.init())) return false;
    const [rs, ps, cs] = await Promise.all([supa.client.from('raises').select('*').order('opened_at', { ascending: false }).limit(200), supa.client.from('raise_profiles').select('address,founder,profile'), supa.client.from('contributions').select('raise_id,wallet,amount,fee,at,refunded_at,claimed_at').order('at')]);
    if (rs.error) return false;
    /* the pair registry before the rows: a row's pair asset is named by its mint, and a mint the registry has not supplied
       yet would read as SOL (QA P1-F22). One forced re-read when a row names a mint still unknown (the public RPC rate-limits at boot) */
    await this.loadPairs();
    if ((rs.data || []).some(r => !Object.values(SEED.pairMints).includes(r.pair_mint))) { this.pairsAt = 0; this.pairsTriedAt = 0; await this.loadPairs(); }
    (ps.data || []).forEach(x => this.profiles[x.address] = x);
    const me = state.wallet && state.wallet.pk, byRaise = {};
    (cs.data || []).forEach(c => (byRaise[c.raise_id] = byRaise[c.raise_id] || []).push(c));
    const hidden = SEED.hiddenFounders || [];
    const list = (rs.data || []).filter(r => !hidden.includes(r.founder) || r.founder === me).map(r => {
      const prof = this.profiles[r.address], p = this.fromRow(r, prof && prof.founder === r.founder ? prof : null);
      p.buys = (byRaise[r.id] || []).map(c => ({ wallet: c.wallet, amount: Number(c.amount), paid: Number(c.amount) + Number(c.fee), at: Date.parse(c.at), fundedBy: null, isFresh: false, tags: [], you: !!me && c.wallet === me, refundClaimed: !!c.refunded_at, tokensClaimed: !!c.claimed_at }));
      p.hist = [[p.openedAt, 0]]; let v = 0; for (const b of p.buys) { v = r6(v + b.amount); p.hist.push([b.at, Math.min(v, p.target)]); }
      if (me) {
        const mine = p.buys.filter(b => b.you);
        if (mine.length) {
          const open = mine.filter(b => !b.refundClaimed), amt = Number(open.reduce((a, b) => a + b.amount, 0).toFixed(9));   // to the lamport, not six places: the tokens owed are derived from it (QA P2-103)
          if (!(p.id in state.positions) || state.positions[p.id] !== amt) state.positions[p.id] = amt || state.positions[p.id] || 0;
          if ((byRaise[r.id] || []).some(c => c.wallet === me && (c.claimed_at || c.refunded_at))) state.claimed[p.id] = state.claimed[p.id] || (p.status === 'seeded' ? 'tokens' : 'refund');
        }
      }
      return p;
    });
    /* a founder's earlier raises, for the Founder card and the Info row: the chain raises by the same wallet opened before this one */
    const outcomeOf = x => x.blacklisted ? 'flagged' : x.status === 'seeded' ? 'seeded' : x.status === 'refunded' ? (x.refundReason === 'cancelled' ? 'cancelled' : 'refunded') : x.status === 'filled' ? 'seeding' : 'live';
    list.forEach(p => { p.pastRaises = list.filter(x => x.founderWallet === p.founderWallet && x.id !== p.id && x.openedAt < p.openedAt).sort((a, b) => b.openedAt - a.openedAt).map(x => ({ name: x.name, ticker: x.ticker, outcome: outcomeOf(x), at: x.openedAt })); });
    const ids = new Set(list.map(p => p.id)), was = {}; state.presales.forEach(p => { was[p.id] = p; });
    /* the pool price a raise already carried stays on the fresh object: a reload would otherwise draw the raise price until the reserves are read again */
    list.forEach(p => { const o = was[p.id]; if (o && o.spot && p.status === 'seeded') { p.spot = o.spot; p.spotFrom = o.spotFrom; p.spotAt = o.spotAt; p.holderCount = o.holderCount != null ? o.holderCount : p.holderCount; } });
    state.presales = list.concat(state.presales.filter(p => !ids.has(p.id) && !p.live));
    this.fillArt(list);
    return true;
  },
  /* the board follows the indexer: a raise opened or changed after the page loaded (Realtime on `raises`) reloads the live
     list, at most once every few seconds; if Realtime is unavailable, the list is reloaded every two minutes instead */
  watchRaises(onChange) {
    if (this.watching || !supa.configured()) return; this.watching = true;
    let timer = null; const bump = () => { if (timer) return; timer = setTimeout(async () => { timer = null; try { if (await this.loadLive()) onChange(); } catch (e) { console.warn('raises reload:', e.message); } }, 2500); };
    supa.init().then(ok => {
      if (!ok) return;
      const onRow = x => {   // a new raise, or one whose stage changed; a contribution's update is left to the 20 s sync
        const r = x.new || {}, p = typeof find === 'function' && r.id ? find(r.id) : null;
        if (x.eventType === 'INSERT' || !p || p.status !== r.status || (p.seedStep || null) !== (r.seed_step || null) || !!p.blacklisted !== !!r.blacklisted) bump();
      };
      supa.client.channel('raises-all').on('postgres_changes', { event: '*', schema: 'public', table: 'raises' }, onRow).subscribe(st => { this.realtimeRaises = st === 'SUBSCRIBED'; });
      setInterval(() => { if (!this.realtimeRaises && !document.hidden) bump(); }, 120e3);
    });
  },
  /* the SOL price in dollars, from the Pyth SOL/USD feed account the program prices raises with (the same address on devnet and
     mainnet; the layout is pyth.rs's: discriminator, write authority, verification level, feed id, then price i64, conf u64,
     exponent i32, publish time i64). Read once a minute; the market caps are quoted with it. Stale or unreadable, the last
     figure stays (and before any, the raise's SOL price at open). */
  async refreshSolUsd() {
    if (this.solUsdAt && Date.now() - this.solUsdAt < 60e3) return SEED.solUsdLive; this.solUsdAt = Date.now();
    try {
      if (!(await this.init())) return null;
      const acc = await this.conn.getAccountInfo(this.pk(PROG.SOL_FEED)); if (!acc) return null;
      const d = acc.data, dv = new DataView(d.buffer, d.byteOffset, d.byteLength), o = 8 + 32 + 1 + 32;
      if (d.length < o + 24 || d[40] !== 1) return null;   // only a fully verified update (as the program takes); a partial one carries a signature count that shifts the fields
      const price = Number(dv.getBigInt64(o, true)), expo = dv.getInt32(o + 16, true), at = Number(dv.getBigInt64(o + 20, true));
      if (!(price > 0) || Date.now() / 1000 - at > 3600) return null;
      const usd = price * 10 ** expo, was = SEED.solUsdLive; SEED.solUsdLive = usd; cacheSet('solUsd', usd);   // kept for the next load, so the first paint prices at the last live figure, not the demo one
      if ((!was || Math.abs(usd / was - 1) > 0.002) && typeof renderTerminal === 'function' && ui.tab === 'terminal') renderTerminal();   // the market caps were drawn at the old price
      return usd;
    } catch (e) { console.warn('SOL price:', e.message); return null; }
  },
  /* the pool price of the seeded raises on the board, read from their reserves once a minute, so the cards show the market, not the raise price */
  refreshSpots(list) {
    if (this.on()) this.refreshSolUsd();
    const due = (list || []).filter(p => p.live && p.pool && (!p.spotAt || Date.now() - p.spotAt > 60e3)); if (!due.length || typeof damm === 'undefined') return;
    due.forEach(p => p.spotAt = Date.now());
    const redraw = () => { if (typeof renderTerminal === 'function' && ui.tab === 'terminal') renderTerminal(); };
    Promise.all(due.map(p => damm.reserves(p).then(rs => { p.spot = rs.price; p.spotFrom = 'chain'; }).catch(() => p))).then(async missed => {
      redraw();
      /* a pool the RPC would not read (rate limit, lagging node): the last indexed trade's price, which is where the pool stood after it */
      const left = missed.filter(p => p && p.pool && !p.spot && typeof tradesAdapter !== 'undefined' && typeof supa !== 'undefined' && supa.configured());
      if (!left.length || !(await supa.init())) return;
      const { data } = await supa.client.from('trades').select('raise_id, price, at').in('raise_id', left.map(p => p.id)).order('at', { ascending: false }).limit(20 * left.length);
      for (const p of left) { const t = (data || []).find(r => r.raise_id === p.id); if (t) { p.spot = Number(t.price); p.spotFrom = 'trade'; } }
      if (left.some(p => p.spot)) redraw();
    });
  },
  /* a raise with no page record (opened by a script, say) still has its token's image: the metadata JSON names it */
  fillArt(list) {
    const todo = list.filter(p => p.metadataUri && p.profile && !p.profile.art && !this.artTried[p.id]);
    todo.forEach(async p => {
      this.artTried[p.id] = true;
      try { const j = await (await fetch(p.metadataUri)).json(); if (j && typeof j.image === 'string' && /^https:\/\//.test(j.image)) { p.profile.art = j.image; if (!p.profile.description && j.description) p.profile.description = String(j.description); if (typeof renderAll === 'function') renderAll(); if (typeof detailBox !== 'undefined' && detailBox && pg.id === p.id) renderDetail(true); } }
      catch (e) { /* no image, the identicon stays */ }
    });
  },
  /* devnet only: the admin closes the Config account and makes it again with the site's numbers, keeping the admin,
     treasury, attestor, price feed and test mode it has. One transaction; the program refuses it on a mainnet build. */
  async resetConfig() {
    await this.init(); const me = this.me(), c = this.cfg, BN = this.lib.BN;
    const params = { admin: c.admin, attestor: c.attestor, seedTreasury: c.seedTreasury, solFeed: c.solFeed, feeBps: SEED.feeBps, creatorShareBps: SEED.creatorShareBps, poolFeeBps: SEED.poolFeeBps, capUsdCents: new BN(SEED.capUsd * 100),
      minDeadline: new BN(SEED.minDeadlineH * 3600), maxDeadline: new BN(SEED.maxDeadlineH * 3600), seedTimeout: new BN(SEED.seedTimeoutDays * 86400), minUnlockDays: SEED.minUnlockDays, payoutDelay: new BN(SEED.payoutDelayDays * 86400), testMode: !!c.testMode, minTargetLamports: c.minTargetLamports || new BN(Math.round(SEED.testMinTargetSol * 1e9)) };   // the minimum raise it has, kept
    const reset = await this.program.methods.resetConfig().accounts({ config: this.pda.config(), admin: me }).instruction();
    const init = await this.program.methods.initConfig(params).accounts({ config: this.pda.config(), payer: me, systemProgram: this.pk(PROG.SYSTEM), devnetWitness: c.testMode ? this.pk(SEED.pairMints.USDC) : null }).instruction();
    await this.send([reset, init]); this.cfg = await this.program.account.config.fetch(this.pda.config());
  },
  /* the raise, fresh from the chain, plus this wallet's own record on it */
  async sync(p) {
    if (!p.address || !(await this.init())) return p;
    const a = await this.viaRpc(() => this.program.account.raise.fetch(this.raiseKey(p))); this.apply(p, a);
    if (isReal()) {
      const c = await this.program.account.contribution.fetchNullable(this.pda.contribution(this.raiseKey(p), this.me()));
      if (c) { state.positions[p.id] = Number(c.amount.toString()) / 10 ** PAIR_DP[p.q]; delete state.claimed[p.id]; }
      else if (state.positions[p.id] && p.status !== 'live' && p.status !== 'filled') state.claimed[p.id] = p.status === 'seeded' ? 'tokens' : 'refund';
      try { state.wallet.bal = await chainBalances(state.wallet.pk); } catch (e) {}
    }
    return p;
  },
  /* after a transaction: the chain's version of the raise lands once the caller's own bookkeeping has run */
  later(p) { setTimeout(() => this.sync(p).then(() => { save(); renderAll(); if (typeof renderDetail === 'function' && detailBox) renderDetail(true); }).catch(() => {}), 0); },

  /* ---- writes */
  /* the attestation for the linked X account, from the backend: the ed25519 instruction and the program's argument */
  async attestation() {
    const x = xAdapter.of(); if (!x) return null;
    const att = await supa.call('x-attest', { handle: x.handle }), bs58 = this.lib.utils.bytes.bs58, hash = hexBytes(att.handleHash);
    const ix = this.w.Ed25519Program.createInstructionWithPublicKey({ publicKey: bs58.decode(att.attestor), message: bs58.decode(att.message), signature: bs58.decode(att.signature) });
    return { ix, hash, arg: { handleHash: Array.from(hash), expiry: new this.lib.BN(att.expiry) }, remaining: [{ pubkey: this.pda.blacklist(hash), isSigner: false, isWritable: false }], handle: x.handle, typed: !!x.typed || !!x.demo };
  },
  async openRaise(p) {
    if (!(await this.init()) || !this.cfg) throw new Error('Seed\'s program could not be read (the config did not load from the RPC). Check the connection and try again.');   // said plainly, not a crash on a null config
    const me = this.me(), att = await this.attestation();
    const nonce = Date.now(), raise = this.pda.raise(me, nonce), pairMint = this.pairMint(p), pp = this.pairProgram(p), reg = this.registry[p.q], scale = this.cfg.testMode ? 1440 : 1;
    if (reg && reg.paused) throw new Error(`${p.q} is paused for new raises.`);
    const deadline = Math.max(1, Math.round((p.endsAt - Date.now()) / 1000 / scale));
    // the schedule as the program takes it: an even schedule compact, custom dates as tranches, nothing without a team share
    const even = p.teamBps && isEven(p.teamSchedule) ? { cliffDays: p.teamSchedule.cliffDays || 0, intervalDays: p.teamSchedule.intervalDays, count: p.teamSchedule.count } : null;
    const schedule = p.teamBps && !even ? tranchesOf(p.teamSchedule).map(t => ({ dayOffset: t.dayOffset, bps: t.bps })) : [];
    if (!/^(https:\/\/|ar:\/\/)/.test(p.metadataUri || '')) throw new Error('The token metadata was not uploaded, so the raise cannot open.');
    const fs = await this.program.account.founderState.fetchNullable(this.pda.founderState(me));   // the wallet's last live raise, which must have ended
    const prevRaise = fs && !fs.liveRaise.equals(this.w.PublicKey.default) ? fs.liveRaise : null;
    const pr = p.profile || {}, lim = v => new this.lib.BN(v > 0 ? this.units(p, v).toString() : 0);   // the founder's limits, program-enforced
    const ix = await this.program.methods.openRaise({ nonce: new this.lib.BN(nonce), name: p.name, ticker: p.ticker, preset: p.preset, minBuy: lim(pr.minBuy), maxBuy: lim(pr.maxBuy), deadline: new this.lib.BN(deadline), teamBps: p.teamBps, schedule, payoutWallet: this.pk(p.payoutWallet), x: att ? att.arg : null, uri: p.metadataUri || '', even })
      .accounts({ config: this.pda.config(), solFeed: this.pk(PROG.SOL_FEED), raise, founder: me, pairMint, pairTokenProgram: pp, pair: reg ? this.find([enc('pair'), pairMint.toBytes()]) : null, pairFeed: reg && !reg.stable ? this.pk(reg.feed) : null, escrow: this.ata(raise, pairMint, pp), walletBlacklist: this.pda.blacklist(me), founderState: this.pda.founderState(me), prevRaise, raiseMeta: this.pda.raiseMeta(raise), instructions: this.pk(PROG.INSTRUCTIONS), tokenProgram: this.pk(PROG.TOKEN), associatedTokenProgram: this.pk(PROG.ATA), systemProgram: this.pk(PROG.SYSTEM) })
      .remainingAccounts(att ? att.remaining : []).instruction();
    await this.send(att ? [att.ix, ix] : [ix]); if (this.dry) return;
    p.address = raise.toBase58(); p.live = true; p.id = `${p.ticker.toLowerCase()}-${p.address.slice(0, 8).toLowerCase()}`; p.founderWallet = state.wallet.pk; p.creator = state.wallet.pk;
    p.xAccount = att ? Object.assign({}, p.xAccount, { handle: att.handle, verified: !att.typed, typed: att.typed }) : { handle: '', verified: false, createdAt: null, followers: null };
    // the page's own words go beside the chain's facts; the founder's wallet signs them
    const model = { tokenUseCase: p.tokenUseCase, xAccount: p.xAccount, dayMs: this.cfg.testMode ? 60e3 : D };
    try { await supa.call('raise-profile', { address: p.address, profile: { profile: p.profile, model } }); this.profiles[p.address] = { address: p.address, founder: state.wallet.pk, profile: { profile: p.profile, model } }; } catch (e) { console.warn('profile not saved:', e.message); }
    await this.sync(p);
  },
  /* link_x on a raise opened without an X account */
  async linkX(p) {
    await this.init(); const att = await this.attestation(); if (!att) throw new Error('Link an X handle first.');
    const ix = await this.program.methods.linkX(att.arg).accounts({ raise: this.raiseKey(p), founder: this.me(), config: this.pda.config(), instructions: this.pk(PROG.INSTRUCTIONS) }).remainingAccounts(att.remaining).instruction();
    await this.send([att.ix, ix]); if (this.dry) return;
    const prof = this.profiles[p.address]; if (prof && prof.profile && prof.profile.model) { prof.profile.model.xAccount = { handle: att.handle, verified: !att.typed, typed: att.typed }; supa.call('raise-profile', { address: p.address, profile: prof.profile }).catch(() => {}); }
  },
  async contribute(p, pay) {
    await this.init(); const me = this.me(), raise = this.raiseKey(p), pairMint = this.pairMint(p), pp = this.pairProgram(p), wt = this.ata(me, pairMint, pp), amount = this.units(p, pay);
    const ixs = [this.ixAtaIdem(me, wt, me, pairMint, pp)];
    if (p.q === 'SOL') ixs.push(this.w.SystemProgram.transfer({ fromPubkey: me, toPubkey: wt, lamports: Number(amount.toString()) }), this.ixSync(wt));   // wrap exactly what the buy and its fee need
    ixs.push(await this.program.methods.contribute(amount).accounts({ raise, contribution: this.pda.contribution(raise, me), wallet: me, pairMint, walletToken: wt, escrow: this.ata(raise, pairMint, pp), tokenProgram: pp, systemProgram: this.pk(PROG.SYSTEM) }).instruction());
    if (p.q === 'SOL') ixs.push(this.ixClose(wt, me, me));   // whatever a trimmed last buy left wrapped comes back as SOL
    await this.send(ixs); this.later(p);
  },
  async claimRefund(p) {
    await this.init(); const me = this.me(), raise = this.raiseKey(p), pairMint = this.pairMint(p), pp = this.pairProgram(p), wt = this.ata(me, pairMint, pp), a = await this.program.account.raise.fetch(raise), st = Object.keys(a.status)[0], now = Date.now() / 1000;
    const ixs = [];
    // the raise settles on chain before the first refund if the crank has not been by yet: a miss, or a seeding that stalled
    // (the timeout counts from the last seeding step, the fill or the mint; a raise the pool already holds is only ever seeded)
    const step = Object.keys(a.seedStep)[0], since = Math.max(Number(a.filledAt), Number(a.progressAt || 0)), tmo = this.cfg.testMode ? Number(this.cfg.seedTimeout) / 1440 : Number(this.cfg.seedTimeout);
    if (st === 'live' && now >= Number(a.endsAt)) ixs.push(await this.program.methods.settle().accounts({ raise }).instruction());
    else if (st === 'filled' && step !== 'pooled' && now >= since + tmo) ixs.push(await this.program.methods.timeoutRefund().accounts({ raise, config: this.pda.config() }).instruction());
    else if (st !== 'refunded') { this.apply(p, a); throw new Error(st === 'seeded' ? 'This raise seeded; there is no refund, the tokens are yours to claim.' : st === 'filled' ? 'This raise is being seeded; there is no refund while seeding is under way.' : 'This raise is still open.'); }
    ixs.push(this.ixAtaIdem(me, wt, me, pairMint, pp), await this.program.methods.claimRefund().accounts({ raise, contribution: this.pda.contribution(raise, me), wallet: me, pairMint, walletToken: wt, escrow: this.ata(raise, pairMint, pp), tokenProgram: pp }).instruction());
    if (p.q === 'SOL') ixs.push(this.ixClose(wt, me, me));
    await this.send(ixs); this.later(p);
  },
  async claimTokens(p) {
    await this.init(); const me = this.me(), raise = this.raiseKey(p), mint = this.pk(p.mint), wt = this.ata(me, mint);
    await this.send([this.ixAtaIdem(me, wt, me, mint), await this.program.methods.claimTokens().accounts({ raise, contribution: this.pda.contribution(raise, me), wallet: me, mint, walletToken: wt, backersVault: this.ata(raise, mint), tokenProgram: this.pk(PROG.TOKEN) }).instruction()]);
    this.later(p);
  },
  async cancelRaise(p) {
    await this.init(); await this.send([await this.program.methods.cancelRaise().accounts({ raise: this.raiseKey(p), founder: this.me(), config: this.pda.config() }).instruction()]); this.later(p);
  },
  /* the seeding steps, pushed from the page; the crank does the same on its own timer */
  async seedStep(p, step) {
    await this.init(); const me = this.me(), raise = this.raiseKey(p), pairMint = this.pairMint(p), pp = this.pairProgram(p), stage = this.ata(this.pda.poolPayer(raise), pairMint, pp), a = await this.program.account.raise.fetch(raise), st = Object.keys(a.seedStep)[0];
    if (Object.keys(a.status)[0] !== 'filled') { this.apply(p, a); throw new Error('That raise is past seeding.'); }
    if (st === 'filled') {
      const mint = this.w.Keypair.generate();
      await this.send([await this.program.methods.crankMint().accounts({ raise, cranker: me, mint: mint.publicKey, backersVault: this.ata(raise, mint.publicKey), poolVault: this.pda.poolVault(raise), teamVault: this.pda.teamVault(raise), pairMint, stage, poolPayer: this.pda.poolPayer(raise), pairTokenProgram: pp, raiseMeta: this.pda.raiseMeta(raise), metadata: this.pda.metadata(mint.publicKey), tokenMetadataProgram: this.pk(PROG.METADATA), rent: this.pk(PROG.RENT), tokenProgram: this.pk(PROG.TOKEN), associatedTokenProgram: this.pk(PROG.ATA), systemProgram: this.pk(PROG.SYSTEM) }).instruction()], [mint], 400000);
    } else if (st === 'minted') {
      const nft = this.w.Keypair.generate(), mint = a.mint, pool = this.pda.dammPool(mint, pairMint);
      await this.send([await this.program.methods.crankPool().accounts({ raise, config: this.pda.config(), cranker: me, mint, pairMint, poolVault: this.pda.poolVault(raise), escrow: this.ata(raise, pairMint, pp), stage, poolPayer: this.pda.poolPayer(raise), pairTokenProgram: pp,
        positionNftMint: nft.publicKey, positionNftAccount: this.pda.dammNftAccount(nft.publicKey), poolAuthority: this.pk(PROG.DAMM_AUTH), pool, position: this.pda.dammPosition(nft.publicKey), tokenAVault: this.pda.dammVault(mint, pool), tokenBVault: this.pda.dammVault(pairMint, pool),
        dammEventAuthority: this.pda.dammEvent(), cpAmmProgram: this.pk(PROG.DAMM), tokenProgram: this.pk(PROG.TOKEN), token2022Program: this.pk(PROG.TOKEN_2022), systemProgram: this.pk(PROG.SYSTEM) }).instruction()], [nft], 600000);
    } else if (st === 'pooled') {
      const tre = this.ata(this.cfg.seedTreasury, pairMint, pp);
      await this.send([this.ixAtaIdem(me, tre, this.cfg.seedTreasury, pairMint, pp), await this.program.methods.crankSeed().accounts({ raise, config: this.pda.config(), pairMint, escrow: this.ata(raise, pairMint, pp), treasuryToken: tre, tokenProgram: pp }).instruction()]);
    } else throw new Error('Seeding is done.');
    await this.sync(p);
  },
  async claimFees(p) {
    await this.init(); const me = this.me(), raise = this.raiseKey(p), a = await this.program.account.raise.fetch(raise), pairMint = a.pairMint, pp = this.pairProgram(p), payout = a.payoutWallet, tre = this.ata(this.cfg.seedTreasury, pairMint, pp), pt = this.ata(payout, pairMint, pp);
    await this.send([this.ixAtaIdem(me, pt, payout, pairMint, pp), this.ixAtaIdem(me, tre, this.cfg.seedTreasury, pairMint, pp),
      await this.program.methods.claimCreatorFees().accounts({ raise, config: this.pda.config(), cranker: me, mint: a.mint, pairMint, poolVault: this.pda.poolVault(raise), escrow: this.ata(raise, pairMint, pp), payoutWallet: payout, payoutToken: pt, treasuryToken: tre, pairTokenProgram: pp, poolAuthority: this.pk(PROG.DAMM_AUTH), pool: a.pool, position: a.position,
        positionNftAccount: this.pda.dammNftAccount(a.positionNftMint), tokenAVault: this.pda.dammVault(a.mint, a.pool), tokenBVault: this.pda.dammVault(pairMint, a.pool), dammEventAuthority: this.pda.dammEvent(), cpAmmProgram: this.pk(PROG.DAMM), tokenProgram: this.pk(PROG.TOKEN), associatedTokenProgram: this.pk(PROG.ATA), systemProgram: this.pk(PROG.SYSTEM) }).instruction()], [], 400000);
    this.later(p);
  },
  async claimVested(p) {
    await this.init(); const me = this.me(), raise = this.raiseKey(p), mint = this.pk(p.mint), payout = this.pk(p.payoutWallet), pt = this.ata(payout, mint);
    await this.send([this.ixAtaIdem(me, pt, payout, mint), await this.program.methods.claimVested().accounts({ raise, cranker: me, mint, teamVault: this.pda.teamVault(raise), payoutWallet: payout, payoutToken: pt, tokenProgram: this.pk(PROG.TOKEN) }).instruction()]);
    this.later(p);
  },
  async requestPayoutChange(p, to) {
    await this.init(); await this.send([await this.program.methods.requestPayoutChange(this.pk(to)).accounts({ raise: this.raiseKey(p), founder: this.me(), config: this.pda.config() }).instruction()]); this.later(p);
  },
  async adminFlag(p) {
    await this.init(); const raise = this.raiseKey(p), a = await this.program.account.raise.fetch(raise);
    const rem = a.xHandleHash ? [{ pubkey: this.pda.blacklist(Uint8Array.from(a.xHandleHash)), isSigner: false, isWritable: true }] : [];   // the handle's blacklist too, when one is linked
    await this.send([await this.program.methods.adminFlagFraud().accounts({ raise, config: this.pda.config(), admin: this.me(), walletBlacklist: this.pda.blacklist(a.founder), systemProgram: this.pk(PROG.SYSTEM) }).remainingAccounts(rem).instruction()]); this.later(p);
  },
  async adminTakeover(p, to) {
    await this.init(); await this.send([await this.program.methods.adminApproveTakeover(this.pk(to)).accounts({ raise: this.raiseKey(p), config: this.pda.config(), admin: this.me() }).instruction()]); this.later(p);
  },
  /* the admin handover's second step, by the wallet the admin named */
  async acceptAdmin() {
    await this.init(); await this.send([await this.program.methods.acceptAdmin().accounts({ config: this.pda.config(), newAdmin: this.me() }).instruction()]);
    this.cfg = await this.program.account.config.fetch(this.pda.config());
  },
  isPendingAdmin() { return !!(this.cfg && isReal() && this.cfg.pendingAdmin && this.cfg.pendingAdmin.toBase58() === state.wallet.pk); },
  isAdmin() { return !!(this.cfg && isReal() && this.cfg.admin.toBase58() === state.wallet.pk); }
};
function cmpBytes(a, b) { for (let i = 0; i < 32; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }
function hexBytes(h) { const out = new Uint8Array(h.length / 2); for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16); return out; }

/* ---- the adapter's live path: a real wallet goes to the chain, the demo wallet keeps its simulation */
(function wire() {
  if (!chain.on()) return;
  /* a demo raise is the demo's whatever wallet is connected: its own steps run in the demo adapter, and a real wallet is
     told it cannot act on one (its balances are the chain's, so a simulated buy would only corrupt what it shows).
     onDemo: 'refuse' (the default) throws for a real wallet; 'run' lets the demo adapter run the raise's own steps;
     'new' means the object is a draft being opened, which is the connected wallet's and never a demo raise — a real
     wallet's draft goes to the chain whatever it carries (its live flag is set only once the raise exists there) */
  const isDemoRaise = p => !!(p && typeof p === 'object' && p.id && !p.live && p.status);
  const live = (name, fn, onDemo = 'refuse') => { const demo = adapter[name]; adapter[name] = function (p) {
    if (!isReal()) return demo.apply(adapter, arguments);
    if (onDemo !== 'new' && isDemoRaise(p)) { if (onDemo === 'run') return demo.apply(adapter, arguments); throw new Error('This is a demo raise. A real wallet acts on live raises; switch to the demo wallet to try this one.'); }
    return fn.apply(chain, arguments); }; };
  live('openPresale', p => chain.openRaise(p), 'new');
  live('contribute', (p, pay) => chain.contribute(p, pay));
  live('claimRefund', p => chain.claimRefund(p));
  live('claimTokens', p => chain.claimTokens(p));
  live('cancelRaise', p => chain.cancelRaise(p));
  live('seedStep', (p, step) => chain.seedStep(p, step), 'run');   // a demo raise seeds itself, whoever is connected
  live('claimFees', p => chain.claimFees(p));
  live('claimVested', p => chain.claimVested(p));
  live('requestPayoutChange', (p, to) => chain.requestPayoutChange(p, to));
  live('linkX', p => chain.linkX(p));
  live('report', async (p, kind) => {   // a report is off-chain; the two admin actions are on-chain
    if (kind === 'flag') return chain.adminFlag(p);
    if (kind === 'takeover') return chain.adminTakeover(p, p._takeoverTo);
    return supa.call('raise-report', { raiseId: p.id, reason: kind });
  });
  /* swaps, deposits and withdrawals are the demo wallet's; a real wallet trades on Meteora and holds its own SOL */
  for (const k of ['swap', 'deposit', 'withdraw']) live(k, () => { throw new Error('A real wallet does that in its own wallet app or on Meteora; this page shows the raise.'); });
})();

/* the admin handover's second step, offered on the Portfolio to the wallet the admin named; and a line for the admin */
function renderAdminNote() {
  renderFootNote();
  const box = $('#adminNote'); if (!box) return;
  if (chain.isPendingAdmin()) {
    box.hidden = false;
    box.innerHTML = `<div class="pp-notice"><b>Seed admin handover</b><p>The current admin named this wallet as the next Seed admin. Accepting makes it the wallet that can flag fraud and approve takeovers.</p><button type="button" class="btn btn-navy" data-accept-admin>Accept Seed admin</button></div>`;
    $('[data-accept-admin]', box).onclick = async e => { e.target.disabled = true; e.target.textContent = 'Confirm in wallet…'; try { await chain.acceptAdmin(); toast('This wallet is the Seed admin now.'); } catch (x) { toast(x.message); } renderAll(); };
  } else if (chain.isAdmin()) {
    box.hidden = false; const c = chain.cfg, stale = c && Number(c.poolFeeBps) !== SEED.poolFeeBps && SEED.network === 'devnet';
    box.innerHTML = `<p class="quiet" style="margin-top:12px">This wallet is the Seed admin on ${esc(SEED.network)}.${c ? ` Config: pool fee ${Number(c.poolFeeBps) / 100}%, Seed fee ${Number(c.feeBps) / 100}%, founder share ${Number(c.creatorShareBps) / 100}%${c.testMode ? ', test mode' : ''}.` : ''}</p>${stale ? `<div class="pp-notice"><b>The site expects a ${SEED.poolFeeBps / 100}% pool fee</b><p>The devnet config says ${Number(c.poolFeeBps) / 100}%. Only a devnet build can close the config and make it again; new pools open with the new fee, existing ones keep theirs. Treasury, attestor and admin stay as they are.</p><button type="button" class="btn btn-navy" data-reset-config>Apply ${SEED.poolFeeBps / 100}% on devnet</button></div>` : ''}`;
    // open alerts from the monitoring job (ops_runs → check_ops → alerts)
    if (supa.configured()) supa.client.from('alerts').select('kind, message, opened_at').is('resolved_at', null).order('opened_at', { ascending: false }).limit(5).then(({ data }) => {
      if (data && data.length && box.isConnected) box.insertAdjacentHTML('afterbegin', `<div class="pp-notice bad"><b>Alerts</b>${data.map(a => `<p>${esc(a.message)} <span class="quiet">(${fmtAgo(Date.now() - Date.parse(a.opened_at))})</span></p>`).join('')}</div>`);
    }).catch(() => {});
    // the pair allowlist: what is allowed, and a form to allow, pause or resume an asset
    const pairs = Object.entries(chain.registry);
    box.insertAdjacentHTML('beforeend', `<div class="pp-notice" style="margin-top:12px"><b>Pair assets</b><p class="quiet">SOL and USDC are built in. ${pairs.length ? pairs.map(([k, v]) => `<span class="num">${esc(k)}</span>${v.paused ? ' (paused)' : ''}${v.stable ? ' ($1)' : ''}`).join(', ') : 'No other pair is allowed yet.'}</p>
      <form data-pair-form class="form" style="gap:8px"><div class="f"><label>Mint</label><div class="inp"><input name="mint" class="num" placeholder="mint address" spellcheck="false"></div></div><div class="f"><label>Symbol</label><div class="inp"><input name="symbol" maxlength="10" placeholder="NVDAx"></div></div>
      <div class="f"><label>Pyth price account</label><div class="inp"><input name="feed" class="num" placeholder="leave empty for a $1 stable" spellcheck="false"></div></div><div class="f"><label>Pyth feed id (hex)</label><div class="inp"><input name="feedId" class="num" placeholder="64 hex characters" spellcheck="false"></div></div>
      <div class="f full"><label><input type="checkbox" name="paused"> Paused for new raises</label></div><div class="f full"><button type="submit" class="btn btn-navy">Allow or update this pair</button></div></form></div>`);
    $('[data-pair-form]', box).onsubmit = async e => {
      e.preventDefault(); const f = e.target, b = $('button[type=submit]', f), v = n => (f.elements[n].value || '').trim();
      if (!v('mint') || !v('symbol')) return toast('A mint and a symbol are needed.');
      const feedHex = v('feedId').replace(/^0x/, ''); if (v('feed') && feedHex.length !== 64) return toast('The feed id is 32 bytes of hex (64 characters).');
      b.disabled = true; b.textContent = 'Confirm in wallet…';
      try { await chain.setPair(v('mint'), { symbol: v('symbol'), feed: v('feed') || null, feedId: v('feed') ? Uint8Array.from(feedHex.match(/../g).map(h => parseInt(h, 16))) : null, stable: !v('feed'), paused: f.elements.paused.checked }); toast(`${v('symbol')} ${f.elements.paused.checked ? 'is paused' : 'is allowed'} as a pair asset.`); if (typeof renderPairSeg === 'function') renderPairSeg(); }
      catch (x) { toast(x.message); }
      renderAll();
    };
    const rb = $('[data-reset-config]', box); if (rb) rb.onclick = async e => { e.target.disabled = true; e.target.textContent = 'Confirm in wallet…'; try { await chain.resetConfig(); toast(`The devnet config now opens pools at ${SEED.poolFeeBps / 100}%.`); } catch (x) { toast(x.message); } renderAll(); };
  }
  else box.hidden = true;
}

/* the footer: a devnet notice while the site is live there; the prototype line only when no program is configured */
function renderFootNote() {
  const live = chain.on(), net = SEED.network === 'devnet' ? 'Solana devnet' : 'Solana';
  $$('[data-foot]').forEach(el => { el.textContent = live
    ? `Live on ${net}${SEED.network === 'devnet' ? ': real transactions, test SOL with no value, and a day counts as a minute. Demo raises are marked; a connected wallet signs its own transactions.' : '.'}`
    : 'Prototype. Raise data is simulated and no transactions are sent. A connected wallet is only read for its address and balances.'; });
  const cur = typeof find === 'function' && ui.tab === 'presale' ? find(ui.sel) : null;   // a live raise's page has no demo to reset
  $$('[data-reset]').forEach(b => b.hidden = !!(cur && cur.live));
}
/* the SOL price from the last visit (an hour at most) prices the first paint until Pyth answers, so the chips and caps never open on the demo figure */
if (!SEED.solUsdLive && typeof cacheGet === 'function') { const c = cacheGet('solUsd', 3600e3); if (c > 0) SEED.solUsdLive = c; }
