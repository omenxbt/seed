// Devnet only: the longest deadline a raise may set, by the program's upgrade authority (production inits with the value it wants).
//   ANCHOR_PROVIDER_URL=<devnet rpc> ANCHOR_WALLET=keys/deployer.json npx ts-node -P tsconfig.json scripts/devnet-max-deadline.ts [days=30]
import * as anchor from '@coral-xyz/anchor';
import idl from '../target/idl/seed.json';
import { SeedClient } from '../client/seed';
const days = Number(process.argv[2] || '30');
(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider), c = new SeedClient(program, provider);
  const sig = await c.send([await c.devnetSetMaxDeadline(days * 86400, provider.wallet.publicKey)]);
  console.log(`max deadline ${Number((await c.fetchConfig()).maxDeadline) / 86400} days in ${sig}`);
})();
