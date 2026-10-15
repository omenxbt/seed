# Backlog, ranked

P0 = broken on devnet or breaks "What Seed is". P1 = a target feature missing. P2 = polish. QA findings keep the priority QA gave.

## P1
1. **Real trading (Phase 3).** In-page buy/sell on the raise's DAMM v2 pool: quote, slippage (2% default, editable), price impact warning, priority fee, wallet signature, explorer toast, balance refresh. Sell with 25/50/100%.
2. **Live data (Phase 4).** Pool added to the Helius webhook at seeding; swaps parsed into `trades`; OHLCV 1m/5m/1h/1D; Lightweight Charts with Price/MCap + volume, live via Realtime; stats from reserves and trades; Trades tab; creator fees read from the position.
3. **Terminal columns.** New raises / Filling fast / Almost full / Seeding / Seeded & trading as live columns with the full card chip set; watchlist; search by CA or X handle.
4. **Safety panel from on-chain facts only.** Mint/freeze authority, LP lock, metadata immutability, holder concentration, fresh and bundled wallets read from the chain for live raises (no demo checks on real raises).
5. **Founder profile page.** Wallet, optional X, past raises and outcomes, fees earned, unlock history.
6. **Portfolio for real wallets.** PnL graph and calendar, open positions, history, claims, Creator tab from chain and Supabase data.
7. **Launch preview extras.** Pool depth, "a 10 SOL buy moves the chart X%", founder fee income at $5K/$25K/$100K daily volume.
8. **Alerts.** In-app notifications for watched raises (filled, seeded, refunds open, unlocks).
9. **Trade on links (Phase 5, mainnet only)** and the mainnet launch checklist in the README.
10. **Top traders and PnL** on seeded raises (from `trades`).

## P2
- Optional min buy / max per wallet / whitelist in the program (the site's profile carries them; the program does not enforce them yet).
- Priority fee setting in the trade panel.
- Docs page pass for the new features.

## Done
- Phase 2 token metadata: RaiseMeta PDA, immutable Metaplex metadata in the mint step, JSON upload at launch, DAS-verified on devnet.
- Phase 1 bugs (cd95e7b): holders by mint with labels, Backers tab after seeding, CA chip, on-chain addresses, honest rail copy, clipped/bucketed charts, subscript prices, plurals.
