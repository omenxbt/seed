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
export const USDC_MINTS = [new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')];   // mainnet, devnet
export const PRESET_CAPS_CENTS = [5_000_000, 10_000_000, 15_000_000, 20_000_000];   // $50K, $100K, $150K, $200K: the production presets
export const TEST_PRESET = 4;                                                     // the devnet test preset's index (about $30)
export const ATTEST_PREFIX = Buffer.from('seed-x-attest:v1');

const le8 = (n: BN | number) => new BN(n).toArrayLike(Buffer, 'le', 8);
const maxKey = (a: web3.PublicKey, b: web3.PublicKey) => (Buffer.compare(a.toBuffer(), b.toBuffer()) === 1 ? a : b).toBuffer();
const minKey = (a: web3.PublicKey, b: web3.PublicKey) => (Buffer.compare(a.toBuffer(), b.toBuffer()) === 1 ? b : a).toBuffer();

export const TOKEN_METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
/* the token program a mint belongs to (Token or Token-2022), from its owner; the pair side of every instruction takes it */
export const pairProgramOf = async (conn: web3.Connection, mint: web3.PublicKey) => { const a = await conn.getAccountInfo(mint); if (!a) throw new Error('no mint ' + mint.toBase58()); return a.owner; };
export const PAIR_SEED = Buffer.from('pair');
export const pda = {
  pair: (pid: web3.PublicKey, mint: web3.PublicKey) => PublicKey.findProgramAddressSync([PAIR_SEED, mint.toBuffer()], pid)[0],
  raiseMeta: (pid: web3.PublicKey, raise: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('meta'), raise.toBuffer()], pid)[0],
  metadata: (mint: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('metadata'), TOKEN_METADATA_PROGRAM.toBuffer(), mint.toBuffer()], TOKEN_METADATA_PROGRAM)[0],
  config: (pid: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('config')], pid)[0],
  raise: (pid: web3.PublicKey, founder: web3.PublicKey, nonce: BN | number) => PublicKey.findProgramAddressSync([Buffer.from('raise'), founder.toBuffer(), le8(nonce)], pid)[0],
  contribution: (pid: web3.PublicKey, raise: web3.PublicKey, wallet: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('contrib'), raise.toBuffer(), wallet.toBuffer()], pid)[0],
  blacklist: (pid: web3.PublicKey, subject: Buffer | web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('blacklist'), subject instanceof PublicKey ? subject.toBuffer() : subject], pid)[0],   // a wallet, or a handle's hash
  founderState: (pid: web3.PublicKey, founder: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('founder'), founder.toBuffer()], pid)[0],
  poolVault: (pid: web3.PublicKey, raise: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('pool'), raise.toBuffer()], pid)[0],
  teamVault: (pid: web3.PublicKey, raise: web3.PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('team'), raise.toBuffer()], pid)[0],
  stage: (pid: web3.PublicKey, raise: web3.PublicKey, pairMint: web3.PublicKey, pairProgram: web3.PublicKey) => getAssociatedTokenAddressSync(pairMint, pda.poolPayer(pid, raise), true, pairProgram),   // the pool payer's ATA for the pair, under the pair's program
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
  /* the admin (or, on a devnet build, the upgrade authority with the ProgramData account) allows, pauses or resumes a pair asset */
  setPair(mint: web3.PublicKey, p: { symbol: string; feedId?: number[] | Buffer | null; feed?: web3.PublicKey | null; stable?: boolean; paused?: boolean }, signer: web3.PublicKey, programData: web3.PublicKey | null = null) {
    return this.program.methods.setPair({ symbol: p.symbol, feedId: p.feedId ? [...p.feedId] : new Array(32).fill(0), stable: !!p.stable, paused: !!p.paused })
      .accounts({ config: this.config, signer, programData, mint, feed: p.stable ? null : p.feed, pair: pda.pair(this.pid, mint), systemProgram: SystemProgram.programId }).instruction();
  }
  /* devnet builds only */
  devnetSetMaxDeadline(secs: number, authority: web3.PublicKey) {
    const programData = PublicKey.findProgramAddressSync([this.pid.toBuffer()], new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111'))[0];
    return (this.program.methods as any).devnetSetMaxDeadline(new BN(secs)).accounts({ config: this.config, authority, programData }).instruction();
  }
  resetConfig(admin: web3.PublicKey) { return this.program.methods.resetConfig().accounts({ config: this.config, admin }).instruction(); }

  /* open_raise, with the attestation instruction first when an X handle is linked (attestor + handle), else alone.
     The founder's record names its last live raise, which is passed in so the program can see it has ended. */
  async openRaise(founder: web3.PublicKey, pairMint: web3.PublicKey, attestor: web3.Keypair | null, handle: string | null, p: { nonce: BN | number; name: string; ticker: string; preset: number; minBuy?: BN | null; maxBuy?: BN | null; deadline: number; teamBps: number; even?: { cliffDays: number; intervalDays: number; count: number } | null; schedule: Tranche[]; payoutWallet: web3.PublicKey; uri?: string }) {
    const raise = this.raiseKey(founder, p.nonce), expiry = Math.floor(Date.now() / 1000) + 3600, hash = attestor && handle ? handleHash(handle) : null;
    const fs = await (this.program.account as any).founderState.fetchNullable(pda.founderState(this.pid, founder));
    const prevRaise = fs && !fs.liveRaise.equals(PublicKey.default) ? fs.liveRaise : null;
    // a pair other than SOL or USDC: its allowlist entry (and the Pyth feed the entry names) ride along, and the escrow is made under the pair's own token program
    const builtIn = pairMint.equals(WSOL) || USDC_MINTS.some(m => m.equals(pairMint));
    const entry = builtIn ? null : await (this.program.account as any).pairAsset.fetchNullable(pda.pair(this.pid, pairMint));
    if (!builtIn && !entry) throw new Error('pair not allowed: ' + pairMint.toBase58());
    const pairTokenProgram: web3.PublicKey = entry ? entry.tokenProgram : TOKEN_PROGRAM_ID;
    const open = await this.program.methods.openRaise({ nonce: new BN(p.nonce), name: p.name, ticker: p.ticker, preset: p.preset, minBuy: p.minBuy || new BN(0), maxBuy: p.maxBuy || new BN(0), deadline: new BN(p.deadline), teamBps: p.teamBps, schedule: p.schedule, even: p.even || null, payoutWallet: p.payoutWallet, x: hash ? { handleHash: [...hash], expiry: new BN(expiry) } : null, uri: p.uri ?? 'https://seed.test/meta.json' })
      .accounts({ config: this.config, solFeed: SOL_FEED, raise, founder, pairMint, pairTokenProgram, pair: entry ? pda.pair(this.pid, pairMint) : null, pairFeed: entry && !entry.stable ? entry.feed : null, escrow: getAssociatedTokenAddressSync(pairMint, raise, true, pairTokenProgram), walletBlacklist: pda.blacklist(this.pid, founder), founderState: pda.founderState(this.pid, founder), prevRaise, raiseMeta: pda.raiseMeta(this.pid, raise), instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
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
  async contribute(raise: web3.PublicKey, pairMint: web3.PublicKey, wallet: web3.PublicKey, amount: BN, pairProgram: web3.PublicKey = TOKEN_PROGRAM_ID) {
    return this.program.methods.contribute(amount).accounts({ raise, contribution: pda.contribution(this.pid, raise, wallet), wallet, pairMint, walletToken: getAssociatedTokenAddressSync(pairMint, wallet, false, pairProgram), escrow: getAssociatedTokenAddressSync(pairMint, raise, true, pairProgram), tokenProgram: pairProgram, systemProgram: SystemProgram.programId }).instruction();
  }
  settle(raise: web3.PublicKey) { return this.program.methods.settle().accounts({ raise }).instruction(); }
  cancelRaise(raise: web3.PublicKey, founder: web3.PublicKey) { return this.program.methods.cancelRaise().accounts({ raise, founder, config: this.config }).instruction(); }
  timeoutRefund(raise: web3.PublicKey) { return this.program.methods.timeoutRefund().accounts({ raise, config: this.config }).instruction(); }
  claimRefund(raise: web3.PublicKey, pairMint: web3.PublicKey, wallet: web3.PublicKey, pairProgram: web3.PublicKey = TOKEN_PROGRAM_ID) {
    return this.program.methods.claimRefund().accounts({ raise, contribution: pda.contribution(this.pid, raise, wallet), wallet, pairMint, walletToken: getAssociatedTokenAddressSync(pairMint, wallet, false, pairProgram), escrow: getAssociatedTokenAddressSync(pairMint, raise, true, pairProgram), tokenProgram: pairProgram }).instruction();
  }
  /* seeding, step 1: the mint is a fresh keypair the cranker signs with */
  crankMint(raise: web3.PublicKey, mint: web3.PublicKey, pairMint: web3.PublicKey, cranker: web3.PublicKey, pairProgram: web3.PublicKey = TOKEN_PROGRAM_ID) {
    return this.program.methods.crankMint().accounts({ raise, cranker, mint, backersVault: getAssociatedTokenAddressSync(mint, raise, true), poolVault: pda.poolVault(this.pid, raise), teamVault: pda.teamVault(this.pid, raise), pairMint, stage: pda.stage(this.pid, raise, pairMint, pairProgram), poolPayer: pda.poolPayer(this.pid, raise), pairTokenProgram: pairProgram, raiseMeta: pda.raiseMeta(this.pid, raise), metadata: pda.metadata(mint), tokenMetadataProgram: TOKEN_METADATA_PROGRAM, rent: web3.SYSVAR_RENT_PUBKEY, tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).instruction();
  }
  /* seeding, step 2: the position NFT mint is a fresh keypair the cranker signs with */
  crankPool(raise: web3.PublicKey, mint: web3.PublicKey, pairMint: web3.PublicKey, positionNftMint: web3.PublicKey, cranker: web3.PublicKey, pairProgram: web3.PublicKey = TOKEN_PROGRAM_ID) {
    const pool = pda.dammPool(mint, pairMint);
    return this.program.methods.crankPool().accounts({ raise, config: this.config, cranker, mint, pairMint, poolVault: pda.poolVault(this.pid, raise), escrow: getAssociatedTokenAddressSync(pairMint, raise, true, pairProgram), stage: pda.stage(this.pid, raise, pairMint, pairProgram), poolPayer: pda.poolPayer(this.pid, raise), pairTokenProgram: pairProgram,
      positionNftMint, positionNftAccount: pda.dammPositionNftAccount(positionNftMint), poolAuthority: DAMM_POOL_AUTHORITY, pool, position: pda.dammPosition(positionNftMint), tokenAVault: pda.dammVault(mint, pool), tokenBVault: pda.dammVault(pairMint, pool),
      dammEventAuthority: pda.dammEventAuthority(), cpAmmProgram: DAMM, tokenProgram: TOKEN_PROGRAM_ID, token2022Program: TOKEN_2022, systemProgram: SystemProgram.programId }).instruction();
  }
  crankSeed(raise: web3.PublicKey, pairMint: web3.PublicKey, treasury: web3.PublicKey, pairProgram: web3.PublicKey = TOKEN_PROGRAM_ID) {
    return this.program.methods.crankSeed().accounts({ raise, config: this.config, pairMint, escrow: getAssociatedTokenAddressSync(pairMint, raise, true, pairProgram), treasuryToken: getAssociatedTokenAddressSync(pairMint, treasury, true, pairProgram), tokenProgram: pairProgram }).instruction();
  }
  claimTokens(raise: web3.PublicKey, mint: web3.PublicKey, wallet: web3.PublicKey) {
    return this.program.methods.claimTokens().accounts({ raise, contribution: pda.contribution(this.pid, raise, wallet), wallet, mint, walletToken: getAssociatedTokenAddressSync(mint, wallet), backersVault: getAssociatedTokenAddressSync(mint, raise, true), tokenProgram: TOKEN_PROGRAM_ID }).instruction();
  }
  claimCreatorFees(raise: web3.PublicKey, r: { mint: web3.PublicKey; pairMint: web3.PublicKey; pool: web3.PublicKey; position: web3.PublicKey; positionNftMint: web3.PublicKey; payoutWallet: web3.PublicKey }, treasury: web3.PublicKey, cranker: web3.PublicKey, pairProgram: web3.PublicKey = TOKEN_PROGRAM_ID) {
    return this.program.methods.claimCreatorFees().accounts({ raise, config: this.config, cranker, mint: r.mint, pairMint: r.pairMint, poolVault: pda.poolVault(this.pid, raise), escrow: getAssociatedTokenAddressSync(r.pairMint, raise, true, pairProgram),
      payoutWallet: r.payoutWallet, payoutToken: getAssociatedTokenAddressSync(r.pairMint, r.payoutWallet, true, pairProgram), treasuryToken: getAssociatedTokenAddressSync(r.pairMint, treasury, true, pairProgram), pairTokenProgram: pairProgram, poolAuthority: DAMM_POOL_AUTHORITY, pool: r.pool, position: r.position,
      positionNftAccount: pda.dammPositionNftAccount(r.positionNftMint), tokenAVault: pda.dammVault(r.mint, r.pool), tokenBVault: pda.dammVault(r.pairMint, r.pool), dammEventAuthority: pda.dammEventAuthority(), cpAmmProgram: DAMM,
      tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).instruction();
  }
  claimVested(raise: web3.PublicKey, mint: web3.PublicKey, payoutWallet: web3.PublicKey, cranker: web3.PublicKey) {
    return this.program.methods.claimVested().accounts({ raise, cranker, mint, teamVault: pda.teamVault(this.pid, raise), payoutWallet, payoutToken: getAssociatedTokenAddressSync(mint, payoutWallet, true), tokenProgram: TOKEN_PROGRAM_ID }).instruction();
  }
  requestPayoutChange(raise: web3.PublicKey, founder: web3.PublicKey, to: web3.PublicKey) { return this.program.methods.requestPayoutChange(to).accounts({ raise, founder, config: this.config }).instruction(); }
  applyPayoutChange(raise: web3.PublicKey) { return this.program.methods.applyPayoutChange().accounts({ raise }).instruction(); }
  /* this program's ProgramData account: with it, a devnet build lets the upgrade authority sign set_pair and the two admin instructions */
  get programData() { return PublicKey.findProgramAddressSync([this.pid.toBuffer()], new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111'))[0]; }
  /* admin_flag_fraud: the founder wallet's blacklist account, plus the handle's as a remaining account when the raise has one.
     `asAuthority` signs as a devnet build's upgrade authority (the ProgramData account rides along) */
  adminFlagFraud(raise: web3.PublicKey, admin: web3.PublicKey, founder: web3.PublicKey, handleHash: Buffer | null, asAuthority = false) {
    return this.program.methods.adminFlagFraud().accounts({ raise, config: this.config, admin, programData: asAuthority ? this.programData : null, walletBlacklist: pda.blacklist(this.pid, founder), systemProgram: SystemProgram.programId })
      .remainingAccounts(handleHash ? [{ pubkey: pda.blacklist(this.pid, handleHash), isSigner: false, isWritable: true }] : []).instruction();
  }
  /* admin_approve_takeover on a seeded raise: what had unlocked and not been paid goes to the payout wallet of before (its token
     account is made if missing, paid by the signer), the rest of the team vault is burned, and the payout moves to `to` */
  async adminApproveTakeover(raise: web3.PublicKey, admin: web3.PublicKey, to: web3.PublicKey, asAuthority = false) {
    const r = await this.fetchRaise(raise);
    return this.program.methods.adminApproveTakeover(to).accounts({ raise, config: this.config, admin, programData: asAuthority ? this.programData : null, mint: r.mint, teamVault: pda.teamVault(this.pid, raise),
      payoutWallet: r.payoutWallet, payoutToken: getAssociatedTokenAddressSync(r.mint, r.payoutWallet, true), tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).instruction();
  }

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
