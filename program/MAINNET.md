# Seed on mainnet, in three stages

Nothing in stages 2 and 3 runs without the owner's go. Stage 1 costs nothing and runs any time.

## Stage 1 — rehearsal on a local validator that is mainnet as far as Seed can tell

`scripts/rehearsal/mainnet-local.sh` starts `solana-test-validator` on port 8999 with Meteora's DAMM v2 (`cpamdp…`), Metaplex
Token Metadata, Pyth's SOL/USD price account and the mainnet USDC mint cloned from mainnet (reads only; the public endpoint
does it), and the devnet build of Seed loaded under its id. The devnet USDC mint is loaded from a saved snapshot so the
config can be made in **test mode, where a day is a minute**: that is the warped time. Every other term is production's:
the four presets, 1% buy fee, 125 bps pool, 70/30, no minimum unlock, 7-day payout delay, 3-day timeout.

`scripts/rehearsal/lifecycle.ts` then runs four raises at once and writes `scripts/rehearsal/report-<date>.md`:

| raise | what it proves |
|---|---|
| A, the $100K preset, 20% team (a $40,000 raise), one unlock at day 90 | a preset off the list refused, the Test preset refused on a config without one; the target derived at the cloned Pyth price (374.11 SOL at $106.92); two buys with 1% on top, the last trimmed to the room; mint (1B, authorities revoked, immutable Metaplex metadata under the raise PDA); DAMM v2 pool with the whole raise (to within DAMM's deposit rounding, a few µSOL) and 400M tokens, position NFT owned by the raise; 1% of the raise (3.74 SOL) of held fees to the treasury; backers' claims 60/40; buy, sell, buy through Meteora's SDK; the fee crank's 70/30 of the position's fees; a payout change that waits 7 days; the admin's takeover, which inside the 90-day cliff burns the whole team share (200M off the supply) and after which `claim_vested` is refused (UnlocksEnded) |
| B, $100K preset, no team ($50,000), cancelled after two buys | both refunds exact, fee included |
| C, $50,000, filled and never seeded | `timeout_refund` refused before the 3-day timeout, refunds after it |
| D, $50,000, one-day deadline, one buy | `settle` marks it missed after the deadline; the refund is exact |

Last run 2026-10-21 (UTC) under the presets: 34 checks, all passed (SOL at $106.92 from the cloned feed; A's $40,000 raise was
374.11 SOL); that run waited out the 90-minute cliff to unlock the team share to the takeover wallet. Since the takeover burn
(2026-10-27, the owner's policy) raise A's takeover burns the team share instead and no unlock follows, so the run has no long
wait; it has not been run again since that change. Run it before stage 2.

## The takeover burn (2026-10-27, the owner's policy)

`admin_approve_takeover` ends the team's allocation on a seeded raise: what the schedule has released and not yet been paid
goes to the payout wallet of before (its token account is made if missing, the signer pays), every team token not yet
unlocked is burned from the team vault (the mint's supply falls by that much), the payout moves to the wallet the backers chose,
and `claim_vested` is refused from then on (UnlocksEnded, 6049). Before seeding it is refused (NotSeeded, or at account
validation when the raise has no mint yet). The Raise layout is unchanged: the takeover is `takeover_to`, the amount paid joins
`team_claimed`, and the TeamBurned event carries paid, burned and the supply after. Proven by 7 unit tests in `state.rs` (both
builds) and the suite on a local validator and on devnet (nothing unlocked: all burned; a quarter paid, a quarter due, half
locked: the due quarter to the old payout wallet, half burned; a second takeover burns nothing; refused before seeding). On
mainnet only the Config admin (the Squads vault) can sign it.

## Security audit: what the auditor must review

The program is not audited. Before production the auditor reviews at least these, each against the code named:

1. **The takeover burn** (`admin_approve_takeover`, `Raise::takeover_split`, `claim_vested`): paid + burned equals the vault and
   neither can exceed it; only the team vault burns, never the backers' or the pool's; the old payout wallet's token account is
   the associated one (`init_if_needed`, admin pays); the supply in TeamBurned is read after the burn; claim_vested is refused
   after any takeover; only a seeded raise.
2. **Who can sign the admin instructions** (`admin_or_devnet_authority`): on a mainnet build only `Config.admin`. The devnet
   build also accepts the program's upgrade authority, shown by this program's ProgramData account (its address and the
   loader's ownership are checked) for `set_pair`, `admin_flag_fraud` and `admin_approve_takeover`; that code is under
   `#[cfg(feature = "devnet")]` and must be absent from the production binary.
3. **Devnet-only code compiled out of production:** test mode (a day is a minute), `reset_config`, `migrate_config`,
   `devnet_set_max_deadline`, the Test preset. `check-deploy.ts` and the build's IDL show none of them.
4. **The locked pool:** no instruction transfers the position NFT or removes liquidity; the NFT is owned by the raise PDA.
5. **Money paths:** `contribute` (1% on top, the last buy trimmed, min_buy / max_buy), `claim_refund` (exact, fee included),
   `claim_tokens`, `claim_creator_fees` (70/30), the held fees to the treasury at seeding, Token-2022 pair checks in `set_pair`.
6. **Seeding and the timeout:** `crank_mint`, `crank_pool`, `crank_seed`, `progress_at`, `timeout_refund` refused once pooled
   (AlreadyPooled), `settle` after the deadline.
7. **Prices and attestations:** Pyth staleness and verification in `pyth.rs`; the X attestation's ed25519 instruction
   introspection in `attest.rs`; the target derived from the preset on chain.
8. **USDC stays open on chain** while the site offers SOL only (the owner's decision, 2026-10-27): `open_raise` accepts
   USDC without an allowlist entry; the auditor confirms a USDC raise is as safe as a SOL one.

## Stage 2 — staging: the same source under a second program id, on mainnet, with real but small SOL

The staging program is `keys/staging-program.json` → **`3PzTSUPz1Pt37bVhZjtfhue4AJo1oSeYMzDKa1cdXs6J`** (git-ignored key; made
2026-10-20). Anchor compiles the id in, so `scripts/staging/deploy.sh` builds the same source with the mainnet flags (no
`devnet` feature: no test mode, no `reset_config`, no `migrate_config`, Arweave URIs only) under that id and puts the source
back. Its Config is made with **tiny presets of its own ($150, $300, $450, $600)**, every other term as production, so a
no-team raise at the first is about half a SOL. Then one seeded raise (SEEDTEST) and
one refunded raise (REFUNDME), then the DEX pick-up check.

```sh
cd program
sh scripts/staging/deploy.sh <mainnet rpc>                       # 1. build only: prints the id, the binary size and the rent
GO=1 sh scripts/staging/deploy.sh <mainnet rpc>                  # 2. deploy with keys/deployer.json (after funding, below)
GO=1 SEED_PROGRAM_ID=3PzTSUPz… ANCHOR_PROVIDER_URL=<mainnet rpc> ANCHOR_WALLET=keys/deployer.json \
  npx ts-node -P tsconfig.json scripts/staging/init.ts           # 3. the staging Config: tiny presets, 125 bps, no test mode
SEED_PROGRAM_ID=3PzTSUPz… ANCHOR_PROVIDER_URL=<mainnet rpc> ANCHOR_WALLET=keys/deployer.json \
  npx ts-node -P tsconfig.json scripts/alt.ts mainnet            # 4. the mainnet lookup table (prints its address)
npx ts-node -P tsconfig.json scripts/check-deploy.ts staging <mainnet rpc> 3PzTSUPz…   # 5. must print OK
# 6. the token metadata JSON on Arweave, with the Irys wallet (Needs the owner): about 0.001 SOL for a 1 KB file
npx @irys/cli upload seedtest.json -n mainnet -t solana -w keys/irys.json   # prints https://gateway.irys.xyz/<id>
GO=1 SEED_PROGRAM_ID=3PzTSUPz… ANCHOR_PROVIDER_URL=<mainnet rpc> ANCHOR_WALLET=keys/deployer.json \
  npx ts-node -P tsconfig.json scripts/staging/seedtest.ts --uri https://gateway.irys.xyz/<id>   # 7. SEEDTEST and REFUNDME
npx ts-node -P tsconfig.json scripts/staging/dex-check.ts <mint>   # 8. DEXScreener, Jupiter search and quote, Birdeye; Axiom and GMGN by hand
```

The site can point at staging for a browser pass by setting `network: 'mainnet'`, `programId`, `lookupTable` and the
mainnet USDC mint in `js/config/seed.js` on a preview deployment (never on `main`); the Supabase indexer would need a
mainnet webhook on the staging id and `SEED_RPC_URL`/`SEED_PROGRAM_ID` for it — optional for this stage.

### SOL to fund before stage 2 (mainnet)

| wallet | needs | of which comes back |
|---|---|---|
| `keys/deployer.json` → `6GTuondHNLSJkYemhVw8GYFTK3ANHPFXdVYUM5JP5zyf` | **5.0 SOL**: ≈ 3.95 SOL program rent (563 KB binary; the buffer's rent becomes the program data account's, so it is paid once), 0.003 ALT, 0.003 Config, ≈ 0.03 SEEDTEST's accounts (raise, meta, founder record, escrow, mint, vaults, metadata), 0.05 fronted for the DAMM pool (≈ 0.025 kept by the pool's rent, the rest back), ≈ 0.02 REFUNDME's founder and accounts, fees, margin | ≈ 0.025 pool-rent change; 0.005 (the 1% on SEEDTEST's fill, since the deployer is the staging treasury); the program rent only by closing the program later (`solana program close`, ≈ 3.95 back) |
| `keys/staging-backer.json` (make one) | **0.75 SOL**: 0.505 fills SEEDTEST (0.5 to the pool for good, 0.005 fee), 0.101 the REFUNDME buy (refunded), 0.03 trades (0.02 + 0.01 in, half sold back), fees | ≈ 0.101 refund + the sell's proceeds + what the last unwrap returns |
| Irys wallet (Needs the owner) | 0.01 SOL | — |

**Sunk for good: ≈ 0.55 SOL** (0.5 in the pool, pool and account rents, fees) **plus the 3.95 SOL program rent** until the
staging program is closed. Jupiter routing and DEXScreener want a trade and some liquidity; 0.5 SOL of liquidity is thin,
so expect DEXScreener and Meteora to show it, Jupiter's quote to route, Birdeye possibly, and Jupiter's token list not.

## Stage 3 — production runbook (do not run)

**SOL only at launch (the owner, 2026-10-26).** Every raise pairs with SOL. The pair allowlist stays in the program, so another
pair can be switched on later with `set_pair` and no upgrade; at launch nobody runs it. A fresh Config has no allowlist
entries, and `scripts/check-deploy.ts` fails if any entry is active (a paused one is fine). The site offers no pair choice.
One gap the config cannot close: **USDC is built into the program** (`open_raise` prices it at a dollar without an allowlist
entry), so the program itself still accepts a USDC raise sent by hand. Closing that needs a program change (make USDC an
allowlist entry like any other pair) and is waiting on the owner's call; until then only the site keeps raises on SOL.

1. **Squads.** Make the multisig (2-of-3 or better) on app.squads.so; note its **vault address** (the signer that holds the
   authority), not the multisig account.
2. **Build.** `anchor build` (no `devnet` feature). Record `sha256sum target/deploy/seed.so`. The production id is the one
   in `declare_id!` (`8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn`, `target/deploy/seed-keypair.json`), the same as devnet.
3. **Deploy** with the deployer (≈ 3.95 SOL of rent + fees; fund it with 4.5 SOL):
   `solana program deploy target/deploy/seed.so --program-id target/deploy/seed-keypair.json -u <mainnet rpc> -k keys/deployer.json`
4. **Init the Config, once, with the four presets and 125 bps**, naming the Squads vault as admin and the treasury wallet Seed will use
   (a Squads vault too, or a cold wallet), the production attestor's public key, Pyth `7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE`:
   `presetCapsCents [5_000_000, 10_000_000, 15_000_000, 20_000_000], testCapCents 0, minTargetLamports 1 (unused, kept for the layout), poolFeeBps 125, feeBps 100, creatorShareBps 7000, capUsdCents 10_000_000 (unused: the presets are the ceiling), minDeadline 86400,
   maxDeadline 2_592_000 (30 days), seedTimeout 259_200, minUnlockDays 90 (unused: no minimum on team unlocks), payoutDelay 604_800, testMode false` — the test suite's
   `make()` in `tests/seed.ts` has the exact call shape (`c.initConfig(params, payer, null)`). There is no instruction that
   changes the presets, the fees or the deadlines afterwards; `update_config` moves only the treasury and the attestor.
5. **Lookup table.** `ANCHOR_PROVIDER_URL=<mainnet rpc> ANCHOR_WALLET=keys/deployer.json npx ts-node -P tsconfig.json scripts/alt.ts mainnet`
   → the address goes into `js/config/seed.js` `lookupTable`. (Its authority is the deployer; it can only ever be appended to.)
6. **Hand the program to Squads:** `solana program set-upgrade-authority 8Kr2… --new-upgrade-authority <squads vault> -u <mainnet rpc> -k keys/deployer.json`
   (and `--skip-new-upgrade-authority-signer-check` only if the vault cannot co-sign; prefer a Squads-initiated accept).
7. **Verify.** `SEED_PROD_UPGRADE_AUTHORITY=<squads vault> npx ts-node -P tsconfig.json scripts/check-deploy.ts production <mainnet rpc>`
   must print `OK`: the four presets, no test preset, 125 bps, 100 bps, 70/30, no test mode, no active allowlist entry (SOL only),
   the vault as upgrade authority. A deploy is not done until it does.
8. **Site and backend.** `js/config/seed.js`: `network: 'mainnet'`, the mainnet Helius browser key (domain-locked), `programId`,
   `lookupTable`, `pairMints.USDC = EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (read-only: the site offers SOL only), `xTyped: false`, `admins = [squads vault]`.
   Supabase: `SEED_RPC_URL` mainnet, `SEED_PROGRAM_ID`, `SEED_DEV_X_HANDLES` **unset**, the Irys wallet for metadata uploads,
   the production attestor secret; a mainnet Helius webhook (raw, the program id; pools join as raises seed); redeploy
   `seed`, `crank`, `helius-webhook`. Vercel: the env `SEED_RPC_URL` (a mainnet RPC) and `SEED_PROGRAM_ID` for the link
   preview functions (`api/_cfg.js` reads the pair allowlist from the chain). Run `scripts/check-deploy.ts production` again after.
   **No small test raise on production.** The small tests (a seeded raise, a refunded raise, the DEX pick-up) belong to
   stage 2 on the staging program; production's first raise is a real one at the $50K preset, opened by a real founder
   from the site, and its pick-up on DEXScreener, Birdeye, Jupiter, Axiom and GMGN is checked as it seeds (the README's
   checklist, items 3–7, applied to that raise).
9. **Keep:** the build's sha256, the deploy and init signatures, the Config address, the table address — in DECISIONS.md.
