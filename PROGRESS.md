# Final report (2026-10-15)

**The build loop is done.** Every item in LOOP.md's target feature set works on devnet with real data; BACKLOG.md has no P0 or P1; seed-qa's full regression passes #4 (63e628a) and #5 (5a6afc0) were both clean — 0 P0, 0 P1, on-chain flows (launch → fill → seed → claim, buys and sells at the quote, 70/30 fee claims, missed-deadline and founder-cancel refunds; team unlocks were verified in pass #2 and again when the crank paid qatwo's) and 22 page loads at 1440 and 390 with no overflow and no console errors; pages load in under 2 s on the preview.

## What shipped on `final-model` (from b59ecb9 to 5a6afc0)
- **Program** (devnet `8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn`): a `RaiseMeta` PDA fixes the token's metadata URI at opening; `crank_mint` creates immutable Metaplex metadata before revoking the mint authority; mainnet builds require Arweave URIs. Config carries the pool fee (1.25% per Josh; 1% of volume reaches the position after Meteora's 20%).
- **Trading**: in-page swaps on the raise's DAMM v2 pool through Meteora's SDK — quote, slippage, priority fee, impact warning, minimum out from the shown quote, wallet signature, Solscan toast, balances re-read; each pool's own fee shown.
- **Live data**: swaps indexed from the pool vaults' balance changes (pools auto-join the Helius webhook), SQL candles and stats, TradingView Lightweight Charts live through Supabase Realtime, a Trades tab, a Top traders tab with PnL, pool figures from reserves and trades, creator fees from the locked position, holders by mint with Seed's accounts labelled.
- **Safety from the chain**: mint and freeze authority, liquidity lock, metadata immutability, holder concentration, fresh and bundled wallets; founder choices shown as facts.
- **Terminal**: five stage lanes with compact rows at desktop width (tabbed board below 1100px), watchlist, search by name / ticker / CA / X handle, pool price and change on seeded cards, Demo chips.
- **Pages**: founder profile (raises and outcomes, fee income and claims, team unlocks); portfolio for real wallets (results by day in SOL, open positions with PnL, history with tx links, Creator tab from the chain); launch preview extras (pool depth, buy impact, fee income); alerts (bell: filled, seeded, refunds open, unlocks, payout moved); Trade-on links on mainnet; the mainnet launch checklist in `program/README.md`.
- **Backend**: `trades`, `vested_claims` tables; `candles()`, `trade_stats()`; the crank's seeding timeout follows the config and it claims unlocked team tokens; volume from trades.
- **QA**: ~45 findings from seed-qa across nine reports fixed (listed under Done in BACKLOG.md).

## Still open (non-blocking)
- **Needs Josh**: click "Apply 1.25% on devnet" on the preview's Portfolio page (admin wallet); an Irys node wallet for mainnet metadata; the mainnet pick-up check; the takeover question on unvested team tokens.
- **Next program upgrade** (BACKLOG P2): snapshot `pool_fee_bps` on the Raise at opening; sweep the dust `crank_pool` leaves.
- **Polish** (BACKLOG P2): Axiom/GMGN-style extras — a 5m/1h/6h/24h stats strip, a USD/SOL toggle and 1s/30s intervals, editable quick amounts, Bought/Sold/PnL in Your position, the figures row by the name.
- Merge `final-model` into `main` when Josh has checked the preview (the live site must never show half old / half new).

---

# Progress: the terminal build on `final-model`

## Needs Josh
- **Mainnet pick-up check (Phase 5).** Which of Axiom, GMGN, DEXScreener, Birdeye and Jupiter list the first mainnet token can only be seen with a real mainnet raise; the checklist in `program/README.md` walks it.
- **Apply the 1.25% pool fee on devnet (decided).** Josh set the pool fee to 1.25% so 1% of volume reaches the position after Meteora's 20% (founder 0.7%, Seed 0.3%). The site, docs, tests and LOOP.md carry it. The devnet Config still says 1%: on the preview's Portfolio page the admin wallet sees "Apply 1.25% on devnet", one transaction (reset_config + init_config, devnet build only) that keeps admin, treasury, attestor and test mode. Pools seeded before it keep 1%. Mainnet's init_config takes 125 from the start. After it lands I set the webhook's `SEED_POOL_FEE_BPS=125`.
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

- **Founder profile**: `#/founder/<wallet>`, linked from a raise's Founder card: wallet with copy and explorer, X account, every raise the wallet opened with its outcome, fee income per seeded raise (from the pool position) with the indexed claims, team unlocks (unlocked, claimed, next, last).

- **Portfolio for real wallets**: `js/adapters/portfolio.js` reads the wallet's contributions and swaps from the indexer and its token balances from the chain; lots at average cost give realised results by day (the PnL graph and calendar, in SOL), open positions (value, unrealised, realised) and a history (backed, refund, claim, buy, sell) with Solscan links. Demo wallets keep the demo data.

- **Launch preview extras**: pool depth at opening (both sides, in the pair asset and USD) and the price move of a 1, 10 and 100 SOL buy on the fresh constant-product pool, beside the derived price, FDV and the founder's fee income at $5K/$25K/$100K daily volume.

- **Alerts**: `js/alerts.js` compares every raise in scope (starred, backed, held, opened) with what was last seen on each render and records filled / seeded / refunds open / team unlock passed / payout wallet moved, with a toast; the header bell counts unread alerts and lists the latest with links.

- **Top traders and PnL**: a Top traders tab on seeded live raises, every wallet that traded or claimed with bought, sold, holding, realised (average cost), unrealised at the pool price and PnL, newest trades folded in live.
- **Fresh and bundled wallet checks from chain**: for a live raise the Info rows come from each real backer's first transaction and funder read from the chain (the largest 20, cached a day) — in place since the risk adapter; the wording in the backlog was stale.

**All target features are in.** What remains is QA's two consecutive clean full passes, the Needs Josh items, and the P2 polish list in BACKLOG.md.

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
