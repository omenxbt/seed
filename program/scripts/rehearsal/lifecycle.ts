// Stage 1 of the mainnet preparation: the whole lifecycle at production terms (81 SOL minimum, 1% buy fee, 125 bps pool, 70/30)
// against mainnet's DAMM v2, Metaplex, Pyth and USDC mint cloned into a local validator (mainnet-local.sh). Time is warped by
// the config's test mode, a day a minute, which is the one thing not as production: the 90-day cliff passes in 90 minutes,
// the 3-day seeding timeout in 3, the 7-day payout delay in 7. Four raises run at once:
//   A  $100K preset, 20% team (so a $40,000 raise), one unlock at day 90: 80.99 refused was the old floor; now a preset off the list is refused; fill, mint, pool, seed, claim, swaps, the fee crank's 70/30, a payout change,
//      the admin's takeover, and the unlock to the new payout wallet
//   B  81 SOL, cancelled after two buys: both refunds exact, fee included
//   C  81 SOL, filled and never seeded: the 3-day timeout, then refunds
//   D  81 SOL, one-day deadline, one buy: settles as missed, then the refund
// Nothing here is sent anywhere but the local validator. Writes scripts/rehearsal/report-<date>.md.
//   ANCHOR_PROVIDER_URL=http://127.0.0.1:8999 ANCHOR_WALLET=keys/deployer.json npx ts-node -P tsconfig.json scripts/rehearsal/lifecycle.ts [--fast]
// --fast skips the 90-minute wait for the unlock (everything else runs).
import * as anchor from '@coral-xyz/anchor';
import { BN, web3 } from '@coral-xyz/anchor';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';
import { NATIVE_MINT, TOKEN_2022_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, getAccount, getAssociatedTokenAddressSync, getMint } from '@solana/spl-token';
import { createHash } from 'crypto';
import { writeFileSync } from 'fs';
import { PRESET_CAPS_CENTS, SeedClient, SOL_FEED, TEST_PRESET, WSOL, decodeMetadata, pda } from '../../client/seed';
import idl from '../../target/idl/seed.json';

const { Keypair, SystemProgram, LAMPORTS_PER_SOL } = web3;
const sol = (n: number) => new BN(Math.round(n * LAMPORTS_PER_SOL));
const fast = process.argv.includes('--fast');
const USDC_DEVNET = new web3.PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const TEAM_BPS = 2000, PRESET = 1;   // the $100K preset; A with a 20% team raises $40,000 of SOL at the cloned Pyth price

const lines: string[] = []; let fails = 0;
const log = (s: string) => { console.log(s); lines.push(s); };
const check = (ok: boolean, what: string, detail = '') => { log(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? ' — ' + detail : ''}`); if (!ok) fails++; };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const minutes = (n: number) => `${n} "day${n === 1 ? '' : 's'}" (${n} min here)`;

(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider); const conn = provider.connection;
  const program = new anchor.Program(idl as anchor.Idl, provider), c = new SeedClient(program, provider), me = (provider.wallet as anchor.Wallet).payer;
  const attestor = Keypair.fromSeed(createHash('sha256').update(Buffer.concat([me.secretKey, Buffer.from('seed attestor')])).digest());
  const treasury = Keypair.generate(), founder = Keypair.generate(), founderB = Keypair.generate(), founderC = Keypair.generate(), founderD = Keypair.generate();
  const backer1 = Keypair.generate(), backer2 = Keypair.generate(), trader = Keypair.generate();
  const t0 = Date.now();
  log(`# Mainnet rehearsal, started ${new Date().toISOString()} (the end time is on the last line)\n`);
  log(`Local validator with mainnet's DAMM v2, Metaplex, Pyth SOL/USD and USDC cloned; Seed devnet build ${(idl as any).address}; time warped by test mode (a day = a minute).\n`);

  // SOL for everyone (the local faucet), and wrapped SOL for the backers and the trader
  for (const k of [founder, founderB, founderC, founderD, backer1, backer2, trader, treasury]) await conn.confirmTransaction(await conn.requestAirdrop(k.publicKey, 2000 * LAMPORTS_PER_SOL), 'confirmed');
  const wrap = async (k: web3.Keypair, n: number) => { const ata = getAssociatedTokenAddressSync(NATIVE_MINT, k.publicKey); await c.send([createAssociatedTokenAccountIdempotentInstruction(k.publicKey, ata, k.publicKey, NATIVE_MINT), SystemProgram.transfer({ fromPubkey: k.publicKey, toPubkey: ata, lamports: n * LAMPORTS_PER_SOL }), createSyncNativeInstruction(ata)], [k]); };
  for (const [k, n] of [[backer1, 1500], [backer2, 1500], [trader, 300]] as [web3.Keypair, number][]) await wrap(k, n);
  await c.send([c.ata(me.publicKey, treasury.publicKey, NATIVE_MINT)]);
  const wsolOf = async (k: web3.PublicKey) => Number((await getAccount(conn, getAssociatedTokenAddressSync(NATIVE_MINT, k, true))).amount);

  // the config at production terms, test mode for time, 81 SOL the minimum
  await c.send([await c.initConfig({ admin: me.publicKey, attestor: attestor.publicKey, seedTreasury: treasury.publicKey, solFeed: SOL_FEED, feeBps: 100, creatorShareBps: 7000, poolFeeBps: 125, capUsdCents: new BN(10_000_000),
    minDeadline: new BN(86400), maxDeadline: new BN(14 * 86400), seedTimeout: new BN(3 * 86400), minUnlockDays: 90, payoutDelay: new BN(7 * 86400), testMode: true, minTargetLamports: sol(81) /* unused */, presetCapsCents: PRESET_CAPS_CENTS.map(x => new BN(x)), testCapCents: new BN(0) }, me.publicKey, USDC_DEVNET)]);
  const cfg = await c.fetchConfig();
  check((cfg.presetCapsCents as BN[]).map(Number).join() === PRESET_CAPS_CENTS.join() && Number(cfg.testCapCents) === 0 && cfg.poolFeeBps === 125 && cfg.feeBps === 100 && cfg.creatorShareBps === 7000, 'config: the four presets, no test preset, 125 bps pool fee, 1% buy fee, 70/30');
  const span = (secs: number) => Math.floor(secs / 1440);
  const uri = 'https://arweave.net/' + 'r'.repeat(43);   // the shape a mainnet URI has; the devnet build takes any https://

  // the four raises, opened while the cloned Pyth price is fresh
  const open = async (who: web3.Keypair, name: string, ticker: string, preset: number, deadlineSecs: number, teamBps: number, schedule: { dayOffset: number; bps: number }[], nonce: number) => {
    const { raise, ixs } = await c.openRaise(who.publicKey, WSOL, null, null, { nonce, name, ticker, uri, preset, deadline: span(deadlineSecs), teamBps, schedule, payoutWallet: who.publicKey });
    await c.send(ixs, [who]); return raise;
  };
  const nonce = Date.now();
  try { await open(founder, 'Off', 'OFF', 7, 86400, 0, [], nonce); check(false, 'a preset off the list is refused'); } catch (e: any) { check(/BadPreset/.test(e.message), 'a preset off the list is refused', 'BadPreset'); }
  try { await open(founder, 'Test', 'TST', TEST_PRESET, 86400, 0, [], nonce + 9); check(false, 'the Test preset is refused on a config without one'); } catch (e: any) { check(/BadPreset/.test(e.message), 'the Test preset is refused on a config without one', 'BadPreset'); }
  const A = await open(founder, 'Seedtest', 'SEEDTEST', PRESET, 86400, TEAM_BPS, [{ dayOffset: 90, bps: 10000 }], nonce + 1);
  const B = await open(founderB, 'Cancelled', 'CNCL', PRESET, 86400, 0, [], nonce + 2);
  const C = await open(founderC, 'Stalled', 'STALL', PRESET, 86400, 0, [], nonce + 3);
  const D = await open(founderD, 'Missed', 'MISS', PRESET, 86400, 0, [], nonce + 4);
  const rA = await c.fetchRaise(A), px = Number(rA.solUsdCents), T = rA.target;   // A's target: $100K × 80% ÷ 2 = $40,000 in SOL at the cloned Pyth price
  check(Number(rA.capUsdCents) === 10_000_000 && Number(rA.targetUsdCents) === 4_000_000 && T.eq(new BN(Math.floor(4_000_000 * 1e9 / px))), 'A opened at the $100K preset: a $40,000 raise, derived at the Pyth price', `SOL at $${px / 100}, target ${Number(T) / 1e9} SOL`);
  const rB = await c.fetchRaise(B), TB = rB.target;   // the no-team raises: $50,000 each
  check(Number(rB.targetUsdCents) === 5_000_000, 'B, C and D: $50,000 raises (no team)');
  log(`\nRaises: A ${A.toBase58()} · B ${B.toBase58()} · C ${C.toBase58()} · D ${D.toBase58()} (D's deadline is ${minutes(1)})\n`);

  // A fills in two buys: 50 SOL and 40 SOL (trimmed to the 31 SOL left), each with 1% on top
  const b1Before = await wsolOf(backer1.publicKey), b2Before = await wsolOf(backer2.publicKey);
  const first = T.muln(6).divn(10), room = T.sub(first), fee = (x: BN) => x.addn(99).divn(100);   // 60%, then more than the 40% left
  await c.send([await c.contribute(A, WSOL, backer1.publicKey, first)], [backer1]);
  await c.send([await c.contribute(A, WSOL, backer2.publicKey, room.muln(3).divn(2))], [backer2]);
  check(b1Before - await wsolOf(backer1.publicKey) === Number(first.add(fee(first))), 'A: a 60% buy costs itself plus 1%');
  check(b2Before - await wsolOf(backer2.publicKey) === Number(room.add(fee(room))), 'A: the last buy is trimmed to the room, plus 1%');
  let a = await c.fetchRaise(A); check(Object.keys(a.status)[0] === 'filled' && a.raised.eq(T), 'A filled at exactly its derived target');

  // B: two buys, then the founder cancels; C: filled, never seeded; D: one buy, one-day deadline
  const bB1 = TB.divn(10), bB2 = TB.divn(20), bD = TB.divn(5);
  await c.send([await c.contribute(B, WSOL, backer1.publicKey, bB1)], [backer1]);
  await c.send([await c.contribute(B, WSOL, backer2.publicKey, bB2)], [backer2]);
  await c.send([await c.contribute(C, WSOL, backer1.publicKey, TB)], [backer1]);
  await c.send([await c.contribute(D, WSOL, backer2.publicKey, bD)], [backer2]);

  // A seeds: mint, pool, seed
  const mint = Keypair.generate(), nft = Keypair.generate();
  await c.send([await c.crankMint(A, mint.publicKey, WSOL, me.publicKey)], [mint]);
  const m = await getMint(conn, mint.publicKey);
  check(m.mintAuthority === null && m.freezeAuthority === null && m.supply === 1_000_000_000_000_000n, 'A: 1B minted, mint and freeze authority revoked');
  const md = decodeMetadata((await conn.getAccountInfo(pda.metadata(mint.publicKey)))!.data);
  check(md.name === 'Seedtest' && md.symbol === 'SEEDTEST' && md.uri === uri && !md.isMutable && md.updateAuthority.equals(A), 'A: immutable Metaplex metadata under the raise PDA (mainnet Metaplex program)');
  const team = await getAccount(conn, pda.teamVault(program.programId, A)); check(team.amount === 200_000_000_000_000n, 'A: 20% of the supply in the team vault');
  await c.send([web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }), await c.crankPool(A, mint.publicKey, WSOL, nft.publicKey, me.publicKey)], [nft]);
  a = await c.fetchRaise(A); const pool = pda.dammPool(mint.publicKey, WSOL);
  check(a.pool.equals(pool) && Object.keys(a.seedStep)[0] === 'pooled', 'A: DAMM v2 pool opened (mainnet cp-amm program)', pool.toBase58());
  const vaultB = await getAccount(conn, pda.dammVault(WSOL, pool)), vaultA = await getAccount(conn, pda.dammVault(mint.publicKey, pool));
  check(Number(vaultB.amount) >= Number(T) * 0.999999 && Number(vaultA.amount) >= 400_000_000_000_000 * 0.999999, 'A: the pool holds the whole raise and the 400M pool tokens, to within DAMM\'s deposit rounding', `${Number(vaultB.amount) / 1e9} SOL of ${Number(T) / 1e9} (${Number(T) - Number(vaultB.amount)} lamports stay in the raise\'s staging account, the pool\'s rounding), ${Number(vaultA.amount) / 1e6} tokens`);
  const nftAcc = await getAccount(conn, pda.dammPositionNftAccount(nft.publicKey), 'confirmed', TOKEN_2022_PROGRAM_ID); check(nftAcc.owner.equals(A) && nftAcc.amount === 1n, 'A: the position NFT is the raise PDA\'s');
  const treBefore = await wsolOf(treasury.publicKey);
  await c.send([await c.crankSeed(A, WSOL, treasury.publicKey)]);
  a = await c.fetchRaise(A); check(Object.keys(a.status)[0] === 'seeded', 'A: seeded');
  const held = await wsolOf(treasury.publicKey) - treBefore; check(held >= Number(T) / 100 && held < Number(T) / 100 + 10_000, 'A: the 1% held fees reach the treasury', `${held / 1e9} SOL`);

  // backers claim: 400M backers tokens split 50/31
  await c.send([c.ata(backer1.publicKey, backer1.publicKey, mint.publicKey), await c.claimTokens(A, mint.publicKey, backer1.publicKey)], [backer1]);
  await c.send([c.ata(backer2.publicKey, backer2.publicKey, mint.publicKey), await c.claimTokens(A, mint.publicKey, backer2.publicKey)], [backer2]);
  const t1 = (await getAccount(conn, getAssociatedTokenAddressSync(mint.publicKey, backer1.publicKey))).amount, t2 = (await getAccount(conn, getAssociatedTokenAddressSync(mint.publicKey, backer2.publicKey))).amount;
  // each claim rounds down, so the two together may leave a base unit or two of dust in the vault
  check(t1 === 400_000_000_000_000n * BigInt(first.toString()) / BigInt(T.toString()) && 400_000_000_000_000n - (t1 + t2) <= 2n, 'A: backers claim 400M tokens in proportion (60/40, rounded down)', `${Number(t1) / 1e6} + ${Number(t2) / 1e6}`);

  // trades on the pool through Meteora's SDK, as the site's trade panel does
  const amm = new CpAmm(conn);
  const swap = async (who: web3.Keypair, side: 'buy' | 'sell', amount: number) => {
    const ps = await amm.fetchPoolState(pool), tokA = ps.tokenAMint.equals(mint.publicKey);
    const inMint = side === 'buy' ? WSOL : mint.publicKey, outMint = side === 'buy' ? mint.publicKey : WSOL, inAmount = new BN(Math.round(amount * (side === 'buy' ? 1e9 : 1e6)));
    const q = await amm.getQuote({ inAmount, inputTokenMint: inMint, slippage: 200, poolState: ps, currentTime: Math.floor(Date.now() / 1000), currentSlot: await conn.getSlot(), tokenADecimal: tokA ? 6 : 9, tokenBDecimal: tokA ? 9 : 6 } as any);
    const tx = await amm.swap({ payer: who.publicKey, pool, inputTokenMint: inMint, outputTokenMint: outMint, amountIn: inAmount, minimumAmountOut: q.minSwapOutAmount, tokenAVault: ps.tokenAVault, tokenBVault: ps.tokenBVault, tokenAMint: ps.tokenAMint, tokenBMint: ps.tokenBMint, tokenAProgram: anchor.utils.token.TOKEN_PROGRAM_ID, tokenBProgram: anchor.utils.token.TOKEN_PROGRAM_ID, referralTokenAccount: null } as any);
    await c.send([web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), ...tx.instructions], [who]);
    return Number(q.swapOutAmount.toString());
  };
  await c.send([c.ata(trader.publicKey, trader.publicKey, mint.publicKey)], [trader]);
  const bought = await swap(trader, 'buy', 20); check(bought > 0, 'A: a 20 SOL buy on the pool', `${bought / 1e6} tokens out`);
  const sold = await swap(trader, 'sell', bought / 1e6 / 2); check(sold > 0, 'A: a sell of half of them', `${sold / 1e9} SOL out`);
  const bought2 = await swap(trader, 'buy', 8); check(bought2 > 0, 'A: an 8 SOL buy');

  // the fee crank: the position's fees split 70% to the payout wallet, 30% to the treasury (Meteora kept its 20% first)
  await c.send([c.ata(me.publicKey, founder.publicKey, NATIVE_MINT)]);
  const payBefore = await wsolOf(founder.publicKey), tre2Before = await wsolOf(treasury.publicKey);
  await c.send([await c.claimCreatorFees(A, { mint: mint.publicKey, pairMint: WSOL, pool, position: a.position, positionNftMint: nft.publicKey, payoutWallet: a.payoutWallet }, treasury.publicKey, me.publicKey)]);
  const toFounder = await wsolOf(founder.publicKey) - payBefore, toTreasury = await wsolOf(treasury.publicKey) - tre2Before, feeTotal = toFounder + toTreasury;
  check(feeTotal > 0 && Math.abs(toFounder / feeTotal - 0.7) < 0.001, 'A: fee crank splits 70/30', `${feeTotal / 1e9} SOL of fees: founder ${toFounder / 1e9} (${(toFounder / feeTotal * 100).toFixed(2)}%), treasury ${toTreasury / 1e9} (${(toTreasury / feeTotal * 100).toFixed(2)}%); the pool's 1.25% on each swap's quote side, less Meteora's 20%`);

  // B is cancelled: both backers get back exactly what they paid, fee included
  const b1 = await wsolOf(backer1.publicKey), b2 = await wsolOf(backer2.publicKey);
  await c.send([await c.cancelRaise(B, founderB.publicKey)], [founderB]);
  await c.send([await c.claimRefund(B, WSOL, backer1.publicKey)], [backer1]); await c.send([await c.claimRefund(B, WSOL, backer2.publicKey)], [backer2]);
  check(await wsolOf(backer1.publicKey) - b1 === Number(bB1.add(fee(bB1))) && await wsolOf(backer2.publicKey) - b2 === Number(bB2.add(fee(bB2))), 'B: cancel refunds both deposits exactly, the 1% with them');

  // D misses its one-day deadline: settle, then the refund
  // the waits go by the chain's own clock (the validator's), not this machine's
  const chainNow = async () => (await conn.getBlockTime(await conn.getSlot('confirmed'))) || Math.floor(Date.now() / 1000);
  const waitUntil = async (unix: number, what: string) => { log(`waiting for ${what}: due ${new Date(unix * 1000).toISOString()}…`); while (await chainNow() < unix + 8) await sleep(5_000); };
  await waitUntil(Number((await c.fetchRaise(D)).endsAt), `D's deadline, ${minutes(1)}`);
  const d2 = await wsolOf(backer2.publicKey);
  await c.send([await c.settle(D)]); const d = await c.fetchRaise(D);
  check(Object.keys(d.status)[0] === 'refunded' && Object.keys(d.refundReason)[0] === 'missed', 'D: settled as missed after the deadline');
  await c.send([await c.claimRefund(D, WSOL, backer2.publicKey)], [backer2]); check(await wsolOf(backer2.publicKey) - d2 === Number(bD.add(fee(bD))), 'D: the refund is the deposit plus the 1%, exactly');

  // C never seeds: after the 3-day timeout anyone refunds it
  try { await c.send([await c.timeoutRefund(C)]); check(false, 'C: timeout_refund before the timeout is refused'); } catch (e: any) { check(/TimeoutNotPassed/.test(e.message), 'C: timeout_refund before the timeout is refused', 'TimeoutNotPassed'); }
  await waitUntil(Number((await c.fetchRaise(C)).filledAt) + span(Number(cfg.seedTimeout)), `C's seeding timeout, ${minutes(3)}`);
  const c1 = await wsolOf(backer1.publicKey);
  await c.send([await c.timeoutRefund(C)]); const cr = await c.fetchRaise(C);
  check(Object.keys(cr.status)[0] === 'refunded' && Object.keys(cr.refundReason)[0] === 'timeout', 'C: refunded on the seeding timeout');
  await c.send([await c.claimRefund(C, WSOL, backer1.publicKey)], [backer1]); check(await wsolOf(backer1.publicKey) - c1 === Number(TB.add(fee(TB))), 'C: the whole deposit plus the 1% refunded, exactly');

  // A: the founder asks to move the payout wallet; it takes seven days; then the admin's takeover moves it at once
  const newPayout = Keypair.generate().publicKey, takeoverTo = Keypair.generate().publicKey;
  await c.send([await c.requestPayoutChange(A, founder.publicKey, newPayout)], [founder]);
  try { await c.send([await c.applyPayoutChange(A)]); check(false, 'A: a payout change cannot apply early'); } catch (e: any) { check(/ChangeNotDue/.test(e.message), 'A: a payout change cannot apply early', 'ChangeNotDue'); }
  await waitUntil(Number((await c.fetchRaise(A)).payoutEffectiveAt), `the payout delay, ${minutes(7)}`);
  await c.send([await c.applyPayoutChange(A)]); a = await c.fetchRaise(A); check(a.payoutWallet.equals(newPayout), 'A: the payout wallet moved after 7 days');
  try { await c.send([await c.adminApproveTakeover(A, backer1.publicKey, takeoverTo)], [backer1]); check(false, 'A: only the admin approves a takeover'); } catch (e: any) { check(/NotAdmin/.test(e.message), 'A: only the admin approves a takeover', 'NotAdmin'); }
  await c.send([await c.adminApproveTakeover(A, me.publicKey, takeoverTo)]); a = await c.fetchRaise(A);
  check(a.payoutWallet.equals(takeoverTo) && a.takeoverTo.equals(takeoverTo), 'A: the admin\'s takeover moves the payout wallet (and the unvested team tokens with it)');
  log('NOTE  no instruction burns unvested team tokens on a takeover: the schedule keeps unlocking to the new payout wallet. That policy is open (Needs Josh).');

  // the unlock: nothing before day 90, everything at it, to the wallet the takeover named
  await c.send([c.ata(me.publicKey, takeoverTo, mint.publicKey)]);   // on its own: a refused claim would roll the account's creation back with it
  try { await c.send([await c.claimVested(A, mint.publicKey, takeoverTo, me.publicKey)]); check(false, 'A: nothing unlocks before the cliff'); } catch (e: any) { check(/NothingToClaim/.test(e.message), 'A: nothing unlocks before the cliff', 'NothingToClaim'); }
  if (fast) log('SKIP  the 90-day unlock (--fast)');
  else {
    await waitUntil(Number(a.seededAt) + 90 * 60, `the cliff, ${minutes(90)}`);
    await c.send([await c.claimVested(A, mint.publicKey, takeoverTo, me.publicKey)]);
    const got = (await getAccount(conn, getAssociatedTokenAddressSync(mint.publicKey, takeoverTo, true))).amount;
    check(got === 200_000_000_000_000n, 'A: at day 90 the whole team share (200M) unlocks to the takeover wallet', `${Number(got) / 1e6} tokens`);
    try { await c.send([await c.claimVested(A, mint.publicKey, takeoverTo, me.publicKey)]); check(false, 'A: nothing left after the last unlock'); } catch (e: any) { check(/NothingToClaim/.test(e.message), 'A: nothing left after the last unlock'); }
  }

  log(`\n${fails ? `${fails} FAILED` : 'ALL PASSED'} · ${lines.filter(l => l.startsWith('PASS')).length} checks · ${((Date.now() - t0) / 60_000).toFixed(1)} minutes · ended ${new Date().toISOString()} · pool ${pool.toBase58()} · mint ${mint.publicKey.toBase58()}`);
  const file = `scripts/rehearsal/report-${new Date().toISOString().slice(0, 10)}.md`; writeFileSync(file, lines.join('\n') + '\n'); console.log('written', file);
  process.exit(fails ? 1 : 0);
})().catch(e => { log(`ABORTED  ${e.message}`); writeFileSync(`scripts/rehearsal/report-${new Date().toISOString().slice(0, 10)}.md`, lines.join('\n') + '\n'); process.exit(1); });
