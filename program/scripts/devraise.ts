// Opens a raise on devnet from the provider wallet, for trying the site against: a live one, or a filled one (the
// provider wallet backs it in full so the seeding steps can be pushed from the page).
//   npx ts-node -P tsconfig.json scripts/devraise.ts live|filled <ticker> [preset: test|0..3] [deadlineSeconds]
import * as anchor from '@coral-xyz/anchor';
import { BN, web3 } from '@coral-xyz/anchor';
import { NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { createHash } from 'crypto';
import { SeedClient, TEST_PRESET, WSOL } from '../client/seed';
import idl from '../target/idl/seed.json';
(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const c = new SeedClient(new anchor.Program(idl as anchor.Idl, provider), provider), me = (provider.wallet as anchor.Wallet).payer;
  const attestor = web3.Keypair.fromSeed(createHash('sha256').update(Buffer.concat([me.secretKey, Buffer.from('seed attestor')])).digest());
  const [mode, ticker = 'TEST', presetArg = 'test', deadline = '800'] = process.argv.slice(2);   // preset: test or 0..3
  const cfg = await c.fetchConfig(); if (!cfg.attestor.equals(attestor.publicKey)) throw new Error('this wallet is not the attestor the config names');
  const nonce = Date.now(), handle = 'seed_dev_' + nonce.toString(36);
  const { raise, ixs } = await c.openRaise(me.publicKey, WSOL, attestor, handle, { nonce, name: ticker[0] + ticker.slice(1).toLowerCase(), ticker, preset: presetArg === 'test' ? TEST_PRESET : Number(presetArg), deadline: Number(deadline), teamBps: 1000, schedule: [{ dayOffset: 90, bps: 10000 }], payoutWallet: me.publicKey });
  await c.send(ixs);
  console.log('raise', raise.toBase58(), 'id', `${ticker.toLowerCase()}-${raise.toBase58().slice(0, 8).toLowerCase()}`);
  if (mode === 'filled') {
    const target = Number((await c.fetchRaise(raise)).target) / 1e9;   // derived on chain from the preset
    const ata = getAssociatedTokenAddressSync(NATIVE_MINT, me.publicKey), lamports = Math.round(Number(target) * 1e9 * 1.01) + 10_000;
    await c.send([createAssociatedTokenAccountIdempotentInstruction(me.publicKey, ata, me.publicKey, NATIVE_MINT), web3.SystemProgram.transfer({ fromPubkey: me.publicKey, toPubkey: ata, lamports }), createSyncNativeInstruction(ata)]);
    await c.send([await c.contribute(raise, WSOL, me.publicKey, new BN(Math.round(Number(target) * 1e9)))]);
    console.log('filled');
  }
})();
