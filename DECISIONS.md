# Decisions

Layout and product calls made while building, with the reason. "What Seed is" in LOOP.md is never changed here.

- **Terminal lanes (Oct 2026).** At desktop width the Terminal shows five columns by stage — New raises, Filling fast
  (50–90%), Almost full (90%+), Seeding, Seeded & trading — each scrolling on its own, the way Axiom's Pulse and GMGN's
  board read at a glance. Below 1100px the existing tabbed board stays: five columns do not fit a phone, and a tab per
  stage is the same information. Trending stays above both. The lane split is by fill, not by pace, so a raise never
  jumps between lanes on a quiet hour; pace is a chip on the card.
- **Watchlist is a star, kept in the browser.** A watched raise is a per-device thing like a filter; nothing about it
  belongs on chain or in Seed's database, so it lives with the demo state and the alerts read it from there.
- **Search matches contract addresses and X handles** as well as names and tickers, because a CA pasted from a wallet
  or a handle from a post is how traders arrive from elsewhere.
- **Fee figures include Meteora's protocol share.** A DAMM v2 customizable pool pays 20% of its fee to Meteora; the
  site shows the founder 0.56% and Seed 0.24% of volume rather than 0.7/0.3, because the first claim would have exposed
  the gap. The 70/30 split itself is unchanged.
- **The chart on a live pool is TradingView's Lightweight Charts, the demo keeps the hand-drawn SVG.** Real data needs
  pan, zoom and live updates; the demo's random walk does not, and loading a 160 KB library for it would slow the
  prototype pages.
- **Safety checks are read from the chain, founder choices are facts.** Name clash and website moved from graded
  checks to plain rows: neither is an on-chain fact, and LOOP.md says safety checks cover only those.
