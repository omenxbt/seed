// Stage 2: the staging program's Config on mainnet. Production terms except the opening market cap presets, which are tiny
// ($150 to $600) so the two staging raises cost about half a SOL each instead of tens of thousands of dollars. No test mode (a mainnet build has no path to it). The deployer is admin
// and treasury; the attestor key is derived from it as the test suite does. Refuses to run unless GO=1.
//   GO=1 SEED_PROGRAM_ID=<staging id> ANCHOR_PROVIDER_URL=<mainnet rpc> ANCHOR_WALLET=keys/deployer.json npx ts-node -P tsconfig.json scripts/staging/init.ts
import * as anchor from '@coral-xyz/anchor';
import { BN, web3 } from '@coral-xyz/anchor';
import { createHash } from 'crypto';
import idl from './out/seed-staging.idl.json';
import { SeedClient, SOL_FEED } from '../../client/seed';

const STAGING_CAPS_CENTS = [15_000, 30_000, 45_000, 60_000];   // $150, $300, $450, $600: a no-team raise at the first is $75, about half a SOL
(async () => {
  if (process.env.GO !== '1') { console.log('dry: set GO=1 to send'); return; }
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const pid = new web3.PublicKey(process.env.SEED_PROGRAM_ID || (idl as any).address);
  const program = new anchor.Program({ ...(idl as any), address: pid.toBase58() } as anchor.Idl, provider), c = new SeedClient(program, provider), me = (provider.wallet as anchor.Wallet).payer;
  const attestor = web3.Keypair.fromSeed(createHash('sha256').update(Buffer.concat([me.secretKey, Buffer.from('seed attestor')])).digest());
  const ix = await c.initConfig({ admin: me.publicKey, attestor: attestor.publicKey, seedTreasury: me.publicKey, solFeed: SOL_FEED, feeBps: 100, creatorShareBps: 7000, poolFeeBps: 125, capUsdCents: new BN(10_000_000),
    minDeadline: new BN(86400), maxDeadline: new BN(14 * 86400), seedTimeout: new BN(3 * 86400), minUnlockDays: 90, payoutDelay: new BN(7 * 86400), testMode: false, minTargetLamports: new BN(1) /* unused */, presetCapsCents: STAGING_CAPS_CENTS.map(x => new BN(x)), testCapCents: new BN(0) }, me.publicKey, null);
  const sig = await c.send([ix]);
  const cfg = await c.fetchConfig();
  console.log(`staging config made in ${sig}: presets ${(cfg.presetCapsCents as BN[]).map(x => '$' + Number(x) / 100).join(' ')}, pool fee ${cfg.poolFeeBps} bps, test mode ${cfg.testMode}, admin ${cfg.admin.toBase58()}`);
  console.log(`attestor ${attestor.publicKey.toBase58()} (the seed function's X_ATTESTOR_KEY must be this key's secret for X links on staging; or open staging raises without X)`);
})();
