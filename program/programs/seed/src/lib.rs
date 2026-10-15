//! Seed: fixed-price raises on Solana that open a locked Meteora DAMM v2 pool.
//!
//! A founder opens a raise (open_raise) with an X attestation; backers buy in (contribute) at one price plus a 1% fee
//! on top; when the target lands the raise is Filled and anyone runs the seeding steps (crank_mint, crank_pool,
//! crank_seed); a raise that misses (settle), is cancelled (cancel_raise) or does not seed in time (timeout_refund)
//! refunds every backer in full (claim_refund). After seeding backers claim their tokens (claim_tokens), anyone claims
//! the pool's fees for the payout wallet and Seed (claim_creator_fees), team tokens unlock on the schedule
//! (claim_vested), the founder can move the payout wallet with a delay (request_payout_change, apply_payout_change),
//! and the admin has exactly two instructions (admin_flag_fraud, admin_approve_takeover).
//!
//! The raise PDA owns everything: the escrow, the token vaults, the pool position NFT. There is no instruction that
//! transfers the position NFT or removes liquidity; the position is permanently locked at creation.
#![allow(clippy::too_many_arguments)]
use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::ID as INSTRUCTIONS_ID;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, SetAuthority, Token, TokenAccount, Transfer};
use anchor_spl::token::spl_token::instruction::AuthorityType;
use anchor_spl::metadata::{self, CreateMetadataAccountsV3, mpl_token_metadata::types::DataV2};

pub mod attest;
pub mod damm;
mod pyth;
pub mod errors;
pub mod events;
pub mod math;
pub mod state;

use errors::SeedError;
use events::*;
use state::*;

declare_id!("8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn");

/// lamports the cranker fronts for the pool, position, vaults and NFT that DAMM creates (about 0.025 SOL of rent);
/// what DAMM does not take comes straight back in the same instruction
pub const POOL_RENT_FRONT: u64 = 50_000_000;

// Meteora DAMM v2 (cp-amm), the same id on mainnet and devnet; the three CPIs Seed sends are in damm.rs
pub const DAMM_PROGRAM: Pubkey = damm::PROGRAM;
pub const DAMM_POOL_AUTHORITY: Pubkey = damm::POOL_AUTHORITY;
pub const TOKEN_2022: Pubkey = pubkey!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
pub const WSOL: Pubkey = pubkey!("So11111111111111111111111111111111111111112");
pub const USDC: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
pub const USDC_DEVNET: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConfigParams {
    pub admin: Pubkey, pub attestor: Pubkey, pub seed_treasury: Pubkey, pub sol_feed: Pubkey,
    pub fee_bps: u16, pub creator_share_bps: u16, pub pool_fee_bps: u16, pub cap_usd_cents: u64,
    pub min_deadline: i64, pub max_deadline: i64, pub seed_timeout: i64, pub min_unlock_days: u32, pub payout_delay: i64,
    pub test_mode: bool,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConfigUpdate { pub seed_treasury: Option<Pubkey>, pub attestor: Option<Pubkey> }

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OpenParams {
    pub nonce: u64,
    pub name: String,
    pub ticker: String,
    pub target: u64,          // base units of the pair asset
    pub deadline: i64,        // seconds from now
    pub team_bps: u16,
    pub schedule: Vec<Tranche>,
    pub payout_wallet: Pubkey,
    pub x: Option<XAttest>,   // the X account, when the founder links one at opening
    pub uri: String,          // the token metadata JSON (name, symbol, description, image, links), on permanent storage
}
/// an X attestation: the attestor signed (founder ‖ handle hash ‖ expiry) in the ed25519 instruction just before
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct XAttest { pub handle_hash: [u8; 32], pub expiry: u64 }

#[program]
pub mod seed {
    use super::*;

    /// once. `test_mode` makes a day a minute for deadlines, the seeding timeout, payout changes and unlocks; it is
    /// compiled only into devnet builds (`--features devnet`) and, even there, needs the devnet USDC mint as a witness,
    /// an account that exists on no other cluster. A mainnet build has no code path that sets it.
    pub fn init_config(ctx: Context<InitConfig>, p: ConfigParams) -> Result<()> {
        if p.test_mode {
            #[cfg(not(feature = "devnet"))]
            return Err(SeedError::TestModeNotAllowed.into());
            #[cfg(feature = "devnet")]
            {
                let w = ctx.accounts.devnet_witness.as_ref().ok_or(SeedError::TestModeNotAllowed)?;
                require!(w.key() == USDC_DEVNET && w.decimals == 6, SeedError::TestModeNotAllowed);   // Account<Mint> already checks the owner
            }
        }
        require!(p.fee_bps < 1000 && p.creator_share_bps <= 10_000 && p.pool_fee_bps <= 1000, SeedError::BadConfig);
        let c = &mut ctx.accounts.config;
        c.admin = p.admin; c.pending_admin = Pubkey::default(); c.attestor = p.attestor; c.seed_treasury = p.seed_treasury; c.sol_feed = p.sol_feed;
        c.fee_bps = p.fee_bps; c.creator_share_bps = p.creator_share_bps; c.pool_fee_bps = p.pool_fee_bps; c.cap_usd_cents = p.cap_usd_cents;
        c.min_deadline = p.min_deadline; c.max_deadline = p.max_deadline; c.seed_timeout = p.seed_timeout; c.min_unlock_days = p.min_unlock_days; c.payout_delay = p.payout_delay;
        c.test_mode = p.test_mode; c.bump = ctx.bumps.config;
        Ok(())
    }

    /// the admin may change where Seed's fees go and who signs attestations, nothing else: the fee, the split, the
    /// deadlines and every open raise's terms are out of reach
    pub fn update_config(ctx: Context<AdminConfig>, u: ConfigUpdate) -> Result<()> {
        let c = &mut ctx.accounts.config;
        if let Some(t) = u.seed_treasury { c.seed_treasury = t; }
        if let Some(a) = u.attestor { c.attestor = a; }
        Ok(())
    }

    /// an admin handover in two steps: the admin names the successor, the successor accepts
    pub fn propose_admin(ctx: Context<AdminConfig>, new_admin: Pubkey) -> Result<()> {
        ctx.accounts.config.pending_admin = new_admin;
        Ok(())
    }
    pub fn accept_admin(ctx: Context<AcceptAdmin>) -> Result<()> {
        let c = &mut ctx.accounts.config;
        require!(c.pending_admin != Pubkey::default() && ctx.accounts.new_admin.key() == c.pending_admin, SeedError::NotPendingAdmin);
        c.admin = c.pending_admin; c.pending_admin = Pubkey::default();
        Ok(())
    }

    /// devnet builds only: the admin closes the config so it can be made again with new terms. Reads the admin from
    /// the raw bytes so a config of an older layout can be closed too.
    #[cfg(feature = "devnet")]
    pub fn reset_config(ctx: Context<ResetConfig>) -> Result<()> {
        let cfg = ctx.accounts.config.to_account_info();
        {
            let d = cfg.try_borrow_data()?;
            require!(d.len() >= 40 && Pubkey::try_from(&d[8..40]).unwrap() == ctx.accounts.admin.key(), SeedError::NotAdmin);
        }
        let lamports = cfg.lamports();
        **cfg.try_borrow_mut_lamports()? = 0;
        **ctx.accounts.admin.to_account_info().try_borrow_mut_lamports()? += lamports;
        cfg.assign(&anchor_lang::system_program::ID);
        cfg.resize(0)?;
        Ok(())
    }

    pub fn open_raise(ctx: Context<OpenRaise>, p: OpenParams) -> Result<()> {
        let c = &ctx.accounts.config; let now = Clock::get()?.unix_timestamp; let founder = ctx.accounts.founder.key();
        // the X account is optional. With one, the attestation is checked and the handle must not be blacklisted
        if let Some(x) = &p.x {
            check_attest(&ctx.accounts.instructions.to_account_info(), &c.attestor, &founder, x, now)?;
            let bl = ctx.remaining_accounts.first().ok_or(SeedError::XBlacklistMissing)?;
            require!(bl.key() == blacklist_key(&x.handle_hash) && bl.data_is_empty(), SeedError::Blacklisted);
        }
        require!(ctx.accounts.wallet_blacklist.data_is_empty(), SeedError::Blacklisted);
        // one live raise per wallet: the founder's record names the last one, which must have left Live
        {
            let fs = &mut ctx.accounts.founder_state;
            if fs.wallet == Pubkey::default() { fs.wallet = founder; fs.bump = ctx.bumps.founder_state; }
            if fs.live_raise != Pubkey::default() {
                let prev = ctx.accounts.prev_raise.as_ref().ok_or(SeedError::PrevRaiseMissing)?;
                require!(prev.key() == fs.live_raise, SeedError::PrevRaiseMissing);
                require!(prev.status != RaiseStatus::Live || now >= prev.ends_at, SeedError::OneLiveRaise);
            }
            fs.live_raise = ctx.accounts.raise.key();
        }
        // the terms
        require!(!p.name.is_empty() && p.name.len() <= MAX_NAME && !p.ticker.is_empty() && p.ticker.len() <= MAX_TICKER, SeedError::BadName);
        require!(p.uri.len() <= MAX_URI && (p.uri.starts_with("https://") || p.uri.starts_with("ar://")), SeedError::BadUri);
        // on mainnet the JSON must be on Arweave, where nobody can edit it; a devnet build takes any https:// address
        #[cfg(not(feature = "devnet"))]
        require!(p.uri.starts_with("ar://") || p.uri.starts_with("https://arweave.net/") || p.uri.starts_with("https://gateway.irys.xyz/"), SeedError::BadUri);
        require!(p.target > 0, SeedError::ZeroTarget);
        require!(p.deadline >= c.span(c.min_deadline) && p.deadline <= c.span(c.max_deadline), SeedError::BadDeadline);
        require!((p.team_bps as u64) < BPS, SeedError::BadTeamShare);
        let pair = ctx.accounts.pair_mint.key();
        require!(pair == WSOL || pair == USDC || pair == USDC_DEVNET, SeedError::BadPair);
        let (target_usd_cents, sol_usd_cents) = if pair == WSOL {
            let cents = pyth::sol_usd_cents(&ctx.accounts.sol_feed.to_account_info(), now)?;
            (math::mul_div(p.target, cents, 1_000_000_000).ok_or(SeedError::Overflow)?, cents)   // lamports to cents
        } else { (p.target / 10_000, 0) };                                                                          // USDC base units (6 dp) to cents
        require!(target_usd_cents <= c.cap_usd_cents, SeedError::OverCap);
        if p.team_bps > 0 {
            require!(!p.schedule.is_empty() && p.schedule.len() <= MAX_TRANCHES && p.schedule.iter().all(|t| t.bps > 0), SeedError::BadSchedule);
            let sum: u64 = p.schedule.iter().map(|t| t.bps as u64).sum();
            require!(sum == BPS, SeedError::ScheduleSum);
            let last = p.schedule.iter().map(|t| t.day_offset).max().unwrap_or(0);
            require!(last >= c.min_unlock_days, SeedError::ScheduleTooShort);
        } else { require!(p.schedule.is_empty(), SeedError::BadSchedule); }

        anchor_spl::associated_token::create(CpiContext::new(ctx.accounts.associated_token_program.to_account_info(), anchor_spl::associated_token::Create { payer: ctx.accounts.founder.to_account_info(), associated_token: ctx.accounts.escrow.to_account_info(), authority: ctx.accounts.raise.to_account_info(), mint: ctx.accounts.pair_mint.to_account_info(), system_program: ctx.accounts.system_program.to_account_info(), token_program: ctx.accounts.token_program.to_account_info() }))?;
        let r = &mut ctx.accounts.raise;
        r.founder = founder; r.nonce = p.nonce; r.x_handle_hash = p.x.as_ref().map(|x| x.handle_hash); r.pair_mint = pair;
        r.target = p.target; r.target_usd_cents = target_usd_cents; r.sol_usd_cents = sol_usd_cents; r.time_unit = c.unit();
        r.fee_bps = c.fee_bps; r.creator_share_bps = c.creator_share_bps; r.team_bps = p.team_bps; r.schedule = if p.team_bps > 0 { p.schedule.clone() } else { vec![] };
        r.payout_wallet = p.payout_wallet; r.pending_payout = None; r.payout_effective_at = 0;
        r.status = RaiseStatus::Live; r.seed_step = SeedStep::Filled; r.refund_reason = None;
        r.raised = 0; r.fees_held = 0; r.backers = 0; r.opened_at = now; r.ends_at = now + p.deadline; r.filled_at = 0; r.seeded_at = 0;
        r.mint = Pubkey::default(); r.pool = Pubkey::default(); r.position = Pubkey::default(); r.position_nft_mint = Pubkey::default();
        r.team_claimed = 0; r.blacklisted = false; r.flagged_at = 0; r.takeover_to = None; r.takeover_at = 0;
        r.name = p.name.clone(); r.ticker = p.ticker.clone(); r.bump = ctx.bumps.raise;
        let m = &mut ctx.accounts.raise_meta; m.raise = r.key(); m.uri = p.uri.clone(); m.bump = ctx.bumps.raise_meta;
        emit!(RaiseOpened { raise: r.key(), founder: r.founder, x_handle_hash: r.x_handle_hash, pair_mint: pair, target: p.target, target_usd_cents, sol_usd_cents,
            team_bps: p.team_bps, payout_wallet: p.payout_wallet, opened_at: now, ends_at: r.ends_at, name: p.name, ticker: p.ticker, schedule: r.schedule.clone(), uri: p.uri });
        Ok(())
    }

    /// a buy: `amount` goes into the raise, trimmed to what fits; the fee rides on top and is held beside it
    /// the founder links an X account to a raise that is live, filled or seeded, with the same attestation open_raise takes
    pub fn link_x(ctx: Context<LinkX>, x: XAttest) -> Result<()> {
        let now = Clock::get()?.unix_timestamp; let c = &ctx.accounts.config; let founder = ctx.accounts.founder.key();
        let r = &ctx.accounts.raise;
        require!(r.x_handle_hash.is_none(), SeedError::XAlreadyLinked);
        require!(r.status != RaiseStatus::Refunded, SeedError::RaiseOver);
        check_attest(&ctx.accounts.instructions.to_account_info(), &c.attestor, &founder, &x, now)?;
        let bl = ctx.remaining_accounts.first().ok_or(SeedError::XBlacklistMissing)?;
        require!(bl.key() == blacklist_key(&x.handle_hash) && bl.data_is_empty(), SeedError::Blacklisted);
        let r = &mut ctx.accounts.raise;
        r.x_handle_hash = Some(x.handle_hash);
        emit!(XLinked { raise: r.key(), founder, x_handle_hash: x.handle_hash, at: now });
        Ok(())
    }

    pub fn contribute(ctx: Context<Contribute>, amount: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let r = &mut ctx.accounts.raise;
        require!(r.status == RaiseStatus::Live, SeedError::NotLive);
        require!(!r.blacklisted, SeedError::Flagged);
        require!(now < r.ends_at, SeedError::DeadlinePassed);
        require!(amount > 0, SeedError::ZeroAmount);
        let room = r.room(); require!(room > 0, SeedError::Full);
        let amount = amount.min(room);
        let fee = math::mul_div_ceil(amount, r.fee_bps as u64, BPS).ok_or(SeedError::Overflow)?;
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer { from: ctx.accounts.wallet_token.to_account_info(), to: ctx.accounts.escrow.to_account_info(), authority: ctx.accounts.wallet.to_account_info() }), amount + fee)?;
        // the contribution record: created on the wallet's first buy, added to after
        let raise_key = r.key(); let wallet_key = ctx.accounts.wallet.key(); let ca = ctx.accounts.contribution.to_account_info();
        let mut c = if ca.data_is_empty() {
            let space = 8 + Contribution::INIT_SPACE; let bump = ctx.bumps.contribution; let cs: &[&[u8]] = &[CONTRIB_SEED, raise_key.as_ref(), wallet_key.as_ref(), &[bump]];
            anchor_lang::system_program::create_account(CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info(), anchor_lang::system_program::CreateAccount { from: ctx.accounts.wallet.to_account_info(), to: ca.clone() }, &[cs]), Rent::get()?.minimum_balance(space), space as u64, &crate::ID)?;
            r.backers += 1;
            Contribution { raise: raise_key, wallet: wallet_key, amount: 0, fee: 0, bump }
        } else {
            let c = Contribution::try_deserialize(&mut &ca.data.borrow()[..])?;
            require!(c.raise == raise_key && c.wallet == wallet_key, SeedError::WrongAccount);
            c
        };
        c.amount += amount; c.fee += fee;
        c.try_serialize(&mut &mut ca.data.borrow_mut()[..])?;
        r.raised += amount; r.fees_held += fee;
        emit!(Contributed { raise: r.key(), wallet: ctx.accounts.wallet.key(), amount, fee, raised: r.raised, backers: r.backers, at: now });
        if r.raised >= r.target { r.status = RaiseStatus::Filled; r.seed_step = SeedStep::Filled; r.filled_at = now; emit!(RaiseFilled { raise: r.key(), at: now }); }
        Ok(())
    }

    /// a live raise past its deadline and short of the target refunds; anyone can settle it
    pub fn settle(ctx: Context<RaiseOnly>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp; let r = &mut ctx.accounts.raise;
        require!(r.status == RaiseStatus::Live, SeedError::NotLive);
        require!(now >= r.ends_at, SeedError::DeadlineNotPassed);
        refund(r, RefundReason::Missed, now)
    }

    pub fn cancel_raise(ctx: Context<FounderOnly>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp; let r = &mut ctx.accounts.raise;
        require!(r.status == RaiseStatus::Live, SeedError::NotLive);
        refund(r, RefundReason::Cancelled, now)
    }

    /// a filled raise that has not finished seeding within the timeout refunds; anyone can call it
    pub fn timeout_refund(ctx: Context<RaiseAndConfig>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp; let r = &mut ctx.accounts.raise;
        require!(r.status == RaiseStatus::Filled, SeedError::NotFilled);
        require!(now >= r.filled_at + ctx.accounts.config.span(ctx.accounts.config.seed_timeout), SeedError::TimeoutNotPassed);
        refund(r, RefundReason::Timeout, now)
    }

    /// a backer takes back exactly what they paid, the fee included; the contribution account closes to them
    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp; let r = &ctx.accounts.raise; let c = &ctx.accounts.contribution;
        require!(r.status == RaiseStatus::Refunded, SeedError::NotRefunded);
        let back = c.amount + c.fee; require!(back > 0, SeedError::NothingToClaim);
        let seeds: &[&[u8]] = &[RAISE_SEED, r.founder.as_ref(), &r.nonce.to_le_bytes(), &[r.bump]];
        token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer { from: ctx.accounts.escrow.to_account_info(), to: ctx.accounts.wallet_token.to_account_info(), authority: r.to_account_info() }, &[seeds]), back)?;
        emit!(RefundClaimed { raise: r.key(), wallet: ctx.accounts.wallet.key(), amount: back, at: now });
        Ok(())
    }

    /// seeding, step 1: create the token (6 decimals, no freeze authority), mint the supply into the raise's vaults and
    /// revoke the mint authority. The mint and the vaults are created here by hand, with the raise PDA as their authority.
    pub fn crank_mint(ctx: Context<CrankMint>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let r = &ctx.accounts.raise;
        require!(r.status == RaiseStatus::Filled, SeedError::NotFilled);
        require!(r.seed_step == SeedStep::Filled, SeedError::WrongStep);
        let seeds: &[&[u8]] = &[RAISE_SEED, r.founder.as_ref(), &r.nonce.to_le_bytes(), &[r.bump]];
        let signer = &[seeds];
        let ai = &ctx.accounts; let tp = ai.token_program.to_account_info(); let sp = ai.system_program.to_account_info(); let payer = ai.cranker.to_account_info(); let rent = Rent::get()?;
        let raise_key = r.key(); let auth = r.to_account_info(); let mint = ai.mint.to_account_info();
        let pool_payer = ai.pool_payer.to_account_info();
        // the mint
        anchor_lang::system_program::create_account(CpiContext::new(sp.clone(), anchor_lang::system_program::CreateAccount { from: payer.clone(), to: mint.clone() }), rent.minimum_balance(Mint::LEN), Mint::LEN as u64, &token::ID)?;
        token::initialize_mint2(CpiContext::new(tp.clone(), token::InitializeMint2 { mint: mint.clone() }), TOKEN_DECIMALS, &raise_key, None)?;
        // the vaults: the backers' at the raise's ATA, the pool's and the team's at fixed PDAs. The pool vault and the pair
        // stage belong to the pool payer PDA, because DAMM's `payer` both pays the pool's rent and signs the deposits into it
        anchor_spl::associated_token::create(CpiContext::new(ai.associated_token_program.to_account_info(), anchor_spl::associated_token::Create { payer: payer.clone(), associated_token: ai.backers_vault.to_account_info(), authority: auth.clone(), mint: mint.clone(), system_program: sp.clone(), token_program: tp.clone() }))?;
        for (vault, seed, bump, of, owner) in [
            (ai.pool_vault.to_account_info(), b"pool".as_ref(), ctx.bumps.pool_vault, mint.clone(), pool_payer.clone()),
            (ai.team_vault.to_account_info(), b"team".as_ref(), ctx.bumps.team_vault, mint.clone(), auth.clone()),
            (ai.stage.to_account_info(), b"stage".as_ref(), ctx.bumps.stage, ai.pair_mint.to_account_info(), pool_payer),
        ] {
            let vs: &[&[u8]] = &[seed, raise_key.as_ref(), &[bump]];
            anchor_lang::system_program::create_account(CpiContext::new_with_signer(sp.clone(), anchor_lang::system_program::CreateAccount { from: payer.clone(), to: vault.clone() }, &[vs]), rent.minimum_balance(TokenAccount::LEN), TokenAccount::LEN as u64, &token::ID)?;
            token::initialize_account3(CpiContext::new(tp.clone(), token::InitializeAccount3 { account: vault, mint: of, authority: owner }))?;
        }
        for (to, n) in [(ai.backers_vault.to_account_info(), r.backers_units()), (ai.pool_vault.to_account_info(), r.pool_units()), (ai.team_vault.to_account_info(), r.team_units())] {
            if n == 0 { continue; }
            token::mint_to(CpiContext::new_with_signer(tp.clone(), token::MintTo { mint: mint.clone(), to, authority: auth.clone() }, signer), n)?;
        }
        // the token's metadata: the name and ticker the raise opened with and the URI fixed then, immutable from the start
        metadata::create_metadata_accounts_v3(CpiContext::new_with_signer(ai.token_metadata_program.to_account_info(), CreateMetadataAccountsV3 {
            metadata: ai.metadata.to_account_info(), mint: mint.clone(), mint_authority: auth.clone(), payer: payer.clone(), update_authority: auth.clone(), system_program: sp.clone(), rent: ai.rent.to_account_info() }, signer),
            DataV2 { name: r.name.clone(), symbol: r.ticker.clone(), uri: ai.raise_meta.uri.clone(), seller_fee_basis_points: 0, creators: None, collection: None, uses: None }, false, true, None)?;
        token::set_authority(CpiContext::new_with_signer(tp.clone(), SetAuthority { account_or_mint: mint.clone(), current_authority: auth.clone() }, signer), AuthorityType::MintTokens, None)?;
        let r = &mut ctx.accounts.raise;
        r.mint = ctx.accounts.mint.key(); r.seed_step = SeedStep::Minted;
        emit!(RaiseMinted { raise: r.key(), mint: r.mint, at: now });
        Ok(())
    }

    /// seeding, step 2: open the DAMM v2 pool with the whole raise and the pool tokens at the raise price, and lock the
    /// position for good. The position NFT lands in an account owned by the raise PDA, which no instruction can move.
    pub fn crank_pool(ctx: Context<CrankPool>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let r = &ctx.accounts.raise; let cfg = &ctx.accounts.config;
        require!(r.status == RaiseStatus::Filled, SeedError::NotFilled);
        require!(r.seed_step == SeedStep::Minted, SeedError::WrongStep);
        let a = ctx.accounts.pool_vault.amount; let b = r.raised;   // token A: the new token; token B: the pair asset
        require!(a > 0 && b > 0, SeedError::ZeroAmount);
        let sqrt_price = math::init_sqrt_price(a, b);
        let liquidity = math::init_liquidity(a, b, sqrt_price);
        let seeds: &[&[u8]] = &[RAISE_SEED, r.founder.as_ref(), &r.nonce.to_le_bytes(), &[r.bump]];
        let signer = &[seeds];
        let params = damm::InitializeCustomizablePoolParameters {
            pool_fees: damm::PoolFeeParameters { base_fee: math::flat_base_fee(cfg.pool_fee_bps), compounding_fee_bps: 0, padding: 0, dynamic_fee: None },
            sqrt_min_price: math::MIN_SQRT_PRICE, sqrt_max_price: math::MAX_SQRT_PRICE, has_alpha_vault: false, liquidity, sqrt_price,
            activation_type: 1,      // timestamp
            collect_fee_mode: 1,     // OnlyB: fees in the pair asset
            activation_point: None,  // live at once
        };
        let ai = &ctx.accounts;
        let (raise_ai, tp, sp, prog, ev) = (ai.raise.to_account_info(), ai.token_program.to_account_info(), ai.system_program.to_account_info(), ai.cp_amm_program.to_account_info(), ai.damm_event_authority.to_account_info());
        let (cranker, pool_payer, stage) = (ai.cranker.to_account_info(), ai.pool_payer.to_account_info(), ai.stage.to_account_info());
        let raise_key = ai.raise.key();
        let ps: &[&[u8]] = &[b"payer", raise_key.as_ref(), &[ctx.bumps.pool_payer]];
        let both = &[seeds, ps];
        // DAMM's payer pays the pool's rent and signs the deposits, so it is the pool payer PDA, which owns the pool vault and
        // the stage: the raise is the pool's creator and the position's owner. The pair side moves from the escrow to the stage
        // first; the cranker fronts the rent and gets the change back after
        token::transfer(CpiContext::new_with_signer(tp.clone(), Transfer { from: ai.escrow.to_account_info(), to: stage.clone(), authority: raise_ai.clone() }, signer), b)?;
        let fronted = POOL_RENT_FRONT;
        anchor_lang::system_program::transfer(CpiContext::new(sp.clone(), anchor_lang::system_program::Transfer { from: cranker.clone(), to: pool_payer.clone() }), fronted)?;
        damm::initialize_customizable_pool(damm::InitPoolAccounts {
            creator: &raise_ai, position_nft_mint: &ai.position_nft_mint.to_account_info(), position_nft_account: &ai.position_nft_account.to_account_info(), payer: &pool_payer,
            pool_authority: &ai.pool_authority.to_account_info(), pool: &ai.pool.to_account_info(), position: &ai.position.to_account_info(), token_a_mint: &ai.mint.to_account_info(), token_b_mint: &ai.pair_mint.to_account_info(),
            token_a_vault: &ai.token_a_vault.to_account_info(), token_b_vault: &ai.token_b_vault.to_account_info(), payer_token_a: &ai.pool_vault.to_account_info(), payer_token_b: &stage,
            token_a_program: &tp, token_b_program: &tp, token_2022_program: &ai.token_2022_program.to_account_info(), system_program: &sp, event_authority: &ev, program: &prog,
        }, params, both)?;
        damm::permanent_lock_position(damm::LockAccounts { pool: &ai.pool.to_account_info(), position: &ai.position.to_account_info(), position_nft_account: &ai.position_nft_account.to_account_info(), signer: &raise_ai, event_authority: &ev, program: &prog }, liquidity, signer)?;
        // the change: whatever rent DAMM did not take goes back to the cranker, and any pair dust the deposit rounded off goes back to the escrow
        let left = pool_payer.lamports();
        if left > 0 { anchor_lang::system_program::transfer(CpiContext::new_with_signer(sp.clone(), anchor_lang::system_program::Transfer { from: pool_payer.clone(), to: cranker.clone() }, &[ps]), left)?; }
        ctx.accounts.stage.reload()?;
        let dust = ctx.accounts.stage.amount;
        if dust > 0 { token::transfer(CpiContext::new_with_signer(tp.clone(), Transfer { from: stage.clone(), to: ctx.accounts.escrow.to_account_info(), authority: pool_payer.clone() }, &[ps]), dust)?; }
        let r = &mut ctx.accounts.raise;
        r.pool = ctx.accounts.pool.key(); r.position = ctx.accounts.position.key(); r.position_nft_mint = ctx.accounts.position_nft_mint.key(); r.seed_step = SeedStep::Pooled;
        emit!(RaisePooled { raise: r.key(), pool: r.pool, position: r.position, at: now });
        Ok(())
    }

    /// seeding, step 3: the raise is seeded; the held fees go to Seed, claims open, the unlock clock starts
    pub fn crank_seed(ctx: Context<CrankSeed>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let r = &ctx.accounts.raise;
        require!(r.status == RaiseStatus::Filled, SeedError::NotFilled);
        require!(r.seed_step == SeedStep::Pooled, SeedError::WrongStep);
        let seeds: &[&[u8]] = &[RAISE_SEED, r.founder.as_ref(), &r.nonce.to_le_bytes(), &[r.bump]];
        // everything left in the escrow: the 1% fee, plus the few units of the pair asset the pool deposit rounded off
        // (sent back from the stage at step 2); from here on the escrow holds trading fees only
        let fees = ctx.accounts.escrow.amount;
        if fees > 0 { token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer { from: ctx.accounts.escrow.to_account_info(), to: ctx.accounts.treasury_token.to_account_info(), authority: r.to_account_info() }, &[seeds]), fees)?; }
        let r = &mut ctx.accounts.raise;
        r.fees_held = 0; r.status = RaiseStatus::Seeded; r.seed_step = SeedStep::Seeded; r.seeded_at = now;
        emit!(RaiseSeeded { raise: r.key(), at: now });
        Ok(())
    }

    /// a backer's tokens: their share of the raise applied to the backers' half; the contribution account closes to them
    pub fn claim_tokens(ctx: Context<ClaimTokens>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp; let r = &ctx.accounts.raise; let c = &ctx.accounts.contribution;
        require!(r.status == RaiseStatus::Seeded, SeedError::NotSeeded);
        let tokens = math::mul_div(c.amount, r.backers_units(), r.target).ok_or(SeedError::Overflow)?;
        require!(tokens > 0, SeedError::NothingToClaim);
        let seeds: &[&[u8]] = &[RAISE_SEED, r.founder.as_ref(), &r.nonce.to_le_bytes(), &[r.bump]];
        token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer { from: ctx.accounts.backers_vault.to_account_info(), to: ctx.accounts.wallet_token.to_account_info(), authority: r.to_account_info() }, &[seeds]), tokens)?;
        emit!(TokensClaimed { raise: r.key(), wallet: ctx.accounts.wallet.key(), tokens, at: now });
        Ok(())
    }

    /// the pool's fees, claimed by anyone: the position pays the raise's pair account, then the founder's share goes to
    /// the payout wallet and the rest to Seed. The split was fixed at opening.
    pub fn claim_creator_fees(ctx: Context<ClaimCreatorFees>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let r = &ctx.accounts.raise;
        require!(r.status == RaiseStatus::Seeded, SeedError::NotSeeded);
        let seeds: &[&[u8]] = &[RAISE_SEED, r.founder.as_ref(), &r.nonce.to_le_bytes(), &[r.bump]];
        let signer = &[seeds];
        let ai = &ctx.accounts; let tp = ai.token_program.to_account_info();
        damm::claim_position_fee(damm::ClaimFeeAccounts {
            pool_authority: &ai.pool_authority.to_account_info(), pool: &ai.pool.to_account_info(), position: &ai.position.to_account_info(), token_a_account: &ai.pool_vault.to_account_info(), token_b_account: &ai.escrow.to_account_info(),
            token_a_vault: &ai.token_a_vault.to_account_info(), token_b_vault: &ai.token_b_vault.to_account_info(), token_a_mint: &ai.mint.to_account_info(), token_b_mint: &ai.pair_mint.to_account_info(), position_nft_account: &ai.position_nft_account.to_account_info(),
            signer: &ai.raise.to_account_info(), token_a_program: &tp, token_b_program: &tp, event_authority: &ai.damm_event_authority.to_account_info(), program: &ai.cp_amm_program.to_account_info(),
        }, signer)?;
        ctx.accounts.escrow.reload()?;
        let total = ctx.accounts.escrow.amount;   // after seeding the escrow holds only fees
        require!(total > 0, SeedError::NothingToClaim);
        let founder = math::mul_div(total, r.creator_share_bps as u64, BPS).ok_or(SeedError::Overflow)?; let seed = total - founder;
        if founder > 0 { token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer { from: ctx.accounts.escrow.to_account_info(), to: ctx.accounts.payout_token.to_account_info(), authority: r.to_account_info() }, signer), founder)?; }
        if seed > 0 { token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer { from: ctx.accounts.escrow.to_account_info(), to: ctx.accounts.treasury_token.to_account_info(), authority: r.to_account_info() }, signer), seed)?; }
        emit!(FeesClaimed { raise: r.key(), by: ctx.accounts.cranker.key(), founder, seed, at: now });
        Ok(())
    }

    /// the team's unlocked tokens, to the payout wallet; anyone can send it
    pub fn claim_vested(ctx: Context<ClaimVested>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let r = &ctx.accounts.raise;
        require!(r.status == RaiseStatus::Seeded, SeedError::NotSeeded);
        let due = r.unlocked_units(now).saturating_sub(r.team_claimed).min(ctx.accounts.team_vault.amount);
        require!(due > 0, SeedError::NothingToClaim);
        let seeds: &[&[u8]] = &[RAISE_SEED, r.founder.as_ref(), &r.nonce.to_le_bytes(), &[r.bump]];
        token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer { from: ctx.accounts.team_vault.to_account_info(), to: ctx.accounts.payout_token.to_account_info(), authority: r.to_account_info() }, &[seeds]), due)?;
        let r = &mut ctx.accounts.raise; r.team_claimed += due;
        emit!(VestedClaimed { raise: r.key(), tokens: due, at: now });
        Ok(())
    }

    pub fn request_payout_change(ctx: Context<FounderOnly>, to: Pubkey) -> Result<()> {
        let now = Clock::get()?.unix_timestamp; let delay = ctx.accounts.config.span(ctx.accounts.config.payout_delay); let r = &mut ctx.accounts.raise;
        require!(r.takeover_to.is_none(), SeedError::NotFounder);   // after a takeover the founder no longer controls the payout
        r.pending_payout = Some(to); r.payout_effective_at = now + delay;
        emit!(PayoutChangeRequested { raise: r.key(), from: r.payout_wallet, to, effective_at: r.payout_effective_at, at: now });
        Ok(())
    }

    pub fn apply_payout_change(ctx: Context<RaiseOnly>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp; let r = &mut ctx.accounts.raise;
        let to = r.pending_payout.ok_or(SeedError::NoChangePending)?;
        require!(now >= r.payout_effective_at, SeedError::ChangeNotDue);
        r.payout_wallet = to; r.pending_payout = None; r.payout_effective_at = 0;
        emit!(PayoutChanged { raise: r.key(), to, at: now });
        Ok(())
    }

    /// admin: the raise is flagged, buying stops, and the founder wallet is blacklisted from opening another, with the
    /// X account too when one is linked (its blacklist account comes as the first remaining account)
    pub fn admin_flag_fraud<'info>(ctx: Context<'_, '_, '_, 'info, AdminFlag<'info>>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp; let r = &mut ctx.accounts.raise;
        r.blacklisted = true; r.flagged_at = now;
        let raise_key = r.key(); let founder = r.founder; let hash = r.x_handle_hash;
        let payer = ctx.accounts.admin.to_account_info(); let sp = ctx.accounts.system_program.to_account_info();
        let wb = ctx.accounts.wallet_blacklist.to_account_info();
        if wb.data_is_empty() { make_blacklist(&wb, founder.to_bytes(), ctx.bumps.wallet_blacklist, raise_key, now, &payer, &sp)?; }
        if let Some(h) = hash {
            let xb = ctx.remaining_accounts.first().ok_or(SeedError::XBlacklistMissing)?;
            let (key, bump) = Pubkey::find_program_address(&[BLACKLIST_SEED, &h], &crate::ID);
            require!(xb.key() == key, SeedError::XBlacklistMissing);
            if xb.data_is_empty() { make_blacklist(xb, h, bump, raise_key, now, &payer, &sp)?; }
        }
        emit!(FraudFlagged { raise: raise_key, founder, x_handle_hash: hash, by: ctx.accounts.admin.key(), at: now });
        Ok(())
    }

    /// admin: creator fees and the remaining unlocks go to a wallet the backers chose
    pub fn admin_approve_takeover(ctx: Context<AdminOnly>, to: Pubkey) -> Result<()> {
        let now = Clock::get()?.unix_timestamp; let r = &mut ctx.accounts.raise;
        let from = r.payout_wallet;
        r.payout_wallet = to; r.pending_payout = None; r.payout_effective_at = 0; r.takeover_to = Some(to); r.takeover_at = now;
        emit!(TakeoverApproved { raise: r.key(), from, to, by: ctx.accounts.admin.key(), at: now });
        Ok(())
    }
}

fn refund(r: &mut Account<Raise>, reason: RefundReason, now: i64) -> Result<()> {
    r.status = RaiseStatus::Refunded; r.refund_reason = Some(reason);
    emit!(RaiseRefunded { raise: r.key(), reason: reason as u8, at: now });
    Ok(())
}

// ---------------------------------------------------------------- helpers
fn check_attest(ix_sysvar: &AccountInfo, attestor: &Pubkey, founder: &Pubkey, x: &XAttest, now: i64) -> Result<()> {
    require!((x.expiry as i64) > now, SeedError::AttestationExpired);
    let msg = attest::expected_message(founder, &x.handle_hash, x.expiry);
    let ix_index = anchor_lang::solana_program::sysvar::instructions::load_current_index_checked(ix_sysvar)?;
    attest::verify(ix_sysvar, ix_index, attestor, &msg)
}
fn blacklist_key(subject: &[u8; 32]) -> Pubkey { Pubkey::find_program_address(&[BLACKLIST_SEED, subject], &crate::ID).0 }
/// a Blacklist account at its PDA, made by hand so the wallet's and the handle's can share one instruction
fn make_blacklist<'info>(acc: &AccountInfo<'info>, subject: [u8; 32], bump: u8, raise: Pubkey, at: i64, payer: &AccountInfo<'info>, sp: &AccountInfo<'info>) -> Result<()> {
    let seeds: &[&[u8]] = &[BLACKLIST_SEED, &subject, &[bump]];
    let space = 8 + Blacklist::INIT_SPACE;
    anchor_lang::system_program::create_account(CpiContext::new_with_signer(sp.clone(), anchor_lang::system_program::CreateAccount { from: payer.clone(), to: acc.clone() }, &[seeds]), Rent::get()?.minimum_balance(space), space as u64, &crate::ID)?;
    Blacklist { subject, raise, at, bump }.try_serialize(&mut &mut acc.try_borrow_mut_data()?[..])?;
    Ok(())
}

// ---------------------------------------------------------------- accounts

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(init, payer = payer, space = 8 + Config::INIT_SPACE, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)] pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    /// the devnet USDC mint, required for test mode and checked by address: it exists on devnet and nowhere else
    pub devnet_witness: Option<Account<'info, Mint>>,
}

#[derive(Accounts)]
pub struct AdminConfig<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ SeedError::NotAdmin)] pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct AcceptAdmin<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)] pub config: Account<'info, Config>,
    pub new_admin: Signer<'info>,
}

#[cfg(feature = "devnet")]
#[derive(Accounts)]
pub struct ResetConfig<'info> {
    /// CHECK: the config PDA, closed by hand so an older layout can go too; the admin is read from its bytes
    #[account(mut, seeds = [CONFIG_SEED], bump)] pub config: UncheckedAccount<'info>,
    #[account(mut)] pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(p: OpenParams)]
pub struct OpenRaise<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)] pub config: Box<Account<'info, Config>>,
    /// CHECK: the Pyth SOL/USD price account the config names; parsed and checked in pyth.rs (unused for a USDC raise)
    #[account(address = config.sol_feed @ SeedError::BadPriceAccount)] pub sol_feed: UncheckedAccount<'info>,
    #[account(init, payer = founder, space = 8 + Raise::INIT_SPACE, seeds = [RAISE_SEED, founder.key().as_ref(), &p.nonce.to_le_bytes()], bump)]
    pub raise: Box<Account<'info, Raise>>,
    #[account(mut)] pub founder: Signer<'info>,
    pub pair_mint: Box<Account<'info, Mint>>,
    /// CHECK: the escrow for buys, the raise PDA's associated token account for the pair asset; created here
    #[account(mut)] pub escrow: UncheckedAccount<'info>,
    /// CHECK: must not exist; admin_flag_fraud creates it for a blacklisted founder wallet
    #[account(seeds = [BLACKLIST_SEED, founder.key().as_ref()], bump)] pub wallet_blacklist: UncheckedAccount<'info>,
    /// the founder's record of its live raise; made the first time
    #[account(init_if_needed, payer = founder, space = 8 + FounderState::INIT_SPACE, seeds = [FOUNDER_SEED, founder.key().as_ref()], bump)] pub founder_state: Box<Account<'info, FounderState>>,
    /// the raise the founder's record names as live, when it names one
    pub prev_raise: Option<Box<Account<'info, Raise>>>,
    #[account(init, payer = founder, space = 8 + RaiseMeta::INIT_SPACE, seeds = [META_SEED, raise.key().as_ref()], bump)] pub raise_meta: Box<Account<'info, RaiseMeta>>,
    /// CHECK: the instructions sysvar, read for the ed25519 instruction before this one
    #[account(address = INSTRUCTIONS_ID)] pub instructions: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LinkX<'info> {
    #[account(mut, has_one = founder @ SeedError::NotFounder)] pub raise: Account<'info, Raise>,
    pub founder: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)] pub config: Account<'info, Config>,
    /// CHECK: the instructions sysvar, read for the ed25519 instruction before this one
    #[account(address = INSTRUCTIONS_ID)] pub instructions: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(mut)] pub raise: Account<'info, Raise>,
    /// CHECK: the wallet's contribution record at seeds ["contrib", raise, wallet]; created on the first buy, read after
    #[account(mut, seeds = [CONTRIB_SEED, raise.key().as_ref(), wallet.key().as_ref()], bump)] pub contribution: UncheckedAccount<'info>,
    #[account(mut)] pub wallet: Signer<'info>,
    #[account(mut, token::mint = raise.pair_mint, token::authority = wallet)] pub wallet_token: Account<'info, TokenAccount>,
    #[account(mut, associated_token::mint = raise.pair_mint, associated_token::authority = raise)] pub escrow: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RaiseOnly<'info> { #[account(mut)] pub raise: Account<'info, Raise> }

#[derive(Accounts)]
pub struct RaiseAndConfig<'info> {
    #[account(mut)] pub raise: Account<'info, Raise>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)] pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct FounderOnly<'info> {
    #[account(mut, has_one = founder @ SeedError::NotFounder)] pub raise: Account<'info, Raise>,
    pub founder: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)] pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    pub raise: Account<'info, Raise>,
    #[account(mut, close = wallet, seeds = [CONTRIB_SEED, raise.key().as_ref(), wallet.key().as_ref()], bump = contribution.bump, has_one = wallet, has_one = raise)]
    pub contribution: Account<'info, Contribution>,
    #[account(mut)] pub wallet: Signer<'info>,
    #[account(mut, token::mint = raise.pair_mint, token::authority = wallet)] pub wallet_token: Account<'info, TokenAccount>,
    #[account(mut, associated_token::mint = raise.pair_mint, associated_token::authority = raise)] pub escrow: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CrankMint<'info> {
    #[account(mut)] pub raise: Account<'info, Raise>,
    #[account(mut)] pub cranker: Signer<'info>,
    /// CHECK: a fresh keypair the cranker signs with; created here as the token's mint
    #[account(mut)] pub mint: Signer<'info>,
    /// CHECK: the raise's associated token account for the mint; created here
    #[account(mut)] pub backers_vault: UncheckedAccount<'info>,
    /// CHECK: the pool's tokens wait here; created here at seeds ["pool", raise], owned by the pool payer
    #[account(mut, seeds = [b"pool", raise.key().as_ref()], bump)] pub pool_vault: UncheckedAccount<'info>,
    /// CHECK: the team's tokens; created here at seeds ["team", raise]
    #[account(mut, seeds = [b"team", raise.key().as_ref()], bump)] pub team_vault: UncheckedAccount<'info>,
    #[account(address = raise.pair_mint @ SeedError::WrongAccount)] pub pair_mint: Account<'info, Mint>,
    /// CHECK: the pair tokens going into the pool wait here; created at seeds ["stage", raise], owned by the pool payer
    #[account(mut, seeds = [b"stage", raise.key().as_ref()], bump)] pub stage: UncheckedAccount<'info>,
    /// CHECK: a PDA with no data that owns the pool vault and the stage and is DAMM's payer; seeds ["payer", raise]
    #[account(seeds = [b"payer", raise.key().as_ref()], bump)] pub pool_payer: UncheckedAccount<'info>,
    #[account(seeds = [META_SEED, raise.key().as_ref()], bump = raise_meta.bump)] pub raise_meta: Account<'info, RaiseMeta>,
    /// CHECK: Token Metadata's PDA for the mint; the metadata program derives and checks it
    #[account(mut)] pub metadata: UncheckedAccount<'info>,
    pub token_metadata_program: Program<'info, metadata::Metadata>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CrankPool<'info> {
    #[account(mut, has_one = mint @ SeedError::WrongAccount, has_one = pair_mint @ SeedError::WrongAccount)] pub raise: Box<Account<'info, Raise>>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)] pub config: Box<Account<'info, Config>>,
    #[account(mut)] pub cranker: Signer<'info>,
    pub mint: Box<Account<'info, Mint>>,
    pub pair_mint: Box<Account<'info, Mint>>,
    #[account(mut, seeds = [b"pool", raise.key().as_ref()], bump)] pub pool_vault: Box<Account<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = pair_mint, associated_token::authority = raise)] pub escrow: Box<Account<'info, TokenAccount>>,
    #[account(mut, seeds = [b"stage", raise.key().as_ref()], bump)] pub stage: Box<Account<'info, TokenAccount>>,
    /// CHECK: the dataless PDA that owns the pool vault and the stage and pays DAMM; seeds ["payer", raise]
    #[account(mut, seeds = [b"payer", raise.key().as_ref()], bump)] pub pool_payer: UncheckedAccount<'info>,
    /// the position NFT's mint: a fresh keypair the cranker signs with
    #[account(mut)] pub position_nft_mint: Signer<'info>,
    /// CHECK: DAMM creates it at its PDA, owned by the raise
    #[account(mut)] pub position_nft_account: UncheckedAccount<'info>,
    /// CHECK: DAMM's fixed pool authority
    #[account(address = DAMM_POOL_AUTHORITY)] pub pool_authority: UncheckedAccount<'info>,
    /// CHECK: DAMM creates and checks the pool PDA
    #[account(mut)] pub pool: UncheckedAccount<'info>,
    /// CHECK: DAMM creates and checks the position PDA
    #[account(mut)] pub position: UncheckedAccount<'info>,
    /// CHECK: DAMM creates the vaults
    #[account(mut)] pub token_a_vault: UncheckedAccount<'info>,
    /// CHECK: DAMM creates the vaults
    #[account(mut)] pub token_b_vault: UncheckedAccount<'info>,
    /// CHECK: DAMM's event authority PDA
    pub damm_event_authority: UncheckedAccount<'info>,
    /// CHECK: the DAMM v2 program
    #[account(address = DAMM_PROGRAM)] pub cp_amm_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    /// CHECK: DAMM asks for it even when neither token uses it
    #[account(address = TOKEN_2022)] pub token_2022_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CrankSeed<'info> {
    #[account(mut)] pub raise: Account<'info, Raise>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)] pub config: Account<'info, Config>,
    #[account(mut, associated_token::mint = raise.pair_mint, associated_token::authority = raise)] pub escrow: Account<'info, TokenAccount>,
    #[account(mut, token::mint = raise.pair_mint, constraint = treasury_token.owner == config.seed_treasury @ SeedError::WrongAccount)] pub treasury_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimTokens<'info> {
    #[account(has_one = mint @ SeedError::WrongAccount)] pub raise: Account<'info, Raise>,
    #[account(mut, close = wallet, seeds = [CONTRIB_SEED, raise.key().as_ref(), wallet.key().as_ref()], bump = contribution.bump, has_one = wallet, has_one = raise)]
    pub contribution: Account<'info, Contribution>,
    #[account(mut)] pub wallet: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut, token::mint = mint, token::authority = wallet)] pub wallet_token: Account<'info, TokenAccount>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = raise)] pub backers_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimCreatorFees<'info> {
    #[account(mut, has_one = mint @ SeedError::WrongAccount, has_one = pair_mint @ SeedError::WrongAccount, has_one = pool @ SeedError::WrongAccount, has_one = position @ SeedError::WrongAccount)]
    pub raise: Box<Account<'info, Raise>>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)] pub config: Box<Account<'info, Config>>,
    #[account(mut)] pub cranker: Signer<'info>,
    pub mint: Box<Account<'info, Mint>>,
    pub pair_mint: Box<Account<'info, Mint>>,
    #[account(mut, seeds = [b"pool", raise.key().as_ref()], bump)] pub pool_vault: Box<Account<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = pair_mint, associated_token::authority = raise)] pub escrow: Box<Account<'info, TokenAccount>>,
    /// CHECK: the payout wallet as the raise names it
    #[account(address = raise.payout_wallet @ SeedError::WrongAccount)] pub payout_wallet: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = pair_mint, associated_token::authority = payout_wallet)] pub payout_token: Box<Account<'info, TokenAccount>>,
    #[account(mut, token::mint = pair_mint, constraint = treasury_token.owner == config.seed_treasury @ SeedError::WrongAccount)] pub treasury_token: Box<Account<'info, TokenAccount>>,
    /// CHECK: DAMM's fixed pool authority
    #[account(address = DAMM_POOL_AUTHORITY)] pub pool_authority: UncheckedAccount<'info>,
    /// CHECK: checked against the raise
    #[account(mut)] pub pool: UncheckedAccount<'info>,
    /// CHECK: checked against the raise
    #[account(mut)] pub position: UncheckedAccount<'info>,
    /// CHECK: the raise's position NFT account; DAMM checks it holds the NFT and that the raise owns it
    pub position_nft_account: UncheckedAccount<'info>,
    /// CHECK: DAMM checks the vaults against the pool
    #[account(mut)] pub token_a_vault: UncheckedAccount<'info>,
    /// CHECK: DAMM checks the vaults against the pool
    #[account(mut)] pub token_b_vault: UncheckedAccount<'info>,
    /// CHECK: DAMM's event authority PDA
    pub damm_event_authority: UncheckedAccount<'info>,
    /// CHECK: the DAMM v2 program
    #[account(address = DAMM_PROGRAM)] pub cp_amm_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimVested<'info> {
    #[account(mut, has_one = mint @ SeedError::WrongAccount)] pub raise: Account<'info, Raise>,
    #[account(mut)] pub cranker: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut, seeds = [b"team", raise.key().as_ref()], bump)] pub team_vault: Account<'info, TokenAccount>,
    /// CHECK: the payout wallet as the raise names it
    #[account(address = raise.payout_wallet @ SeedError::WrongAccount)] pub payout_wallet: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = payout_wallet)] pub payout_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(mut)] pub raise: Account<'info, Raise>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ SeedError::NotAdmin)] pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct AdminFlag<'info> {
    #[account(mut)] pub raise: Account<'info, Raise>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ SeedError::NotAdmin)] pub config: Account<'info, Config>,
    #[account(mut)] pub admin: Signer<'info>,
    /// CHECK: the founder wallet's blacklist account at seeds ["blacklist", founder]; created here if it does not exist
    #[account(mut, seeds = [BLACKLIST_SEED, raise.founder.as_ref()], bump)] pub wallet_blacklist: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
