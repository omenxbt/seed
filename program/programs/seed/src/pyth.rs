//! The Pyth SOL/USD price, read from a sponsored price feed account of the Pyth receiver program (the same address on
//! mainnet and devnet, kept fresh by Pyth, so nobody posts prices). The account is parsed by hand: PriceUpdateV2 is
//! 8 bytes of discriminator, the 32-byte write authority, the verification level (0 = Partial, followed by the
//! signature count; 1 = Full), then the price message: feed id (32), price i64, conf u64, exponent i32,
//! publish time i64, previous publish time i64, EMA price i64, EMA conf u64, then the posted slot.
use anchor_lang::prelude::*;
use crate::errors::SeedError;

pub const RECEIVER: Pubkey = pubkey!("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");
pub const SOL_USD_FEED_ID: [u8; 32] = [0xef, 0x0d, 0x8b, 0x6f, 0xda, 0x2c, 0xeb, 0xa4, 0x1d, 0xa1, 0x5d, 0x40, 0x95, 0xd1, 0xda, 0x39, 0x2a, 0x0d, 0x2f, 0x8e, 0xd0, 0xc6, 0xc7, 0xbc, 0x0f, 0x4c, 0xfa, 0xc8, 0xc2, 0x80, 0xb5, 0x6d];
/// a price older than this cannot open a SOL raise; the sponsored feed updates far more often than this
pub const MAX_AGE: i64 = 15 * 60;

/// the SOL price in US cents, or an error if the account is not the fully verified SOL/USD feed or is stale
pub fn sol_usd_cents(acc: &AccountInfo, now: i64) -> Result<u64> { price_cents(acc, &SOL_USD_FEED_ID, now) }

/// a price in US cents from any sponsored feed account, checked against the feed id it must carry (a pair asset's, from
/// the allowlist) and refused when stale
pub fn price_cents(acc: &AccountInfo, feed_id: &[u8; 32], now: i64) -> Result<u64> {
    require!(acc.owner == &RECEIVER, SeedError::BadPriceAccount);
    let d = acc.try_borrow_data()?;
    require!(d.len() >= 8 + 32 + 1 + 32 + 8 + 8 + 4 + 8, SeedError::BadPriceAccount);
    let mut o = 8 + 32;
    let level = d[o]; o += 1;
    require!(level == 1, SeedError::BadPriceAccount);   // Full verification only
    require!(d[o..o + 32] == feed_id[..], SeedError::BadPriceAccount); o += 32;
    let price = i64::from_le_bytes(d[o..o + 8].try_into().unwrap()); o += 8;
    o += 8;   // conf
    let expo = i32::from_le_bytes(d[o..o + 4].try_into().unwrap()); o += 4;
    let publish_time = i64::from_le_bytes(d[o..o + 8].try_into().unwrap());
    require!(price > 0, SeedError::BadPriceAccount);
    require!(now - publish_time <= MAX_AGE, SeedError::StalePrice);
    // price × 10^expo dollars → cents
    let cents: u128 = if expo <= 0 {
        let scale = 10u128.pow((-expo) as u32);
        (price as u128) * 100 / scale
    } else { (price as u128) * 100 * 10u128.pow(expo as u32) };
    u64::try_from(cents).map_err(|_| SeedError::Overflow.into())
}
