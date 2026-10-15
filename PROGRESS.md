# Progress: the terminal build on `final-model`

Phases ship in order on `final-model`; each is verified on devnet before the next starts. `seed-qa` tests each pushed phase
independently; its notes live in `QA.md` (not committed by this session).

| Phase | State | Pushed |
|---|---|---|
| 1 Bugs | done, verifying on devnet | see git log |
| 2 Token metadata | not started | |
| 3 Real trading | not started | |
| 4 Live data | not started | |
| 5 Terminal ready (mainnet only) | not started | |

## Phase 1: bugs — done when
- Holders tab lists every holder of the token mint (Helius DAS `getTokenAccounts`, plain-RPC fallback) with the accounts Seed opened labelled: Locked pool, Backers unclaimed, Team vesting, Pool staging, Seed, Founder payout. Backers tab lists contributions, with the claim state after seeding.
- After seeding the header chip is the token mint, labelled CA, with copy. The raise account, mint, pool and payout wallet are under Info → On chain, each with copy and an explorer link.
- "Simulated on the demo wallet" and the Demo pill appear only on demo raises. A live raise's deposit panel says the transaction is sent from the wallet; a live seeded raise links to its Meteora pool (the in-page swap is Phase 3).
- Charts clip to their card; the raise line and the projection stay inside the plot; buys are bucketed to the raise's length (10 s … 1 day, 24–72 buckets); candle time labels fit at 1440, 1024 and 390. A live pool with no indexed trades shows flat candles at the raise price (real candles are Phase 4).
- Tiny prices read `0.0₅1234` everywhere a price shows (`fmtPrice`).
- Counts pluralise: 1 backer, 2 backers; wallets, holders, accounts, milestones, announcements, pages, followers, funding wallets.

## Phase 2: token metadata — done when
- At launch the token JSON (name, symbol, description, image, website/X/Telegram when given) is uploaded to permanent storage: Arweave via Irys on mainnet, Supabase storage on devnet.
- The seed mint step creates Metaplex Token Metadata with that URI and makes it immutable (`is_mutable = false`, update authority removed). The token stays a standard SPL token.
- Program tests: metadata exists, matches the launch form, is immutable. Redeployed to devnet. Phantom shows the token name and image.

## Phase 3: real trading — done when
- On a seeded live raise the trade panel quotes and sends real swaps on the raise's DAMM v2 pool (`@meteora-ag/cp-amm-sdk`): quote, minimum out from an editable slippage (default 2%), price-impact warning above 5%, wallet signature, toast with an explorer link, balance refresh.
- Buy and Sell both work; Sell defaults to the token balance with 25/50/100% buttons. Demo raises keep the simulated panel.

## Phase 4: live data — done when
- When a raise seeds, its pool address is added to the Helius webhook; DAMM v2 swaps are parsed into a `trades` table (signature, pool, side, SOL amount, token amount, price, trader, slot, time).
- A SQL function/view builds 1m, 5m, 1h, 1D OHLCV from trades; the first candle opens at the raise price.
- The chart is TradingView Lightweight Charts with Price/MCap and volume bars, live through Supabase Realtime; no demo candles on real pools.
- Liquidity from pool reserves; 24h volume and trade count from trades; price vs raise price; holder count. A Trades tab lists the latest swaps.
- Creator fees: earned and claimable read from the pool position; the claim sends 70% to the payout wallet and 30% to the Seed treasury.

## Phase 5: terminal ready (mainnet only) — done when
- Seeded raises carry "Trade on" links with the mint prefilled: Axiom, GMGN, DEXScreener, Birdeye, Jupiter, each URL checked against the live site.
- `README` has a mainnet launch checklist: one small real raise, then Phantom name/image, DEXScreener, Birdeye, Jupiter, Axiom and GMGN pick-up, with a report of which do not.

## Done when, on devnet with two wallets (the founder is not the admin)
- Phantom shows the token name and image.
- Buys and sells from both wallets land; candles and the Trades tab update within seconds.
- The holders list is correct.
- Claiming fees sends 70% to the founder's payout wallet and 30% to the Seed treasury, checked on chain.
- No chart clips at any width; no console errors.
