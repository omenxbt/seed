// Prints the on-chain Config of the Seed program: ANCHOR_PROVIDER_URL=... node scripts/config.mjs
import anchor from '@coral-xyz/anchor';
import { readFileSync } from 'fs';
const idl = JSON.parse(readFileSync(new URL('../target/idl/seed.json', import.meta.url), 'utf8'));
const conn = new anchor.web3.Connection(process.env.ANCHOR_PROVIDER_URL, 'confirmed');
const program = new anchor.Program(idl, { connection: conn });
const [cfgKey] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('config')], program.programId);
const c = await program.account.config.fetch(cfgKey);
for (const k of ['admin', 'attestor', 'oracle', 'seedTreasury']) console.log(k, c[k].toBase58());
console.log('feeBps', c.feeBps, 'creatorShareBps', c.creatorShareBps, 'poolFeeBps', c.poolFeeBps, 'capUsdCents', c.capUsdCents.toString(), 'solPriceCents', c.solPriceCents?.toString(), 'priceAt', c.priceAt?.toString());
