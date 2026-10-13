// Prints the latest seeded raise on the cluster and its DAMM position's lock state. Run with the test env:
// ANCHOR_PROVIDER_URL=... ANCHOR_WALLET=keys/deployer.json npx ts-node -P tsconfig.json scripts/inspect.ts
import * as anchor from '@coral-xyz/anchor';
import idl from '../target/idl/seed.json';
(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider);
  const all = await (program.account as any).raise.all();
  const seeded = all.filter((x: any) => Object.keys(x.account.status)[0] === 'seeded').sort((a: any, b: any) => b.account.seededAt.toNumber() - a.account.seededAt.toNumber());
  const r = seeded[0];
  console.log('raises on this cluster:', all.length, 'seeded:', seeded.length);
  console.log('latest seeded raise:', r.publicKey.toBase58());
  console.log('pool:', r.account.pool.toBase58(), 'position:', r.account.position.toBase58());
  const pos = await provider.connection.getAccountInfo(r.account.position);
  // DAMM Position, after the 8-byte discriminator: pool(32) nft_mint(32) fee_a_per_token_checkpoint(32) fee_b_per_token_checkpoint(32)
  // fee_a_pending(8) fee_b_pending(8) unlocked_liquidity(16) vested_liquidity(16) permanent_locked_liquidity(16)
  const d = pos!.data; const o = 8 + 32 + 32 + 32 + 32 + 8 + 8;
  const u128 = (at: number) => { let v = 0n; for (let i = 15; i >= 0; i--) v = (v << 8n) | BigInt(d[at + i]); return v; };
  console.log('unlocked_liquidity:', u128(o).toString(), 'vested:', u128(o + 16).toString(), 'permanent_locked_liquidity:', u128(o + 32).toString());
})();
