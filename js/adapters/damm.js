/* ==========================================================================
   DAMM ADAPTER: quotes and swaps on a raise's Meteora DAMM v2 pool, in the browser, signed by the wallet.
   The pool opened with the whole raise against the pool's share of the supply; token A is the raise's mint, token B the
   pair asset. Meteora's own SDK (cp-amm-sdk, loaded from esm.sh on first use) prices the swap, builds the transaction
   and wraps or unwraps SOL; the wallet signs; the page confirms by polling. Demo raises never come here.
   ========================================================================== */
const DAMM_SDK = 'https://esm.sh/@meteora-ag/cp-amm-sdk@1.5.1?bundle';
const damm = {
  lib: null, amm: null, states: {}, slippage: 2, priority: 'auto',   // the panel's settings, kept per session: slippage in percent; priority fee 'auto' or a number of SOL
  /* the priority fee as a compute-unit price: auto asks the RPC for recent fees on the pool and takes the median; a custom one
     is spread over the swap's compute budget */
  async priorityIx(p, units) {
    let micro = 0;
    if (this.priority === 'auto') { try { const fees = await chain.conn.getRecentPrioritizationFees({ lockedWritableAccounts: [chain.pk(p.pool)] }); const xs = fees.map(f => f.prioritizationFee).filter(x => x > 0).sort((a, b) => a - b); micro = xs.length ? xs[Math.floor(xs.length / 2)] : 0; } catch (e) { micro = 0; } }
    else if (this.priority > 0) micro = Math.round(this.priority * 1e9 * 1e6 / units);   // SOL → lamports → micro-lamports per unit
    return micro > 0 ? chain.w.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: Math.min(micro, 50_000_000) }) : null;
  },
  async init() {
    if (this.amm) return true;
    if (!(await chain.init())) return false;
    this.lib = await import(DAMM_SDK); this.amm = new this.lib.CpAmm(chain.conn);
    return true;
  },
  /* the pool's state, fresh for ten seconds */
  async state(p, fresh) {
    if (!(await this.init())) throw new Error('The chain is not reachable right now.'); const k = p.pool, hit = this.states[k];
    if (!fresh && hit && Date.now() - hit.at < 10e3) return hit.s;
    const s = await this.amm.fetchPoolState(chain.pk(k)); this.states[k] = { s, at: Date.now() }; return s;
  },
  decimals(p) { return { tok: 6, pair: p.q === 'SOL' ? 9 : 6 }; },
  /* the pool's reserves and spot price, in the page's units: tokens per pair asset */
  async reserves(p) {
    const s = await this.state(p), d = this.decimals(p), tokA = s.tokenAMint.toBase58() === p.mint;
    const [va, vb] = await Promise.all([chain.conn.getTokenAccountBalance(s.tokenAVault), chain.conn.getTokenAccountBalance(s.tokenBVault)]);
    const tok = Number((tokA ? va : vb).value.amount) / Math.pow(10, d.tok), pair = Number((tokA ? vb : va).value.amount) / Math.pow(10, d.pair);
    /* sqrt_price is Q64.64 of token B per token A in base units */
    const sq = Number(s.sqrtPrice.toString()) / Math.pow(2, 64), raw = sq * sq, price = tokA ? raw * Math.pow(10, d.tok - d.pair) : (1 / raw) * Math.pow(10, d.tok - d.pair);
    return { tok, pair, price, feeBps: SEED.poolFeeBps };   // the pool opened with Seed's flat fee and no dynamic fee
  },
  /* the locked position's fees, in the pair asset: what waits to be claimed and what has been claimed so far (the pool
     collects fees in the pair asset only). The program's claim splits a claim 70/30 between the payout wallet and Seed. */
  async fees(p) {
    if (!p.position) return null;
    const s = await this.state(p), pos = await this.amm.fetchPositionState(chain.pk(p.position)), d = this.decimals(p);
    const un = this.lib.getUnClaimLpFee(s, pos), tokA = s.tokenAMint.toBase58() === p.mint;
    const pending = Number((tokA ? un.feeTokenB : un.feeTokenA).toString()) / Math.pow(10, d.pair), claimed = Number((tokA ? pos.metrics.totalClaimedBFee : pos.metrics.totalClaimedAFee).toString()) / Math.pow(10, d.pair);
    return { pending, claimed };
  },
  /* side 'buy': amount of the pair asset in; 'sell': tokens in. Returns amounts in the page's units. */
  async quote(p, side, amount, slippage = this.slippage) {
    const s = await this.state(p), d = this.decimals(p), inDec = side === 'buy' ? d.pair : d.tok, outDec = side === 'buy' ? d.tok : d.pair;
    const inMint = side === 'buy' ? chain.pk(SEED.pairMints[p.q]) : chain.pk(p.mint);
    if (!(amount > 0)) return { out: 0, minOut: 0, fee: 0, impact: 0, price: (await this.reserves(p)).price };
    const inAmount = new chain.lib.BN(Math.round(amount * Math.pow(10, inDec)).toString());
    const q = await this.amm.getQuote({ inAmount, inputTokenMint: inMint, slippage: Math.round(slippage * 100) /* the SDK takes basis points */, poolState: s, currentTime: Math.floor(Date.now() / 1000), currentSlot: await chain.conn.getSlot(), tokenADecimal: s.tokenAMint.toBase58() === p.mint ? d.tok : d.pair, tokenBDecimal: s.tokenAMint.toBase58() === p.mint ? d.pair : d.tok });
    const out = Number(q.swapOutAmount.toString()) / Math.pow(10, outDec), minOut = Number(q.minSwapOutAmount.toString()) / Math.pow(10, outDec), fee = Number(q.totalFee.toString()) / Math.pow(10, d.pair);   // the pool collects its fee in the pair asset only (OnlyB)
    const impact = typeof q.priceImpact === 'number' ? q.priceImpact : Number(q.priceImpact.toString());
    return { out, minOut, fee, impact: impact / 100, price: side === 'buy' ? amount / out : out / amount, inAmount, minOutRaw: q.minSwapOutAmount };
  },
  /* the swap: built by the SDK, signed by the wallet, confirmed by polling; resolves the signature. The minimum out is the
     one the panel showed (the quote passed in), so a price that moved since is caught by the pool, not waved through. */
  async swap(p, side, amount, slippage = this.slippage, shown = null) {
    const s = await this.state(p, true), q = shown && shown.inAmount ? shown : await this.quote(p, side, amount, slippage), me = chain.me();
    const tokMint = chain.pk(p.mint), pairMint = chain.pk(SEED.pairMints[p.q]), tp = chain.pk(PROG.TOKEN);
    const tx = await this.amm.swap({ payer: me, pool: chain.pk(p.pool), inputTokenMint: side === 'buy' ? pairMint : tokMint, outputTokenMint: side === 'buy' ? tokMint : pairMint, amountIn: q.inAmount, minimumAmountOut: q.minOutRaw,
      tokenAVault: s.tokenAVault, tokenBVault: s.tokenBVault, tokenAMint: s.tokenAMint, tokenBMint: s.tokenBMint, tokenAProgram: tp, tokenBProgram: tp, referralTokenAccount: null, poolState: s });
    const pri = await this.priorityIx(p, 400000);
    const sig = await chain.send(pri ? [pri, ...tx.instructions] : tx.instructions, [], 400000);
    this.states[p.pool] = null;
    return { sig, quote: q };
  }
};
