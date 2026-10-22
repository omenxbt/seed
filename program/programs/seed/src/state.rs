use anchor_lang::prelude::*;

pub const CONFIG_SEED: &[u8] = b"config";
pub const RAISE_SEED: &[u8] = b"raise";
pub const CONTRIB_SEED: &[u8] = b"contrib";
pub const BLACKLIST_SEED: &[u8] = b"blacklist";
pub const FOUNDER_SEED: &[u8] = b"founder";
pub const META_SEED: &[u8] = b"meta";
pub const PAIR_SEED: &[u8] = b"pair";
pub const MAX_PAIR_SYMBOL: usize = 10;
pub const MAX_URI: usize = 200;   // Token Metadata's own limit

pub const BPS: u64 = 10_000;
pub const SUPPLY: u64 = 1_000_000_000;      // whole tokens
pub const TOKEN_DECIMALS: u8 = 6;
pub const SUPPLY_UNITS: u64 = SUPPLY * 1_000_000;   // base units at 6 decimals
pub const MAX_TRANCHES: usize = 24;
pub const MAX_NAME: usize = 32;
pub const MAX_TICKER: usize = 8;
pub const DAY: i64 = 86_400;
pub const LAMPORTS: u64 = 1_000_000_000;

/// The fixed terms. The site's js/config/seed.js carries the same numbers.
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,            // the multisig that can flag fraud and approve a takeover
    pub pending_admin: Pubkey,    // an admin handover waits here until the new admin accepts it (zero when none)
    pub attestor: Pubkey,         // signs the X attestations open_raise verifies
    pub seed_treasury: Pubkey,    // where Seed's fees go (its share of pool fees and the 1% on buys)
    pub sol_feed: Pubkey,         // the Pyth SOL/USD price account open_raise reads for the cap
    pub fee_bps: u16,             // 100: Seed's fee on each buy, on top
    pub creator_share_bps: u16,   // 7000: the founder's share of pool fees, snapshotted into each raise at opening
    pub pool_fee_bps: u16,        // 125: the DAMM v2 pool's flat fee; Meteora's protocol keeps 20% of it, so 1% of volume reaches the position
    pub cap_usd_cents: u64,       // 10_000_000: $100,000
    pub min_deadline: i64,        // seconds, 24h
    pub max_deadline: i64,        // seconds, 14d
    pub seed_timeout: i64,        // seconds, 3d
    pub min_unlock_days: u32,     // 90
    pub payout_delay: i64,        // seconds, 7d
    pub test_mode: bool,          // devnet only: a day is a minute (see init_config)
    pub bump: u8,
    /// unused since 2026-10-20: the presets below size a raise (a raise once had a minimum in lamports here); kept for the
    /// layout, which every devnet config already carries
    pub min_target_lamports: u64,
    /// the opening market cap presets a founder picks from, in cents, set once at init_config: $50K, $100K, $150K, $200K in
    /// production. The raise is derived from the one chosen (math::derive_target). They are the floor and the ceiling.
    pub preset_caps_cents: [u64; 4],
    /// devnet test mode only: a tiny extra preset (about $30) so a cycle costs cents. A mainnet build refuses any value but
    /// zero at init_config (math::check_presets), so no wallet anywhere has an exemption
    pub test_cap_cents: u64,
}
pub const TEST_PRESET: u8 = 4;   // the index of the test preset in open_raise; 0..3 are the production presets

/// A pair asset the admin allowed (["pair", mint]): SOL and USDC need none (they are built in); any other SPL token — a
/// tokenized stock, a major token — is added here with the Pyth price account that prices it, so a preset market cap can be
/// turned into a target in that asset at opening. `stable` means the asset is a dollar (no feed). `paused` stops new raises
/// in it; raises already open are untouched. Mints with a transfer fee, a transfer hook, a permanent delegate or that are
/// non-transferable are refused at set_pair.
#[account]
#[derive(InitSpace)]
pub struct PairAsset {
    pub mint: Pubkey,
    pub token_program: Pubkey,   // Token or Token-2022
    pub decimals: u8,
    pub feed: Pubkey,            // the Pyth price account (zero when stable)
    pub feed_id: [u8; 32],       // the Pyth feed id the account must carry
    pub stable: bool,
    pub paused: bool,
    #[max_len(MAX_PAIR_SYMBOL)]
    pub symbol: String,
    pub added_at: i64,
    pub bump: u8,
}
impl Config {
    /// one "day" in seconds: 86 400, or 60 in test mode
    pub fn unit(&self) -> i64 { if self.test_mode { 60 } else { DAY } }
    /// a span the terms give in seconds, in this config's time: a day's worth becomes a minute's worth in test mode
    pub fn span(&self, secs: i64) -> i64 { if self.test_mode { secs / (DAY / 60) } else { secs } }
    /// the opening market cap a preset index names, in cents; None for an index not on the list (the test preset only
    /// where the config carries one)
    pub fn cap_for(&self, preset: u8) -> Option<u64> {
        match preset { 0..=3 => Some(self.preset_caps_cents[preset as usize]), TEST_PRESET if self.test_cap_cents > 0 => Some(self.test_cap_cents), _ => None }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub struct Tranche {
    pub day_offset: u32,   // days after seeding
    pub bps: u16,          // share of the team tokens
}
/// an even schedule: `count` equal unlocks, one every `interval_days`, the first `interval_days` after a cliff of `cliff_days`
/// (unlock k is at day cliff + k × interval). Compact, so "every day for a year" fits a transaction where 365 tranches would not.
/// Unlock k releases up to floor(k × 10000 / count) bps of the team share in all: even to the basis point, 100% at the last.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub struct EvenUnlocks { pub cliff_days: u32, pub interval_days: u32, pub count: u16 }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum RaiseStatus { Live, Filled, Seeded, Refunded }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum SeedStep { Filled, Minted, Pooled, Seeded }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum RefundReason { Missed, Cancelled, Timeout }

#[account]
#[derive(InitSpace)]
pub struct Raise {
    pub founder: Pubkey,
    pub nonce: u64,
    pub x_handle_hash: Option<[u8; 32]>,   // the linked X account, if any; sha256 of the lowercased handle
    pub pair_mint: Pubkey,
    pub target: u64,                  // base units of the pair asset
    pub target_usd_cents: u64,
    pub sol_usd_cents: u64,           // the SOL price when it opened (0 for a USDC raise)
    pub time_unit: i64,               // seconds in one unlock "day": 86 400, or 60 for a raise opened in test mode
    pub fee_bps: u16,
    pub creator_share_bps: u16,
    pub team_bps: u16,
    #[max_len(MAX_TRANCHES)]
    pub schedule: Vec<Tranche>,
    pub payout_wallet: Pubkey,
    pub pending_payout: Option<Pubkey>,
    pub payout_effective_at: i64,
    pub status: RaiseStatus,
    pub seed_step: SeedStep,
    pub refund_reason: Option<RefundReason>,
    pub raised: u64,
    pub fees_held: u64,
    pub backers: u32,
    pub opened_at: i64,
    pub ends_at: i64,
    pub filled_at: i64,
    pub seeded_at: i64,
    pub mint: Pubkey,                 // set at the Minted step
    pub pool: Pubkey,                 // set at the Pooled step
    pub position: Pubkey,
    pub position_nft_mint: Pubkey,
    pub team_claimed: u64,            // base units
    pub blacklisted: bool,
    pub flagged_at: i64,
    pub takeover_to: Option<Pubkey>,
    pub takeover_at: i64,
    #[max_len(MAX_NAME)]
    pub name: String,
    #[max_len(MAX_TICKER)]
    pub ticker: String,
    pub bump: u8,
    /// the even schedule, when the founder chose one (then `schedule` is empty). Last in the layout: a raise from before it,
    /// allocated with room for 24 tranches and holding fewer, reads its spare zero bytes as None
    pub even: Option<EvenUnlocks>,
    pub cap_usd_cents: u64,   // the opening market cap the founder picked (the preset's value when the raise opened)
    pub preset: u8,           // its index (0..3, or TEST_PRESET on devnet)
    pub min_buy: u64,         // the smallest buy, in base units of the pair asset; 0 = none. A buy that fills the room may be smaller
    pub max_buy: u64,         // the most one wallet may put in over the raise, in base units; 0 = none
    /// when the last seeding step landed: the fill, then the mint, then the pool. The seeding timeout counts from here, so a
    /// raise whose seeding is under way is finished by the next crank, never refunded under it (QA P0-F19). A raise from
    /// before this field reads it as 0 and falls back to filled_at
    pub progress_at: i64,
}

impl Raise {
    /// the supply split: team, then backers and the pool get equal halves of the rest, in base units
    pub fn team_units(&self) -> u64 { (SUPPLY_UNITS as u128 * self.team_bps as u128 / BPS as u128) as u64 }
    pub fn half_units(&self) -> u64 { (SUPPLY_UNITS - self.team_units()) / 2 }
    pub fn backers_units(&self) -> u64 { self.half_units() }
    pub fn pool_units(&self) -> u64 { self.half_units() }
    pub fn room(&self) -> u64 { self.target.saturating_sub(self.raised) }
    /// what the schedule has released by `now`, in base units
    pub fn unlocked_units(&self, now: i64) -> u64 {
        if self.seeded_at == 0 { return 0; }
        let days = (now - self.seeded_at) / self.time_unit.max(1);
        let bps = crate::math::unlocked_bps(days, &self.schedule, self.even.as_ref());
        (self.team_units() as u128 * bps as u128 / BPS as u128) as u64
    }
}

#[account]
#[derive(InitSpace)]
pub struct Contribution {
    pub raise: Pubkey,
    pub wallet: Pubkey,
    pub amount: u64,     // what went into the raise
    pub fee: u64,        // the 1% on top, held beside it
    pub bump: u8,
}

/// an X handle hash that can no longer open a raise; created by admin_flag_fraud
#[account]
#[derive(InitSpace)]
pub struct Blacklist {
    pub subject: [u8; 32],   // a founder wallet, or the sha256 of an X handle
    pub raise: Pubkey,       // the raise it was flagged on
    pub at: i64,
    pub bump: u8,
}

/// one per founder wallet: the raise it has live, so a wallet opens one at a time. Checked and refreshed by open_raise;
/// the raise named here is passed in and must have left Live (filled, refunded, cancelled, or past its deadline).
#[account]
#[derive(InitSpace)]
pub struct FounderState {
    pub wallet: Pubkey,
    pub live_raise: Pubkey,
    pub bump: u8,
}

/// the token's metadata URI, fixed when the raise opens so that whoever runs the mint step cannot choose it. The mint step
/// writes it into Token Metadata and makes that metadata immutable.
#[account]
#[derive(InitSpace)]
pub struct RaiseMeta {
    pub raise: Pubkey,
    #[max_len(MAX_URI)]
    pub uri: String,
    pub bump: u8,
}
