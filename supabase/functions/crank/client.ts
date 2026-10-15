// The crank's view of the Seed program: the same addresses and instructions as program/client/seed.ts, written for
// Deno's npm: imports. Keep the two in step when an instruction changes.
import { Buffer } from 'node:buffer';
import { BN, Program, web3 } from 'npm:@coral-xyz/anchor@0.30.1';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, getAccount } from 'npm:@solana/spl-token@0.4.9';

const { PublicKey, Keypair, SystemProgram, ComputeBudgetProgram } = web3;
export const DAMM = new PublicKey('cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG');
export const DAMM_POOL_AUTHORITY = new PublicKey('HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC');
export const TOKEN_2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const B58A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function bs58(b: Uint8Array) { let n = 0n; for (const x of b) n = n * 256n + BigInt(x); let s = ''; while (n > 0n) { s = B58A[Number(n % 58n)] + s; n /= 58n; } for (const x of b) { if (x !== 0) break; s = '1' + s; } return s; }
const maxKey = (a: web3.PublicKey, b: web3.PublicKey) => (Buffer.compare(a.toBuffer(), b.toBuffer()) === 1 ? a : b).toBuffer();
const minKey = (a: web3.PublicKey, b: web3.PublicKey) => (Buffer.compare(a.toBuffer(), b.toBuffer()) === 1 ? b : a).toBuffer();
const TOKEN_METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const pda = {
  config: (pid: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('config')], pid)[0],
  poolVault: (pid: web3.PublicKey, raise: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('pool'), raise.toBuffer()], pid)[0],
  stage: (pid: web3.PublicKey, raise: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('stage'), raise.toBuffer()], pid)[0],
  poolPayer: (pid: web3.PublicKey, raise: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('payer'), raise.toBuffer()], pid)[0],
  raiseMeta: (pid: web3.PublicKey, raise: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('meta'), raise.toBuffer()], pid)[0],
  metadata: (mint: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('metadata'), TOKEN_METADATA_PROGRAM.toBuffer(), mint.toBuffer()], TOKEN_METADATA_PROGRAM)[0],
  dammPool: (a: web3.PublicKey, b: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('cpool'), maxKey(a, b), minKey(a, b)], DAMM)[0],
  dammPosition: (nft: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('position'), nft.toBuffer()], DAMM)[0],
  dammPositionNftAccount: (nft: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('position_nft_account'), nft.toBuffer()], DAMM)[0],
  dammVault: (mint: web3.PublicKey, pool: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('token_vault'), mint.toBuffer(), pool.toBuffer()], DAMM)[0],
  dammEventAuthority: () => PublicKey.findProgramAddressSync([Buffer.from('__event_authority')], DAMM)[0],
};

export function seedClient(program: Program, conn: web3.Connection) {
  const pid = program.programId, config = pda.config(pid), me = program.provider.publicKey!;
  // confirms by polling signature status, as program/client/seed.ts does: no websocket, so any RPC works
  const send = async (ixs: web3.TransactionInstruction[], signers: web3.Keypair[] = []) => {
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
    const tx = new web3.Transaction({ feePayer: me, blockhash, lastValidBlockHeight }).add(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }), ...ixs);
    const signed = await (program.provider as any).wallet.signTransaction(tx);
    if (signers.length) signed.partialSign(...signers);
    const sig = await conn.sendRawTransaction(signed.serialize(), { preflightCommitment: 'confirmed' });
    for (;;) {
      const st = (await conn.getSignatureStatuses([sig])).value[0];
      if (st?.err) throw new Error(`Transaction ${sig} failed: ${JSON.stringify(st.err)}`);
      if (st && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) return sig;
      if ((await conn.getBlockHeight('confirmed')) > lastValidBlockHeight) throw new Error(`Transaction ${sig} expired before it was confirmed`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  };
  const raiseOf = (k: web3.PublicKey) => (program.account as any).raise.fetch(k);
  const m = program.methods as any;
  return {
    // every Raise account, decoded one by one: one from before a layout change fails to decode and is skipped, not fatal
    async allRaises() {
      const disc = (program.coder.accounts as any).accountDiscriminator ? (program.coder.accounts as any).accountDiscriminator('raise') : (program.idl as any).accounts.find((a: any) => a.name === 'Raise').discriminator;
      const raw = await conn.getProgramAccounts(pid, { filters: [{ memcmp: { offset: 0, bytes: bs58(Uint8Array.from(disc)) } }] });
      const out: { publicKey: web3.PublicKey; account: any }[] = [];
      for (const { pubkey, account } of raw) { try { out.push({ publicKey: pubkey, account: program.coder.accounts.decode('raise', account.data as Buffer) }); } catch { /* an older layout */ } }
      return out;
    },
    settle: (raise: web3.PublicKey) => m.settle().accounts({ raise }).rpc(),
    timeoutRefund: (raise: web3.PublicKey) => m.timeoutRefund().accounts({ raise, config }).rpc(),
    applyPayoutChange: (raise: web3.PublicKey) => m.applyPayoutChange().accounts({ raise }).rpc(),
    async crankMint(raise: web3.PublicKey) {
      const r = await raiseOf(raise), mint = Keypair.generate();
      const ix = await m.crankMint().accounts({ raise, cranker: me, mint: mint.publicKey, backersVault: getAssociatedTokenAddressSync(mint.publicKey, raise, true), poolVault: pda.poolVault(pid, raise), teamVault: PublicKey.findProgramAddressSync([Buffer.from('team'), raise.toBuffer()], pid)[0], pairMint: r.pairMint, stage: pda.stage(pid, raise), poolPayer: pda.poolPayer(pid, raise), raiseMeta: pda.raiseMeta(pid, raise), metadata: pda.metadata(mint.publicKey), tokenMetadataProgram: TOKEN_METADATA_PROGRAM, rent: web3.SYSVAR_RENT_PUBKEY, tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).instruction();
      return send([ix], [mint]);
    },
    async crankPool(raise: web3.PublicKey) {
      const r = await raiseOf(raise), nft = Keypair.generate(), pool = pda.dammPool(r.mint, r.pairMint);
      const ix = await m.crankPool().accounts({ raise, config, cranker: me, mint: r.mint, pairMint: r.pairMint, poolVault: pda.poolVault(pid, raise), escrow: getAssociatedTokenAddressSync(r.pairMint, raise, true), stage: pda.stage(pid, raise), poolPayer: pda.poolPayer(pid, raise),
        positionNftMint: nft.publicKey, positionNftAccount: pda.dammPositionNftAccount(nft.publicKey), poolAuthority: DAMM_POOL_AUTHORITY, pool, position: pda.dammPosition(nft.publicKey), tokenAVault: pda.dammVault(r.mint, pool), tokenBVault: pda.dammVault(r.pairMint, pool),
        dammEventAuthority: pda.dammEventAuthority(), cpAmmProgram: DAMM, tokenProgram: TOKEN_PROGRAM_ID, token2022Program: TOKEN_2022, systemProgram: SystemProgram.programId }).instruction();
      return send([ix], [nft]);
    },
    async crankSeed(raise: web3.PublicKey) {
      const r = await raiseOf(raise), cfg = await (program.account as any).config.fetch(config), tre = getAssociatedTokenAddressSync(r.pairMint, cfg.seedTreasury, true);
      const ix = await m.crankSeed().accounts({ raise, config, escrow: getAssociatedTokenAddressSync(r.pairMint, raise, true), treasuryToken: tre, tokenProgram: TOKEN_PROGRAM_ID }).instruction();
      return send([createAssociatedTokenAccountIdempotentInstruction(me, tre, cfg.seedTreasury, r.pairMint), ix]);
    },
    async claimCreatorFees(raise: web3.PublicKey) {
      const r = await raiseOf(raise), cfg = await (program.account as any).config.fetch(config), pool = r.pool as web3.PublicKey;
      const payoutToken = getAssociatedTokenAddressSync(r.pairMint, r.payoutWallet, true), tre = getAssociatedTokenAddressSync(r.pairMint, cfg.seedTreasury, true);
      const ix = await m.claimCreatorFees().accounts({ raise, config, cranker: me, mint: r.mint, pairMint: r.pairMint, poolVault: pda.poolVault(pid, raise), escrow: getAssociatedTokenAddressSync(r.pairMint, raise, true),
        payoutWallet: r.payoutWallet, payoutToken, treasuryToken: tre, poolAuthority: DAMM_POOL_AUTHORITY, pool, position: r.position, positionNftAccount: pda.dammPositionNftAccount(r.positionNftMint),
        tokenAVault: pda.dammVault(r.mint, pool), tokenBVault: pda.dammVault(r.pairMint, pool), dammEventAuthority: pda.dammEventAuthority(), cpAmmProgram: DAMM, tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).instruction();
      return send([createAssociatedTokenAccountIdempotentInstruction(me, payoutToken, r.payoutWallet, r.pairMint), createAssociatedTokenAccountIdempotentInstruction(me, tre, cfg.seedTreasury, r.pairMint), ix]);
    },
  };
}
export { getAccount };
