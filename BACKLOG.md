# Backlog, ranked

P0 = broken on devnet or breaks "What Seed is". P1 = a target feature missing. P2 = polish. QA findings keep the priority QA gave.

## P1
1. **Live data (Phase 4).** Pool added to the Helius webhook at seeding; swaps parsed into `trades`; OHLCV 1m/5m/1h/1D; Lightweight Charts with Price/MCap + volume, live via Realtime; stats from reserves and trades; Trades tab; creator fees read from the position.
2. **Terminal columns.** New raises / Filling fast / Almost full / Seeding / Seeded & trading as live columns with the full card chip set; watchlist; search by CA or X handle.
3. **Safety panel from on-chain facts only.** Mint/freeze authority, LP lock, metadata immutability, holder concentration, fresh and bundled wallets read from the chain for live raises (no demo checks on real raises).
4. **Founder profile page.** Wallet, optional X, past raises and outcomes, fees earned, unlock history.
5. **Portfolio for real wallets.** PnL graph and calendar, open positions, history, claims, Creator tab from chain and Supabase data.
6. **Launch preview extras.** Pool depth, "a 10 SOL buy moves the chart X%", founder fee income at $5K/$25K/$100K daily volume.
7. **Alerts.** In-app notifications for watched raises (filled, seeded, refunds open, unlocks).
8. **Trade on links (Phase 5, mainnet only)** and the mainnet launch checklist in the README.
9. **Top traders and PnL** on seeded raises (from `trades`).

## P2
- **QA P2-4 (seed-qa):** dust after crank_pool — ~0.5 token left in the pool staging vault and ~0.001 wSOL in the raise's stage after the DAMM deposit rounds. Burn or sweep both in crank_seed (program change; next upgrade).
- Optional min buy / max per wallet / whitelist in the program (the site's profile carries them; the program does not enforce them yet).
- Priority fee setting in the trade panel.
- Docs page pass for the new features.

## Done
- Phase 3 real trading: in-page swaps on the DAMM v2 pool through Meteora's SDK, slippage, impact warning, explorer toast, balance refresh.
- QA Phase 2 findings (seed-qa): P2-8 docs say the update authority is the raise PDA (not removed); P2-9 a raise with no page record shows its metadata image.
- QA Phase 1 findings (seed-qa): P1-1 crank timeout follows the config's seed timeout and test mode; P1-2 deposit panel caps tokens at the room with the fee left out; P1-3 devnet pools link to devnet.meteora.ag; P2-1 no repeated axis labels; P2-2 Demo chip on demo tiles when the site is live; P2-3 holders header wording; P2-5 raised and target share decimals; P2-6 holder labels wrap under the address at phone width; P2-7 no Reset demo on live raise pages.
- Phase 2 token metadata: RaiseMeta PDA, immutable Metaplex metadata in the mint step, JSON upload at launch, DAS-verified on devnet.
- Phase 1 bugs (cd95e7b): holders by mint with labels, Backers tab after seeding, CA chip, on-chain addresses, honest rail copy, clipped/bucketed charts, subscript prices, plurals.
