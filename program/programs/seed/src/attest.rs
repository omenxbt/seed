//! The X attestation. Seed's backend signs, with the attestor key in Config,
//!   "seed-x-attest:v1" || founder (32) || sha256(lower-cased handle) (32) || expiry (u64 LE)
//! and the client puts an ed25519-program instruction verifying that signature right before open_raise. The program
//! reads that instruction back through the instructions sysvar and checks it is the attestor's signature over exactly
//! this message. The ed25519 program has already refused the transaction if the signature was bad.
use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked;

pub const ED25519_PROGRAM: Pubkey = pubkey!("Ed25519SigVerify111111111111111111111111111");
use crate::errors::SeedError;

pub const PREFIX: &[u8] = b"seed-x-attest:v1";

pub fn expected_message(founder: &Pubkey, handle_hash: &[u8; 32], expiry: u64) -> Vec<u8> {
    let mut m = Vec::with_capacity(PREFIX.len() + 72);
    m.extend_from_slice(PREFIX); m.extend_from_slice(founder.as_ref()); m.extend_from_slice(handle_hash); m.extend_from_slice(&expiry.to_le_bytes());
    m
}

/// the instruction just before this one must be the ed25519 program checking `attestor` over `message`
pub fn verify(ix_sysvar: &AccountInfo, current_index: u16, attestor: &Pubkey, message: &[u8]) -> Result<()> {
    require!(current_index > 0, SeedError::BadAttestation);
    let ix = load_instruction_at_checked(current_index as usize - 1, ix_sysvar).map_err(|_| SeedError::BadAttestation)?;
    require!(ix.program_id == ED25519_PROGRAM && ix.accounts.is_empty(), SeedError::BadAttestation);
    let d = &ix.data;
    require!(d.len() >= 16 && d[0] == 1, SeedError::BadAttestation);
    let u16at = |i: usize| u16::from_le_bytes([d[i], d[i + 1]]) as usize;
    let sig_off = u16at(2); let sig_ix = u16at(4); let pk_off = u16at(6); let pk_ix = u16at(8); let msg_off = u16at(10); let msg_len = u16at(12); let msg_ix = u16at(14);
    // every part must be in this same instruction, not another one in the transaction
    require!(sig_ix == 0xffff && pk_ix == 0xffff && msg_ix == 0xffff, SeedError::BadAttestation);
    require!(d.len() >= pk_off + 32 && d.len() >= sig_off + 64 && d.len() >= msg_off + msg_len, SeedError::BadAttestation);
    require!(&d[pk_off..pk_off + 32] == attestor.as_ref(), SeedError::BadAttestation);
    require!(&d[msg_off..msg_off + msg_len] == message, SeedError::BadAttestation);
    Ok(())
}
