// An X attestation for any wallet and handle, signed by the attestor the provider wallet derives (devnet only; the
// same shape the seed function's x-attest returns). Prints JSON.  npx ts-node -P tsconfig.json scripts/attest-for.ts <wallet> <handle>
import * as anchor from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import { createHash } from 'crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { attestMessage, handleHash } from '../client/seed';
(async () => {
  const provider = anchor.AnchorProvider.env(); const me = (provider.wallet as anchor.Wallet).payer;
  const attestor = web3.Keypair.fromSeed(createHash('sha256').update(Buffer.concat([me.secretKey, Buffer.from('seed attestor')])).digest());
  const [wallet, handle] = process.argv.slice(2), hash = handleHash(handle), expiry = Math.floor(Date.now() / 1000) + 3600;
  const message = attestMessage(new web3.PublicKey(wallet), hash, expiry), signature = nacl.sign.detached(message, attestor.secretKey);
  console.log(JSON.stringify({ wallet, handle, handleHash: hash.toString('hex'), expiry, message: bs58.encode(message), signature: bs58.encode(signature), attestor: attestor.publicKey.toBase58() }));
})();
