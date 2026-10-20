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

/// A target against the terms: its worth in cents (the cap is in dollars) and the SOL price it was measured with. A SOL raise
/// is held to the minimum in lamports, a USDC raise to the minimum's worth in dollars at today's SOL price. If the minimum is
/// ever worth more than the cap, the cap is the minimum, so a raise is always possible (at exactly the cap).
/// `is_sol`: the pair is wSOL; `target`: base units of the pair (lamports, or USDC at 6 decimals); `cents`: today's SOL price.
pub fn check_target(is_sol: bool, target: u64, cents: u64, cap_cents: u64, min_lamports: u64) -> anchor_lang::Result<(u64, u64)> {
    use anchor_lang::prelude::*;
    use crate::errors::SeedError;
    let (target_cents, sol_cents) = if is_sol { (mul_div(target, cents, crate::state::LAMPORTS).ok_or(SeedError::Overflow)?, cents) } else { (target / 10_000, 0) };
    require!(target_cents <= cap_cents, SeedError::OverCap);
    if is_sol { require!(target >= min_lamports || target_cents >= cap_cents, SeedError::TargetBelowMinimum); }
    else {
        let floor_cents = mul_div(min_lamports, cents, crate::state::LAMPORTS).ok_or(SeedError::Overflow)?.min(cap_cents);
        require!(target_cents >= floor_cents, SeedError::TargetBelowMinimum);
    }
    Ok((target_cents, sol_cents))
}

/* The minimum raise, proven on every build: `cargo test` (the mainnet build) and `cargo test --features devnet` run the same
   cases, since the floor is a config value the binary applies the same way whatever features it was built with. */
#[cfg(test)]
mod target_tests {
    use super::check_target;
    const CAP: u64 = 10_000_000;          // $100,000 in cents
    const MIN: u64 = 81_000_000_000;      // 81 SOL
    const SOL: u64 = 1_000_000_000;
    const PX: u64 = 15_000;               // $150.00
    fn code(r: anchor_lang::Result<(u64, u64)>) -> String { match r { Ok(_) => "ok".into(), Err(e) => format!("{e:?}") } }

    #[test] fn sol_80_99_is_refused() { assert!(code(check_target(true, 80_990_000_000, PX, CAP, MIN)).contains("TargetBelowMinimum")); }
    #[test] fn sol_81_opens() { assert_eq!(check_target(true, MIN, PX, CAP, MIN).unwrap(), (81 * 150 * 100, PX)); }
    #[test] fn sol_one_lamport_under_is_refused() { assert!(code(check_target(true, MIN - 1, PX, CAP, MIN)).contains("TargetBelowMinimum")); }
    #[test] fn usdc_meets_the_minimum_in_dollars_at_the_price() {
        // 81 SOL at $150 is $12,150: a cent under is refused, exactly it opens
        assert!(code(check_target(false, 12_149_990_000, PX, CAP, MIN)).contains("TargetBelowMinimum"));
        assert_eq!(check_target(false, 12_150_000_000, PX, CAP, MIN).unwrap(), (1_215_000, 0));
        // at $200 the same dollars no longer do
        assert!(code(check_target(false, 12_150_000_000, 20_000, CAP, MIN)).contains("TargetBelowMinimum"));
        assert_eq!(check_target(false, 16_200_000_000, 20_000, CAP, MIN).unwrap(), (1_620_000, 0));
    }
    #[test] fn when_81_sol_is_worth_more_than_the_cap_the_cap_is_the_minimum() {
        let px = 200_000;   // $2,000 a SOL: 81 SOL is $162,000, over the $100,000 cap
        assert_eq!(check_target(true, 50 * SOL, px, CAP, MIN).unwrap(), (CAP, px), "exactly $100,000 of SOL opens");
        assert!(code(check_target(true, 49 * SOL, px, CAP, MIN)).contains("TargetBelowMinimum"), "under the cap is under the minimum");
        assert!(code(check_target(true, 51 * SOL, px, CAP, MIN)).contains("OverCap"));
        assert_eq!(check_target(false, 100_000_000_000, px, CAP, MIN).unwrap(), (CAP, 0), "exactly $100,000 of USDC opens");
        assert!(code(check_target(false, 99_999_990_000, px, CAP, MIN)).contains("TargetBelowMinimum"));
    }
    #[test] fn over_the_cap_is_refused_first() { assert!(code(check_target(true, 1_000 * SOL, PX, CAP, MIN)).contains("OverCap")); }
    #[test] fn a_staging_or_devnet_config_may_carry_a_lower_minimum() {
        let min = 100_000_000;   // 0.1 SOL, the devnet test-mode config
        assert!(code(check_target(true, 99_900_000, PX, CAP, min)).contains("TargetBelowMinimum"));
        assert_eq!(check_target(true, min, PX, CAP, min).unwrap(), (1_500, PX));
        assert!(code(check_target(false, 14_990_000, PX, CAP, min)).contains("TargetBelowMinimum"));   // $14.99 under 0.1 SOL at $150
        assert_eq!(check_target(false, 15_000_000, PX, CAP, min).unwrap(), (1_500, 0));
    }
    #[test] fn the_minimum_is_whatever_the_config_says_and_nothing_else() {
        // the binary carries no number of its own: a config made with 81 SOL refuses 80 and a config made with 82 refuses 81
        assert!(code(check_target(true, 80 * SOL, PX, CAP, 81 * SOL)).contains("TargetBelowMinimum"));
        assert!(code(check_target(true, 81 * SOL, PX, CAP, 82 * SOL)).contains("TargetBelowMinimum"));
        assert!(check_target(true, 82 * SOL, PX, CAP, 82 * SOL).is_ok());
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
