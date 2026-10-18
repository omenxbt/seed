# Status report (2026-10-18, the minimum raise)

- **Minimum raise = 81 SOL (Josh's decision):** the size a pump.fun curve collects before it graduates, so the smallest Seed pool opens where those tokens migrate; a bigger target opens at a proportionally higher market cap, and a USDC raise meets the same dollars at the SOL price when it opens. In the program as `MIN_TARGET_LAMPORTS` (0.05 SOL in test mode, so devnet cycles stay cheap) with the `UnderFloor` error; on the site in the Launch form's validation and hint (the chain's config decides which floor applies), the docs and the parameters table. Chosen as a constant rather than a Config field so the devnet program could be upgraded in place with no Config reset (the config's admin is Josh's wallet, not the deployer) and no gap on the live site.
- **Devnet program upgraded** (slot 512533641, deployer 5.21 → 5.209 SOL); the IDL copies in `js/idl/` and the crank function were refreshed (one new error code; no account layout change, so the deployed crank keeps working). The test suite gained an `UnderFloor` case.
- **Mainnet:** the mainnet build carries the 81 SOL floor automatically (no test mode). Nothing else on the mainnet path changed.

# Status report (2026-10-17 evening, battle-test round 3; seed-qa passes #19–#21)

## Where it stands
- **`main` = `final-model` = 138d742**, the gate met again by two consecutive clean full passes (#20 on f10b5f5, #21 on 138d742). Josh asked for everything to go to main as it landed this round, so each commit went to both branches and the passes ran on production.
- **Josh's asks:** the hatched gutters beside the content are gone (e9fc0ae; the rail's hairline is the only line). A brand kit lives in `brand/` (untracked, 3.2 MB): a 16-page brandbook (HTML and PDF), 18 logo variants as SVG and PNG built from the exact `#seed21` geometry, five 1500×500 banners with X's avatar zone kept clear, and a `_src/build.py` that regenerates it all from the site's tokens.
- **My production sweep (a539b13):** the founder page's five figures sat in delta.css's two-column stat grid and left a cell empty (now one row of five; 2×2 plus a spanning cell under 720px); the raise page's tab strip cut "Deck" off with no hint (it fades at the edge it can still scroll towards); an invalid launch form focuses its first problem field; the docs' "Reading the terminal" described the retired three lanes (rewritten for the table and its tabs).
- **seed-qa pass #19 (3 P1, 6 P2, all fixed in 5e7034f and f10b5f5):** F12 a second tab's save dropped a real wallet in about a second — the storage sync keeps this tab's wallet, positions, claims, balances and demo book unless the saving tab holds the same wallet, re-marks the wallet's own buys after the merge (F12b), and a save that changes nothing is not written; F13 the founder's Portfolio threw on team-unlock history rows (`fmtExact` on an event with no pair amount) and never loaded — only the event's own figures are formatted, the record loads before the cards, and each card is isolated; F14 a real wallet's "held" read the claimed amount (the demo fallback) — it is the chain balance only, "…" until known. P2s: the launch target must be a plain decimal (`12abc`, `1e3`, `Infinity` refused); a buy refused in the wallet reads "Cancelled in the wallet"; the founder header named the address twice; duplicate "missed its target" toasts; the Creator tab's grid had an empty column.
- **Pass #20 (clean; 2 P2, fixed in 138d742):** 77 a tab that never connected took another tab's real wallet from its save — the sync now runs the trusted-reconnect check (`resume()`) instead, verified in all three cases (no extension, untrusting wallet, trusting wallet) with the connecting tab keeping its wallet throughout; 78 the terminal docs name the All tab and the Backers column and explain Change on a live raise. **Pass #21: clean, nothing new.** Each pass ran the full devnet cycle (launch → fill → seed → claim; buy, sell, buy; the fee crank; a cancel and a missed-deadline refund) plus every page at 1440 and 390 with real wallets read through a stub provider.
- **Still open, non-blocking:** P2-74 — the board cache still sits inside `seed.v6`, so an idle tab writes ~750 KB on price ticks (the full split is a bigger change); the older polish P2s; Josh's decisions (minimum raise target ≈$2,000, the Irys mainnet wallet, team tokens on a takeover).
- **Devnet SOL:** deployer 5.21 (seed-qa funds its own keys from it now), crank 1.59, test founder 2.02, test backer 2.06; seed-qa founder 0.131, backers 0.109 and 0.166.

# Status report (2026-10-17, the Delta redesign; seed-qa passes #16–#18)

## Where it stands
- **`main` = 0359cff**, the redesign, merged after two consecutive clean full passes (#17 and #18) and a production smoke test by seed-qa. The live site is seed-nu-ten.vercel.app; `final-model` runs one commit ahead with pass #18's two polish notes (the SOL chip waits for Pyth or its cached reading instead of flashing the demo price; the hero copy uncaps where the mark is hidden).
- **What changed (Josh's ask: copy the Delta Liquidity Figma's UI, keep Seed's colours):** everything lives in `css/delta.css`, loaded after the inline rules, plus markup in `index.html` and templates in `js/presale-page.js`. From 1024px a 64px icon rail on the left (mark; Terminal, Launch, Portfolio with the open one lit; X, Discord, docs at the foot) and hatched gutters. The app bar on every page is the search box (typing on another page opens the board), three stat chips (raises live, raised in dollars, the SOL price — on the live site these count only what is on chain), a refresh button, the bell and a gradient wallet button. The Terminal opens with a hero (the Seed mark where Delta has its tile cluster) beside the most active raise as a card with its fill sketched behind the figures; from 1001px the feed is one table (rank badge, token, market cap, change, raised with its bar, backers, time, a barcode strip lit to the fill, the action) and the three lanes are retired; tiles stay below 1000px and on Trending. The raise page's chart has timeframe pills, a Price / Market cap switch and a foot line; the pool figures and the project's numbers sit in bordered grids; Holders and Backers carry rank badges and share strips. Segmented controls light their chosen segment; primary buttons are blue gradient pills.
- **Found and fixed on the way (passes #16–#18):** demo totals in the live site's chips and featured card; the bell popover off the left edge on a phone; the board collapsing to a strip when the hero outgrew the window (the Terminal now scrolls as a page); stylesheet order (delta.css lost equal-specificity fights until it moved after the inline block); and one pre-redesign bug, the Creator fees note running past its card since ecc64ac.
- **Devnet SOL:** deployer 5.61 (0.2 to seed-qa's founder on 2026-10-17), crank 1.59, test founder 2.02, test backer 2.06; seed-qa founder 0.117, backers 0.048 and 0.192.
- **Figma access:** the Figma connector reports no access to the file (IOYdMrcybQtlA0gim7nIkS); the frames were read through the signed-in browser. Sharing the file with the connector's account would let the Design System page's tokens be pulled exactly.

# Status report (2026-10-16, after seed-qa passes #12–#15)

## Where it stands
- The live site is seed-nu-ten.vercel.app. **`main` = `final-model` = ecc64ac**, merged after two consecutive clean full passes by seed-qa (#14 and #15, both on ecc64ac). Every pass runs a real devnet cycle (launch → fill → seed → claim → three swaps indexed → 70/30 crank claim → a cancel refund and a missed-deadline refund) plus 48–54 page loads at 1440 and 390.
- **Every item in LOOP.md's target feature set works on devnet with real data**, verified by both sessions, and the three asks since the last report are done: market cap by default, market caps accurate (post-swap pool price from DAMM's own swap event, exact to the digit), and **market caps in dollars** at the live SOL price.
- **The program** (devnet `8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn`) is unchanged; devnet Config carries `pool_fee_bps = 125`. Tests: 21/21 local, 18 + 3 admin-only on devnet.
- **Devnet SOL:** deployer 5.81 (after 1 SOL to the crank on 2026-10-16), test founder 2.02, test backer 2.06, **crank 1.59** (each test cycle costs it ~0.04). seed-qa's wallets ~0.50 together (founder 0.21, backers 0.08 and 0.22); the deployer key is `program/keys/deployer.json`.

## Since the last report (2026-10-15 evening → 2026-10-16)
- **Market caps in dollars (Josh):** rows, tiles, the page stat, the chart's MCap axis and the "Raise MC" line are in USD, pump.fun-style (`$4.2K`, `$10K`, `$1.5M`), at the live SOL price read in the browser from the Pyth SOL/USD feed account the program itself prices raises with (`chain.refreshSolUsd()`, once a minute, Full-verification updates only; falls back to the raise's SOL price at open). The SOL figure and the rate sit in the tooltip; Price mode stays in SOL. The chart never autoscales below zero (Josh's "0 0 0 0" axis was a scale dragged negative). The Launch page's USD figures and the $100K cap check use the same live price (they used a fixed $148.2). Why the devnet raises read `$12`: they raise 0.05 SOL, so their caps *are* twelve dollars; a 20 SOL raise opens at ~$4.6K, a 100 SOL raise at ~$23K. A minimum raise target (≈$2,000) would make pump.fun-scale caps a guarantee — a program change, Josh's call.
- **seed-qa pass #13 (wide, production): 2 P1, 9 P2, all fixed and re-verified.** F8: the Portfolio offered "Claim refund" on a filled raise mid-seeding (and counted it as a token claim) — it now shows "Seeding n/4" and "N tokens when it seeds", counts under neither, and `claim()` refuses until the raise resolves. F9: a raise opened after the board loaded never appeared until a reload — `raises` joined the Realtime publication and the board reloads its live list on a new raise or a stage change (verified: F9RT opened 07:21:12, on the board 07:21:17, through filled → seeded with no reload). P2s: Escape closes the bell; holders summary counts labelled wallets as wallets; chain checks persist ten minutes across tabs and a badge with checks pending says "so far"; the Portfolio without a wallet names the demo book; links are https-only; cancelled raises read "Cancelled" on the founder card; docs panels say 1.25%; descriptions cannot carry remote images (tracking pixels).
- **My own production pass:** 82 routes at 1440 and 14 at 390 with no overflow, no NaN/undefined, no console errors; database cross-check over all 61 raises (contributions sum to `raised` and `backers` everywhere, no raise stuck seeding, every seeded raise has a pool and fee); indexed prices equal the live pool on all 8 pools with trades; a live buy moved the board's row and tile ~3 s after the transaction, in dollars.

## Fixed earlier (2026-10-15, from the e2e rounds and seed-qa passes #8–#12)
- **Market cap by default, and accurate (Josh's ask):** the seeded page's chart opens on MCap (Price is a toggle away; the raise line reads "Raise MC"); lane rows and tiles show `MC <cap> SOL` (the pool's price over the 1e9 supply; a live raise shows the market cap it opens at). Under it, a real accuracy bug: the indexer stored each swap's *average fill* as its price, which on a thin pool is nowhere near where the pool ends up (fee9's chart closed at 0.663 SOL MC while the pool sat at 0.388). A trade's price is now where the pool stands after the swap: the pool account's exact `sqrt_price` for the latest swap, the vaults' post-swap ratio from the transaction for older ones. All 47 existing trades re-priced from their transactions. Verified live: a sell's indexed price equals the pool's sqrt price to every digit, and the page's Market cap stat equals the chart's last close.
- **Market caps in dollars (Josh's ask, 2026-10-15):** every MC figure (rows, tiles, the page stat, the chart's MCap axis and "Raise MC" line) is quoted in USD, pump.fun-style ($4.2K, $10K, $1.5M), at the live SOL price read in the browser from the program's own Pyth SOL/USD feed account (`chain.refreshSolUsd()`, once a minute; falls back to the raise's SOL price at open). The SOL figure and the rate sit in the tooltip. The chart never autoscales below zero. A devnet raise's cap is a few dollars by nature (0.05 SOL raised); the formatting is the same one a real raise will show in thousands.
- **Every trade exact (QA P2-52):** the indexer reads `next_sqrt_price` from DAMM's own swap event (EvtSwap2, a self-CPI in the transaction), so backfilled and historical swaps are priced exactly too, not just the latest; all 55 trades re-priced. **Rows tick per trade (P2-51):** the board joins one Realtime channel on `trades` and patches a raise's rows and tiles as a swap is indexed (~2 s); a reload keeps each raise's pool price (no flash of the raise price).
- **A pool the RPC will not read** (429, lagging node) used to show the *raise* price as the market, silently. It now shows the last indexed trade's price, marked "last trade" (stat note, pill on the pool card, Liquidity "—"), on the page and in the lanes.
- **QA P2-49:** the backfill pages back through a pool's signatures (`before`, 100 a page, up to 10 pages) until the window is covered or the pool's first transaction, so a busy launch keeps its first swaps. **P2-50:** each pool's own fee (read from its account at byte 8, kept in `raises.pool_fee_bps`) prices its swaps, not the env's setting; the six trades on the 1% pools were re-priced.
- **Indexing gap (P1, F7):** Helius only delivers a pool's transactions once the pool is on the webhook's address list, so a swap in the first minute after seeding was never indexed — exactly the early buys. The swap reader moved to `supabase/functions/_shared/swaps.ts` and the crank backfills from `getSignaturesForAddress` every pass for 30 minutes after seeding, then hourly for the last two hours. Reproduced and verified on `bkf-6m8ltg6e` (a buy 7 s after seeding, missed by the webhook, indexed by the next crank pass).
- **Alerts bell (P1, F6):** the popover never showed (`.pop` needs `.open`; only `hidden` was toggled). Fixed; "Latest 30 of N" when more are stored; compact Clear.
- **Load-order race:** another open Seed tab saves every second; its storage event reached a fresh tab before `x.js` had loaded (console `ReferenceError: xAdapter`) and replaced the raise objects mid-read so the Info tab stayed on "Reading the chain…". The storage listener waits for boot; chain checks live in a cache by raise id.
- **Lagging RPC node:** a pool served from before its liquidity landed made the SDK throw "Amount out must be greater than 0" into the trade panel. The quote re-reads the pool once, then says the pool is still settling.
- **Creator fees card** follows every live trade (it sat stale until a reload).
- **Polish:** a chain check with nothing to grade stays with the checks; a real wallet's portfolio rail drops the demo Deposit/Withdraw form; watch-only lanes say the watchlist is empty; amounts under 0.1 keep two significant figures (0.005 SOL, not 0.01); a refunded raise's chat is badged Closed; Max with nothing to spend says to add SOL; `refreshHolding` re-checks the wallet after the await.

## Still open
- **Needs Josh:** an Irys node wallet for mainnet metadata (devnet keeps token JSON in Supabase storage; the `seed` function's `upload-url` routes to Irys when `SEED_NETWORK=mainnet`); the mainnet pick-up check (which of Axiom / GMGN / DEXScreener / Birdeye / Jupiter list the first mainnet token); the takeover question on unvested team tokens (kept as is: unlocks keep paying the moved payout wallet).
- **Next program upgrade** (BACKLOG P2, ~3 SOL of devnet buffer): snapshot `pool_fee_bps` on the Raise at opening; sweep the dust `crank_pool` leaves.
- **Polish** (BACKLOG P2): Axiom/GMGN extras — 5m/1h/6h/24h stats strip, USD/SOL toggle and 1s/30s intervals, editable quick amounts, Bought/Sold/PnL in Your position, figures row by the name.
- **Not testable without Josh:** the Phantom signing UI itself (both sessions only ever sign with the scripted test wallets); every signed flow was exercised through the same instructions from `keys/test/`.

## Mainnet path (in order, from `program/README.md`)
1. Irys wallet + secret, `SEED_NETWORK=mainnet` on the `seed` function.
2. Mainnet program build (no test mode, Arweave-only URIs), deploy, Squads multisig as upgrade authority, `init_config` with 125 bps.
3. A Helius mainnet webhook on the program; `SEED_RPC_URL`, `SEED_POOL_FEE_BPS=125`, the crank's pg_cron schedule.
4. One small real raise end to end, then the pick-up check.

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
