// Admin actions on the config from the provider wallet. Usage (with ANCHOR_PROVIDER_URL and ANCHOR_WALLET set):
//   npx ts-node -P tsconfig.json scripts/admin.ts show
//   npx ts-node -P tsconfig.json scripts/admin.ts treasury <pubkey>     update_config: where Seed's fees go
//   npx ts-node -P tsconfig.json scripts/admin.ts attestor <pubkey>     update_config: who signs X attestations
//   npx ts-node -P tsconfig.json scripts/admin.ts propose <pubkey>      propose_admin: the successor then accepts from the site
//   npx ts-node -P tsconfig.json scripts/admin.ts accept                accept_admin, as the pending admin
//   npx ts-node -P tsconfig.json scripts/admin.ts takeover <raise> <to> admin_approve_takeover: pays the unlocked to the old payout, burns the rest
//   npx ts-node -P tsconfig.json scripts/admin.ts flag <raise>          admin_flag_fraud, the X handle's blacklist too when one is linked
// takeover and flag sign as a devnet build's upgrade authority when the provider wallet is not the config's admin
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
  else if (cmd === 'takeover' || cmd === 'flag') {
    const raise = new PublicKey(arg), asAuth = !(await c.fetchConfig()).admin.equals(me), r = await c.fetchRaise(raise);
    const ix = cmd === 'takeover' ? await c.adminApproveTakeover(raise, me, new PublicKey(process.argv[4]), asAuth) : await c.adminFlagFraud(raise, me, r.founder, r.xHandleHash ? Buffer.from(r.xHandleHash) : null, asAuth);
    console.log(cmd, raise.toBase58(), await c.send([ix]));
    const a = await c.fetchRaise(raise); console.log('payout', a.payoutWallet.toBase58(), 'takeoverTo', a.takeoverTo ? a.takeoverTo.toBase58() : null, 'teamClaimed', a.teamClaimed.toString(), 'blacklisted', a.blacklisted);
    return;
  }
  else if (cmd !== 'show') throw new Error('unknown command');
  const cfg = await c.fetchConfig();
  for (const k of ['admin', 'pendingAdmin', 'attestor', 'seedTreasury', 'solFeed']) console.log(k.padEnd(13), cfg[k].toBase58());
  console.log('testMode     ', cfg.testMode, ' feeBps', cfg.feeBps, ' creatorShareBps', cfg.creatorShareBps, ' capUsdCents', cfg.capUsdCents.toString());
})();
