# Progress: the terminal build on `final-model`

## Needs Josh
- **Mainnet pick-up check (Phase 5).** Which of Axiom, GMGN, DEXScreener, Birdeye and Jupiter list the first mainnet token can only be seen with a real mainnet raise; the checklist in `program/README.md` walks it.
- **Meteora's protocol share of pool fees (QA P1-5).** A DAMM v2 customizable pool pays 20% of every fee to Meteora's protocol (fixed in their program, not a parameter Seed sets). So of the 1% fee, the locked position earns 0.8%, split 70/30: founder 0.56% of volume, Seed 0.24%. The site, docs and launch preview now say so (`SEED.dammProtocolPct`). LOOP.md's "1% split 70/30" stays as the split of the position's fees. If the founder should net 0.7% of volume, the pool fee would have to be 1.25%, which changes "What Seed is" — your call.
- **Mainnet metadata storage.** Devnet keeps the token JSON in Supabase storage. Mainnet needs Arweave through Irys: an Irys node wallet funded with a little SOL, its key as a Supabase secret, and the `seed` function's `upload-url` action routed to it when `SEED_NETWORK=mainnet`. The program side is done; only the upload target changes.
- **Unvested team tokens on a community takeover.** Kept as is: unlocks keep paying the (moved) payout wallet. Open decision.
- **Devnet SOL.** The deployer holds ~1.5 SOL after the Phase 2 upgrade; each program upgrade needs ~2.9 SOL free for the buffer (returned afterwards) plus `program extend` when the binary grows. The test wallets (`keys/test/`) hold 0.7 and 0.8.

Phases ship in order on `final-model`; each is verified on devnet before the next starts. `seed-qa` tests each pushed phase
independently; its notes live in `QA.md` (not committed by this session).

| Phase | State | Pushed |
|---|---|---|
| 1 Bugs | done, verified on the devnet preview | cd95e7b |
| 2 Token metadata | done, verified on devnet (raise meta-7avrmrzs) | see git log |
| 3 Real trading | done, verified on devnet (swaps from both test wallets) | see git log |
| 4 Live data | done, verified on devnet (live trade seen on the open page in ~15 s) | see git log |
| 5 Terminal ready (mainnet only) | links and checklist shipped; the live check needs a mainnet raise (Needs Josh) | see git log |

## Target features beyond the five phases
- **Terminal lanes** (commit after 3b166c8): New raises / Filling fast / Almost full / Seeding / Seeded & trading as live columns at ≥1100px, the tabbed board below; watchlist (star on a card, Watchlist toggle); search by name, ticker, CA, raise account or X handle; price on every card.

## Phase 1: bugs — done when
- Holders tab lists every holder of the token mint (Helius DAS `getTokenAccounts`, plain-RPC fallback) with the accounts Seed opened labelled: Locked pool, Backers unclaimed, Team vesting, Pool staging, Seed, Founder payout. Backers tab lists contributions, with the claim state after seeding.
- After seeding the header chip is the token mint, labelled CA, with copy. The raise account, mint, pool and payout wallet are under Info → On chain, each with copy and an explorer link.
- "Simulated on the demo wallet" and the Demo pill appear only on demo raises. A live raise's deposit panel says the transaction is sent from the wallet; a live seeded raise links to its Meteora pool (the in-page swap is Phase 3).
- Charts clip to their card; the raise line and the projection stay inside the plot; buys are bucketed to the raise's length (10 s … 1 day, 24–72 buckets); candle time labels fit at 1440, 1024 and 390. A live pool with no indexed trades shows flat candles at the raise price (real candles are Phase 4).
- Tiny prices read `0.0₅1234` everywhere a price shows (`fmtPrice`).
- Counts pluralise: 1 backer, 2 backers; wallets, holders, accounts, milestones, announcements, pages, followers, funding wallets.

## Phase 2: token metadata — shipped
- `RaiseMeta` PDA fixes the URI at `open_raise`; `crank_mint` creates immutable Metaplex metadata (update authority = raise PDA, `is_mutable=false`) before revoking the mint authority. 21/21 tests locally, 18 + 3 admin-pending on devnet.
- Launch uploads the token JSON to Supabase storage (`application/json` now allowed in the bucket) and passes the URI; the indexer stores `raises.metadata_uri`; the crank sends the new accounts.
- Devnet check with the test wallets (founder ≠ admin): raise `meta-7avrmrzs`, mint `9RnSfLGVp9dMmt6QuNPmNP4UNYM6WjaFvEYP4odn1ZzQ`, pool `BwYXGXHyRkjw1UKqVgWJUgkgJ4AR1mUwL5yWf1qBJfSo`; Helius DAS resolves name "Meta", symbol META, the image and `mutable: false`, which is what Phantom shows.

Done when (met):
- At launch the token JSON (name, symbol, description, image, website/X/Telegram when given) is uploaded to permanent storage: Arweave via Irys on mainnet, Supabase storage on devnet.
- The seed mint step creates Metaplex Token Metadata with that URI and makes it immutable (`is_mutable = false`; the update authority is the raise PDA, which has no instruction that could update it, so nothing can change the name or image). The token stays a standard SPL token.
- Program tests: metadata exists, matches the launch form, is immutable. Redeployed to devnet. Phantom shows the token name and image.

## Phase 3: real trading — shipped
- `js/adapters/damm.js`: Meteora's cp-amm-sdk (esm.sh) quotes and builds the swap; the wallet signs; `chain.send` confirms by polling. Slippage is per session (default 2%, editable in the panel header, sent to the SDK in basis points); the minimum out sent is the one the panel showed.
- The panel: Buy/Sell, quick amounts (0.01/0.05/0.1/Max of the pair asset; 25/50/100% of the holding), You receive, Price, Price impact (red above 5% with a note), Minimum received, Pool fee; a toast with a Solscan link; the wallet's SOL and token balances re-read from the chain after. The demo wallet cannot trade a real pool (treated as not connected); demo raises keep the simulated panel.
- Devnet: four real swaps from the test wallets (founder buy 0.002, backer sell 20M, backer buy 0.001, founder buy 0.0005, backer sell 5M) on meta-7avrmrzs's pool through `program/scripts/e2e-swap.ts`, the same SDK calls the page makes; the page's own flow dry-run as the backer wallet.

Done when (met):
- On a seeded live raise the trade panel quotes and sends real swaps on the raise's DAMM v2 pool (`@meteora-ag/cp-amm-sdk`): quote, minimum out from an editable slippage (default 2%), price-impact warning above 5%, wallet signature, toast with an explorer link, balance refresh.
- Buy and Sell both work; Sell defaults to the token balance with 25/50/100% buttons. Demo raises keep the simulated panel.

## Phase 4: live data — shipped
- `trades` table + `candles(raise, tf, limit)` and `trade_stats(raise)` SQL functions (migration 20261015010000). The webhook parses a DAMM v2 swap from the pool vaults' balance changes (side, pair amount, tokens, price, trader, slot, time; Seed's own transactions skipped) and, on RaisePooled, adds the pool to the Helius webhook through the API (`HELIUS_API_KEY`, `HELIUS_WEBHOOK_ID` secrets). `raises.fees_volume` is the sum of indexed trades.
- `js/adapters/trades.js`: candles (first candle opens at the raise price, each opens at the last close, the current bucket is appended), latest trades, stats, a Realtime watch per raise.
- The raise page on a live pool: TradingView Lightweight Charts 4.2.3 (candles + volume, raise-price line, Price/MCap, 1m/5m/1h/1D, default 1m) fed from trades and updated in place on each Realtime insert; pool figures from the chain (liquidity from reserves) and trades (24h volume and count), holder count from DAS; a Trades tab (side, amounts, price, wallet, time, Solscan link) that flashes a new row in; creator fees from the locked position (`getUnClaimLpFee` + `metrics.totalClaimedBFee`), the claim handled by the program's 70/30 split (indexed claims: founder 0.000029655 / Seed 0.00001271 SOL on meta-7avrmrzs = 70/30).

Done when (met):
- When a raise seeds, its pool address is added to the Helius webhook; DAMM v2 swaps are parsed into a `trades` table (signature, pool, side, SOL amount, token amount, price, trader, slot, time).
- A SQL function/view builds 1m, 5m, 1h, 1D OHLCV from trades; the first candle opens at the raise price.
- The chart is TradingView Lightweight Charts with Price/MCap and volume bars, live through Supabase Realtime; no demo candles on real pools.
- Liquidity from pool reserves; 24h volume and trade count from trades; price vs raise price; holder count. A Trades tab lists the latest swaps.
- Creator fees: earned and claimable read from the pool position; the claim sends 70% to the payout wallet and 30% to the Seed treasury.

## Phase 5: terminal ready (mainnet only) — shipped
- "Trade on" links (Axiom, GMGN, DEXScreener, Birdeye, Jupiter) under the trade panel on mainnet, each URL form checked in a browser against a live token (Axiom `/t/<mint>` forwards to the pool page; Birdeye's canonical path is `/solana/token/<mint>`). Hidden on devnet, which none of them index.
- `program/README.md` has the mainnet launch checklist. The pick-up report itself needs a mainnet raise (Needs Josh).

Done when:
- Seeded raises carry "Trade on" links with the mint prefilled: Axiom, GMGN, DEXScreener, Birdeye, Jupiter, each URL checked against the live site.
- `README` has a mainnet launch checklist: one small real raise, then Phantom name/image, DEXScreener, Birdeye, Jupiter, Axiom and GMGN pick-up, with a report of which do not.

## Done when, on devnet with two wallets (the founder is not the admin)
- Phantom shows the token name and image.
- Buys and sells from both wallets land; candles and the Trades tab update within seconds.
- The holders list is correct.
- Claiming fees sends 70% to the founder's payout wallet and 30% to the Seed treasury, checked on chain.
- No chart clips at any width; no console errors.
