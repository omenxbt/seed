//! Events, in the field order supabase/functions/_shared/events.ts decodes them. Change both together.
use anchor_lang::prelude::*;
use crate::state::{EvenUnlocks, Tranche};

#[event]
pub struct RaiseOpened {
    pub raise: Pubkey, pub founder: Pubkey, pub x_handle_hash: Option<[u8; 32]>, pub pair_mint: Pubkey, pub target: u64, pub target_usd_cents: u64, pub sol_usd_cents: u64,
    pub team_bps: u16, pub payout_wallet: Pubkey, pub opened_at: i64, pub ends_at: i64, pub name: String, pub ticker: String, pub schedule: Vec<Tranche>, pub uri: String,
    pub even: Option<EvenUnlocks>,   // appended, so an indexer reading an older layout still reads everything before it
    pub cap_usd_cents: u64, pub preset: u8, pub min_buy: u64, pub max_buy: u64,
}
#[event] pub struct Contributed { pub raise: Pubkey, pub wallet: Pubkey, pub amount: u64, pub fee: u64, pub raised: u64, pub backers: u32, pub at: i64 }
#[event] pub struct RaiseFilled { pub raise: Pubkey, pub at: i64 }
#[event] pub struct RaiseMinted { pub raise: Pubkey, pub mint: Pubkey, pub at: i64 }
#[event] pub struct RaisePooled { pub raise: Pubkey, pub pool: Pubkey, pub position: Pubkey, pub at: i64 }
#[event] pub struct RaiseSeeded { pub raise: Pubkey, pub at: i64 }
#[event] pub struct RaiseRefunded { pub raise: Pubkey, pub reason: u8, pub at: i64 }
#[event] pub struct RefundClaimed { pub raise: Pubkey, pub wallet: Pubkey, pub amount: u64, pub at: i64 }
#[event] pub struct TokensClaimed { pub raise: Pubkey, pub wallet: Pubkey, pub tokens: u64, pub at: i64 }
#[event] pub struct FeesClaimed { pub raise: Pubkey, pub by: Pubkey, pub founder: u64, pub seed: u64, pub at: i64 }
#[event] pub struct VestedClaimed { pub raise: Pubkey, pub tokens: u64, pub at: i64 }
#[event] pub struct PayoutChangeRequested { pub raise: Pubkey, pub from: Pubkey, pub to: Pubkey, pub effective_at: i64, pub at: i64 }
#[event] pub struct PayoutChanged { pub raise: Pubkey, pub to: Pubkey, pub at: i64 }
#[event] pub struct FraudFlagged { pub raise: Pubkey, pub founder: Pubkey, pub x_handle_hash: Option<[u8; 32]>, pub by: Pubkey, pub at: i64 }
#[event] pub struct XLinked { pub raise: Pubkey, pub founder: Pubkey, pub x_handle_hash: [u8; 32], pub at: i64 }
#[event] pub struct TakeoverApproved { pub raise: Pubkey, pub from: Pubkey, pub to: Pubkey, pub by: Pubkey, pub at: i64 }
