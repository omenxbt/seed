// The Seed program from TypeScript: PDAs, the DAMM v2 addresses a raise needs, the X attestation instruction, and one
// method per program instruction with every account filled in. Used by the tests and by the Supabase crank; the site
// will use the same file once wallets send real transactions.
import { AnchorProvider, BN, Program, web3 } from '@coral-xyz/anchor';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';
import * as nacl from 'tweetnacl';
import { createHash } from 'crypto';

const { PublicKey, Keypair, SystemProgram, SYSVAR_INSTRUCTIONS_PUBKEY, Ed25519Program } = web3;
export const DAMM = new PublicKey('cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG');
export const DAMM_POOL_AUTHORITY = new PublicKey('HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC');
export const TOKEN_2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
export const SOL_FEED = new PublicKey('7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE');   // Pyth's sponsored SOL/USD price account, the same on mainnet and devnet
export const WSOL = new PublicKey('So11111111111111111111111111111111111111112');
export const PRESET_CAPS_CENTS = [5_000_000, 10_000_000, 15_000_000, 20_000_000];   // $50K, $100K, $150K, $200K: the production presets
export const TEST_PRESET = 4;                                                     // the devnet test preset's index (about $30)
export const ATTEST_PREFIX = Buffer.from('seed-x-attest:v1');

const le8 = (n: BN | number) => new BN(n).toArrayLike(Buffer, 'le', 8);
const maxKey = (a: web3.PublicKey, b: web3.PublicKey) => (Buffer.compare(a.toBuffer(), b.toBuffer()) === 1 ? a : b).toBuffer();
const minKey = (a: web3.PublicKey, b: web3.PublicKey) => (Buffer.compare(a.toBuffer(), b.toBuffer()) === 1 ? b : a).toBuffer();

export const TOKEN_METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
export const pda = {
  raiseMeta: (pid: web3.PublicKey, raise: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('meta'), raise.toBuffer()], pid)[0],
  metadata: (mint: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('metadata'), TOKEN_METADATA_PROGRAM.toBuffer(), mint.toBuffer()], TOKEN_METADATA_PROGRAM)[0],
  config: (pid: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('config')], pid)[0],
  raise: (pid: web3.PublicKey, founder: web3.PublicKey, nonce: BN | number) => PublicKey.findProgramAddressSync([Buffer.from('raise'), founder.toBuffer(), le8(nonce)], pid)[0],
  contribution: (pid: web3.PublicKey, raise: web3.PublicKey, wallet: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('contrib'), raise.toBuffer(), wallet.toBuffer()], pid)[0],
  blacklist: (pid: web3.PublicKey, subject: Buffer | web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('blacklist'), subject instanceof PublicKey ? subject.toBuffer() : subject], pid)[0],   // a wallet, or a handle's hash
  founderState: (pid: web3.PublicKey, founder: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('founder'), founder.toBuffer()], pid)[0],
  poolVault: (pid: web3.PublicKey, raise: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('pool'), raise.toBuffer()], pid)[0],
  teamVault: (pid: web3.PublicKey, raise: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('team'), raise.toBuffer()], pid)[0],
  stage: (pid: web3.PublicKey, raise: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('stage'), raise.toBuffer()], pid)[0],
  poolPayer: (pid: web3.PublicKey, raise: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('payer'), raise.toBuffer()], pid)[0],
  // DAMM v2
  dammPool: (a: web3.PublicKey, b: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('cpool'), maxKey(a, b), minKey(a, b)], DAMM)[0],
  dammPosition: (nftMint: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('position'), nftMint.toBuffer()], DAMM)[0],
  dammPositionNftAccount: (nftMint: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('position_nft_account'), nftMint.toBuffer()], DAMM)[0],
  dammVault: (mint: web3.PublicKey, pool: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('token_vault'), mint.toBuffer(), pool.toBuffer()], DAMM)[0],
  dammEventAuthority: () => PublicKey.findProgramAddressSync([Buffer.from('__event_authority')], DAMM)[0],
};

export const handleHash = (handle: string) => createHash('sha256').update(handle.toLowerCase()).digest();
/* what the attestor signs, and the ed25519 instruction that goes right before open_raise */
export function attestMessage(founder: web3.PublicKey, hash: Buffer, expiry: number) {
  const e = Buffer.alloc(8); e.writeBigUInt64LE(BigInt(expiry));
  return Buffer.concat([ATTEST_PREFIX, founder.toBuffer(), hash, e]);
}
export function attestIx(attestor: web3.Keypair, founder: web3.PublicKey, hash: Buffer, expiry: number) {
  const message = attestMessage(founder, hash, expiry);
  const signature = nacl.sign.detached(message, attestor.secretKey);
  return Ed25519Program.createInstructionWithPublicKey({ publicKey: attestor.publicKey.toBytes(), message, signature });
}

export type Tranche = { dayOffset: number; bps: number };

export class SeedClient {
  pid: web3.PublicKey;
  constructor(public program: Program, public provider: AnchorProvider) { this.pid = program.programId; }
  get config() { return pda.config(this.pid); }
  async fetchConfig() { return (this.program.account as any).config.fetch(this.config); }
  async fetchRaise(raise: web3.PublicKey) { return (this.program.account as any).raise.fetch(raise); }
  async allRaises() { return (this.program.account as any).raise.all(); }
  raiseKey(founder: web3.PublicKey, nonce: BN | number) { return pda.raise(this.pid, founder, nonce); }

  /* the config, once; `devnetWitness` is the devnet USDC mint and is only needed for test mode (devnet builds) */
  initConfig(p: any, payer: web3.PublicKey, devnetWitness: web3.PublicKey | null = null) {
    return this.program.methods.initConfig(p).accounts({ config: this.config, payer, systemProgram: SystemProgram.programId, devnetWitness }).instruction();
  }
  updateConfig(u: { seedTreasury?: web3.PublicKey | null; attestor?: web3.PublicKey | null }, admin: web3.PublicKey) { return this.program.methods.updateConfig({ seedTreasury: u.seedTreasury ?? null, attestor: u.attestor ?? null }).accounts({ config: this.config, admin }).instruction(); }
  proposeAdmin(newAdmin: web3.PublicKey, admin: web3.PublicKey) { return this.program.methods.proposeAdmin(newAdmin).accounts({ config: this.config, admin }).instruction(); }
  acceptAdmin(newAdmin: web3.PublicKey) { return this.program.methods.acceptAdmin().accounts({ config: this.config, newAdmin }).instruction(); }
  /* devnet builds only */
  resetConfig(admin: web3.PublicKey) { return this.program.methods.resetConfig().accounts({ config: this.config, admin }).instruction(); }

  /* open_raise, with the attestation instruction first when an X handle is linked (attestor + handle), else alone.
     The founder's record names its last live raise, which is passed in so the program can see it has ended. */
  async openRaise(founder: web3.PublicKey, pairMint: web3.PublicKey, attestor: web3.Keypair | null, handle: string | null, p: { nonce: BN | number; name: string; ticker: string; preset: number; minBuy?: BN | null; maxBuy?: BN | null; deadline: number; teamBps: number; even?: { cliffDays: number; intervalDays: number; count: number } | null; schedule: Tranche[]; payoutWallet: web3.PublicKey; uri?: string }) {
    const raise = this.raiseKey(founder, p.nonce), expiry = Math.floor(Date.now() / 1000) + 3600, hash = attestor && handle ? handleHash(handle) : null;
    const fs = await (this.program.account as any).founderState.fetchNullable(pda.founderState(this.pid, founder));
    const prevRaise = fs && !fs.liveRaise.equals(PublicKey.default) ? fs.liveRaise : null;
    const open = await this.program.methods.openRaise({ nonce: new BN(p.nonce), name: p.name, ticker: p.ticker, preset: p.preset, minBuy: p.minBuy || new BN(0), maxBuy: p.maxBuy || new BN(0), deadline: new BN(p.deadline), teamBps: p.teamBps, schedule: p.schedule, even: p.even || null, payoutWallet: p.payoutWallet, x: hash ? { handleHash: [...hash], expiry: new BN(expiry) } : null, uri: p.uri ?? 'https://seed.test/meta.json' })
      .accounts({ config: this.config, solFeed: SOL_FEED, raise, founder, pairMint, escrow: getAssociatedTokenAddressSync(pairMint, raise, true), walletBlacklist: pda.blacklist(this.pid, founder), founderState: pda.founderState(this.pid, founder), prevRaise, raiseMeta: pda.raiseMeta(this.pid, raise), instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId })
      .remainingAccounts(hash ? [{ pubkey: pda.blacklist(this.pid, hash), isSigner: false, isWritable: false }] : []).instruction();
    return { raise, ixs: hash ? [attestIx(attestor!, founder, hash, expiry), open] : [open] };
  }
  /* link_x: the attestation instruction, then link_x, for a raise opened without an X account */
  async linkX(raise: web3.PublicKey, founder: web3.PublicKey, attestor: web3.Keypair, handle: string) {
    const hash = handleHash(handle), expiry = Math.floor(Date.now() / 1000) + 3600;
    const ix = await this.program.methods.linkX({ handleHash: [...hash], expiry: new BN(expiry) }).accounts({ raise, founder, config: this.config, instructions: SYSVAR_INSTRUCTIONS_PUBKEY })
      .remainingAccounts([{ pubkey: pda.blacklist(this.pid, hash), isSigner: false, isWritable: false }]).instruction();
    return [attestIx(attestor, founder, hash, expiry), ix];
  }
  async contribute(raise: web3.PublicKey, pairMint: web3.PublicKey, wallet: web3.PublicKey, amount: BN) {
    return this.program.methods.contribute(amount).accounts({ raise, contribution: pda.contribution(this.pid, raise, wallet), wallet, walletToken: getAssociatedTokenAddressSync(pairMint, wallet), escrow: getAssociatedTokenAddressSync(pairMint, raise, true), tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).instruction();
  }
  settle(raise: web3.PublicKey) { return this.program.methods.settle().accounts({ raise }).instruction(); }
  cancelRaise(raise: web3.PublicKey, founder: web3.PublicKey) { return this.program.methods.cancelRaise().accounts({ raise, founder, config: this.config }).instruction(); }
  timeoutRefund(raise: web3.PublicKey) { return this.program.methods.timeoutRefund().accounts({ raise, config: this.config }).instruction(); }
  claimRefund(raise: web3.PublicKey, pairMint: web3.PublicKey, wallet: web3.PublicKey) {
    return this.program.methods.claimRefund().accounts({ raise, contribution: pda.contribution(this.pid, raise, wallet), wallet, walletToken: getAssociatedTokenAddressSync(pairMint, wallet), escrow: getAssociatedTokenAddressSync(pairMint, raise, true), tokenProgram: TOKEN_PROGRAM_ID }).instruction();
  }
  /* seeding, step 1: the mint is a fresh keypair the cranker signs with */
  crankMint(raise: web3.PublicKey, mint: web3.PublicKey, pairMint: web3.PublicKey, cranker: web3.PublicKey) {
    return this.program.methods.crankMint().accounts({ raise, cranker, mint, backersVault: getAssociatedTokenAddressSync(mint, raise, true), poolVault: pda.poolVault(this.pid, raise), teamVault: pda.teamVault(this.pid, raise), pairMint, stage: pda.stage(this.pid, raise), poolPayer: pda.poolPayer(this.pid, raise), raiseMeta: pda.raiseMeta(this.pid, raise), metadata: pda.metadata(mint), tokenMetadataProgram: TOKEN_METADATA_PROGRAM, rent: web3.SYSVAR_RENT_PUBKEY, tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).instruction();
  }
  /* seeding, step 2: the position NFT mint is a fresh keypair the cranker signs with */
  crankPool(raise: web3.PublicKey, mint: web3.PublicKey, pairMint: web3.PublicKey, positionNftMint: web3.PublicKey, cranker: web3.PublicKey) {
    const pool = pda.dammPool(mint, pairMint);
    return this.program.methods.crankPool().accounts({ raise, config: this.config, cranker, mint, pairMint, poolVault: pda.poolVault(this.pid, raise), escrow: getAssociatedTokenAddressSync(pairMint, raise, true), stage: pda.stage(this.pid, raise), poolPayer: pda.poolPayer(this.pid, raise),
      positionNftMint, positionNftAccount: pda.dammPositionNftAccount(positionNftMint), poolAuthority: DAMM_POOL_AUTHORITY, pool, position: pda.dammPosition(positionNftMint), tokenAVault: pda.dammVault(mint, pool), tokenBVault: pda.dammVault(pairMint, pool),
      dammEventAuthority: pda.dammEventAuthority(), cpAmmProgram: DAMM, tokenProgram: TOKEN_PROGRAM_ID, token2022Program: TOKEN_2022, systemProgram: SystemProgram.programId }).instruction();
  }
  crankSeed(raise: web3.PublicKey, pairMint: web3.PublicKey, treasury: web3.PublicKey) {
    return this.program.methods.crankSeed().accounts({ raise, config: this.config, escrow: getAssociatedTokenAddressSync(pairMint, raise, true), treasuryToken: getAssociatedTokenAddressSync(pairMint, treasury), tokenProgram: TOKEN_PROGRAM_ID }).instruction();
  }
  claimTokens(raise: web3.PublicKey, mint: web3.PublicKey, wallet: web3.PublicKey) {
    return this.program.methods.claimTokens().accounts({ raise, contribution: pda.contribution(this.pid, raise, wallet), wallet, mint, walletToken: getAssociatedTokenAddressSync(mint, wallet), backersVault: getAssociatedTokenAddressSync(mint, raise, true), tokenProgram: TOKEN_PROGRAM_ID }).instruction();
  }
  claimCreatorFees(raise: web3.PublicKey, r: { mint: web3.PublicKey; pairMint: web3.PublicKey; pool: web3.PublicKey; position: web3.PublicKey; positionNftMint: web3.PublicKey; payoutWallet: web3.PublicKey }, treasury: web3.PublicKey, cranker: web3.PublicKey) {
    return this.program.methods.claimCreatorFees().accounts({ raise, config: this.config, cranker, mint: r.mint, pairMint: r.pairMint, poolVault: pda.poolVault(this.pid, raise), escrow: getAssociatedTokenAddressSync(r.pairMint, raise, true),
      payoutWallet: r.payoutWallet, payoutToken: getAssociatedTokenAddressSync(r.pairMint, r.payoutWallet, true), treasuryToken: getAssociatedTokenAddressSync(r.pairMint, treasury), poolAuthority: DAMM_POOL_AUTHORITY, pool: r.pool, position: r.position,
      positionNftAccount: pda.dammPositionNftAccount(r.positionNftMint), tokenAVault: pda.dammVault(r.mint, r.pool), tokenBVault: pda.dammVault(r.pairMint, r.pool), dammEventAuthority: pda.dammEventAuthority(), cpAmmProgram: DAMM,
      tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).instruction();
  }
  claimVested(raise: web3.PublicKey, mint: web3.PublicKey, payoutWallet: web3.PublicKey, cranker: web3.PublicKey) {
    return this.program.methods.claimVested().accounts({ raise, cranker, mint, teamVault: pda.teamVault(this.pid, raise), payoutWallet, payoutToken: getAssociatedTokenAddressSync(mint, payoutWallet, true), tokenProgram: TOKEN_PROGRAM_ID }).instruction();
  }
  requestPayoutChange(raise: web3.PublicKey, founder: web3.PublicKey, to: web3.PublicKey) { return this.program.methods.requestPayoutChange(to).accounts({ raise, founder, config: this.config }).instruction(); }
  applyPayoutChange(raise: web3.PublicKey) { return this.program.methods.applyPayoutChange().accounts({ raise }).instruction(); }
  /* admin_flag_fraud: the founder wallet's blacklist account, plus the handle's as a remaining account when the raise has one */
  adminFlagFraud(raise: web3.PublicKey, admin: web3.PublicKey, founder: web3.PublicKey, handleHash: Buffer | null) {
    return this.program.methods.adminFlagFraud().accounts({ raise, config: this.config, admin, walletBlacklist: pda.blacklist(this.pid, founder), systemProgram: SystemProgram.programId })
      .remainingAccounts(handleHash ? [{ pubkey: pda.blacklist(this.pid, handleHash), isSigner: false, isWritable: true }] : []).instruction();
  }
  adminApproveTakeover(raise: web3.PublicKey, admin: web3.PublicKey, to: web3.PublicKey) { return this.program.methods.adminApproveTakeover(to).accounts({ raise, config: this.config, admin }).instruction(); }

  /* the idempotent ATA instruction the claims need before they run */
  ata(payer: web3.PublicKey, owner: web3.PublicKey, mint: web3.PublicKey) { return createAssociatedTokenAccountIdempotentInstruction(payer, getAssociatedTokenAddressSync(mint, owner, true), owner, mint); }
  /* signs, sends and confirms by polling signature status: no websocket, so it works the same on the public RPC and
     on providers whose subscriptions stall. A failed transaction throws with the program's logs in the message. */
  async send(ixs: web3.TransactionInstruction[], signers: web3.Keypair[] = []) {
    const conn = this.provider.connection, payer = this.provider.publicKey!;
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
    const tx = new web3.Transaction({ feePayer: payer, blockhash, lastValidBlockHeight }).add(...ixs);
    const signed = await this.provider.wallet.signTransaction(tx);
    if (signers.length) signed.partialSign(...signers);
    const sig = await conn.sendRawTransaction(signed.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed' });
    for (;;) {
      const st = (await conn.getSignatureStatuses([sig])).value[0];
      if (st?.err) { const t = await conn.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }); throw new Error(`Transaction ${sig} failed: ${JSON.stringify(st.err)}\n${(t?.meta?.logMessages || []).join('\n')}`); }
      if (st && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) return sig;
      if ((await conn.getBlockHeight('confirmed')) > lastValidBlockHeight) throw new Error(`Transaction ${sig} expired before it was confirmed`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

/* Token Metadata's account, the fields that matter here: who may update it, the name, symbol and URI, and whether it can change */
export function decodeMetadata(data: Buffer) {
  let o = 1; const updateAuthority = new PublicKey(data.subarray(o, o + 32)); o += 32; const mint = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const str = () => { const n = data.readUInt32LE(o); o += 4; const v = data.subarray(o, o + n).toString('utf8').replace(/\0+$/, ''); o += n; return v; };
  const name = str(), symbol = str(), uri = str(); o += 2;   // seller fee
  const hasCreators = data[o]; o += 1; if (hasCreators) { const n = data.readUInt32LE(o); o += 4 + n * 34; }
  const primarySaleHappened = !!data[o]; o += 1; const isMutable = !!data[o];
  return { updateAuthority, mint, name, symbol, uri, primarySaleHappened, isMutable };
}
