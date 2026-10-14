// Admin actions on the config from the provider wallet. Usage (with ANCHOR_PROVIDER_URL and ANCHOR_WALLET set):
//   npx ts-node -P tsconfig.json scripts/admin.ts show
//   npx ts-node -P tsconfig.json scripts/admin.ts treasury <pubkey>     update_config: where Seed's fees go
//   npx ts-node -P tsconfig.json scripts/admin.ts attestor <pubkey>     update_config: who signs X attestations
//   npx ts-node -P tsconfig.json scripts/admin.ts propose <pubkey>      propose_admin: the successor then accepts from the site
//   npx ts-node -P tsconfig.json scripts/admin.ts accept                accept_admin, as the pending admin
import * as anchor from '@coral-xyz/anchor';
import { SeedClient } from '../client/seed';
import idl from '../target/idl/seed.json';
const { PublicKey } = anchor.web3;
(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const c = new SeedClient(new anchor.Program(idl as anchor.Idl, provider), provider), me = provider.publicKey!;
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'treasury') await c.send([await c.updateConfig({ seedTreasury: new PublicKey(arg) }, me)]);
  else if (cmd === 'attestor') await c.send([await c.updateConfig({ attestor: new PublicKey(arg) }, me)]);
  else if (cmd === 'propose') await c.send([await c.proposeAdmin(new PublicKey(arg), me)]);
  else if (cmd === 'accept') await c.send([await c.acceptAdmin(me)]);
  else if (cmd !== 'show') throw new Error('unknown command');
  const cfg = await c.fetchConfig();
  for (const k of ['admin', 'pendingAdmin', 'attestor', 'seedTreasury', 'solFeed']) console.log(k.padEnd(13), cfg[k].toBase58());
  console.log('testMode     ', cfg.testMode, ' feeBps', cfg.feeBps, ' creatorShareBps', cfg.creatorShareBps, ' capUsdCents', cfg.capUsdCents.toString());
})();
