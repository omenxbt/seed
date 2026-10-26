# Seed build loop

## What Seed is (never change any of this)
Seed is a trading terminal for fixed-price presales that test product-market fit, on Solana and Meteora: "Axiom/GMGN for presales." The market decides what gets funded. Seed doesn't gate ideas or judge founder terms.

Raise
- The founder picks an opening market cap preset: $50K, $100K, $150K or $200K. No typed target, no custom option. The raise is derived: target = cap × (1 − team share) ÷ 2, priced in SOL (every raise pairs with SOL at launch; the program keeps its pair allowlist for later) at the Pyth SOL/USD price when the raise opens, and all of it goes into the pool. The presets are the floor and the ceiling; there is no separate minimum or maximum. The presets live in the program's Config, set once at init; a devnet build in test mode also allows a tiny Test preset (about $30) that no mainnet build has. The founder also sets a deadline (24h, 3d, 7d, 14d or 30d). Hard cap = target, so there's no partial raise.
- The founder can also set an optional minimum buy and maximum per wallet, enforced by the program. (A whitelist is not built; nothing shows one until the program enforces it.)
- Price is derived, never typed: price = target ÷ backer tokens.
- Seed fee: 1% on top of each buy, refunded with the buy if the raise doesn't seed.
- Miss or founder cancel: every backer claims a full refund (buy + fee), and the token never mints.
- Fill: anyone can run the seeding steps. If seeding hasn't finished 3 days after the fill, everyone is refunded.

Seeding
- Mint 1,000,000,000 tokens with metadata (name, symbol, image, links), made immutable. Revoke mint and freeze authority. Standard SPL token.
- Team share: set by the founder, any value from 0 up to (not including) 100%. Backers get (1B − team) ÷ 2 and the pool gets the same.
- Pool: Meteora DAMM v2 with 100% of the raise + the pool tokens, opening at the raise price (so the pool opens at the preset market cap), LP permanently locked, position owned by the Seed program PDA. Fees collected in the quote asset only (OnlyB).
- Backer tokens: pro rata, claimable right after seeding, no lockup.

Founder income
- Pool fee 1.25% (Meteora's protocol keeps 20% of it, so 1% of volume reaches the locked position), split 70% to the founder payout wallet and 30% to Seed, snapshotted at seeding. Anyone can trigger a claim, and Seed auto-claims on a schedule.
- Team allocation is optional and off by default (0% team: backers and the pool split the supply). When on, the team share is anything from 0% up to (not including) 100%, and the team tokens unlock either all at seeding or on the founder's own schedule: evenly every day, week or month for N of them, after an optional cliff, or custom dated tranches. No minimum length, no maximum, no cap on a slice, no rate limit. The program checks only what matters: the slices add up to exactly 100% of the team share, the dates increase, and everything is fixed at seeding. Paid to the payout wallet.
- Payout wallet changes wait 7 days and show on the raise page while pending.

Identity and trust
- A wallet is enough to launch. Linking X is optional and adds a Verified X badge with handle, age and followers. No KYC.
- One live raise per wallet.
- Anyone can file a report, and reports are public. Seed admins act only on fraud: blacklist the founder wallet, plus the X account if linked, and flag the page. Admins can also approve a community takeover, which moves the payout wallet.
- Team share, unlock schedule and token use case are always shown as plain information, never styled as warnings: the schedule reads as one plain sentence plus the next unlock date, with no warning and no impact figure. Safety checks cover only on-chain facts: mint and freeze authority, LP lock, metadata immutability, holder concentration, fresh and bundled wallets.
- There is no roadmap or milestones section. The token use case is optional, with "None, this is a bet on the team" allowed.
- Launch form: no tagline field, no minimum text lengths, only name, ticker, target and deadline required; no pair choice (SOL only).

Admin and program
- update_config can change only the treasury and attestor. The admin handover is two-step (propose, then accept). Nothing can change fees, the split, existing raises or founder payout wallets.
- Test mode (a day counts as a minute) exists only in devnet builds.
- Never decide what happens to unvested team tokens on a takeover. It's an open decision: keep current behaviour and list it under "Needs Josh."

## Never build
Treasuries, voting, follow-on raises or reserves, bonding curves, launches without a presale, perps or leverage, custodial wallets, bots that trade without the user's signature, KYC or required X, warnings on founder terms, fake or demo data on real raises, and anything that changes "What Seed is." Copy patterns from Axiom and GMGN, never their branding, logos, names or text.

## Brand
Dark UI, Instrument Sans + Instrument Serif italic + IBM Plex Mono, accent #2E63E7, the existing Seed logo. Redesign layouts if it's better, and write why in DECISIONS.md.

## Target feature set (reference: Axiom Pulse and token pages, GMGN token pages and wallet tools)
1. Terminal: live columns (New raises / Filling fast / Almost full / Seeding / Seeded & trading). Cards show ticker, fill %, time left, backers, price, Verified X and safety chips. Filters (including Verified X only), sort, search by name, ticker, CA or X handle, and a watchlist.
2. Raise page, live: fill bar and pace, raised-over-time chart, backers list, deposit panel with quick amounts, refund countdown, seeding steps with "run next step".
3. Raise page, seeded: real-time TradingView Lightweight chart (price/MCap, 1s to 1D, volume, raise price line), real trade panel on the DAMM v2 pool (buy/sell, quick amounts, slippage, priority fee, price impact), live trades tape, holders with labels (Pool, Team vesting, Seed) and top-10 %, top traders and PnL, safety panel, creator fees, team unlocks, roadmap, announcements, reports, chat, and "Trade on" links (Axiom, GMGN, DEXScreener, Birdeye, Jupiter; mainnet only).
4. Founder profile: wallet, optional X, past raises and outcomes, fees earned, unlock history.
5. Portfolio: PnL graph and calendar, open positions, history, claims (tokens, refunds), and a Creator tab (fees, unlocks, payout wallet and pending change).
6. Launch: the full form with a live preview (supply split, derived price, FDV, pool depth, "a 10 SOL buy moves the chart X%", founder fee income at $5K, $25K and $100K daily volume), validation and metadata upload.
7. Alerts: in-app notifications for watched raises (filled, seeded, refunds open, unlocks).
8. Docs page in plain English. Every page works at 390px.

## Each iteration
Each iteration, work the first unticked item in CHECKLIST.md that doesn't need the owner; tick it only when verified, with the commit or tx in brackets.
1. Read BACKLOG.md, PROGRESS.md, QA.md and any new seed-qa messages.
2. Pick the highest-value item: P0 bugs first, then missing target features, then polish. Keep BACKLOG.md ranked and add what you discover.
3. Build it. Test on devnet with saved scripted wallets in keys/test/ (gitignored).
4. Launch a fresh review subagent with the item's acceptance criteria, the diff and the "What Seed is" section. It fails anything that breaks those rules. Fix until it passes.
5. Commit, push to final-model, then update PROGRESS.md (what shipped, commit, screenshots) and BACKLOG.md. The push is the deploy: Vercel builds final-model as the preview and main as production from GitHub on its own, so there is no manual `vercel deploy` step.
6. seed-qa findings go into BACKLOG.md at the priority it gave.

## Stop and push me a notification only if
- Something needs mainnet, real money, or deleting data or accounts.
- The deployer is below 1 SOL and test wallets can't refill it.
- A change would alter "What Seed is."
Everything else that needs me goes in a "Needs Josh" list at the top of PROGRESS.md, and you keep going.

## Finished when
- Every item in the target feature set works on devnet with real data.
- BACKLOG.md has no P0 or P1 items.
- seed-qa reports two full regression passes in a row with no P0 or P1 issues.
- No console errors, every page works at 1440 and 390, and pages load in under 2s on the preview.
Then write the final report in PROGRESS.md, push me "Seed build done: <summary>", and end the loop.
