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

/// The raise, derived from the opening market cap the founder picked: target = cap × (1 − team share) ÷ 2, in cents, then in
/// the pair asset's base units at its price — `decimals` and `price_cents` are the pair's (SOL: 9 and the Pyth SOL/USD
/// price; USDC: 6 and 100; an allowed pair: its own). Half of what the team does not take is what backers pay for and all
/// of it goes into the pool, so the pool opens at exactly the cap. Returns (target units, target cents).
pub fn derive_target(cap_cents: u64, team_bps: u16, decimals: u8, price_cents: u64) -> anchor_lang::Result<(u64, u64)> {
    use anchor_lang::prelude::*;
    use crate::errors::SeedError;
    use crate::state::BPS;
    require!((team_bps as u64) < BPS, SeedError::BadTeamShare);
    require!(price_cents > 0 && decimals <= 18, SeedError::BadPairFeed);
    let target_cents = mul_div(cap_cents, BPS - team_bps as u64, BPS).ok_or(SeedError::Overflow)? / 2;
    let target = mul_div(target_cents, 10u64.pow(decimals as u32), price_cents).ok_or(SeedError::Overflow)?;
    require!(cap_cents > 0 && target_cents > 0 && target > 0, SeedError::BadPreset);
    Ok((target, target_cents))
}

/// The presets a config may be made with: four opening market caps, ascending, every one above zero. The test preset is
/// allowed only in a devnet build and only with test mode: a mainnet build refuses any value but zero, so there is no path to
/// a tiny raise on mainnet. (`cargo test` on the mainnet build proves the refusal; `--features devnet` proves the allowance.)
pub fn check_presets(caps: &[u64; 4], test_cap_cents: u64, test_mode: bool) -> anchor_lang::Result<()> {
    use anchor_lang::prelude::*;
    use crate::errors::SeedError;
    require!(caps.iter().all(|&c| c > 0) && caps.windows(2).all(|w| w[0] < w[1]), SeedError::BadConfig);
    #[cfg(not(feature = "devnet"))]
    { let _ = test_mode; require!(test_cap_cents == 0, SeedError::TestPresetNotAllowed); }
    #[cfg(feature = "devnet")]
    require!(test_cap_cents == 0 || test_mode, SeedError::TestPresetNotAllowed);
    Ok(())
}

#[cfg(test)]
mod preset_tests {
    use super::{check_presets, derive_target};
    const CAPS: [u64; 4] = [5_000_000, 10_000_000, 15_000_000, 20_000_000];   // $50K, $100K, $150K, $200K in cents
    fn code<T>(r: anchor_lang::Result<T>) -> String { match r { Ok(_) => "ok".into(), Err(e) => format!("{e:?}") } }

    #[test] fn every_preset_at_0_15_and_50_percent_team_at_100_150_and_250_dollars() {
        for &cap in &CAPS { for &team in &[0u16, 1500, 5000] { for &px in &[10_000u64, 15_000, 25_000] {
            let (lamports, cents) = derive_target(cap, team, 9, px).unwrap();
            let want_cents = cap * (10_000 - team as u64) / 10_000 / 2;
            assert_eq!(cents, want_cents, "cap {cap} team {team}: target is cap × (1 − team) ÷ 2");
            assert_eq!(lamports, want_cents * 1_000_000_000 / px, "priced in lamports at ${}", px / 100);
            assert_eq!(derive_target(cap, team, 6, 100).unwrap(), (want_cents * 10_000, want_cents), "a USDC raise: the same dollars at $1, 6 decimals");
            // an allowed pair: a tokenized stock at $250 with 8 decimals
            assert_eq!(derive_target(cap, team, 8, 25_000).unwrap(), (want_cents * 100_000_000 / 25_000, want_cents), "a $250 stock token, 8 decimals");
        } } }
        // Josh's example: $100K, 15% team, $150 a SOL → $42,500 → 283.333… SOL
        assert_eq!(derive_target(10_000_000, 1500, 9, 15_000).unwrap(), (283_333_333_333, 4_250_000));
        assert_eq!(derive_target(5_000_000, 0, 9, 10_000).unwrap().0, 250_000_000_000, "$50K, no team, $100: 250 SOL");
        assert_eq!(derive_target(20_000_000, 5000, 9, 25_000).unwrap().0, 200_000_000_000, "$200K, half to the team, $250: 200 SOL");
    }
    #[test] fn a_hundred_percent_team_share_has_nothing_to_raise() { assert!(code(derive_target(10_000_000, 10_000, 9, 15_000)).contains("BadTeamShare")); }
    #[test] fn the_test_preset_is_tiny() { assert_eq!(derive_target(3_000, 1500, 9, 10_500).unwrap(), (121_428_571, 1_275), "$30, 15% team, $105: $12.75, 0.121 SOL"); }
    #[test] fn a_pair_without_a_price_cannot_size_a_raise() { assert!(code(derive_target(10_000_000, 0, 6, 0)).contains("BadPairFeed")); }
    #[test] fn presets_must_ascend_and_be_set() {
        assert!(check_presets(&CAPS, 0, false).is_ok());
        assert!(code(check_presets(&[5_000_000, 10_000_000, 10_000_000, 20_000_000], 0, false)).contains("BadConfig"));
        assert!(code(check_presets(&[0, 10_000_000, 15_000_000, 20_000_000], 0, false)).contains("BadConfig"));
    }
    #[cfg(not(feature = "devnet"))]
    #[test] fn the_mainnet_build_refuses_a_test_preset_whatever_the_mode() {
        assert!(code(check_presets(&CAPS, 3_000, true)).contains("TestPresetNotAllowed"));
        assert!(code(check_presets(&CAPS, 3_000, false)).contains("TestPresetNotAllowed"));
        assert!(code(check_presets(&CAPS, 1, true)).contains("TestPresetNotAllowed"));
    }
    #[cfg(feature = "devnet")]
    #[test] fn the_devnet_build_allows_a_test_preset_only_in_test_mode() {
        assert!(check_presets(&CAPS, 3_000, true).is_ok());
        assert!(code(check_presets(&CAPS, 3_000, false)).contains("TestPresetNotAllowed"));
    }
}

/// The team share and its unlocks, checked at opening. Any share under 100%. With a share: exactly one shape, either dated
/// tranches (each with a share, in increasing order, summing to exactly 100% of the team share, at most MAX_TRANCHES) or an
/// even schedule (at least one unlock, at least a day apart). No minimum length, no maximum, no cap on a slice. Without a
/// share: no schedule at all.
pub fn check_schedule(team_bps: u16, tranches: &[crate::state::Tranche], even: Option<&crate::state::EvenUnlocks>) -> anchor_lang::Result<()> {
    use anchor_lang::prelude::*;
    use crate::errors::SeedError;
    use crate::state::{BPS, MAX_TRANCHES};
    require!((team_bps as u64) < BPS, SeedError::BadTeamShare);
    if team_bps == 0 { require!(tranches.is_empty() && even.is_none(), SeedError::BadSchedule); return Ok(()); }
    match (tranches.is_empty(), even) {
        (false, None) => {
            require!(tranches.len() <= MAX_TRANCHES && tranches.iter().all(|t| t.bps > 0), SeedError::BadSchedule);
            require!(tranches.windows(2).all(|w| w[0].day_offset < w[1].day_offset), SeedError::ScheduleOrder);
            require!(tranches.iter().map(|t| t.bps as u64).sum::<u64>() == BPS, SeedError::ScheduleSum);
        }
        (true, Some(e)) => require!(e.interval_days >= 1 && e.count >= 1, SeedError::BadSchedule),
        _ => return Err(SeedError::BadSchedule.into()),
    }
    Ok(())
}

/// the share of the team tokens unlocked `days` after seeding: the tranches due, or the even schedule's unlocks so far,
/// floor(passed × 10000 / count): each unlock differs from the next by at most one basis point and the last lands on 100%
pub fn unlocked_bps(days: i64, tranches: &[crate::state::Tranche], even: Option<&crate::state::EvenUnlocks>) -> u64 {
    use crate::state::BPS;
    if let Some(e) = even {
        if days < e.cliff_days as i64 || e.count == 0 { return 0; }
        let passed = (((days - e.cliff_days as i64) / e.interval_days.max(1) as i64) as u64).min(e.count as u64);
        return passed * BPS / e.count as u64;   // even to the basis point: floor(passed × 10000 / count), exactly 10000 at the last
    }
    tranches.iter().filter(|t| (t.day_offset as i64) <= days).map(|t| t.bps as u64).sum()
}

#[cfg(test)]
mod schedule_tests {
    use super::{check_schedule, unlocked_bps};
    use crate::state::{EvenUnlocks, Tranche};
    fn tr(v: &[(u32, u16)]) -> Vec<Tranche> { v.iter().map(|&(d, b)| Tranche { day_offset: d, bps: b }).collect() }
    fn even(cliff_days: u32, interval_days: u32, count: u16) -> EvenUnlocks { EvenUnlocks { cliff_days, interval_days, count } }
    fn code(r: anchor_lang::Result<()>) -> String { match r { Ok(()) => "ok".into(), Err(e) => format!("{e:?}") } }

    #[test] fn no_team_share_means_no_schedule() {
        assert!(check_schedule(0, &[], None).is_ok());
        assert!(code(check_schedule(0, &tr(&[(0, 10000)]), None)).contains("BadSchedule"));
        assert!(code(check_schedule(0, &[], Some(&even(0, 30, 12)))).contains("BadSchedule"));
    }
    #[test] fn ninety_nine_percent_all_at_seeding_is_fine() {
        assert!(check_schedule(9900, &tr(&[(0, 10000)]), None).is_ok());
        assert_eq!(unlocked_bps(0, &tr(&[(0, 10000)]), None), 10000, "everything at seeding");
    }
    #[test] fn a_hundred_percent_is_not() { assert!(code(check_schedule(10000, &tr(&[(0, 10000)]), None)).contains("BadTeamShare")); }
    #[test] fn daily_weekly_monthly_with_and_without_a_cliff() {
        for (e, first, last) in [(even(0, 1, 90), 1, 90), (even(0, 7, 8), 7, 56), (even(0, 30, 12), 30, 360), (even(90, 1, 30), 91, 120), (even(90, 7, 52), 97, 454), (even(90, 30, 12), 120, 450)] {
            assert!(check_schedule(1500, &[], Some(&e)).is_ok());
            assert_eq!(unlocked_bps(first as i64 - 1, &[], Some(&e)), 0, "nothing before the first unlock");
            assert_eq!(unlocked_bps(first as i64, &[], Some(&e)), 10000 / e.count as u64, "one slice at the first unlock");
            assert_eq!(unlocked_bps(last as i64 - 1, &[], Some(&e)), 10000 * (e.count as u64 - 1) / e.count as u64, "all but the last before the last");
            assert_eq!(unlocked_bps(last as i64, &[], Some(&e)), 10000, "the remainder goes with the last, so exactly 100%");
            assert_eq!(unlocked_bps(100_000, &[], Some(&e)), 10000);
        }
        assert_eq!(unlocked_bps(89, &[], Some(&even(90, 30, 12))), 0, "nothing during the cliff");
        assert_eq!(unlocked_bps(119, &[], Some(&even(90, 30, 12))), 0, "the first slice is one interval after the cliff");
    }
    #[test] fn even_means_even_to_the_basis_point() {
        // 365 daily unlocks: 27 or 28 bps each, never a lump at the end (QA P2-87)
        let e = even(0, 1, 365); let mut prev = 0;
        for k in 1..=365 { let now = unlocked_bps(k, &[], Some(&e)); assert!(now - prev == 27 || now - prev == 28, "day {k}: {} bps", now - prev); prev = now; }
        assert_eq!(prev, 10000);
        // more unlocks than basis points: some unlocks release nothing, none releases a lump
        let e = even(0, 1, 20_000); let mut prev = 0;
        for k in 1..=20_000 { let now = unlocked_bps(k, &[], Some(&e)); assert!(now - prev <= 1); prev = now; }
        assert_eq!(prev, 10000);
    }
    #[test] fn an_even_schedule_needs_an_interval_and_a_count() {
        assert!(code(check_schedule(1000, &[], Some(&even(0, 0, 12)))).contains("BadSchedule"));
        assert!(code(check_schedule(1000, &[], Some(&even(0, 30, 0)))).contains("BadSchedule"));
    }
    #[test] fn custom_tranches_must_sum_to_exactly_100_percent_of_the_share() {
        assert!(check_schedule(1000, &tr(&[(30, 5000), (60, 5000)]), None).is_ok());
        assert!(code(check_schedule(1000, &tr(&[(30, 6000), (60, 6000)]), None)).contains("ScheduleSum"));
        assert!(code(check_schedule(1000, &tr(&[(30, 5000), (60, 4999)]), None)).contains("ScheduleSum"));
        assert!(code(check_schedule(1000, &tr(&[(30, 5000), (60, 0), (90, 5000)]), None)).contains("BadSchedule"), "a slice with no share");
    }
    #[test] fn custom_dates_must_increase() {
        assert!(code(check_schedule(1000, &tr(&[(60, 5000), (30, 5000)]), None)).contains("ScheduleOrder"));
        assert!(code(check_schedule(1000, &tr(&[(30, 5000), (30, 5000)]), None)).contains("ScheduleOrder"));
    }
    #[test] fn one_shape_at_a_time() {
        assert!(code(check_schedule(1000, &tr(&[(0, 10000)]), Some(&even(0, 30, 12)))).contains("BadSchedule"));
        assert!(code(check_schedule(1000, &[], None)).contains("BadSchedule"), "a share with no schedule");
    }
    #[test] fn no_minimum_length() {
        assert!(check_schedule(1000, &tr(&[(1, 10000)]), None).is_ok(), "all on day one");
        assert!(check_schedule(1000, &[], Some(&even(0, 1, 1))).is_ok(), "one unlock, one day in");
    }
}
