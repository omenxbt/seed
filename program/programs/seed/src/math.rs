//! The pool's opening numbers, in DAMM v2's own terms: a Q64.64 sqrt price and a liquidity such that the pool takes
//! (almost) exactly the raise and the pool tokens. The pool's deposit formulas, which these mirror:
//!   amount A = L * (pb - s) / (s * pb)     (rounded up)
//!   amount B = L * (s - pa) / 2^128        (rounded up)
//! with s the opening sqrt price and pa, pb the full-range bounds.
use uint::construct_uint;
construct_uint! { pub struct U256(4); }

pub const MIN_SQRT_PRICE: u128 = 4_295_048_016;
pub const MAX_SQRT_PRICE: u128 = 79_226_673_521_066_979_257_578_248_091;

fn isqrt(n: U256) -> U256 {
    if n.is_zero() { return n; }
    let mut x = U256::one() << ((256 - n.leading_zeros() as usize + 1) / 2);   // a first guess above the root
    loop { let y = (x + n / x) >> 1; if y >= x { return x; } x = y; }
}

/// the opening sqrt price for `a` base units of the token against `b` base units of the pair asset:
/// sqrt(b / a) in Q64.64. With a full price range the quadratic DAMM solves collapses to this (pa ~ 0, 1/pb ~ 0).
pub fn init_sqrt_price(a: u64, b: u64) -> u128 {
    let s = isqrt((U256::from(b) << 128) / U256::from(a));
    s.as_u128().clamp(MIN_SQRT_PRICE + 1, MAX_SQRT_PRICE - 1)
}

/// the largest liquidity the pool can take from `a` and `b` at sqrt price `s`, less one part in a billion so that the
/// pool's rounded-up deposits never exceed what the raise holds
pub fn init_liquidity(a: u64, b: u64, s: u128) -> u128 {
    let pa = U256::from(MIN_SQRT_PRICE); let pb = U256::from(MAX_SQRT_PRICE); let s = U256::from(s);
    let la = U256::from(a) * s * pb / (pb - s);
    let lb = (U256::from(b) << 128) / (s - pa);
    let l = if la < lb { la } else { lb };
    (l - l / U256::from(1_000_000_000u64)).as_u128()
}

/// the fee numerator DAMM uses for a flat fee of `bps` (denominator 1e9)
pub const fn fee_numerator(bps: u16) -> u64 { bps as u64 * 100_000 }

/// the 27 bytes of a BaseFeeParameters for a flat fee: a time scheduler with no periods, mode byte 0 at offset 26
pub fn flat_base_fee(bps: u16) -> [u8; 27] {
    let mut d = [0u8; 27];
    d[0..8].copy_from_slice(&fee_numerator(bps).to_le_bytes());   // cliff_fee_numerator
    // number_of_period (u16), period_frequency (u64), reduction_factor (u64): zero; base_fee_mode: 0 (FeeTimeSchedulerLinear)
    d
}

pub fn mul_div(a: u64, b: u64, c: u64) -> Option<u64> {
    (a as u128).checked_mul(b as u128)?.checked_div(c as u128)?.try_into().ok()
}
pub fn mul_div_ceil(a: u64, b: u64, c: u64) -> Option<u64> {
    let p = (a as u128).checked_mul(b as u128)?;
    ((p + c as u128 - 1) / c as u128).try_into().ok()
}
