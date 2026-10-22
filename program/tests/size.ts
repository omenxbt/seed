/* open_raise at its largest must fit one transaction (1232 bytes). Nothing is sent: the instructions are built as the site
   and the client build them, with every field at the program's limit, and measured as a legacy transaction and as a v0
   transaction over the lookup table (client/alt.ts). Run on its own: npx ts-mocha -p tsconfig.json tests/size.ts */
import * as anchor from '@coral-xyz/anchor';
import { BN, web3 } from '@coral-xyz/anchor';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { expect } from 'chai';
import { SOL_FEED, attestIx, handleHash, pda } from '../client/seed';
import { USDC_DEVNET, fixedAddresses, legacySize, localTable, v0Size } from '../client/alt';
import idl from '../target/idl/seed.json';

const PACKET = 1232, MAX_NAME = 32, MAX_TICKER = 8, MAX_TRANCHES = 24, MAX_URI = 200;   // state.rs

describe('open_raise at its largest', () => {
  const program = new anchor.Program(idl as anchor.Idl, { connection: new web3.Connection('http://127.0.0.1:8899') });
  const pid = program.programId, founder = web3.Keypair.generate(), attestor = web3.Keypair.generate(), nonce = Date.now();
  const raise = pda.raise(pid, founder.publicKey, nonce), hash = handleHash('a'.repeat(15)), expiry = Math.floor(Date.now() / 1000) + 3600;
  const prevRaise = web3.Keypair.generate().publicKey;   // the founder's last raise, named when it has one: a distinct account

  async function worst(pairMint: web3.PublicKey) {
    const schedule = Array.from({ length: MAX_TRANCHES }, (_, i) => ({ dayOffset: 90 + 30 * i, bps: i === MAX_TRANCHES - 1 ? 10000 - 416 * (MAX_TRANCHES - 1) : 416 }));
    const open = await program.methods.openRaise({ nonce: new BN(nonce), name: 'N'.repeat(MAX_NAME), ticker: 'T'.repeat(MAX_TICKER), target: new BN('1000000000000'), deadline: new BN(14 * 86400), teamBps: 2000, schedule, payoutWallet: web3.Keypair.generate().publicKey, x: { handleHash: [...hash], expiry: new BN(expiry) }, uri: 'https://' + 'u'.repeat(MAX_URI - 8), even: null })
      .accounts({ config: pda.config(pid), solFeed: SOL_FEED, raise, founder: founder.publicKey, pairMint, pairTokenProgram: TOKEN_PROGRAM_ID, pair: null, pairFeed: null, escrow: getAssociatedTokenAddressSync(pairMint, raise, true), walletBlacklist: pda.blacklist(pid, founder.publicKey), founderState: pda.founderState(pid, founder.publicKey), prevRaise, raiseMeta: pda.raiseMeta(pid, raise), instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY, tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: web3.SystemProgram.programId })
      .remainingAccounts([{ pubkey: pda.blacklist(pid, hash), isSigner: false, isWritable: false }]).instruction();
    return [attestIx(attestor, founder.publicKey, hash, expiry), open];
  }

  it('fits a v0 transaction over the lookup table, USDC pair, X linked, 24 tranches, 32-char name, 8-char ticker, 200-char URI', async () => {
    const ixs = await worst(USDC_DEVNET), table = localTable(web3.Keypair.generate().publicKey, fixedAddresses(pid, 'devnet'));
    const legacy = legacySize(founder.publicKey, ixs), v0 = v0Size(founder.publicKey, ixs, table);
    console.log(`      legacy ${legacy} bytes, v0 over the table ${v0} bytes, limit ${PACKET}`);
    expect(v0).to.be.at.most(PACKET);
  });
  it('the same with the SOL pair', async () => {
    const ixs = await worst(new web3.PublicKey('So11111111111111111111111111111111111111112')), table = localTable(web3.Keypair.generate().publicKey, fixedAddresses(pid, 'devnet'));
    expect(v0Size(founder.publicKey, ixs, table)).to.be.at.most(PACKET);
  });
  it('the table carries every fixed account the instruction names', async () => {
    const ixs = await worst(USDC_DEVNET), fixed = new Set(fixedAddresses(pid, 'devnet').map(k => k.toBase58()));
    const perRaise = new Set([raise, founder.publicKey, prevRaise, pda.blacklist(pid, founder.publicKey), pda.founderState(pid, founder.publicKey), pda.raiseMeta(pid, raise), getAssociatedTokenAddressSync(USDC_DEVNET, raise, true), pda.blacklist(pid, hash)].map(k => k.toBase58()));
    for (const ix of ixs) for (const k of [ix.programId, ...ix.keys.map(m => m.pubkey)]) expect(fixed.has(k.toBase58()) || perRaise.has(k.toBase58()), k.toBase58()).to.equal(true);
  });
});
