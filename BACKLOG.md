# Backlog, ranked

P0 = broken on devnet or breaks "What Seed is". P1 = a target feature missing. P2 = polish. QA findings keep the priority QA gave.

## P1
1. **Safety panel from on-chain facts only.** Mint/freeze authority, LP lock, metadata immutability, holder concentration, fresh and bundled wallets read from the chain for live raises (no demo checks on real raises).
2. **Founder profile page.** Wallet, optional X, past raises and outcomes, fees earned, unlock history.
3. **Portfolio for real wallets.** PnL graph and calendar, open positions, history, claims, Creator tab from chain and Supabase data.
4. **Launch preview extras.** Pool depth, "a 10 SOL buy moves the chart X%", founder fee income at $5K/$25K/$100K daily volume.
5. **Alerts.** In-app notifications for watched raises (filled, seeded, refunds open, unlocks).
6. **Trade on links (Phase 5, mainnet only)** and the mainnet launch checklist in the README.
7. **Top traders and PnL** on seeded raises (from `trades`).

## P2
- **Axiom/GMGN patterns from QA (P2-15..19):** Your position with Bought / Sold / Holding / PnL for traders; editable quick-amount presets saved per wallet; a 5m/1h/6h/24h strip (change, buys/sells, net volume) above the panel; Price/MCap/Liquidity/24h volume in a row by the name and CA; a USD/SOL toggle and 1s/30s intervals.
- **QA P2-4 (seed-qa):** dust after crank_pool — ~0.5 token left in the pool staging vault and ~0.001 wSOL in the raise's stage after the DAMM deposit rounds. Burn or sweep both in crank_seed (program change; next upgrade).
- Optional min buy / max per wallet / whitelist in the program (the site's profile carries them; the program does not enforce them yet).
- Priority fee setting in the trade panel.
- Docs page pass for the new features.

## Done
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
