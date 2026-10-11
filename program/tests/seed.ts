// Seed program tests, on devnet (Meteora's DAMM v2 is deployed there and nowhere local). The provider wallet is the
// admin, the oracle, the treasury and the founder; the attestor key is derived from it. Run: anchor test --skip-local-validator --skip-deploy
import * as anchor from '@coral-xyz/anchor';
import { BN, web3 } from '@coral-xyz/anchor';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddressSync, getMint } from '@solana/spl-token';
import { assert } from 'chai';
import { createHash } from 'crypto';
import { SeedClient, pda, handleHash, attestIx, WSOL } from '../client/seed';
import idl from '../target/idl/seed.json';

const { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } = web3;
const sol = (n: number) => new BN(Math.round(n * LAMPORTS_PER_SOL));
const SUPPLY_UNITS = new BN('1000000000000000');   // 1B at 6 decimals

describe('seed', () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider);
  const c = new SeedClient(program, provider);
  const me = (provider.wallet as anchor.Wallet).payer;
  const attestor = Keypair.fromSeed(createHash('sha256').update(Buffer.concat([me.secretKey, Buffer.from('seed attestor')])).digest());
  const backer = Keypair.generate();
  const nonce = Date.now();
  let raise: web3.PublicKey, mint: web3.Keypair, nft: web3.Keypair, r: any;
  const handle = 'seed_test_' + nonce.toString(36);
  const expectFail = async (p: Promise<unknown>, code: string) => { try { await p; } catch (e: any) { assert.include(String(e.message || e), code, `expected ${code}`); return; } assert.fail(`expected ${code}`); };

  before(async () => {
    // the config, once; the attestor is fixed by it, which is why the key derives from the wallet
    try { await c.fetchConfig(); } catch {
      await c.send([await c.initConfig({ admin: me.publicKey, attestor: attestor.publicKey, oracle: me.publicKey, seedTreasury: me.publicKey, feeBps: 100, creatorShareBps: 7000, poolFeeBps: 100, capUsdCents: new BN(10_000_000),
        minDeadline: new BN(86400), maxDeadline: new BN(14 * 86400), seedTimeout: new BN(3 * 86400), minUnlockDays: 90, payoutDelay: new BN(7 * 86400) }, me.publicKey)]);
    }
    const cfg = await c.fetchConfig();
    assert.ok(cfg.attestor.equals(attestor.publicKey), 'the config was made with another attestor; close it or use that wallet');
    await c.send([await c.setSolPrice(15000, me.publicKey)]);   // $150
    // a backer with a little SOL, and wrapped SOL for both
    await c.send([SystemProgram.transfer({ fromPubkey: me.publicKey, toPubkey: backer.publicKey, lamports: 0.25 * LAMPORTS_PER_SOL })]);
    for (const [w, n] of [[me, 0.2], [backer, 0.15]] as [web3.Keypair, number][]) {
      const ata = getAssociatedTokenAddressSync(NATIVE_MINT, w.publicKey);
      await c.send([createAssociatedTokenAccountIdempotentInstruction(w.publicKey, ata, w.publicKey, NATIVE_MINT), SystemProgram.transfer({ fromPubkey: w.publicKey, toPubkey: ata, lamports: n * LAMPORTS_PER_SOL }), createSyncNativeInstruction(ata)], [w]);
    }
    await c.send([c.ata(me.publicKey, me.publicKey, NATIVE_MINT)]);   // the treasury's pair account
  });

  it('refuses an attestation that is not from the attestor', async () => {
    const fake = Keypair.generate(), hash = handleHash(handle), expiry = Math.floor(Date.now() / 1000) + 3600;
    const { ixs } = await c.openRaise(me.publicKey, WSOL, attestor, handle, { nonce: nonce + 1, name: 'Fake', ticker: 'FAKE', target: sol(0.2), deadline: 86400, teamBps: 0, schedule: [], payoutWallet: me.publicKey });
    ixs[0] = attestIx(fake, me.publicKey, hash, expiry);
    await expectFail(c.send(ixs), 'BadAttestation');
  });

  it('refuses a schedule that ends before 90 days or does not add up', async () => {
    const bad = (schedule: any[], teamBps = 1000) => c.openRaise(me.publicKey, WSOL, attestor, handle, { nonce: nonce + 2, name: 'Bad', ticker: 'BAD', target: sol(0.2), deadline: 86400, teamBps, schedule, payoutWallet: me.publicKey }).then(x => c.send(x.ixs));
    await expectFail(bad([{ dayOffset: 30, bps: 10000 }]), 'ScheduleTooShort');
    await expectFail(bad([{ dayOffset: 90, bps: 5000 }]), 'ScheduleSum');
  });

  it('opens a raise with a verified X attestation', async () => {
    const { raise: rk, ixs } = await c.openRaise(me.publicKey, WSOL, attestor, handle, { nonce, name: 'Kiln', ticker: 'KILN', target: sol(0.2), deadline: 86400, teamBps: 1000, schedule: [{ dayOffset: 90, bps: 5000 }, { dayOffset: 180, bps: 5000 }], payoutWallet: me.publicKey });
    await c.send(ixs); raise = rk; r = await c.fetchRaise(raise);
    assert.equal(r.teamBps, 1000); assert.ok(r.target.eq(sol(0.2))); assert.deepEqual(Object.keys(r.status)[0], 'live');
    assert.ok(r.targetUsdCents.eq(new BN(3000)), 'a 0.2 SOL target at $150 is $30');
  });

  it('takes buys with the fee on top, trims the last one, and fills', async () => {
    await c.send([await c.contribute(raise, WSOL, backer.publicKey, sol(0.1))], [backer]);
    r = await c.fetchRaise(raise); assert.ok(r.raised.eq(sol(0.1))); assert.ok(r.feesHeld.eq(sol(0.001))); assert.equal(r.backers, 1);
    const before = (await getAccount(provider.connection, getAssociatedTokenAddressSync(NATIVE_MINT, me.publicKey))).amount;
    await c.send([await c.contribute(raise, WSOL, me.publicKey, sol(0.15))]);   // only 0.1 fits
    const after = (await getAccount(provider.connection, getAssociatedTokenAddressSync(NATIVE_MINT, me.publicKey))).amount;
    assert.equal(Number(before - after), 0.101 * LAMPORTS_PER_SOL, 'the buy is trimmed to the room left, plus 1%');
    r = await c.fetchRaise(raise); assert.deepEqual(Object.keys(r.status)[0], 'filled'); assert.equal(r.backers, 2);
    await expectFail(c.send([await c.contribute(raise, WSOL, backer.publicKey, sol(0.01))], [backer]), 'NotLive');
  });

  it('step 1: mints the supply into the vaults and revokes the authorities', async () => {
    mint = Keypair.generate();
    await c.send([await c.crankMint(raise, mint.publicKey, me.publicKey)], [mint]);
    const m = await getMint(provider.connection, mint.publicKey);
    assert.equal(m.mintAuthority, null); assert.equal(m.freezeAuthority, null); assert.equal(m.decimals, 6); assert.equal(m.supply, BigInt(SUPPLY_UNITS.toString()));
    const backers = await getAccount(provider.connection, getAssociatedTokenAddressSync(mint.publicKey, raise, true)), pool = await getAccount(provider.connection, pda.poolVault(program.programId, raise)), team = await getAccount(provider.connection, pda.teamVault(program.programId, raise));
    assert.equal(team.amount, BigInt('100000000000000'), '10% to the team'); assert.equal(backers.amount, pool.amount); assert.equal(backers.amount, BigInt('450000000000000'));
    r = await c.fetchRaise(raise); assert.deepEqual(Object.keys(r.seedStep)[0], 'minted');
  });

  it('step 2: opens the DAMM v2 pool with the whole raise and locks the position under the raise PDA', async () => {
    nft = Keypair.generate();
    const ix = await c.crankPool(raise, mint.publicKey, WSOL, nft.publicKey, me.publicKey);
    await c.send([web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }), ix], [nft]);
    r = await c.fetchRaise(raise); assert.deepEqual(Object.keys(r.seedStep)[0], 'pooled');
    const pool = pda.dammPool(mint.publicKey, WSOL); assert.ok(r.pool.equals(pool));
    const vaultB = await getAccount(provider.connection, pda.dammVault(WSOL, pool)), vaultA = await getAccount(provider.connection, pda.dammVault(mint.publicKey, pool));
    assert.ok(Number(vaultB.amount) >= 0.2 * LAMPORTS_PER_SOL * 0.999999, 'the whole raise is in the pool'); assert.ok(Number(vaultA.amount) >= 450000000000000 * 0.999999);
    const nftAcc = await getAccount(provider.connection, pda.dammPositionNftAccount(nft.publicKey));
    assert.ok(nftAcc.owner.equals(raise), 'the position NFT is owned by the raise PDA'); assert.equal(nftAcc.amount, 1n);
    // the position's permanent lock: the Position account's permanent_locked_liquidity is non-zero (offset from the IDL layout is not needed: the raise's own record and DAMM's refusal to withdraw are the proof below)
  });

  it('nobody can move the position NFT: not the founder, not the admin, and no program instruction exists for it', async () => {
    const from = pda.dammPositionNftAccount(nft.publicKey), to = getAssociatedTokenAddressSync(nft.publicKey, me.publicKey);
    await expectFail(c.send([createAssociatedTokenAccountIdempotentInstruction(me.publicKey, to, me.publicKey, nft.publicKey), createTransferInstruction(from, to, me.publicKey, 1)]), 'owner does not match');
    const names = (idl as any).instructions.map((i: any) => i.name);
    assert.notInclude(names.join(','), 'transfer'); assert.notInclude(names.join(','), 'withdraw'); assert.notInclude(names.join(','), 'remove');
    const writesNft = (idl as any).instructions.filter((i: any) => i.accounts.some((a: any) => a.name === 'position_nft_account' && a.writable));
    assert.equal(writesNft.length, 1, 'only crank_pool writes the NFT account, and only to create it'); assert.equal(writesNft[0].name, 'crank_pool');
  });

  it('step 3: seeds; the held fees go to Seed', async () => {
    const tre = getAssociatedTokenAddressSync(NATIVE_MINT, me.publicKey), before = (await getAccount(provider.connection, tre)).amount;
    await c.send([await c.crankSeed(raise, WSOL, me.publicKey)]);
    r = await c.fetchRaise(raise); assert.deepEqual(Object.keys(r.status)[0], 'seeded'); assert.ok(r.seededAt.gtn(0));
    assert.equal(Number((await getAccount(provider.connection, tre)).amount - before), 0.002 * LAMPORTS_PER_SOL, '1% of 0.2 SOL');
  });

  it('a backer claims their share of the backers tokens', async () => {
    await c.send([c.ata(backer.publicKey, backer.publicKey, mint.publicKey), await c.claimTokens(raise, mint.publicKey, backer.publicKey)], [backer]);
    const bal = await getAccount(provider.connection, getAssociatedTokenAddressSync(mint.publicKey, backer.publicKey));
    assert.equal(bal.amount, BigInt('225000000000000'), 'half the raise is half the backers tokens');
    await expectFail(c.send([await c.claimTokens(raise, mint.publicKey, backer.publicKey)], [backer]), 'AccountNotInitialized');   // the record closed with the claim
  });

  it('creator fees: claimable by anyone, nothing yet since nobody traded', async () => {
    await c.send([c.ata(me.publicKey, me.publicKey, NATIVE_MINT)]);
    await expectFail(c.send([await c.claimCreatorFees(raise, { mint: mint.publicKey, pairMint: WSOL, pool: r.pool, position: r.position, positionNftMint: nft.publicKey, payoutWallet: r.payoutWallet }, me.publicKey, me.publicKey)]), 'NothingToClaim');
  });

  it('team tokens: nothing before the cliff', async () => {
    await c.send([c.ata(me.publicKey, me.publicKey, mint.publicKey)]);
    await expectFail(c.send([await c.claimVested(raise, mint.publicKey, r.payoutWallet, me.publicKey)]), 'NothingToClaim');
  });

  it('a payout wallet change waits seven days', async () => {
    const to = Keypair.generate().publicKey;
    await c.send([await c.requestPayoutChange(raise, me.publicKey, to)]);
    r = await c.fetchRaise(raise); assert.ok(r.pendingPayout.equals(to)); assert.ok(r.payoutEffectiveAt.gt(r.seededAt));
    await expectFail(c.send([await c.applyPayoutChange(raise)]), 'ChangeNotDue');
  });

  it('admin: a takeover moves the payout wallet', async () => {
    const to = Keypair.generate().publicKey;
    await expectFail(c.send([await c.adminApproveTakeover(raise, backer.publicKey, to)], [backer]), 'NotAdmin');
    await c.send([await c.adminApproveTakeover(raise, me.publicKey, to)]);
    r = await c.fetchRaise(raise); assert.ok(r.payoutWallet.equals(to)); assert.equal(r.pendingPayout, null); assert.ok(r.takeoverTo.equals(to));
  });

  describe('a cancelled raise', () => {
    let raise2: web3.PublicKey; const handle2 = handle + '_2';
    it('refunds every backer exactly what they paid', async () => {
      const { raise: rk, ixs } = await c.openRaise(me.publicKey, WSOL, attestor, handle2, { nonce: nonce + 3, name: 'Moss', ticker: 'MOSS', target: sol(0.1), deadline: 86400, teamBps: 0, schedule: [], payoutWallet: me.publicKey });
      await c.send(ixs); raise2 = rk;
      const ata = getAssociatedTokenAddressSync(NATIVE_MINT, backer.publicKey), before = (await getAccount(provider.connection, ata)).amount;
      await c.send([await c.contribute(raise2, WSOL, backer.publicKey, sol(0.02))], [backer]);
      await expectFail(c.send([await c.settle(raise2)]), 'DeadlineNotPassed');
      await expectFail(c.send([await c.cancelRaise(raise2, backer.publicKey)], [backer]), 'NotFounder');
      await c.send([await c.cancelRaise(raise2, me.publicKey)]);
      const r2 = await c.fetchRaise(raise2); assert.deepEqual(Object.keys(r2.status)[0], 'refunded'); assert.deepEqual(Object.keys(r2.refundReason)[0], 'cancelled');
      await c.send([await c.claimRefund(raise2, WSOL, backer.publicKey)], [backer]);
      assert.equal((await getAccount(provider.connection, ata)).amount, before, 'the buy and its fee came back');
    });
    it('admin: flagging fraud blacklists the X handle', async () => {
      await c.send([await c.adminFlagFraud(raise2, me.publicKey, handleHash(handle2))]);
      const r2 = await c.fetchRaise(raise2); assert.isTrue(r2.blacklisted);
      const { ixs } = await c.openRaise(me.publicKey, WSOL, attestor, handle2, { nonce: nonce + 4, name: 'Again', ticker: 'AGN', target: sol(0.1), deadline: 86400, teamBps: 0, schedule: [], payoutWallet: me.publicKey });
      await expectFail(c.send(ixs), 'Blacklisted');
    });
  });
});
