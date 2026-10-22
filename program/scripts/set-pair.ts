// Allows, pauses or resumes a pair asset on the admin's allowlist: any SPL token without a transfer fee, hook, permanent
// delegate or non-transferable flag, with the Pyth price account (and feed id) that prices it, or --stable for a dollar.
// The config's admin signs; on a devnet build the program's upgrade authority may too (keys/deployer.json).
//   ANCHOR_PROVIDER_URL=<rpc> ANCHOR_WALLET=<admin or deployer> npx ts-node -P tsconfig.json scripts/set-pair.ts <mint> <SYMBOL> (--stable | --feed <pyth price account> --feed-id <hex 32 bytes>) [--pause|--resume]
import * as anchor from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import idl from '../target/idl/seed.json';
import { SeedClient, pda } from '../client/seed';

const args = process.argv.slice(2), [mintArg, symbol] = args, opt = (k: string) => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : undefined; };
if (!mintArg || !symbol) throw new Error('mint and symbol');
(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider), c = new SeedClient(program, provider), me = provider.wallet.publicKey, mint = new web3.PublicKey(mintArg);
  const cfg = await c.fetchConfig(), admin = cfg.admin.equals(me);
  const programData = admin ? null : web3.PublicKey.findProgramAddressSync([program.programId.toBuffer()], new web3.PublicKey('BPFLoaderUpgradeab1e11111111111111111111111'))[0];
  const stable = args.includes('--stable'), feed = opt('--feed') ? new web3.PublicKey(opt('--feed')!) : null, feedHex = opt('--feed-id');
  if (!stable && !(feed && feedHex)) throw new Error('--stable, or --feed and --feed-id');
  const feedId = feedHex ? Buffer.from(feedHex.replace(/^0x/, ''), 'hex') : null; if (feedId && feedId.length !== 32) throw new Error('feed id: 32 bytes of hex');
  const cur: any = await (program.account as any).pairAsset.fetchNullable(pda.pair(program.programId, mint));
  const paused = args.includes('--pause') ? true : args.includes('--resume') ? false : !!(cur && cur.paused);
  const sig = await c.send([await c.setPair(mint, { symbol, feedId, feed, stable, paused }, me, programData)]);
  const a: any = await (program.account as any).pairAsset.fetch(pda.pair(program.programId, mint));
  console.log(`${a.symbol} ${mint.toBase58()}: ${a.stable ? 'stable ($1)' : 'feed ' + a.feed.toBase58()}, ${a.decimals} decimals, ${a.tokenProgram.toBase58() === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' ? 'Token-2022' : 'Token'}, ${a.paused ? 'PAUSED' : 'open for new raises'}, by ${admin ? 'the admin' : 'the upgrade authority'} in ${sig}`);
})();
