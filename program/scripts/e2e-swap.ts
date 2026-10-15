// Swaps on a raise's DAMM v2 pool from a keypair, through Meteora's SDK: the same path the page's trade panel takes.
//   ANCHOR_PROVIDER_URL=<helius devnet> ANCHOR_WALLET=keys/test/backer.json \
//   npx ts-node -P tsconfig.json scripts/e2e-swap.ts <raise id or address> buy|sell <amount> [slippagePct]
// buy: amount of the pair asset (SOL) in; sell: tokens in. Prints the quote, the signature and the balances after.
import * as anchor from '@coral-xyz/anchor';
import { BN, web3 } from '@coral-xyz/anchor';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { SeedClient, WSOL } from '../client/seed';
import idl from '../target/idl/seed.json';

const [raiseArg, side = 'buy', amountArg = '0.001', slip = '2'] = process.argv.slice(2);
(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider), c = new SeedClient(program, provider), me = (provider.wallet as anchor.Wallet).payer;
  let raise: web3.PublicKey;
  if (raiseArg.length > 40) raise = new web3.PublicKey(raiseArg);
  else {   // by the site's id: every account of the program, decoded one by one (raises from before a layout change are skipped)
    const accs = await provider.connection.getProgramAccounts(program.programId), coder = program.coder.accounts; let found: web3.PublicKey | null = null;
    for (const a of accs) { try { const d = coder.decode('raise', a.account.data); if (`${d.ticker.toLowerCase()}-${a.pubkey.toBase58().slice(0, 8).toLowerCase()}` === raiseArg) found = a.pubkey; } catch (e) {} }
    if (!found) throw new Error('no raise ' + raiseArg); raise = found;
  }
  const r = await c.fetchRaise(raise); if (!r.pool || r.pool.equals(web3.PublicKey.default)) throw new Error('not seeded');
  const amm = new CpAmm(provider.connection), ps = await amm.fetchPoolState(r.pool), tokA = ps.tokenAMint.equals(r.mint);
  const dec = { tok: 6, pair: r.pairMint.equals(WSOL) ? 9 : 6 }, inDec = side === 'buy' ? dec.pair : dec.tok, outDec = side === 'buy' ? dec.tok : dec.pair;
  const inMint = side === 'buy' ? r.pairMint : r.mint, outMint = side === 'buy' ? r.mint : r.pairMint, inAmount = new BN(Math.round(Number(amountArg) * 10 ** inDec));
  const q = await amm.getQuote({ inAmount, inputTokenMint: inMint, slippage: Math.round(Number(slip) * 100) /* basis points */, poolState: ps, currentTime: Math.floor(Date.now() / 1000), currentSlot: await provider.connection.getSlot(), tokenADecimal: tokA ? dec.tok : dec.pair, tokenBDecimal: tokA ? dec.pair : dec.tok });
  console.log('quote', { in: amountArg, out: Number(q.swapOutAmount.toString()) / 10 ** outDec, minOut: Number(q.minSwapOutAmount.toString()) / 10 ** outDec, impactPct: Number(q.priceImpact.toString()) });
  const tx = await amm.swap({ payer: me.publicKey, pool: r.pool, inputTokenMint: inMint, outputTokenMint: outMint, amountIn: inAmount, minimumAmountOut: q.minSwapOutAmount, tokenAVault: ps.tokenAVault, tokenBVault: ps.tokenBVault, tokenAMint: ps.tokenAMint, tokenBMint: ps.tokenBMint, tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID, referralTokenAccount: null, poolState: ps });
  const sig = await c.send([web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), ...tx.instructions]);
  console.log('signature', sig);
  const held = await provider.connection.getTokenAccountBalance(getAssociatedTokenAddressSync(r.mint, me.publicKey)).catch(() => null);
  console.log('after', { sol: (await provider.connection.getBalance(me.publicKey)) / 1e9, tokens: held ? held.value.uiAmountString : '0' });
})();
