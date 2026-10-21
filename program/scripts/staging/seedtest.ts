// Stage 2: the two staging raises on mainnet, through the staging program. SEEDTEST (0.5 SOL, 10% team, one unlock at day 90)
// is filled by the backer wallet, seeded (mint, pool, seed), claimed, traded on (buy, sell, buy) and its fees cranked; REFUNDME
// (0.5 SOL) takes one buy and is cancelled, and the backer is refunded. Prints every address and the DEX links to check.
// Real SOL moves here: refuses to run unless GO=1. The metadata JSON must already be on Arweave (the mainnet build takes
// ar://, arweave.net or gateway.irys.xyz only): pass its address as --uri.
//   GO=1 SEED_PROGRAM_ID=<staging id> ANCHOR_PROVIDER_URL=<mainnet rpc> ANCHOR_WALLET=keys/deployer.json \
//   npx ts-node -P tsconfig.json scripts/staging/seedtest.ts --uri https://arweave.net/<id> [--backer keys/staging-backer.json] [--skip-refund]
import * as anchor from '@coral-xyz/anchor';
import { BN, web3 } from '@coral-xyz/anchor';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';
import { NATIVE_MINT, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createCloseAccountInstruction, createSyncNativeInstruction, getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { readFileSync } from 'fs';
import idl from './out/seed-staging.idl.json';
import { SeedClient, WSOL, pda } from '../../client/seed';

const arg = (k: string, d = '') => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const { Keypair, SystemProgram, LAMPORTS_PER_SOL } = web3; const sol = (n: number) => new BN(Math.round(n * LAMPORTS_PER_SOL));
const PRESET = 0;   // the staging config's smallest cap ($150): a $75 raise with no team, about half a SOL

(async () => {
  if (process.env.GO !== '1') { console.log('dry: set GO=1 to send'); return; }
  const uri = arg('--uri'); if (!/^(ar:\/\/|https:\/\/arweave\.net\/|https:\/\/gateway\.irys\.xyz\/)/.test(uri)) throw new Error('--uri must be an Arweave address (ar://, arweave.net or gateway.irys.xyz)');
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider); const conn = provider.connection;
  const pid = new web3.PublicKey(process.env.SEED_PROGRAM_ID || (idl as any).address);
  const program = new anchor.Program({ ...(idl as any), address: pid.toBase58() } as anchor.Idl, provider), c = new SeedClient(program, provider), me = (provider.wallet as anchor.Wallet).payer;
  const backer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(arg('--backer', 'keys/staging-backer.json'), 'utf8'))));
  const cfg = await c.fetchConfig(); if (cfg.testMode || Number(cfg.presetCapsCents[0]) > 100_000) throw new Error('not the staging config (test mode off, a first preset under $1,000)');
  const out: Record<string, string> = {}; const say = (k: string, v: string) => { out[k] = v; console.log(`${k}: ${v}`); };
  const wsolOf = async (k: web3.PublicKey) => Number((await getAccount(conn, getAssociatedTokenAddressSync(NATIVE_MINT, k, true))).amount);

  // the backer wraps what both raises need: about 0.5 to fill SEEDTEST (a $75 raise), 0.1 for the REFUNDME buy, 0.05 to trade
  const bAta = getAssociatedTokenAddressSync(NATIVE_MINT, backer.publicKey);
  await c.send([createAssociatedTokenAccountIdempotentInstruction(backer.publicKey, bAta, backer.publicKey, NATIVE_MINT), SystemProgram.transfer({ fromPubkey: backer.publicKey, toPubkey: bAta, lamports: Math.round(0.9 * LAMPORTS_PER_SOL) }), createSyncNativeInstruction(bAta)], [backer]);
  await c.send([c.ata(me.publicKey, cfg.seedTreasury, NATIVE_MINT), c.ata(me.publicKey, me.publicKey, NATIVE_MINT)]);

  // SEEDTEST
  const nonce = Date.now();
  const A = await c.openRaise(me.publicKey, WSOL, null, null, { nonce, name: 'Seedtest', ticker: 'SEEDTEST', uri, preset: PRESET, deadline: 86400, teamBps: 1000, schedule: [{ dayOffset: 90, bps: 10000 }], payoutWallet: me.publicKey });
  await c.send(A.ixs); say('SEEDTEST raise', A.raise.toBase58()); say('SEEDTEST id', `seedtest-${A.raise.toBase58().slice(0, 8).toLowerCase()}`);
  const target = (await c.fetchRaise(A.raise)).target as BN; say('SEEDTEST target', `${Number(target) / 1e9} SOL (derived from the $${Number(cfg.presetCapsCents[PRESET]) / 100} cap at the Pyth price)`);
  await c.send([await c.contribute(A.raise, WSOL, backer.publicKey, target)], [backer]);
  let r = await c.fetchRaise(A.raise); if (Object.keys(r.status)[0] !== 'filled') throw new Error('SEEDTEST did not fill');
  const mint = Keypair.generate(), nft = Keypair.generate();
  await c.send([await c.crankMint(A.raise, mint.publicKey, WSOL, me.publicKey)], [mint]); say('mint (the CA)', mint.publicKey.toBase58());
  await c.send([web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }), await c.crankPool(A.raise, mint.publicKey, WSOL, nft.publicKey, me.publicKey)], [nft]);
  await c.send([await c.crankSeed(A.raise, WSOL, cfg.seedTreasury)]);
  r = await c.fetchRaise(A.raise); say('pool', r.pool.toBase58()); say('status', Object.keys(r.status)[0]);
  await c.send([c.ata(backer.publicKey, backer.publicKey, mint.publicKey), await c.claimTokens(A.raise, mint.publicKey, backer.publicKey)], [backer]);
  say('backer holds', String(Number((await getAccount(conn, getAssociatedTokenAddressSync(mint.publicKey, backer.publicKey))).amount) / 1e6) + ' SEEDTEST');

  // three trades through Meteora's SDK, then the fee crank
  const amm = new CpAmm(conn);
  const swap = async (side: 'buy' | 'sell', amount: number) => {
    const ps = await amm.fetchPoolState(r.pool), tokA = ps.tokenAMint.equals(mint.publicKey);
    const inMint = side === 'buy' ? WSOL : mint.publicKey, outMint = side === 'buy' ? mint.publicKey : WSOL, inAmount = new BN(Math.round(amount * (side === 'buy' ? 1e9 : 1e6)));
    const q = await amm.getQuote({ inAmount, inputTokenMint: inMint, slippage: 300, poolState: ps, currentTime: Math.floor(Date.now() / 1000), currentSlot: await conn.getSlot(), tokenADecimal: tokA ? 6 : 9, tokenBDecimal: tokA ? 9 : 6 } as any);
    const tx = await amm.swap({ payer: backer.publicKey, pool: r.pool, inputTokenMint: inMint, outputTokenMint: outMint, amountIn: inAmount, minimumAmountOut: q.minSwapOutAmount, tokenAVault: ps.tokenAVault, tokenBVault: ps.tokenBVault, tokenAMint: ps.tokenAMint, tokenBMint: ps.tokenBMint, tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID, referralTokenAccount: null } as any);
    const sig = await c.send([web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), ...tx.instructions], [backer]); say(`${side} ${amount}`, sig); return Number(q.swapOutAmount.toString());
  };
  const got = await swap('buy', 0.02); await swap('sell', got / 1e6 / 2); await swap('buy', 0.01);
  const payBefore = await wsolOf(me.publicKey);
  await c.send([await c.claimCreatorFees(A.raise, { mint: mint.publicKey, pairMint: WSOL, pool: r.pool, position: r.position, positionNftMint: nft.publicKey, payoutWallet: r.payoutWallet }, cfg.seedTreasury, me.publicKey)]);
  say('fee crank paid the payout wallet (70%)', `${(await wsolOf(me.publicKey) - payBefore) / 1e9} SOL`);

  // REFUNDME: one buy, cancelled, refunded
  if (!process.argv.includes('--skip-refund')) {
    const f = Keypair.generate(); await c.send([SystemProgram.transfer({ fromPubkey: me.publicKey, toPubkey: f.publicKey, lamports: Math.round(0.03 * LAMPORTS_PER_SOL) })]);
    const B = await c.openRaise(f.publicKey, WSOL, null, null, { nonce: nonce + 1, name: 'Refundme', ticker: 'REFUNDME', uri, preset: PRESET, deadline: 86400, teamBps: 0, schedule: [], payoutWallet: f.publicKey });
    await c.send(B.ixs, [f]); say('REFUNDME raise', B.raise.toBase58());
    const before = await wsolOf(backer.publicKey);
    await c.send([await c.contribute(B.raise, WSOL, backer.publicKey, sol(0.1))], [backer]);
    await c.send([await c.cancelRaise(B.raise, f.publicKey)], [f]);
    await c.send([await c.claimRefund(B.raise, WSOL, backer.publicKey)], [backer]);
    say('REFUNDME refund exact', String(await wsolOf(backer.publicKey) === before));
  }
  // the backer unwraps what is left
  await c.send([createCloseAccountInstruction(bAta, backer.publicKey, backer.publicKey)], [backer]);

  console.log('\nDEX pick-up to check (give them a few minutes):');
  for (const [n, u] of [['DEXScreener', `https://dexscreener.com/solana/${mint.publicKey.toBase58()}`], ['Birdeye', `https://birdeye.so/token/${mint.publicKey.toBase58()}?chain=solana`], ['Jupiter', `https://jup.ag/tokens/${mint.publicKey.toBase58()}`], ['Axiom', `https://axiom.trade/t/${mint.publicKey.toBase58()}`], ['GMGN', `https://gmgn.ai/sol/token/${mint.publicKey.toBase58()}`], ['Meteora', `https://app.meteora.ag/dammv2/${r.pool.toBase58()}`]]) console.log(`  ${n.padEnd(11)} ${u}`);
  console.log(`\nscripted check: npx ts-node -P tsconfig.json scripts/staging/dex-check.ts ${mint.publicKey.toBase58()}`);
  console.log(JSON.stringify(out, null, 1));
})();
