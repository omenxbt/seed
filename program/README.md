# The Seed program

An Anchor program (`programs/seed`) that holds a raise end to end: buys at a fixed price with a 1% fee on top, the
$100,000 cap, the deadline, refunds on a miss, a cancel or a stalled seeding, the four seeding steps (mint the supply,
open and lock the Meteora DAMM v2 pool, finish), backers' claims, the pool's fees split 70/30 on a permissionless
claim, team unlocks on a schedule fixed at opening, payout wallet changes after seven days, and the admin's two
instructions (flag fraud, approve a takeover). The raise PDA owns the escrow, the vaults and the pool position NFT; no
instruction can move that NFT or remove liquidity. `src/lib.rs` has the instructions, `src/state.rs` the accounts,
`src/events.rs` the events the indexer reads, `src/damm.rs` the three DAMM v2 CPIs, `src/attest.rs` the X attestation
check, `src/math.rs` the pool's opening price and liquidity.

## Build and deploy (devnet)

```sh
cd program
anchor build                       # target/deploy/seed.so, target/idl/seed.json
cp target/idl/seed.json ../js/idl/seed.json && cp target/idl/seed.json ../supabase/functions/crank/seed.json
solana program deploy target/deploy/seed.so --program-id target/deploy/seed-keypair.json -u devnet --max-len 500000
npm install && anchor test --skip-local-validator --skip-deploy   # runs tests/seed.ts against devnet
```

The build pins a few transitive crates in `Cargo.lock` (blake3, zeroize, hashbrown, indexmap, proc-macro-crate,
unicode-segmentation) because the SBF toolchain's rustc 1.84 cannot read edition-2024 manifests; `cargo update` will
undo those pins, so do not run it blindly. The program is built for size (`opt-level = "z"`) and the DAMM interface is
hand-written rather than generated, which keeps the binary under 500 KB: deploying it costs about 2.4 SOL of rent at
`--max-len` equal to the binary size, more if you leave room for upgrades.

Seeding, step 2, is the one place Seed depends on how Meteora is built: DAMM's `payer` both pays the pool's rent and
signs the deposits into it, so Seed keeps a dataless PDA per raise (`["payer", raise]`) that owns the pool vault and a
staging account for the pair asset, and the cranker fronts the rent (`POOL_RENT_FRONT`) and gets the change back in
the same instruction. The raise PDA is the pool's creator and the position's owner. `scripts/inspect.ts` prints the
latest seeded raise and its position's `permanent_locked_liquidity` straight from the cluster.

**X is optional.** `open_raise` takes `x: Option<XAttest>`; with one, the attestation instruction rides in front and
the handle's blacklist account is the first remaining account. `link_x` adds an X account to a live, filled or seeded
raise later on the same terms. A wallet has one live raise at a time: its `FounderState` names the last one, which is
passed in as `prev_raise` so the program can see it has left Live. `admin_flag_fraud` blacklists the founder wallet
(`["blacklist", wallet]`) and, when linked, the handle (`["blacklist", sha256(handle)]`).

**Local runs.** `scripts/localnet.sh` starts a validator with DAMM v2, the Pyth account and the devnet USDC mint
cloned from devnet and the program loaded, so the whole suite, admin tests included, runs offline in under a minute
(on devnet the admin tests skip unless the provider wallet is the config's admin). The suite's raises come from the
deployer and from a second founder derived from its key (`'seed test founder'`); both are in `SEED.hiddenFounders`, so
the site never shows them. Keep the admin tests off devnet: the fraud-flag test blacklists that second founder for good.

The tests run on devnet because Meteora's DAMM v2 is deployed there and nowhere local. They use the provider wallet as
admin, oracle, treasury and founder, derive the attestor key from it, and need about 0.4 SOL. The config PDA is made
once with that attestor; another wallet's run against the same deployment must use the wallet that made the config.

**Builds.** `anchor build` is the mainnet build. `anchor build -- --features devnet` adds two things that must never
reach mainnet: `reset_config` (the admin closes the config so it can be made again) and test mode, in which a day is a
minute for deadlines, the seeding timeout, payout changes and unlocks. Test mode is set once, at `init_config`, and
even in a devnet build it needs the devnet USDC mint passed as a witness, an account that exists on no other cluster; a
mainnet build has no code path that sets it. Each raise records its time unit at opening (`time_unit`).

**The SOL price** comes from Pyth's sponsored SOL/USD price account (`7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE`,
the same on mainnet and devnet, kept fresh by Pyth), parsed in `pyth.rs` and refused when older than fifteen minutes.
Nobody posts prices.

**Admin.** The config's admin can move `seed_treasury` and `attestor` (`update_config`) and hand admin over in two
steps (`propose_admin`, then `accept_admin` by the successor). Nothing else in the config, and nothing in any raise,
can be changed. `scripts/admin.ts` runs these from the provider wallet.

The devnet program id is in `Anchor.toml` and `declare_id!`; the keypair is `target/deploy/seed-keypair.json` (not
committed). `Anchor.toml` deploys and tests from `keys/deployer.json`, a wallet made for this project and nothing else
(`solana-keygen new -o keys/deployer.json`; the folder is git-ignored). It needs about 3 SOL of devnet SOL: the rent
above plus the tests. The SOL price the cap uses is set by `set_sol_price` from the oracle key; on mainnet that should read a
Pyth feed instead.

## Token metadata

The founder's page uploads the token's JSON (name, symbol, description, image, website, X and Telegram) before the
raise opens: to Supabase storage on devnet, to Arweave through Irys on mainnet. `open_raise` fixes its address in a
`RaiseMeta` account (`["meta", raise]`, 200 characters at most; any https:// on devnet, Arweave only in a mainnet build), so whoever runs the permissionless
mint step cannot choose it. `crank_mint` then creates Metaplex Token Metadata for the mint with the raise's name and
ticker and that URI, `is_mutable = false`, update authority the raise PDA (which has no instruction to update it), and
only then revokes the mint authority. The token is a standard SPL token with six decimals. `scripts/e2e-raise.ts` runs
the whole path on devnet with the test wallets and prints what Helius DAS (what Phantom reads) resolves for the token.

## Mainnet launch checklist

Before the first public raise on mainnet, one small real raise (a few dollars, a one-day deadline, a wallet that is
not the admin) run end to end, then checked where traders look:

1. **Build and deploy the mainnet program** (`anchor build`, no `devnet` feature: no test mode, no `reset_config`,
   metadata URIs must be Arweave). Upgrade authority and Config admin to the Squads multisig. `js/config/seed.js`:
   `network: 'mainnet'`, the mainnet program id, the mainnet USDC mint, `xTyped: false`. Supabase: a mainnet Helius
   webhook (raw, the program id; pools join it as raises seed), `SEED_RPC_URL` mainnet, `SEED_DEV_X_HANDLES` unset,
   the Irys wallet for metadata uploads.
2. **Open, fill, seed** the test raise from the site with a browser wallet. The crank or the page runs the three steps.
3. **Phantom** shows the token's name, symbol and image (immutable Metaplex metadata; DAS `getAsset` agrees).
4. **The pool appears** on DEXScreener (`dexscreener.com/solana/<mint>`), Birdeye (`birdeye.so/solana/token/<mint>`)
   and Jupiter (`jup.ag/tokens/<mint>`, and a quote routes through the Meteora pool).
5. **Pasting the CA** into Axiom (`axiom.trade/t/<mint>`) and GMGN (`gmgn.ai/sol/token/<mint>`) shows the pool and
   allows a trade; the Seed page's "Trade on" links (mainnet only) open those pages.
6. **A buy and a sell** from the Seed page, each landing at the quote; the Trades tab and the chart update; the holders
   list matches the chain; a fee claim pays the payout wallet 70% and the treasury 30% of the position's fees
   (Meteora keeps 20% of the pool fee first).
7. Report which sites did not pick the token up and why (most index a pool once it has a trade and some liquidity;
   DEXScreener and Birdeye usually within minutes, Jupiter's strict list is separate from routing).

## Upgrade authority

On devnet the upgrade authority is the developer keypair that deployed it. **On mainnet the upgrade authority must be a
Squads multisig** (`solana program set-upgrade-authority <program id> --new-upgrade-authority <squads vault>`), and the
Config's `admin` the same multisig, so no single key can change the program or flag a raise.

## What the program does not do

There is no instruction that transfers the position NFT, withdraws or reduces liquidity, mints after seeding, changes
a fee split or a schedule, or moves a refund anywhere but back to its backer. `tests/seed.ts` tries to move the NFT and
checks that no instruction writes its account after creation.
