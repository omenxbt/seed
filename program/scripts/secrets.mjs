// Prints the SEED_* secrets for a devnet deployment as KEY=VALUE lines, for piping into `supabase secrets set`.
// Never print its output to a terminal. The attestor is the one program/tests/seed.ts derives from the deployer wallet
// (it is fixed in the on-chain Config); the crank wallet is a fresh keypair saved to keys/crank.json unless present.
import { Keypair } from '@solana/web3.js';
import { createHash, randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import bs58 from 'bs58';
const deployer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync('keys/deployer.json', 'utf8'))));
const seed = createHash('sha256').update(Buffer.concat([Buffer.from(deployer.secretKey), Buffer.from('seed attestor')])).digest();
if (!existsSync('keys/crank.json')) writeFileSync('keys/crank.json', JSON.stringify(Array.from(Keypair.generate().secretKey)), { mode: 0o600 });
const crank = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync('keys/crank.json', 'utf8'))));
process.stdout.write([
  `SEED_ATTESTOR_KEY=${bs58.encode(seed)}`,
  `SEED_CRANK_KEY=${bs58.encode(crank.secretKey)}`,
  `CRANK_SECRET=${randomBytes(24).toString('hex')}`,
  `HELIUS_WEBHOOK_SECRET=${randomBytes(24).toString('hex')}`,
].join('\n') + '\n');
process.stderr.write(`attestor ${Keypair.fromSeed(seed).publicKey.toBase58()}\ncrank ${crank.publicKey.toBase58()}\n`);
