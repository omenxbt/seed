// The deploy check: reads the live Config and the program account on a cluster and refuses to report success unless they
// carry the terms the profile demands. Production is 81 SOL and 125 bps (and 100 bps on buys, 70/30, no test mode); staging
// may carry a lower minimum; devnet is the test-mode config. Exit code 0 only on success, so a deploy script can gate on it.
//   npx ts-node -P tsconfig.json scripts/check-deploy.ts production|staging|devnet <rpc url> [program id]
import * as anchor from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import idl from '../target/idl/seed.json';
import { pda } from '../client/seed';

const [profile, rpc, programArg] = process.argv.slice(2);
if (!['production', 'staging', 'devnet'].includes(profile) || !rpc) { console.error('usage: check-deploy.ts production|staging|devnet <rpc url> [program id]'); process.exit(2); }

const WANT = {
  production: { minTargetLamports: 81_000_000_000, poolFeeBps: 125, feeBps: 100, creatorShareBps: 7000, capUsdCents: 10_000_000, testMode: false },
  staging: { poolFeeBps: 125, feeBps: 100, creatorShareBps: 7000, capUsdCents: 10_000_000, testMode: false },
  devnet: { poolFeeBps: 125, feeBps: 100, creatorShareBps: 7000, capUsdCents: 10_000_000, testMode: true }
}[profile as 'production' | 'staging' | 'devnet'] as Record<string, number | boolean>;
const BPF_UPGRADEABLE = new web3.PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');

(async () => {
  const conn = new web3.Connection(rpc, 'confirmed');
  const pid = new web3.PublicKey(programArg || (idl as any).address), program = new anchor.Program({ ...(idl as any), address: pid.toBase58() } as anchor.Idl, { connection: conn });
  const failures: string[] = [];
  const c: any = await (program.account as any).config.fetch(pda.config(pid)).catch((e: Error) => { failures.push(`config unreadable: ${e.message}`); return null; });
  if (c) {
    const got: Record<string, number | boolean> = { minTargetLamports: Number(c.minTargetLamports), poolFeeBps: c.poolFeeBps, feeBps: c.feeBps, creatorShareBps: c.creatorShareBps, capUsdCents: Number(c.capUsdCents), testMode: !!c.testMode, minUnlockDays: c.minUnlockDays };
    for (const [k, v] of Object.entries(WANT)) if (got[k] !== v) failures.push(`${k}: ${got[k]} (want ${v})`);
    if (!(Number(got.minTargetLamports) > 0)) failures.push('minTargetLamports is zero');
    console.log(`${profile} ${pid.toBase58()} on ${rpc.replace(/api-key=[^&]+/, 'api-key=…')}`);
    console.log(`  min raise ${Number(c.minTargetLamports) / 1e9} SOL · pool fee ${c.poolFeeBps} bps · buy fee ${c.feeBps} bps · founder share ${c.creatorShareBps / 100}% · cap $${Number(c.capUsdCents) / 100} · test mode ${c.testMode}`);
    console.log(`  admin ${c.admin.toBase58()} · treasury ${c.seedTreasury.toBase58()} · attestor ${c.attestor.toBase58()} · price feed ${c.solFeed.toBase58()}`);
  }
  // the program account: who may upgrade it (production: the Squads multisig; never a hot wallet)
  const programData = web3.PublicKey.findProgramAddressSync([pid.toBuffer()], BPF_UPGRADEABLE)[0];
  const pd = await conn.getAccountInfo(programData);
  if (!pd) failures.push('program data account missing: the program is not deployed here');
  else {
    const hasAuthority = pd.data[12] === 1, authority = hasAuthority ? new web3.PublicKey(pd.data.subarray(13, 45)).toBase58() : 'none (immutable)';
    console.log(`  upgrade authority ${authority} · program data ${pd.data.length} bytes`);
    if (profile === 'production' && hasAuthority && process.env.SEED_PROD_UPGRADE_AUTHORITY && authority !== process.env.SEED_PROD_UPGRADE_AUTHORITY) failures.push(`upgrade authority ${authority} is not SEED_PROD_UPGRADE_AUTHORITY`);
  }
  if (failures.length) { console.error('FAIL\n  ' + failures.join('\n  ')); process.exit(1); }
  console.log('OK');
})();
