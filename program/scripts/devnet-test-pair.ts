// Devnet: a Token-2022 test asset, "TSTx", priced as a dollar, allowed as a pair by the upgrade authority, and a balance of it
// minted to the wallets named — so a raise paired with a tokenized-stock-style asset can be exercised without a mainnet stock.
//   ANCHOR_PROVIDER_URL=<devnet rpc> ANCHOR_WALLET=keys/deployer.json npx ts-node -P tsconfig.json scripts/devnet-test-pair.ts <wallet>... [--mint <existing TSTx mint>]
import * as anchor from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import { TOKEN_2022_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createInitializeMint2Instruction, createMintToInstruction, getAssociatedTokenAddressSync, getMintLen } from '@solana/spl-token';
import idl from '../target/idl/seed.json';
import { SeedClient, pda } from '../client/seed';

const args = process.argv.slice(2), mi = args.indexOf('--mint'), existing = mi > 0 ? args[mi + 1] : null, wallets = args.filter((a, i) => a !== '--mint' && i !== mi + 1);
(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider), c = new SeedClient(program, provider), me = (provider.wallet as anchor.Wallet).payer, T22 = TOKEN_2022_PROGRAM_ID;
  let mint: web3.PublicKey;
  if (existing) mint = new web3.PublicKey(existing);
  else {
    const mk = web3.Keypair.generate(), len = getMintLen([]);
    await c.send([web3.SystemProgram.createAccount({ fromPubkey: me.publicKey, newAccountPubkey: mk.publicKey, space: len, lamports: await provider.connection.getMinimumBalanceForRentExemption(len), programId: T22 }), createInitializeMint2Instruction(mk.publicKey, 6, me.publicKey, null, T22)], [mk]);
    mint = mk.publicKey; console.log('TSTx mint', mint.toBase58(), '(Token-2022, 6 decimals, mint authority: the deployer)');
    const programData = web3.PublicKey.findProgramAddressSync([program.programId.toBuffer()], new web3.PublicKey('BPFLoaderUpgradeab1e11111111111111111111111'))[0];
    const cfg = await c.fetchConfig();
    await c.send([await c.setPair(mint, { symbol: 'TSTx', stable: true }, me.publicKey, cfg.admin.equals(me.publicKey) ? null : programData)]);
    console.log('allowed as a $1 pair at', pda.pair(program.programId, mint).toBase58());
  }
  for (const w of wallets) {
    const owner = new web3.PublicKey(w), ata = getAssociatedTokenAddressSync(mint, owner, true, T22);
    await c.send([createAssociatedTokenAccountIdempotentInstruction(me.publicKey, ata, owner, mint, T22), createMintToInstruction(mint, ata, me.publicKey, 1_000_000_000, [], T22)]);
    console.log('minted 1,000 TSTx to', w);
  }
})();
