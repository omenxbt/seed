# Backlog, ranked

P0 = broken on devnet or breaks "What Seed is". P1 = a target feature missing. P2 = polish. QA findings keep the priority QA gave.

## P1
_None open. The Trade-on links and the mainnet checklist shipped in Phase 5; the live pick-up check needs a mainnet raise (Needs Josh)._

## P2
- **QA P2-26 (seed-qa, program change):** snapshot `pool_fee_bps` on the Raise at `open_raise` (as `creator_share_bps` is) so a raise live across a config change seeds at the fee its backers saw. Next program upgrade, with P2-4.
- **Axiom/GMGN patterns from QA (P2-15..19):** Your position with Bought / Sold / Holding / PnL for traders; editable quick-amount presets saved per wallet; a 5m/1h/6h/24h strip (change, buys/sells, net volume) above the panel; Price/MCap/Liquidity/24h volume in a row by the name and CA; a USD/SOL toggle and 1s/30s intervals.
- **QA P2-4 (seed-qa):** dust after crank_pool — ~0.5 token left in the pool staging vault and ~0.001 wSOL in the raise's stage after the DAMM deposit rounds. Burn or sweep both in crank_seed (program change; next upgrade).
- Optional min buy / max per wallet / whitelist in the program (the site's profile carries them; the program does not enforce them yet).
- Docs page pass for the new features.

## Done
- Josh's pass (2026-10-15): three lanes (New raises under 90%, Almost full 90%+ and seeding, Seeded & trading) that end at the window's bottom and scroll inside; smaller Trending; frosted glass on lanes and rows; entrances without opacity so the glass is there from the first frame; the launch form no longer reloads the page (its segment buttons were submitting the form); the Founder card's Profile icon replaced by a link on the raises row.
- QA pass #4 (seed-qa, clean): P2-37 the launch Closes row follows the config's test mode without a wallet; the buy-impact figures leave the pool fee out of the price.
- Top traders and PnL (B6): a Top traders tab on seeded live raises — bought, sold, holding, realised, unrealised, PnL per wallet from the indexed trades and claims.
- Fresh and bundled wallet checks from chain (B7): already the case for live raises — backers.enrich() reads each real backer's first transaction and funder from the chain (getSignaturesForAddress/getTransaction, the largest 20, cached a day) and the Info rows carry the Live pill; the backlog wording was stale.
- QA regression #3 (seed-qa): P2-35 pool depth reads per side with the total; big moves read ×N; P2-36 one test-mode close time.
- Alerts (B5): a bell in the header; watched, backed, held and opened raises raise an alert (and a toast) when they fill, seed, refund, pass a team unlock or move their payout wallet; kept in the browser with the watchlist.
- Launch preview extras (B4): pool depth at opening and what a 1/10/100 SOL (or 100/1K/10K USDC) buy does to the price; the founder's fee income at $5K/$25K/$100K daily volume was already there.
- QA on 845347f (seed-qa): P1-F4 a real wallet's Creator tab lists only the raises it opened on chain, totals per pair asset, fees read from the positions; P2-32 held team tokens show as positions and vested claims are indexed (vested_claims) into the history; P2-33 day results summed unrounded; P2-34 refunded rows show what was paid and refunded.
- Portfolio for real wallets (B3): contributions, swaps and token balances from the indexer and the chain → lots at average cost, realised results by day in SOL (graph and calendar), open positions with value/unrealised/realised, a history with tx links; the Creator tab reads the position's fees.
- QA regression #2 (seed-qa): P2-27 small raised figures keep their digits; P2-28 demo founders get Profile links; P2-29 the profile is titled by name, X handle or wallet; P2-30 fee totals per pair asset; P2-31 the crank claims unlocked team tokens to the payout wallet (idempotent token account).
- Founder profile (B2): #/founder/<wallet> from the raise's Founder card — wallet, X, every raise with its outcome, fee income per seeded raise with the indexed claims, team unlocks.
- QA push 9 (seed-qa): P1-F3 the page shows each pool's own fee, read from its state (cliff fee numerator), not the site's setting.
- QA pushes 6–7 (seed-qa): P1-F1 the trades watch waits for the Supabase client (the channel was never opened on a fresh load); P1-F2 seeded cards show the pool's price and change from the reserves; P2-23 the refund note only for a wallet owed one; P2-24 compact lane rows.
- Terminal lanes (B1): five stage columns at desktop width (tabbed board below 1100px), a starred watchlist with a toggle, search by name, ticker, CA, raise account or X handle, price on every card. Why: DECISIONS.md.
- QA regression #1 (seed-qa): P1-F1 the price, market cap and position's worth re-read from the pool's reserves after each trade; P2-20 chart time in local time; P2-21 MCap axis labels with significant digits; P2-22 room for the top label.
- Safety checks from the chain (QA P1-4): mint and freeze authority, liquidity lock (permanently locked, NFT in the raise account), metadata immutability, top-10 holder concentration; name/ticker and website are plain facts now.
- Phase 5: Trade-on links (mainnet only, URL forms checked in a browser) and the mainnet launch checklist.
- QA Phase 3 findings (seed-qa): P1-5 fee maths include Meteora's 20% protocol share (site, docs, launch preview); P1-6 priority fee (Auto / custom SOL) in the trade panel as a compute-unit price; P2-2 Demo chip on Trending tiles; P2-6 holders table fits a phone; P2-10 explorer links carry the cluster; P2-11 the footer starts on the live line; P2-12 small fee figures readable; P2-13 the impact figure turns red; P2-14 the room message names the payment with the fee.
- Phase 4 live data: trades table and candles, Lightweight Charts live via Realtime, pool figures from chain and trades, Trades tab, position fees.
- Phase 3 real trading: in-page swaps on the DAMM v2 pool through Meteora's SDK, slippage, impact warning, explorer toast, balance refresh.
- QA Phase 2 findings (seed-qa): P2-8 docs say the update authority is the raise PDA (not removed); P2-9 a raise with no page record shows its metadata image.
- QA Phase 1 findings (seed-qa): P1-1 crank timeout follows the config's seed timeout and test mode; P1-2 deposit panel caps tokens at the room with the fee left out; P1-3 devnet pools link to devnet.meteora.ag; P2-1 no repeated axis labels; P2-2 Demo chip on demo tiles when the site is live; P2-3 holders header wording; P2-5 raised and target share decimals; P2-6 holder labels wrap under the address at phone width; P2-7 no Reset demo on live raise pages.
- Phase 2 token metadata: RaiseMeta PDA, immutable Metaplex metadata in the mint step, JSON upload at launch, DAS-verified on devnet.
- Phase 1 bugs (cd95e7b): holders by mint with labels, Backers tab after seeding, CA chip, on-chain addresses, honest rail copy, clipped/bucketed charts, subscript prices, plurals.
