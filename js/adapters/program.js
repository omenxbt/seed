/* ==========================================================================
   PROGRAM ADAPTER (live). The Seed program on the chain named in js/config/seed.js, for real wallets. The demo wallet
   keeps its simulation; a real wallet sends real transactions, signed in its own wallet app, and the page is then
   refreshed from the chain (the Raise account) and from Supabase (the indexed tables, for the lists and the buys).
   Anchor's browser build arrives through esm.sh the first time it is needed; the IDL is js/idl/seed.json.
   What a raise says about itself (description, links, roadmap, art) is not on chain: it lives in raise_profiles,
   written by the founder's wallet through the seed function.
   ========================================================================== */
const ANCHOR_URL = 'https://esm.sh/@coral-xyz/anchor@0.30.1?bundle';
const PROG = {
  TOKEN: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', TOKEN_2022: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', ATA: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  SYSTEM: '11111111111111111111111111111111', DAMM: 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG', DAMM_AUTH: 'HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC',
  SOL_FEED: '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE', INSTRUCTIONS: 'Sysvar1nstructions1111111111111111111111111'
};
const PAIR_DP = { SOL: 9, USDC: 6 };
const enc = s => new TextEncoder().encode(s);
const le8 = n => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, BigInt(n), true); return b; };

var chain = {
  lib: null, program: null, cfg: null, conn: null, loading: null, profiles: {}, ready: false, dry: false,
  on() { return !!(SEED.programId && SEED.rpc); },
  /* Anchor, the IDL, a read-only program and the config; once */
  init() {
    if (!this.on()) return Promise.resolve(false);
    if (this.program) return Promise.resolve(true);
    return this.loading || (this.loading = (async () => {
      try {
        const [lib, idl] = await Promise.all([import(ANCHOR_URL), fetch('js/idl/seed.json').then(r => r.json())]);
        this.lib = lib; this.w = lib.web3; this.conn = new lib.web3.Connection(SEED.rpc, 'confirmed');
        this.program = new lib.Program(idl, { connection: this.conn });
        this.pid = this.program.programId;
        this.cfg = await this.program.account.config.fetch(this.pda.config());
        this.ready = true; return true;
      } catch (e) { console.warn('Seed program unavailable:', e.message); this.loading = null; return false; }
    })());
  },
  pk(s) { return new this.w.PublicKey(s); },
  find(seeds, pid) { return this.w.PublicKey.findProgramAddressSync(seeds, pid || this.pid)[0]; },
  pda: {
    config() { return chain.find([enc('config')]); },
    raise(founder, nonce) { return chain.find([enc('raise'), founder.toBytes(), le8(nonce)]); },
    contribution(raise, wallet) { return chain.find([enc('contrib'), raise.toBytes(), wallet.toBytes()]); },
    blacklist(hash) { return chain.find([enc('blacklist'), hash]); },
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
  ixAtaIdem(payer, ata, owner, mint) {
    const k = (p, s, w) => ({ pubkey: p, isSigner: s, isWritable: w });
    return new this.w.TransactionInstruction({ programId: this.pk(PROG.ATA), data: Uint8Array.of(1), keys: [k(payer, true, true), k(ata, false, true), k(owner, false, false), k(mint, false, false), k(this.pk(PROG.SYSTEM), false, false), k(this.pk(PROG.TOKEN), false, false)] });
  },
  ixSync(ata) { return new this.w.TransactionInstruction({ programId: this.pk(PROG.TOKEN), data: Uint8Array.of(17), keys: [{ pubkey: ata, isSigner: false, isWritable: true }] }); },
  ixClose(ata, dest, owner) { return new this.w.TransactionInstruction({ programId: this.pk(PROG.TOKEN), data: Uint8Array.of(9), keys: [{ pubkey: ata, isSigner: false, isWritable: true }, { pubkey: dest, isSigner: false, isWritable: true }, { pubkey: owner, isSigner: true, isWritable: false }] }); },
  units(p, amount) { return new this.lib.BN(Math.round(amount * 10 ** PAIR_DP[p.q]).toString()); },
  pairMint(p) { return this.pk(SEED.pairMints[p.q]); },
  me() { return this.pk(state.wallet.pk); },
  raiseKey(p) { return this.pk(p.address); },

  /* ---- sending. The wallet app signs; confirmation is by polling, so any RPC works. */
  async send(ixs, signers = [], units = 0) {
    const prov = providerOf(state.wallet.kind); if (!this.dry && !(prov && prov.signTransaction)) throw new Error('This wallet cannot sign transactions here.');
    const me = this.me(), { blockhash, lastValidBlockHeight } = await this.conn.getLatestBlockhash('confirmed');
    const tx = new this.w.Transaction({ feePayer: me, blockhash, lastValidBlockHeight });
    if (units) tx.add(this.w.ComputeBudgetProgram.setComputeUnitLimit({ units }));
    tx.add(...ixs);
    if (signers.length) tx.partialSign(...signers);
    if (this.dry) {   // a rehearsal: the chain simulates the transaction as this wallet, nothing is signed or sent
      const sim = await this.conn.simulateTransaction(new this.w.VersionedTransaction(tx.compileMessage()), { sigVerify: false, replaceRecentBlockhash: true });
      if (sim.value.err) throw new Error(this.explain((sim.value.logs || []).join('\n')) + ' [dry run]');
      return 'dry-run:' + (sim.value.unitsConsumed || 0) + 'cu';
    }
    const signed = await prov.signTransaction(tx);
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
    p.teamSchedule = a.teamBps ? { tranches: a.schedule.map(x => ({ dayOffset: x.dayOffset, bps: x.bps })) } : null;
    p.payoutWallet = a.payoutWallet.toBase58(); p.pendingPayoutWallet = a.pendingPayout ? a.pendingPayout.toBase58() : null; p.payoutEffectiveAt = a.pendingPayout ? t(a.payoutEffectiveAt) : null;
    p.targetUsd = Number(a.targetUsdCents) / 100; p.solUsdAtOpen = Number(a.solUsdCents) ? Number(a.solUsdCents) / 100 : p.solUsdAtOpen;
    p.teamClaimed = Number(a.teamClaimed.toString()) / 1e6; p.blacklisted = !!a.blacklisted;
    p.mint = a.mint && !a.mint.equals(this.w.PublicKey.default) ? a.mint.toBase58() : null; p.pool = a.pool && !a.pool.equals(this.w.PublicKey.default) ? a.pool.toBase58() : null;
    p.position = a.position && !a.position.equals(this.w.PublicKey.default) ? a.position.toBase58() : null; p.positionNftMint = a.positionNftMint && !a.positionNftMint.equals(this.w.PublicKey.default) ? a.positionNftMint.toBase58() : null;
    if (p.status === 'seeded' && !p.fees) p.fees = { volume: 0, founderClaimed: 0, seedClaimed: 0 };
    if (p.status === 'refunded' && !p.resolvedAt) p.resolvedAt = Date.now();
    if (a.flaggedAt && Number(a.flaggedAt)) p.flag = p.flag || { at: t(a.flaggedAt), by: null, reportId: null };
    if (a.takeoverTo && !a.takeoverTo.equals(this.w.PublicKey.default)) p.takeover = p.takeover || { from: null, to: a.takeoverTo.toBase58(), at: t(a.takeoverAt), reportId: null, by: null, label: null };
    return p;
  },
  /* an indexed row (Supabase) onto a raise object; the chain fills in the rest when the page is opened */
  fromRow(r, prof) {
    const q = r.pair_mint === SEED.pairMints.USDC ? 'USDC' : 'SOL', me = state.wallet && state.wallet.pk, pr = prof && prof.profile || {}, m = pr.model || {};
    const p = { id: r.id, address: r.address, live: true, name: r.name, ticker: r.ticker, idea: m.idea || (pr.profile && pr.profile.tagline) || '', q, target: Number(r.target), targetUsd: Number(r.target_usd), solUsdAtOpen: r.sol_usd_at_open ? Number(r.sol_usd_at_open) : SEED.demoSolUsd,
      raised: Number(r.raised), backers: r.backers, openedAt: Date.parse(r.opened_at), endsAt: Date.parse(r.ends_at), status: r.status, seedStep: r.seed_step, refundReason: r.refund_reason, filledAt: r.filled_at ? Date.parse(r.filled_at) : null, seededAt: r.seeded_at ? Date.parse(r.seeded_at) : null, resolvedAt: r.resolved_at ? Date.parse(r.resolved_at) : null,
      feeBps: r.fee_bps, creatorShareBps: r.creator_share_bps, teamBps: r.team_bps, teamSchedule: r.team_schedule, roadmap: m.roadmap || [], tokenUseCase: m.tokenUseCase || 'none', xAccount: m.xAccount || { handle: r.x_id ? String(r.x_id).replace(/^dev:/, '') : '', verified: false, typed: true, createdAt: null, followers: null }, pastRaises: [],
      payoutWallet: r.payout_wallet, pendingPayoutWallet: r.pending_payout, payoutEffectiveAt: r.payout_effective_at ? Date.parse(r.payout_effective_at) : null, reports: [], blacklisted: r.blacklisted, flag: r.flag, takeover: r.takeover,
      mint: r.mint, pool: r.pool, position: r.position, fees: r.status === 'seeded' ? { volume: Number(r.fees_volume), founderClaimed: Number(r.fees_founder_claimed), seedClaimed: Number(r.fees_seed_claimed) } : undefined, teamClaimed: Number(r.team_claimed),
      founderWallet: r.founder, mine: !!me && r.founder === me, creator: r.founder, hist: [], buys: [], profile: pr.profile || { tagline: '', description: '', links: {}, team: [], founder: { name: 'Founder', wallet: r.founder, pastLaunches: [] }, updates: [], chat: [] }, dayMs: m.dayMs || D };
    if (p.profile && !p.profile.founder) p.profile.founder = { name: 'Founder', wallet: r.founder, pastLaunches: [] };
    return p;
  },
  /* the live raises: rows, their profiles and their buys, merged into the page's list (a live raise replaces its own older copy) */
  async loadLive() {
    if (!supa.configured() || !(await supa.init())) return false;
    const [rs, ps, cs] = await Promise.all([supa.client.from('raises').select('*').order('opened_at', { ascending: false }).limit(200), supa.client.from('raise_profiles').select('address,founder,profile'), supa.client.from('contributions').select('raise_id,wallet,amount,fee,at,refunded_at,claimed_at').order('at')]);
    if (rs.error) return false;
    (ps.data || []).forEach(x => this.profiles[x.address] = x);
    const me = state.wallet && state.wallet.pk, byRaise = {};
    (cs.data || []).forEach(c => (byRaise[c.raise_id] = byRaise[c.raise_id] || []).push(c));
    const list = (rs.data || []).map(r => {
      const prof = this.profiles[r.address], p = this.fromRow(r, prof && prof.founder === r.founder ? prof : null);
      p.buys = (byRaise[r.id] || []).map(c => ({ wallet: c.wallet, amount: Number(c.amount), paid: Number(c.amount) + Number(c.fee), at: Date.parse(c.at), fundedBy: null, isFresh: false, tags: [], you: !!me && c.wallet === me, refundClaimed: !!c.refunded_at }));
      p.hist = [[p.openedAt, 0]]; let v = 0; for (const b of p.buys) { v = r6(v + b.amount); p.hist.push([b.at, Math.min(v, p.target)]); }
      if (me) {
        const mine = p.buys.filter(b => b.you);
        if (mine.length) {
          const open = mine.filter(b => !b.refundClaimed), amt = r6(open.reduce((a, b) => a + b.amount, 0));
          if (!(p.id in state.positions) || state.positions[p.id] !== amt) state.positions[p.id] = amt || state.positions[p.id] || 0;
          if ((byRaise[r.id] || []).some(c => c.wallet === me && (c.claimed_at || c.refunded_at))) state.claimed[p.id] = state.claimed[p.id] || (p.status === 'seeded' ? 'tokens' : 'refund');
        }
      }
      return p;
    });
    const ids = new Set(list.map(p => p.id));
    state.presales = list.concat(state.presales.filter(p => !ids.has(p.id) && !p.live));
    return true;
  },
  /* the raise, fresh from the chain, plus this wallet's own record on it */
  async sync(p) {
    if (!p.address || !(await this.init())) return p;
    const a = await this.program.account.raise.fetch(this.raiseKey(p)); this.apply(p, a);
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
  async openRaise(p) {
    await this.init(); const me = this.me(), x = xAdapter.of();
    const att = await supa.call('x-attest', { handle: x ? x.handle : '' });
    const bs58 = this.lib.utils.bytes.bs58, hash = hexBytes(att.handleHash);
    const attestIx = this.w.Ed25519Program.createInstructionWithPublicKey({ publicKey: bs58.decode(att.attestor), message: bs58.decode(att.message), signature: bs58.decode(att.signature) });
    const nonce = Date.now(), raise = this.pda.raise(me, nonce), pairMint = this.pairMint(p), scale = this.cfg.testMode ? 1440 : 1;
    const deadline = Math.max(1, Math.round((p.endsAt - Date.now()) / 1000 / scale));
    const schedule = p.teamBps ? tranchesOf(p.teamSchedule).map(t => ({ dayOffset: t.dayOffset, bps: t.bps })) : [];
    const ix = await this.program.methods.openRaise({ nonce: new this.lib.BN(nonce), name: p.name, ticker: p.ticker, target: this.units(p, p.target), deadline: new this.lib.BN(deadline), teamBps: p.teamBps, schedule, payoutWallet: this.pk(p.payoutWallet), xHandleHash: Array.from(hash), attestExpiry: new this.lib.BN(att.expiry) })
      .accounts({ config: this.pda.config(), solFeed: this.pk(PROG.SOL_FEED), raise, founder: me, pairMint, escrow: this.ata(raise, pairMint), blacklist: this.pda.blacklist(hash), instructions: this.pk(PROG.INSTRUCTIONS), tokenProgram: this.pk(PROG.TOKEN), associatedTokenProgram: this.pk(PROG.ATA), systemProgram: this.pk(PROG.SYSTEM) }).instruction();
    await this.send([attestIx, ix]); if (this.dry) return;
    p.address = raise.toBase58(); p.live = true; p.id = `${p.ticker.toLowerCase()}-${p.address.slice(0, 8).toLowerCase()}`; p.founderWallet = state.wallet.pk; p.creator = state.wallet.pk;
    if (x) p.xAccount = Object.assign({}, p.xAccount, { handle: x.handle, verified: false, typed: true });
    // the page's own words go beside the chain's facts; the founder's wallet signs them
    const model = { idea: p.idea, roadmap: p.roadmap, tokenUseCase: p.tokenUseCase, xAccount: p.xAccount, dayMs: this.cfg.testMode ? 60e3 : D };
    try { await supa.call('raise-profile', { address: p.address, profile: { profile: p.profile, model } }); this.profiles[p.address] = { address: p.address, founder: state.wallet.pk, profile: { profile: p.profile, model } }; } catch (e) { console.warn('profile not saved:', e.message); }
    await this.sync(p);
  },
  async contribute(p, pay) {
    await this.init(); const me = this.me(), raise = this.raiseKey(p), pairMint = this.pairMint(p), wt = this.ata(me, pairMint), amount = this.units(p, pay);
    const ixs = [this.ixAtaIdem(me, wt, me, pairMint)];
    if (p.q === 'SOL') ixs.push(this.w.SystemProgram.transfer({ fromPubkey: me, toPubkey: wt, lamports: Number(amount.toString()) }), this.ixSync(wt));   // wrap exactly what the buy and its fee need
    ixs.push(await this.program.methods.contribute(amount).accounts({ raise, contribution: this.pda.contribution(raise, me), wallet: me, walletToken: wt, escrow: this.ata(raise, pairMint), tokenProgram: this.pk(PROG.TOKEN), systemProgram: this.pk(PROG.SYSTEM) }).instruction());
    if (p.q === 'SOL') ixs.push(this.ixClose(wt, me, me));   // whatever a trimmed last buy left wrapped comes back as SOL
    await this.send(ixs); this.later(p);
  },
  async claimRefund(p) {
    await this.init(); const me = this.me(), raise = this.raiseKey(p), pairMint = this.pairMint(p), wt = this.ata(me, pairMint), a = await this.program.account.raise.fetch(raise), st = Object.keys(a.status)[0], now = Date.now() / 1000;
    const ixs = [];
    // the raise settles on chain before the first refund if the crank has not been by yet: a miss, or a seeding timeout
    if (st === 'live' && now >= Number(a.endsAt)) ixs.push(await this.program.methods.settle().accounts({ raise }).instruction());
    else if (st === 'filled' && now >= Number(a.filledAt) + (this.cfg.testMode ? Number(this.cfg.seedTimeout) / 1440 : Number(this.cfg.seedTimeout))) ixs.push(await this.program.methods.timeoutRefund().accounts({ raise, config: this.pda.config() }).instruction());
    else if (st !== 'refunded') { this.apply(p, a); throw new Error(st === 'seeded' ? 'This raise seeded; there is no refund, the tokens are yours to claim.' : 'This raise is still open.'); }
    ixs.push(this.ixAtaIdem(me, wt, me, pairMint), await this.program.methods.claimRefund().accounts({ raise, contribution: this.pda.contribution(raise, me), wallet: me, walletToken: wt, escrow: this.ata(raise, pairMint), tokenProgram: this.pk(PROG.TOKEN) }).instruction());
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
    await this.init(); const me = this.me(), raise = this.raiseKey(p), pairMint = this.pairMint(p), a = await this.program.account.raise.fetch(raise), st = Object.keys(a.seedStep)[0];
    if (Object.keys(a.status)[0] !== 'filled') { this.apply(p, a); throw new Error('That raise is past seeding.'); }
    if (st === 'filled') {
      const mint = this.w.Keypair.generate();
      await this.send([await this.program.methods.crankMint().accounts({ raise, cranker: me, mint: mint.publicKey, backersVault: this.ata(raise, mint.publicKey), poolVault: this.pda.poolVault(raise), teamVault: this.pda.teamVault(raise), pairMint, stage: this.pda.stage(raise), poolPayer: this.pda.poolPayer(raise), tokenProgram: this.pk(PROG.TOKEN), associatedTokenProgram: this.pk(PROG.ATA), systemProgram: this.pk(PROG.SYSTEM) }).instruction()], [mint], 400000);
    } else if (st === 'minted') {
      const nft = this.w.Keypair.generate(), mint = a.mint, pool = this.pda.dammPool(mint, pairMint);
      await this.send([await this.program.methods.crankPool().accounts({ raise, config: this.pda.config(), cranker: me, mint, pairMint, poolVault: this.pda.poolVault(raise), escrow: this.ata(raise, pairMint), stage: this.pda.stage(raise), poolPayer: this.pda.poolPayer(raise),
        positionNftMint: nft.publicKey, positionNftAccount: this.pda.dammNftAccount(nft.publicKey), poolAuthority: this.pk(PROG.DAMM_AUTH), pool, position: this.pda.dammPosition(nft.publicKey), tokenAVault: this.pda.dammVault(mint, pool), tokenBVault: this.pda.dammVault(pairMint, pool),
        dammEventAuthority: this.pda.dammEvent(), cpAmmProgram: this.pk(PROG.DAMM), tokenProgram: this.pk(PROG.TOKEN), token2022Program: this.pk(PROG.TOKEN_2022), systemProgram: this.pk(PROG.SYSTEM) }).instruction()], [nft], 600000);
    } else if (st === 'pooled') {
      const tre = this.ata(this.cfg.seedTreasury, pairMint);
      await this.send([this.ixAtaIdem(me, tre, this.cfg.seedTreasury, pairMint), await this.program.methods.crankSeed().accounts({ raise, config: this.pda.config(), escrow: this.ata(raise, pairMint), treasuryToken: tre, tokenProgram: this.pk(PROG.TOKEN) }).instruction()]);
    } else throw new Error('Seeding is done.');
    await this.sync(p);
  },
  async claimFees(p) {
    await this.init(); const me = this.me(), raise = this.raiseKey(p), a = await this.program.account.raise.fetch(raise), pairMint = a.pairMint, payout = a.payoutWallet, tre = this.ata(this.cfg.seedTreasury, pairMint), pt = this.ata(payout, pairMint);
    await this.send([this.ixAtaIdem(me, pt, payout, pairMint), this.ixAtaIdem(me, tre, this.cfg.seedTreasury, pairMint),
      await this.program.methods.claimCreatorFees().accounts({ raise, config: this.pda.config(), cranker: me, mint: a.mint, pairMint, poolVault: this.pda.poolVault(raise), escrow: this.ata(raise, pairMint), payoutWallet: payout, payoutToken: pt, treasuryToken: tre, poolAuthority: this.pk(PROG.DAMM_AUTH), pool: a.pool, position: a.position,
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
    await this.send([await this.program.methods.adminFlagFraud().accounts({ raise, config: this.pda.config(), admin: this.me(), blacklist: this.pda.blacklist(Uint8Array.from(a.xHandleHash)), systemProgram: this.pk(PROG.SYSTEM) }).instruction()]); this.later(p);
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
  const live = (name, fn) => { const demo = adapter[name]; adapter[name] = function () { return isReal() ? fn.apply(chain, arguments) : demo.apply(adapter, arguments); }; };
  live('openPresale', p => chain.openRaise(p));
  live('contribute', (p, pay) => chain.contribute(p, pay));
  live('claimRefund', p => chain.claimRefund(p));
  live('claimTokens', p => chain.claimTokens(p));
  live('cancelRaise', p => chain.cancelRaise(p));
  live('seedStep', (p, step) => chain.seedStep(p, step));
  live('claimFees', p => chain.claimFees(p));
  live('claimVested', p => chain.claimVested(p));
  live('requestPayoutChange', (p, to) => chain.requestPayoutChange(p, to));
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
  const box = $('#adminNote'); if (!box) return;
  if (chain.isPendingAdmin()) {
    box.hidden = false;
    box.innerHTML = `<div class="pp-notice"><b>Seed admin handover</b><p>The current admin named this wallet as the next Seed admin. Accepting makes it the wallet that can flag fraud and approve takeovers.</p><button type="button" class="btn btn-navy" data-accept-admin>Accept Seed admin</button></div>`;
    $('[data-accept-admin]', box).onclick = async e => { e.target.disabled = true; e.target.textContent = 'Confirm in wallet…'; try { await chain.acceptAdmin(); toast('This wallet is the Seed admin now.'); } catch (x) { toast(x.message); } renderAll(); };
  } else if (chain.isAdmin()) { box.hidden = false; box.innerHTML = `<p class="quiet" style="margin-top:12px">This wallet is the Seed admin on ${esc(SEED.network)}.</p>`; }
  else box.hidden = true;
}
