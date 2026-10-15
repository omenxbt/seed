// The site's launch path, scripted, for devnet checks with the test wallets: upload the token JSON to Seed's storage,
// open the raise from the founder wallet (no X), fill it from the backer wallet, run the three seeding steps, claim the
// backer's tokens. Prints the raise, mint and pool, and what Helius DAS (what Phantom reads) says about the token.
//   SUPABASE_URL=… SUPABASE_SECRET_KEY=… ANCHOR_PROVIDER_URL=<helius devnet> ANCHOR_WALLET=keys/test/founder.json \
//   npx ts-node -P tsconfig.json scripts/e2e-raise.ts <TICKER> [targetSol] [backerKeypair] [imageUrl]
import * as anchor from '@coral-xyz/anchor';
import { BN, web3 } from '@coral-xyz/anchor';
import { NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { readFileSync } from 'fs';
import { SeedClient, WSOL, pda, decodeMetadata } from '../client/seed';
import idl from '../target/idl/seed.json';

const [ticker = 'E2E', targetSol = '0.05', backerPath = 'keys/test/backer.json', image = ''] = process.argv.slice(2);
const SUPA = process.env.SUPABASE_URL!, KEY = process.env.SUPABASE_SECRET_KEY!;

async function upload(name: string, body: string, type: string) {
  const path = `uploads/e2e/${Date.now().toString(36)}-${name}`;
  const r = await fetch(`${SUPA}/storage/v1/object/presale-media/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, apikey: KEY, 'content-type': type }, body });
  if (!r.ok) throw new Error('upload ' + r.status + ' ' + await r.text());
  return `${SUPA}/storage/v1/object/public/presale-media/${path}`;
}

(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const c = new SeedClient(new anchor.Program(idl as anchor.Idl, provider), provider), me = (provider.wallet as anchor.Wallet).payer;
  const backer = web3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(backerPath, 'utf8'))));
  const name = ticker[0] + ticker.slice(1).toLowerCase(), target = new BN(Math.round(Number(targetSol) * 1e9)), nonce = Date.now();
  const uri = await upload(`${ticker.toLowerCase()}.json`, JSON.stringify({ name, symbol: ticker, description: `${name}: a devnet end-to-end raise.`, image: image || undefined, seller_fee_basis_points: 0, properties: { category: 'image', files: image ? [{ uri: image, type: 'image/png' }] : [] } }), 'application/json');
  console.log('metadata', uri);
  const cfg = await c.fetchConfig();
  const { raise, ixs } = await c.openRaise(me.publicKey, WSOL, null, null, { nonce, name, ticker, uri, target, deadline: cfg.testMode ? 90 : 86400, teamBps: 1000, schedule: [{ dayOffset: 90, bps: 10000 }], payoutWallet: me.publicKey });
  await c.send(ixs);
  console.log('raise', raise.toBase58(), 'id', `${ticker.toLowerCase()}-${raise.toBase58().slice(0, 8).toLowerCase()}`);
  // the backer wraps what the buy needs with the fee on top, then fills the raise in one buy
  const ata = getAssociatedTokenAddressSync(NATIVE_MINT, backer.publicKey), lamports = Math.round(Number(targetSol) * 1e9 * 1.01) + 10_000;
  await c.send([createAssociatedTokenAccountIdempotentInstruction(backer.publicKey, ata, backer.publicKey, NATIVE_MINT), web3.SystemProgram.transfer({ fromPubkey: backer.publicKey, toPubkey: ata, lamports }), createSyncNativeInstruction(ata)], [backer]);
  await c.send([await c.contribute(raise, WSOL, backer.publicKey, target)], [backer]);
  console.log('filled by', backer.publicKey.toBase58());
  const mint = web3.Keypair.generate(), nft = web3.Keypair.generate();
  await c.send([await c.crankMint(raise, mint.publicKey, WSOL, me.publicKey)], [mint]); console.log('minted', mint.publicKey.toBase58());
  await c.send([web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }), await c.crankPool(raise, mint.publicKey, WSOL, nft.publicKey, me.publicKey)], [nft]);
  await c.send([createAssociatedTokenAccountIdempotentInstruction(me.publicKey, getAssociatedTokenAddressSync(NATIVE_MINT, cfg.seedTreasury), cfg.seedTreasury, NATIVE_MINT), await c.crankSeed(raise, WSOL, cfg.seedTreasury)]);
  const r = await c.fetchRaise(raise); console.log('seeded; pool', r.pool.toBase58());
  await c.send([createAssociatedTokenAccountIdempotentInstruction(backer.publicKey, getAssociatedTokenAddressSync(mint.publicKey, backer.publicKey), backer.publicKey, mint.publicKey), await c.claimTokens(raise, mint.publicKey, backer.publicKey)], [backer]);
  console.log('backer claimed');
  const md = decodeMetadata((await provider.connection.getAccountInfo(pda.metadata(mint.publicKey)))!.data);
  console.log('on-chain metadata', { name: md.name, symbol: md.symbol, uri: md.uri, isMutable: md.isMutable });
  // what a wallet shows: Helius DAS resolves the JSON behind the metadata
  const das = await fetch(provider.connection.rpcEndpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAsset', params: { id: mint.publicKey.toBase58() } }) }).then(r => r.json() as Promise<any>);
  const ct = das.result && das.result.content;
  console.log('DAS', das.error ? das.error.message : { name: ct.metadata.name, symbol: ct.metadata.symbol, json_uri: ct.json_uri, image: (ct.links || {}).image, mutable: das.result.mutable });
})();
