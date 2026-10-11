//! The three DAMM v2 (cp-amm) instructions Seed sends, built by hand from the program's IDL (idls/cp_amm.json) so the
//! binary carries only these and not the whole generated interface. Discriminators and layouts are the IDL's; the
//! account order is the IDL's too. The rest of DAMM is never called.
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::{AccountMeta, Instruction}, program::invoke_signed};

pub const PROGRAM: Pubkey = pubkey!("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG");
pub const POOL_AUTHORITY: Pubkey = pubkey!("HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC");
const INIT_CUSTOMIZABLE_POOL: [u8; 8] = [20, 161, 241, 24, 189, 221, 180, 2];
const PERMANENT_LOCK_POSITION: [u8; 8] = [165, 176, 125, 6, 231, 171, 186, 213];
const CLAIM_POSITION_FEE: [u8; 8] = [180, 38, 154, 17, 133, 33, 162, 211];

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DynamicFeeParameters { pub bin_step: u16, pub bin_step_u128: u128, pub filter_period: u16, pub decay_period: u16, pub reduction_factor: u16, pub max_volatility_accumulator: u32, pub variable_fee_control: u32 }
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PoolFeeParameters { pub base_fee: [u8; 27], pub compounding_fee_bps: u16, pub padding: u8, pub dynamic_fee: Option<DynamicFeeParameters> }
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeCustomizablePoolParameters { pub pool_fees: PoolFeeParameters, pub sqrt_min_price: u128, pub sqrt_max_price: u128, pub has_alpha_vault: bool, pub liquidity: u128, pub sqrt_price: u128, pub activation_type: u8, pub collect_fee_mode: u8, pub activation_point: Option<u64> }

fn data(disc: [u8; 8], args: &impl AnchorSerialize) -> Vec<u8> { let mut d = disc.to_vec(); args.serialize(&mut d).unwrap(); d }

pub struct InitPoolAccounts<'a, 'info> {
    pub creator: &'a AccountInfo<'info>, pub position_nft_mint: &'a AccountInfo<'info>, pub position_nft_account: &'a AccountInfo<'info>, pub payer: &'a AccountInfo<'info>,
    pub pool_authority: &'a AccountInfo<'info>, pub pool: &'a AccountInfo<'info>, pub position: &'a AccountInfo<'info>, pub token_a_mint: &'a AccountInfo<'info>, pub token_b_mint: &'a AccountInfo<'info>,
    pub token_a_vault: &'a AccountInfo<'info>, pub token_b_vault: &'a AccountInfo<'info>, pub payer_token_a: &'a AccountInfo<'info>, pub payer_token_b: &'a AccountInfo<'info>,
    pub token_a_program: &'a AccountInfo<'info>, pub token_b_program: &'a AccountInfo<'info>, pub token_2022_program: &'a AccountInfo<'info>, pub system_program: &'a AccountInfo<'info>,
    pub event_authority: &'a AccountInfo<'info>, pub program: &'a AccountInfo<'info>,
}
pub fn initialize_customizable_pool(a: InitPoolAccounts, params: InitializeCustomizablePoolParameters, signer: &[&[&[u8]]]) -> Result<()> {
    let metas = vec![
        AccountMeta::new_readonly(a.creator.key(), true), AccountMeta::new(a.position_nft_mint.key(), true), AccountMeta::new(a.position_nft_account.key(), false), AccountMeta::new(a.payer.key(), true),
        AccountMeta::new_readonly(a.pool_authority.key(), false), AccountMeta::new(a.pool.key(), false), AccountMeta::new(a.position.key(), false), AccountMeta::new_readonly(a.token_a_mint.key(), false), AccountMeta::new_readonly(a.token_b_mint.key(), false),
        AccountMeta::new(a.token_a_vault.key(), false), AccountMeta::new(a.token_b_vault.key(), false), AccountMeta::new(a.payer_token_a.key(), false), AccountMeta::new(a.payer_token_b.key(), false),
        AccountMeta::new_readonly(a.token_a_program.key(), false), AccountMeta::new_readonly(a.token_b_program.key(), false), AccountMeta::new_readonly(a.token_2022_program.key(), false), AccountMeta::new_readonly(a.system_program.key(), false),
        AccountMeta::new_readonly(a.event_authority.key(), false), AccountMeta::new_readonly(a.program.key(), false),
    ];
    let ix = Instruction { program_id: PROGRAM, accounts: metas, data: data(INIT_CUSTOMIZABLE_POOL, &params) };
    invoke_signed(&ix, &[a.creator.clone(), a.position_nft_mint.clone(), a.position_nft_account.clone(), a.payer.clone(), a.pool_authority.clone(), a.pool.clone(), a.position.clone(), a.token_a_mint.clone(), a.token_b_mint.clone(),
        a.token_a_vault.clone(), a.token_b_vault.clone(), a.payer_token_a.clone(), a.payer_token_b.clone(), a.token_a_program.clone(), a.token_b_program.clone(), a.token_2022_program.clone(), a.system_program.clone(), a.event_authority.clone(), a.program.clone()], signer)?;
    Ok(())
}

pub struct LockAccounts<'a, 'info> { pub pool: &'a AccountInfo<'info>, pub position: &'a AccountInfo<'info>, pub position_nft_account: &'a AccountInfo<'info>, pub signer: &'a AccountInfo<'info>, pub event_authority: &'a AccountInfo<'info>, pub program: &'a AccountInfo<'info> }
pub fn permanent_lock_position(a: LockAccounts, liquidity: u128, signer: &[&[&[u8]]]) -> Result<()> {
    let metas = vec![AccountMeta::new(a.pool.key(), false), AccountMeta::new(a.position.key(), false), AccountMeta::new_readonly(a.position_nft_account.key(), false), AccountMeta::new_readonly(a.signer.key(), true), AccountMeta::new_readonly(a.event_authority.key(), false), AccountMeta::new_readonly(a.program.key(), false)];
    let ix = Instruction { program_id: PROGRAM, accounts: metas, data: data(PERMANENT_LOCK_POSITION, &liquidity) };
    invoke_signed(&ix, &[a.pool.clone(), a.position.clone(), a.position_nft_account.clone(), a.signer.clone(), a.event_authority.clone(), a.program.clone()], signer)?;
    Ok(())
}

pub struct ClaimFeeAccounts<'a, 'info> {
    pub pool_authority: &'a AccountInfo<'info>, pub pool: &'a AccountInfo<'info>, pub position: &'a AccountInfo<'info>, pub token_a_account: &'a AccountInfo<'info>, pub token_b_account: &'a AccountInfo<'info>,
    pub token_a_vault: &'a AccountInfo<'info>, pub token_b_vault: &'a AccountInfo<'info>, pub token_a_mint: &'a AccountInfo<'info>, pub token_b_mint: &'a AccountInfo<'info>, pub position_nft_account: &'a AccountInfo<'info>,
    pub signer: &'a AccountInfo<'info>, pub token_a_program: &'a AccountInfo<'info>, pub token_b_program: &'a AccountInfo<'info>, pub event_authority: &'a AccountInfo<'info>, pub program: &'a AccountInfo<'info>,
}
pub fn claim_position_fee(a: ClaimFeeAccounts, signer: &[&[&[u8]]]) -> Result<()> {
    let metas = vec![
        AccountMeta::new_readonly(a.pool_authority.key(), false), AccountMeta::new_readonly(a.pool.key(), false), AccountMeta::new(a.position.key(), false), AccountMeta::new(a.token_a_account.key(), false), AccountMeta::new(a.token_b_account.key(), false),
        AccountMeta::new(a.token_a_vault.key(), false), AccountMeta::new(a.token_b_vault.key(), false), AccountMeta::new_readonly(a.token_a_mint.key(), false), AccountMeta::new_readonly(a.token_b_mint.key(), false), AccountMeta::new_readonly(a.position_nft_account.key(), false),
        AccountMeta::new_readonly(a.signer.key(), true), AccountMeta::new_readonly(a.token_a_program.key(), false), AccountMeta::new_readonly(a.token_b_program.key(), false), AccountMeta::new_readonly(a.event_authority.key(), false), AccountMeta::new_readonly(a.program.key(), false),
    ];
    let ix = Instruction { program_id: PROGRAM, accounts: metas, data: CLAIM_POSITION_FEE.to_vec() };
    invoke_signed(&ix, &[a.pool_authority.clone(), a.pool.clone(), a.position.clone(), a.token_a_account.clone(), a.token_b_account.clone(), a.token_a_vault.clone(), a.token_b_vault.clone(), a.token_a_mint.clone(), a.token_b_mint.clone(), a.position_nft_account.clone(),
        a.signer.clone(), a.token_a_program.clone(), a.token_b_program.clone(), a.event_authority.clone(), a.program.clone()], signer)?;
    Ok(())
}
