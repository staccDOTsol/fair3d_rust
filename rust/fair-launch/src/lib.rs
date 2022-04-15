pub mod utils;

use {
    crate::utils::{
        assert_data_valid, assert_derivation, assert_initialized, assert_owned_by,
         calculate_withdraw_amount,
        create_or_allocate_account_raw, 
        spl_token_transfer, TokenTransferParams,
    },
    anchor_lang::{
        prelude::*,
        solana_program::{
            program::{invoke, invoke_signed},
            program_pack::Pack,
            system_instruction, system_program,
        },
        AnchorDeserialize, AnchorSerialize,
    },
    anchor_spl::token::{Mint},
    spl_token::{
        instruction::{initialize_account2},
        state::Account,
    },
};

pub const PREFIX: &str = "fair_launch";
pub const TREASURY: &str = "treasury";
pub const MINT: &str = "mint";
pub const LOTTERY: &str = "lottery";
pub const PARTICIPATION: &str = "participation";
pub const ACCOUNT: &str = "account";
pub const MAX_GRANULARITY: u64 = 100;

#[program]
pub mod fair_launch {
    use super::*;
    pub fn initialize_fair_launch<'info>(
        ctx: Context<'_, '_, '_, 'info, InitializeFairLaunch<'info>>,
        bump: u8,
        treasury_bump: u8,
        token_mint_bump: u8,
        data: FairLaunchData,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;

        assert_data_valid(&data)?;
        fair_launch.data = data;
        fair_launch.data.last =  0;

        fair_launch.authority = *ctx.accounts.authority.key;
        fair_launch.bump = bump;
        fair_launch.treasury_bump = treasury_bump;
        fair_launch.token_mint_bump = token_mint_bump;

        fair_launch.token_mint = ctx.accounts.token_mint.key();
        assert_owned_by(&ctx.accounts.token_mint.to_account_info(), &spl_token::id())?; //paranoia

        let token_mint_key = ctx.accounts.token_mint.key();
        let treasury_seeds = &[
            PREFIX.as_bytes(),
            token_mint_key.as_ref(),
            TREASURY.as_bytes(),
        ];
        let treasury_info = &ctx.accounts.treasury;
        fair_launch.treasury = *treasury_info.key;
        assert_derivation(ctx.program_id, treasury_info, treasury_seeds)?;

        let signer_seeds = &[
            PREFIX.as_bytes(),
            token_mint_key.as_ref(),
            TREASURY.as_bytes(),
            &[fair_launch.treasury_bump],
        ];

        if ctx.remaining_accounts.len() > 0 {
            let treasury_mint_info = &ctx.remaining_accounts[0];
            let _treasury_mint: spl_token::state::Mint = assert_initialized(&treasury_mint_info)?;

            assert_owned_by(&treasury_mint_info, &spl_token::id())?;

            fair_launch.treasury_mint = Some(*treasury_mint_info.key);

            if treasury_info.data_len() > 0 {
                return Err(ErrorCode::TreasuryAlreadyExists.into());
            }

            // make the treasury token account

            create_or_allocate_account_raw(
                *ctx.accounts.token_program.key,
                treasury_info,
                &ctx.accounts.rent.to_account_info(),
                &ctx.accounts.system_program,
                &ctx.accounts.payer,
                Account::LEN,
                signer_seeds,
            )?;

            invoke_signed(
                &initialize_account2(
                    &ctx.accounts.token_program.key,
                    treasury_info.key,
                    treasury_mint_info.key,
                    &fair_launch.key(),
                )
                .unwrap(),
                &[
                    ctx.accounts.token_program.clone(),
                    treasury_info.clone(),
                    fair_launch.to_account_info(),
                    treasury_mint_info.clone(),
                    ctx.accounts.rent.to_account_info(),
                ],
                &[signer_seeds],
            )?;
        } else {
            // Nothing to do but check that it does not already exist, we can begin transferring sol to it.
            if !treasury_info.data_is_empty()
                || treasury_info.lamports() > 0
                || treasury_info.owner != ctx.accounts.system_program.key
            {
                return Err(ErrorCode::TreasuryAlreadyExists.into());
            }

            invoke_signed(
                &system_instruction::assign(treasury_info.key, &ctx.program_id),
                &[ctx.accounts.system_program.clone(), treasury_info.clone()],
                &[signer_seeds],
            )?;
        }
        fair_launch.data.phase_one_end = fair_launch.data.phase_one_end.checked_add(fair_launch.data.lottery_duration
            .checked_mul(6)
            .ok_or(ErrorCode::NumericalOverflowError)?).ok_or(ErrorCode::NumericalOverflowError)?;
        
        Ok(())
    }


    pub fn purchase_ticket<'info>(
        ctx: Context<'_, '_, '_, 'info, PurchaseTicket<'info>>,
        bump: u8,

        amount: u64,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        let buyer = &ctx.accounts.buyer;
        let clock = &ctx.accounts.clock;

        if clock.unix_timestamp > fair_launch.data.phase_one_end
        {
            return Err(ErrorCode::CannotBuyTicketsOutsidePhaseOne.into());
        }


        fair_launch.number_tickets_sold = fair_launch
            .number_tickets_sold
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        
        let charged_amount = amount;

            if buyer.lamports() < charged_amount {
                return Err(ErrorCode::NotEnoughSOL.into());
            }
            if charged_amount <= fair_launch.data.last {
                return Err(ErrorCode::NotEnoughSOL.into());
            }
            fair_launch.data.last = charged_amount;
            invoke(
                &system_instruction::transfer(buyer.key, ctx.accounts.treasury.key, charged_amount),
                &[
                    buyer.clone(),
                    ctx.accounts.treasury.clone(),
                    ctx.accounts.system_program.clone(),
                ],
            )?;
        

        if fair_launch.data.phase_one_end.checked_sub(clock.unix_timestamp).ok_or(ErrorCode::NumericalOverflowError)? < fair_launch.data.lottery_duration{
            fair_launch.data.phase_one_end = clock.unix_timestamp.checked_add(fair_launch.data.lottery_duration).ok_or(ErrorCode::NumericalOverflowError)?;
        }
        fair_launch.authority = *ctx.accounts.buyer.key;
        Ok(())
    }

    pub fn withdraw_funds<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawFunds<'info>>,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        let treasury = &mut ctx.accounts.treasury;
        let authority = &mut ctx.accounts.authority;
        let token_mint = &ctx.accounts.token_mint;
        let clock = &ctx.accounts.clock;

        if fair_launch.data.phase_one_end.checked_sub(clock.unix_timestamp).ok_or(ErrorCode::NumericalOverflowError)? >= 1 {
            return Err(ErrorCode::CannotCashOutUntilPhaseThree.into());
        }

        let mint: spl_token::state::Mint = assert_initialized(token_mint)?;
        let tokens = mint.supply;

        let signer_seeds = [
            PREFIX.as_bytes(),
            &token_mint.key.as_ref(),
            &[fair_launch.bump],
        ];

        if let Some(treasury_mint) = fair_launch.treasury_mint {
            let treasury_mint_info = &ctx.remaining_accounts[0];
            let _treasury_mint: spl_token::state::Mint = assert_initialized(&treasury_mint_info)?;

            let authority_token_account_info = &ctx.remaining_accounts[1];
            let authority_token_account: Account =
                assert_initialized(&authority_token_account_info)?;
            let treasury_account: Account = assert_initialized(treasury)?;

            let token_program = &ctx.remaining_accounts[2];

            if token_program.key != &spl_token::id() {
                return Err(ErrorCode::InvalidTokenProgram.into());
            }

            if *treasury_mint_info.key != treasury_mint {
                return Err(ErrorCode::TreasuryMintMismatch.into());
            }

            assert_owned_by(treasury_mint_info, &token_program.key)?;
            assert_owned_by(authority_token_account_info, &token_program.key)?;
            assert_owned_by(treasury, &token_program.key)?;

            if authority_token_account.mint != *treasury_mint_info.key {
                return Err(ErrorCode::TreasuryMintMismatch.into());
            }

            // assert is an ATA
            assert_derivation(
                &spl_associated_token_account::id(),
                authority_token_account_info,
                &[
                    authority.key.as_ref(),
                    token_program.key.as_ref(),
                    &treasury_mint_info.key.as_ref(),
                ],
            )?;

            if authority_token_account.delegate.is_some() {
                return Err(ErrorCode::AccountShouldHaveNoDelegates.into());
            }

            if authority_token_account.owner != fair_launch.authority {
                return Err(ErrorCode::AccountOwnerShouldBeAuthority.into());
            }

            if fair_launch.treasury_snapshot.is_none() {
                fair_launch.treasury_snapshot = Some(treasury_account.amount)
            }

            let amount = calculate_withdraw_amount(
                &fair_launch.data,
                tokens,
                fair_launch.treasury_snapshot.unwrap(),
                treasury_account.amount,
            )?;

            spl_token_transfer(TokenTransferParams {
                source: treasury.to_account_info(),
                destination: authority_token_account_info.clone(),
                authority: fair_launch.to_account_info(),
                authority_signer_seeds: &signer_seeds,
                token_program: token_program.clone(),
                amount,
            })?;
        } else {
            if fair_launch.treasury_snapshot.is_none() {
                fair_launch.treasury_snapshot = Some(treasury.lamports())
            }

            let amount = calculate_withdraw_amount(
                &fair_launch.data,
                tokens,
                fair_launch.treasury_snapshot.unwrap(),
                treasury.lamports(),
            )?;

            let treasury_signer_seeds = [
                PREFIX.as_bytes(),
                fair_launch.token_mint.as_ref(),
                TREASURY.as_bytes(),
                &[fair_launch.treasury_bump],
            ];

            invoke_signed(
                &system_instruction::transfer(treasury.key, authority.key, amount),
                &[
                    treasury.to_account_info(),
                    authority.clone(),
                    ctx.accounts.system_program.clone(),
                ],
                &[&treasury_signer_seeds],
            )?;
        }

        Ok(())
    }
}
#[derive(Accounts)]
#[instruction(bump: u8, treasury_bump: u8, token_mint_bump: u8, data: FairLaunchData)]
pub struct InitializeFairLaunch<'info> {
    #[account(init, seeds=[PREFIX.as_bytes(), token_mint.key.as_ref()], payer=payer, bump=bump, space=FAIR_LAUNCH_SPACE_VEC_START+8u64.checked_mul((data.price_range_end - data.price_range_start).checked_div(data.tick_size).ok_or(ErrorCode::NumericalOverflowError)?.checked_add(2).ok_or(ErrorCode::NumericalOverflowError)?).ok_or(ErrorCode::NumericalOverflowError)? as usize)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(init, seeds=[PREFIX.as_bytes(), authority.key.as_ref(), MINT.as_bytes(), data.uuid.as_bytes()], mint::authority=fair_launch, mint::decimals=0, payer=payer, bump=token_mint_bump)]
    token_mint: CpiAccount<'info, Mint>,
    #[account(mut)]
    treasury: AccountInfo<'info>,
    #[account(constraint= authority.data_is_empty() && authority.lamports() > 0)]
    authority: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
    // Remaining accounts in this order if using spl tokens for payment:
    // [optional] treasury mint
}

/// Can only update fair launch before phase 1 start.
#[derive(Accounts)]
pub struct UpdateFairLaunch<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(signer)]
    authority: AccountInfo<'info>,
    clock: Sysvar<'info, Clock>,
}

/// Limited Update that only sets phase 3 dates once bitmap is in place and fully setup.
#[derive(Accounts)]
pub struct StartPhaseThree<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority, has_one=token_mint)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), LOTTERY.as_bytes()], constraint=fair_launch_lottery_bitmap.to_account_info().data_len() > 0, bump=fair_launch_lottery_bitmap.bump, has_one=fair_launch)]
    fair_launch_lottery_bitmap: ProgramAccount<'info, FairLaunchLotteryBitmap>,
    #[account(signer)]
    authority: AccountInfo<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.authority.as_ref(), MINT.as_bytes(), fair_launch.data.uuid.as_bytes()], bump=fair_launch.token_mint_bump)]
    token_mint: CpiAccount<'info, Mint>,
}

/// Restarts phase two with as much time as the lottery duration had if duration is passed
#[derive(Accounts)]
pub struct RestartPhaseTwo<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    clock: Sysvar<'info, Clock>,
}

/// Can only create the fair launch lottery bitmap after phase 1 has ended.
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct CreateFairLaunchLotteryBitmap<'info> {
    #[account(seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(init, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), LOTTERY.as_bytes()],  payer=payer, bump=bump, space= FAIR_LAUNCH_LOTTERY_SIZE + (fair_launch.number_tickets_sold.checked_div(8).ok_or(ErrorCode::NumericalOverflowError)? as usize) + 1)]
    fair_launch_lottery_bitmap: ProgramAccount<'info, FairLaunchLotteryBitmap>,
    #[account(signer)]
    authority: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
}

/// Can only set the fair launch lottery bitmap after phase 2 has ended.
#[derive(Accounts)]
pub struct UpdateFairLaunchLotteryBitmap<'info> {
    #[account(seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), LOTTERY.as_bytes()], bump=fair_launch_lottery_bitmap.bump)]
    fair_launch_lottery_bitmap: ProgramAccount<'info, FairLaunchLotteryBitmap>,
    #[account(signer)]
    authority: AccountInfo<'info>,
}

/// Can only purchase a ticket in phase 1.
#[derive(Accounts)]
#[instruction(bump: u8, amount: u64)]
pub struct PurchaseTicket<'info> {

    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=treasury)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut)]
    treasury: AccountInfo<'info>,
    #[account(mut, signer, constraint= buyer.data_is_empty() && buyer.lamports() > 0)]
    buyer: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
    // Remaining accounts in this order if using spl tokens for payment:
    // [Writable/optional] treasury mint
    // [Writable/optional] buyer token account (must be ata)
    // [optional] transfer authority to transfer amount from buyer token account
    // [optional] token program
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority, has_one=treasury)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut)]
    
    clock: Sysvar<'info, Clock>,
    treasury: AccountInfo<'info>,
    #[account(signer, mut)]
    authority: AccountInfo<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.authority.as_ref(), MINT.as_bytes(), fair_launch.data.uuid.as_bytes()], bump=fair_launch.token_mint_bump)]
    token_mint: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    // Remaining accounts in this order if using spl tokens for payment:
    // [Writable/optional] treasury mint
    // [Writable/optional] buyer token account (must be ata)
    // [optional] token program
}


pub const FAIR_LAUNCH_LOTTERY_SIZE: usize = 8 + // discriminator
32 + // fair launch
1 + // bump
8; // size of bitmask ones

pub const FAIR_LAUNCH_SPACE_VEC_START: usize = 8 + // discriminator
32 + // token_mint
32 + // treasury
32 + // authority
1 + // bump
1 + // treasury_bump
1 + // token_mint_bump
4 + 6 + // uuid 
8 + //range start
8 + // range end
8 + // phase one start
8 + // phase one end
8 + // phase two end
8 + // lottery duration
8 + // tick size
8 + // number of tokens
8 + // fee
1 + // anti rug option
2 + // anti rug bp
8 + // anti rug token count
8 + // self destruct date
8 + // number of tickets unseq'ed
8 + // number of tickets sold
8 + // number of tickets dropped
8 + // number of tickets punched 
8 + // number of tokens burned for refunds
8 + // number of tokens preminted
1 + // phase three started
9 + // treasury snapshot
8 + // current_eligible_holders
8 + // current median,
4 + // u32 representing number of amounts in vec so far
1 + // participation modulo (added later)
1 + // participation_mint_bump (added later)
1 + // participation_token_bump (added later)
33 + // participation_mint (added later)
65; // padding

// Note both TokenMetadata/Creator copied over from token metadata due to anchor needing them
// in file to put into IDL
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Creator {
    pub address: Pubkey,
    pub verified: bool,
    // In percentages, NOT basis points ;) Watch out!
    pub share: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct TokenMetadata {
    /// The name of the asset
    pub name: String,
    /// The symbol for the asset
    pub symbol: String,
    /// URI pointing to JSON representing the asset
    pub uri: String,
    /// Royalty basis points that goes to creators in secondary sales (0-10000)
    pub seller_fee_basis_points: u16,
    /// Array of creators, optional
    pub creators: Option<Vec<Creator>>,
    pub is_mutable: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct AntiRugSetting {
    /// basis points kept in the treasury until conditions are met
    pub reserve_bp: u16,
    /// The supply of the fair launch mint must be below this amount
    /// to unlock the reserve
    pub token_requirement: u64,
    /// if you don't meet your promise by this date, pro-rated refunds are allowed
    pub self_destruct_date: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct FairLaunchData {
    pub last: u64,
    pub uuid: String,
    pub price_range_start: u64,
    pub price_range_end: u64,
    pub phase_one_start: i64,
    pub phase_one_end: i64,
    pub phase_two_end: i64,
    pub lottery_duration: i64,
    pub tick_size: u64,
    pub number_of_tokens: u64,
    pub fee: u64,
    pub anti_rug_setting: Option<AntiRugSetting>,
}

#[account]
pub struct FairLaunch {
    pub token_mint: Pubkey,
    pub treasury: Pubkey,
    pub treasury_mint: Option<Pubkey>,
    pub authority: Pubkey,
    pub bump: u8,
    pub treasury_bump: u8,
    pub token_mint_bump: u8,
    pub data: FairLaunchData,
    /// Tickets that are missing a corresponding seq pda. Crank it.
    pub number_tickets_un_seqed: u64,
    /// If I have to explain this, you're an idiot.
    pub number_tickets_sold: u64,
    /// People that withdrew in phase 2 because they dislike you.
    pub number_tickets_dropped: u64,
    /// People who won the lottery and punched ticket in exchange for token. Good job!
    pub number_tickets_punched: u64,
    /// if you go past refund date, here is how many people lost faith in you.
    pub number_tokens_burned_for_refunds: u64,
    /// here is how many tokens you preminted before people had access. SHAME. *bell*
    pub number_tokens_preminted: u64,
    /// Yes.
    pub phase_three_started: bool,
    /// Snapshot of treasury taken on first withdrawal.
    pub treasury_snapshot: Option<u64>,
    pub current_eligible_holders: u64,
    pub current_median: u64,
    pub counts_at_each_tick: Vec<u64>,
    pub participation_modulo: u8,
    pub participation_mint_bump: u8,
    pub participation_token_bump: u8,
    pub participation_mint: Option<Pubkey>,
}

#[account]
pub struct FairLaunchLotteryBitmap {
    pub fair_launch: Pubkey,
    pub bump: u8,
    /// This must be exactly the number of winners and is incremented precisely in each strip addition
    pub bitmap_ones: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum FairLaunchTicketState {
    NoSequenceStruct,
    Unpunched,
    Punched,
    Withdrawn,
}


#[error]
pub enum ErrorCode {
    #[msg("Account does not have correct owner!")]
    IncorrectOwner,
    #[msg("Account is not initialized!")]
    Uninitialized,
    #[msg("Mint Mismatch!")]
    MintMismatch,
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    #[msg("Numerical overflow error")]
    NumericalOverflowError,
    #[msg("Timestamps of phases should line up")]
    TimestampsDontLineUp,
    #[msg("Cant set phase 3 dates yet")]
    CantSetPhaseThreeDatesYet,
    #[msg("Uuid must be exactly of 6 length")]
    UuidMustBeExactly6Length,
    #[msg("Tick size too small")]
    TickSizeTooSmall,
    #[msg("Cannot give zero tokens")]
    CannotGiveZeroTokens,
    #[msg("Invalid price ranges")]
    InvalidPriceRanges,
    #[msg("With this tick size and price range, you will have too many ticks(>" + MAX_GRANULARITY + ") - choose less granularity")]
    TooMuchGranularityInRange,
    #[msg("Cannot use a tick size with a price range that results in a remainder when doing (end-start)/ticksize")]
    CannotUseTickSizeThatGivesRemainder,
    #[msg("Derived key invalid")]
    DerivedKeyInvalid,
    #[msg("Treasury Already Exists")]
    TreasuryAlreadyExists,
    #[msg("The number of ones in the lottery must equal the number of tickets sold in phase 1")]
    LotteryBitmapOnesMustEqualNumberOfTicketsSold,
    #[msg("Amount must be between price ranges and at a tick mark")]
    InvalidPurchaseAmount,
    #[msg("Treasury mint does not match")]
    TreasuryMintMismatch,
    #[msg("Not enough tokens to pay for this minting")]
    NotEnoughTokens,
    #[msg("Not enough SOL to pay for this minting")]
    NotEnoughSOL,
    #[msg("Sent up invalid token program")]
    InvalidTokenProgram,
    #[msg("Cannot buy tickets outside phase one")]
    CannotBuyTicketsOutsidePhaseOne,
    #[msg("Cannot create the bitmap before phase two end")]
    CannotCreateFairLaunchLotteryBitmapBeforePhaseTwoEnd,
    #[msg("Cannot update fair launch lottery once phase three locked")]
    CannotUpdateFairLaunchLotteryOncePhaseThreeLocked,
    #[msg("Seq already exists")]
    SeqAlreadyExists,
    #[msg("Cannot set lottery until all tickets have sequence lookups using permissionless crank endpoint. Use CLI to make.")]
    CannotSetFairLaunchLotteryUntilAllTicketsAreSequenced,
    #[msg("During phase three, since you did not pay up to the median, you can only withdraw your funds")]
    CanOnlySubmitZeroDuringPhaseThree,
    #[msg("During phase three, since you paid above median, you can only withdraw the difference")]
    CanOnlySubmitDifferenceDuringPhaseThree,
    #[msg("You did not win the lottery, therefore you can only withdraw your funds")]
    DidNotWinLotteryCanOnlyWithdraw,
    #[msg("This account should have no delegates")]
    AccountShouldHaveNoDelegates,
    #[msg("Token minting failed")]
    TokenMintToFailed,
    #[msg("During phase two and one buyer must be signer")]
    DuringPhaseTwoAndOneBuyerMustBeSigner,
    #[msg("Invalid fair launch ticket state for this operation")]
    InvalidFairLaunchTicketState,
    #[msg("Cannot cash out until all refunds and punches (permissionless calls) have been processed. Use the CLI.")]
    CannotCashOutUntilAllRefundsAndPunchesHaveBeenProcessed,
    #[msg("Cannot cash out until phase three")]
    CannotCashOutUntilPhaseThree,
    #[msg("Cannot update fair launch variables once it is in progress")]
    CannotUpdateFairLaunchDataOnceInProgress,
    #[msg("Not able to adjust tickets between phase two and three")]
    PhaseTwoEnded,
    #[msg("Cannot punch ticket when having paid less than median.")]
    CannotPunchTicketWhenHavingPaidLessThanMedian,
    #[msg("You have already withdrawn your seed capital alotment from the treasury.")]
    AlreadyWithdrawnCapitalAlotment,
    #[msg("No anti rug settings on this fair launch. Should've checked twice.")]
    NoAntiRugSetting,
    #[msg("Self destruct date has not passed yet, so you are not eligible for a refund.")]
    SelfDestructNotPassed,
    #[msg("Token burn failed")]
    TokenBurnFailed,
    #[msg("No treasury snapshot present")]
    NoTreasurySnapshot,
    #[msg("Cannot refund until all existing tickets have been dropped or punched")]
    CannotRefundUntilAllTicketsHaveBeenPunchedOrDropped,
    #[msg("Cannot refund until phase three")]
    CannotRefundUntilPhaseThree,
    #[msg("Invalid reserve bp")]
    InvalidReserveBp,
    #[msg("Anti Rug Token Requirement must be less than or equal to number of tokens being sold")]
    InvalidAntiRugTokenRequirement,
    #[msg("Cannot punch ticket until phase three")]
    CannotPunchTicketUntilPhaseThree,
    #[msg("Cannot punch ticket until you have refunded the difference between your given price and the median.")]
    CannotPunchTicketUntilEqualized,
    #[msg("Invalid lottery duration")]
    InvalidLotteryDuration,
    #[msg("Phase two already started")]
    PhaseThreeAlreadyStarted,
    #[msg("Phase two hasnt ended yet")]
    PhaseTwoHasntEndedYet,
    #[msg("Lottery duration hasnt ended yet")]
    LotteryDurationHasntEndedYet,
    #[msg("Fair launch ticket and fair launch key mismatch")]
    FairLaunchMismatch,
    #[msg("Participation Token Account already exists")]
    ParticipationTokenAccountAlreadyExists,
    #[msg("Invalid participation modulo")]
    InvalidParticipationModulo,
    #[msg("Already got participation")]
    AlreadyMintedParticipation,
    #[msg("Not eligible for participation")]
    NotEligibleForParticipation,
    #[msg("The mint on this account does not match the participation nft mint")]
    ParticipationMintMismatch,
    #[msg("Account owner should be buyer")]
    AccountOwnerShouldBeBuyer,
    #[msg("Account owner should be fair launch authority")]
    AccountOwnerShouldBeAuthority,
    #[msg("Token mint mismatch")]
    TokenMintMismatch,
    #[msg("Cannot mint more tokens than are allowed by the fair launch")]
    CannotMintMoreTokensThanTotal,
    #[msg("Due to concerns that you might mint, burn, then mint again and mess up the counter, you can only mint once before the FLP")]
    CanOnlyPremintOnce,
    #[msg("Once phase three has begun, no more FLP tokens can be minted until all ticket holders have been given tokens")]
    CannotMintTokensUntilAllCashedOut,
}