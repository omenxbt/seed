# Decisions

Layout and product calls made while building, with the reason. "What Seed is" in LOOP.md is never changed here.

- **SOL only at launch (the owner, 2026-10-26).** Every new raise pairs with SOL: the Launch form has no pair choice and no
  "What backers pay" block (backers see the 1% fee on the raise page's deposit panel), the board and the Filters dialog
  offer no pair, and the docs say SOL. On devnet TSTx is paused with `set_pair` (tx 3iMigYj8…xa6icaJ), so the program
  refuses it (PairPaused). The allowlist stays in the program so a pair comes back without an upgrade; older USDC and
  TSTx raises stay visible as history. USDC is built into `open_raise` and cannot be paused by config (BACKLOG, Re-enable
  other pairs).
- **Terminal lanes (Oct 2026).** At desktop width the Terminal shows three columns by stage — New raises (under 90%),
  Almost full (90%+ and seeding), Seeded & trading — each scrolling on its own and ending at the window's bottom (the owner
  dropped the Filling fast and Seeding lanes: five were too narrow to read), the way Axiom's Pulse and GMGN's
  board read at a glance. Below 1100px the existing tabbed board stays: five columns do not fit a phone, and a tab per
  stage is the same information. Trending stays above both. The lane split is by fill, not by pace, so a raise never
  jumps between lanes on a quiet hour; pace is a chip on the card.
- **Watchlist is a star, kept in the browser.** A watched raise is a per-device thing like a filter; nothing about it
  belongs on chain or in Seed's database, so it lives with the demo state and the alerts read it from there.
- **Search matches contract addresses and X handles** as well as names and tickers, because a CA pasted from a wallet
  or a handle from a post is how traders arrive from elsewhere.
- **Pool fee 1.25%, so 1% of volume reaches the position (the owner, Oct 2026).** A DAMM v2 customizable pool pays 20% of its
  fee to Meteora's protocol, which the first fee claim exposed. Rather than show the founder 0.56% of volume, the pool
  fee is 1.25%: Meteora keeps 0.25%, the locked position earns 1%, split 70/30 as before. Set in the program's Config
  (`pool_fee_bps = 125`), `SEED.poolFeeBps`, the docs and LOOP.md.
- **The chart on a live pool is TradingView's Lightweight Charts, the demo keeps the hand-drawn SVG.** Real data needs
  pan, zoom and live updates; the demo's random walk does not, and loading a 160 KB library for it would slow the
  prototype pages.
- **Safety checks are read from the chain, founder choices are facts.** Name clash and website moved from graded
  checks to plain rows: neither is an on-chain fact, and LOOP.md says safety checks cover only those.
