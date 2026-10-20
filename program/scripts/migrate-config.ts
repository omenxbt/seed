// Devnet only: grows a Config of the layout before the presets (228 bytes) by forty bytes and sets the four opening market cap
// presets and the test preset, once.
// The program's upgrade authority signs (the devnet config's admin is a browser wallet). Prints the config before and after.
//   ANCHOR_PROVIDER_URL=<devnet rpc> ANCHOR_WALLET=keys/deployer.json npx ts-node -P tsconfig.json scripts/migrate-config.ts [testCapUsd=30]
import * as anchor from '@coral-xyz/anchor';
import { BN, web3 } from '@coral-xyz/anchor';
import idl from '../target/idl/seed.json';
import { pda } from '../client/seed';

const BPF_UPGRADEABLE = new web3.PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
const testCapUsd = Number(process.argv[2] || '30'), CAPS = [5_000_000, 10_000_000, 15_000_000, 20_000_000];   // $50K, $100K, $150K, $200K in cents

(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider), pid = program.programId, config = pda.config(pid);
  const programData = web3.PublicKey.findProgramAddressSync([pid.toBuffer()], BPF_UPGRADEABLE)[0];
  const before = await provider.connection.getAccountInfo(config); if (!before) throw new Error('no config on this cluster');
  console.log(`config ${config.toBase58()}: ${before.data.length} bytes before`);
  const ix = await (program.methods as any).migrateConfig(CAPS.map(x => new BN(x)), new BN(Math.round(testCapUsd * 100)))
    .accounts({ config, authority: provider.wallet.publicKey, program: pid, programData, systemProgram: web3.SystemProgram.programId }).instruction();
  const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('finalized');
  const tx = new web3.Transaction({ feePayer: provider.wallet.publicKey, blockhash, lastValidBlockHeight }).add(ix);
  let sig: string;
  try { sig = await provider.sendAndConfirm(tx, [], { commitment: 'confirmed', skipPreflight: true }); }
  catch (e: any) {   // a config already of this layout is refused (BadConfig); say so instead of dumping the error object
    const logs: string[] = e.logs || e.transactionLogs || []; const line = logs.find(l => /Error Code/.test(l)) || e.message || String(e);
    console.error('refused:', line.replace(/^Program log: /, '')); process.exit(1);
  }
  const c: any = await (program.account as any).config.fetch(config);
  console.log(`migrated in ${sig}: ${(await provider.connection.getAccountInfo(config))!.data.length} bytes, presets ${(c.presetCapsCents as BN[]).map(x => '$' + Number(x) / 100).join(' ')}, test preset $${Number(c.testCapCents) / 100}, test_mode ${c.testMode}, pool_fee_bps ${c.poolFeeBps}`);
})();
