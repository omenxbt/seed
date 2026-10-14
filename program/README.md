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
(on devnet the admin tests skip unless the provider wallet is the config's admin).

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

## Upgrade authority

On devnet the upgrade authority is the developer keypair that deployed it. **On mainnet the upgrade authority must be a
Squads multisig** (`solana program set-upgrade-authority <program id> --new-upgrade-authority <squads vault>`), and the
Config's `admin` the same multisig, so no single key can change the program or flag a raise.

## What the program does not do

There is no instruction that transfers the position NFT, withdraws or reduces liquidity, mints after seeding, changes
a fee split or a schedule, or moves a refund anywhere but back to its backer. `tests/seed.ts` tries to move the NFT and
checks that no instruction writes its account after creation.
