# Seed on mainnet, in three stages

Nothing in stages 2 and 3 runs without Josh's go. Stage 1 costs nothing and runs any time.

## Stage 1 — rehearsal on a local validator that is mainnet as far as Seed can tell

`scripts/rehearsal/mainnet-local.sh` starts `solana-test-validator` on port 8999 with Meteora's DAMM v2 (`cpamdp…`), Metaplex
Token Metadata, Pyth's SOL/USD price account and the mainnet USDC mint cloned from mainnet (reads only; the public endpoint
does it), and the devnet build of Seed loaded under its id. The devnet USDC mint is loaded from a saved snapshot so the
config can be made in **test mode, where a day is a minute**: that is the warped time. Every other term is production's:
the four presets, 1% buy fee, 125 bps pool, 70/30, no minimum unlock, 7-day payout delay, 3-day timeout.

`scripts/rehearsal/lifecycle.ts` then runs four raises at once and writes `scripts/rehearsal/report-<date>.md`:

| raise | what it proves |
|---|---|
| A, the $100K preset, 20% team (a $40,000 raise), one unlock at day 90 | a preset off the list refused, the Test preset refused on a config without one; the target derived at the cloned Pyth price (374.11 SOL at $106.92); two buys with 1% on top, the last trimmed to the room; mint (1B, authorities revoked, immutable Metaplex metadata under the raise PDA); DAMM v2 pool with the whole raise (to within DAMM's deposit rounding, a few µSOL) and 400M tokens, position NFT owned by the raise; 1% of the raise (3.74 SOL) of held fees to the treasury; backers' claims 60/40; buy, sell, buy through Meteora's SDK; the fee crank's 70/30 of the position's fees; a payout change that waits 7 days; the admin's takeover; the whole team share (200M) unlocking at day 90 to the takeover wallet, nothing before and nothing after |
| B, $100K preset, no team ($50,000), cancelled after two buys | both refunds exact, fee included |
| C, $50,000, filled and never seeded | `timeout_refund` refused before the 3-day timeout, refunds after it |
| D, $50,000, one-day deadline, one buy | `settle` marks it missed after the deadline; the refund is exact |

Takes about 90 minutes, almost all of it the 90-minute cliff (`--fast` skips that one wait). Last run 2026-10-21 (UTC) under the
presets: 34 checks, all passed (SOL at $106.92 from the cloned feed; A's $40,000 raise was 374.11 SOL). **Not covered:** a burn of
unvested team tokens on a takeover — no such instruction exists; the schedule keeps unlocking to the new payout wallet.
That policy is open (Needs Josh).

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
# 6. the token metadata JSON on Arweave, with the Irys wallet (Needs Josh): about 0.001 SOL for a 1 KB file
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
| Irys wallet (Needs Josh) | 0.01 SOL | — |

**Sunk for good: ≈ 0.55 SOL** (0.5 in the pool, pool and account rents, fees) **plus the 3.95 SOL program rent** until the
staging program is closed. Jupiter routing and DEXScreener want a trade and some liquidity; 0.5 SOL of liquidity is thin,
so expect DEXScreener and Meteora to show it, Jupiter's quote to route, Birdeye possibly, and Jupiter's token list not.

## Stage 3 — production runbook (do not run)

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
   must print `OK`: the four presets, no test preset, 125 bps, 100 bps, 70/30, no test mode, the vault as upgrade authority. A deploy is not
   done until it does.
8. **Site and backend.** `js/config/seed.js`: `network: 'mainnet'`, the mainnet Helius browser key (domain-locked), `programId`,
   `lookupTable`, `pairMints.USDC = EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, `xTyped: false`, `admins = [squads vault]`.
   Supabase: `SEED_RPC_URL` mainnet, `SEED_PROGRAM_ID`, `SEED_DEV_X_HANDLES` **unset**, the Irys wallet for metadata uploads,
   the production attestor secret; a mainnet Helius webhook (raw, the program id; pools join as raises seed); redeploy
   `seed`, `crank`, `helius-webhook`. Run `scripts/check-deploy.ts production` again after.
   **No small test raise on production.** The small tests (a seeded raise, a refunded raise, the DEX pick-up) belong to
   stage 2 on the staging program; production's first raise is a real one at the $50K preset, opened by a real founder
   from the site, and its pick-up on DEXScreener, Birdeye, Jupiter, Axiom and GMGN is checked as it seeds (the README's
   checklist, items 3–7, applied to that raise).
9. **Keep:** the build's sha256, the deploy and init signatures, the Config address, the table address — in DECISIONS.md.
