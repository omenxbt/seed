/* The address lookup table Seed's transactions compile against (v0 transactions). Every account that is the same in
   every transaction lives in it, so each costs one byte in a message instead of thirty-two: the program and its config,
   the price feed, the pair mints, the token programs, the sysvars, the signature program and Meteora. Per-raise accounts
   (the raise, its escrow, the founder and its record, the mint, the pool) stay in the message itself.
   scripts/alt.ts makes the table on a cluster from this list; the site reads it by the address in js/config/seed.js. */
import { web3 } from '@coral-xyz/anchor';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { DAMM, DAMM_POOL_AUTHORITY, SOL_FEED, TOKEN_2022, TOKEN_METADATA_PROGRAM, WSOL, pda } from './seed';

export const USDC_MAINNET = new web3.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const USDC_DEVNET = new web3.PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
export const ED25519_PROGRAM = new web3.PublicKey('Ed25519SigVerify111111111111111111111111111');

/* the fixed accounts, in the order the table holds them (append-only: a new address goes at the end) */
export function fixedAddresses(programId: web3.PublicKey, cluster: 'devnet' | 'mainnet') {
  return [
    programId, pda.config(programId), SOL_FEED,
    WSOL, cluster === 'mainnet' ? USDC_MAINNET : USDC_DEVNET,
    TOKEN_PROGRAM_ID, TOKEN_2022, ASSOCIATED_TOKEN_PROGRAM_ID, web3.SystemProgram.programId,
    web3.SYSVAR_INSTRUCTIONS_PUBKEY, web3.SYSVAR_RENT_PUBKEY, ED25519_PROGRAM, web3.ComputeBudgetProgram.programId,
    TOKEN_METADATA_PROGRAM, DAMM, DAMM_POOL_AUTHORITY
  ];
}

/* a table account built locally from the list: what the chain's copy looks like once scripts/alt.ts has run */
export function localTable(key: web3.PublicKey, addresses: web3.PublicKey[]) {
  return new web3.AddressLookupTableAccount({ key, state: { deactivationSlot: BigInt('18446744073709551615'), lastExtendedSlot: 0, lastExtendedSlotStartIndex: 0, authority: undefined, addresses } });
}

/* a v0 transaction over the table, signatures left blank; its serialized length is what the network measures against 1232 */
export function v0Size(payer: web3.PublicKey, ixs: web3.TransactionInstruction[], table: web3.AddressLookupTableAccount) {
  const msg = new web3.TransactionMessage({ payerKey: payer, recentBlockhash: '11111111111111111111111111111111', instructions: ixs }).compileToV0Message([table]);
  return new web3.VersionedTransaction(msg).serialize().length;
}
export function legacySize(payer: web3.PublicKey, ixs: web3.TransactionInstruction[]) {
  const msg = new web3.TransactionMessage({ payerKey: payer, recentBlockhash: '11111111111111111111111111111111', instructions: ixs }).compileToLegacyMessage();
  return new web3.VersionedTransaction(msg).serialize().length;
}
