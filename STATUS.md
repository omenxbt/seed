# Seed status — 2026-10-26, 18:00 PT
**Where it stands:** QA gate: 0 of 2 clean passes; #34 not clean (P1-F28, fixed in 2bb0188); #35 next, on final-model 7a35f70.

| Section | Done | Total | State |
|---|---|---|---|
| A. Housekeeping | 5 | 5 | done |
| B. Scope changes | 6 | 7 | blocked: B2's USDC half needs the owner |
| C. Remaining fixes | 8 | 8 | done (on final-model 7a35f70) |
| D. UI simplification | 3 | 4 | waiting on the owner: keep or revert |
| E. QA gate | 2 | 4 | in progress: #35 next on 7a35f70 |
| F. Final testing | 0 | 9 | not started |

**Done since last update (18:00):**
- C6-C8 and the owner's raise page asks merged into final-model: 7a35f70 (Creator fees in a window from the founder card, no "How it raised" on a seeded raise, the pool figures in the left panel, the Solana mark in the buy fields, the Trending bar rolling without end)

**Done (17:38):**
- C6 the remaining P2s: P2-97 to P2-104 verified fixed; P2-71, 72, 73, 75, 76 to BACKLOG (QA.md never describes them) [dfcc7f6]
- C7 Axiom and GMGN buttons on every seeded raise page; disabled with the reason on devnet [658f153]
- C8 a seeded raise's Info tab carries its DEXScreener profile (icon, header, plain-text description, links), Copy as JSON and the form link [7fd0803]
- D1 green Buy / red Sell back on ui-simplify [29a8215]
- D2 ui-simplify up to date with final-model [eee8ff7]
- D3 the ui-simplify pass handed to seed-qa, queued behind the gate

**Done before (17:10):**
- A1 personal names out of tracked files [8d0e1ce]
- A2 Vercel builds every push on its own [6bbd066; dpl_BL4wLbfx, dpl_28P96Uk2, dpl_548M2PLt, dpl_6pwo4xSc]
- A3 the 10:21 AM CLI deploy was a clean export of commit 7e5f845: nothing uncommitted shipped [dpl_PLUmaCPf]
- A4 deployer 10.00 SOL, no buffers left
- A5 devnet program on the 85dc510 build [slot 515474928, tx 4n3PD67P…ioq185c]; suite 28/28 on a local validator with that build
- B1 no pair selector on the Launch form [03f8677]
- B3 no program change for USDC; the allowlist stays [03f8677]
- B4 MAINNET.md, check-deploy.ts and the staging init are SOL only [03f8677]
- B5 SOL in the docs and all copy, the brand kit included [03f8677, 30e1382]
- B6 F21 and F22 under "Re-enable other pairs" in BACKLOG.md [03f8677]
- B7 "What backers pay" gone; the deposit panel shows "Seed fee, 1%, included" [03f8677]
- C1 no "Yours" tag without a wallet [88ebc1a]
- C2 no $100K cap in the docs [88ebc1a]
- C3 /r links name the request's host [e5b4152]
- C4 raise links by account address and by mint [88ebc1a]
- C5 refund counts "claimed / backers" [f4f0d65 and the indexer backfill]
- E1 scope sent to seed-qa; pass #33 running since 03f8677
- E4 QA wallets above 0.05 SOL
- Also, outside the checklist: the one-line Trending bar and no background effects on the original UI [b8abe02]

**In progress:** seed-qa's full pass #35 on 7a35f70 (#34 on 0fc8490 found P1-F28, fixed in 2bb0188, and P2-105 to P2-107). seed-cc fixes what it finds. main stays at 0fc8490 until seed-qa passes the change.

**Blocked:**
- B2 (USDC refused on chain), since 16:00 PT: `open_raise` takes USDC without the allowlist, and B3 rules out the program change. Waiting on the owner.

**Needs the owner:**
1. USDC (B2 against B3): accept that USDC stays open on chain while the site offers SOL only, or allow the small program change.
2. ui-simplify (D): "revert" to delete the branch (its two kept pieces are already on the original), or "keep" to merge it.
3. Admin actions for seed-qa, signed in your Phantom (the Config admin): flag fraud on raise G1aiNZza… (QA Q34X); approve the takeover on Eev4YwcB… (QA Pass 34D) to 6D8kCB4Y…; then flag the X-attested test raise a builder opens. Exact steps in PROGRESS.md.
4. After the QA gate: the Phantom click-through (launch a Test-preset raise, back it, watch it seed, claim, trade).
5. Refund checks: one cancelled raise, one missed deadline.
6. Phone check.
7. Takeover policy for unvested team tokens: burn or keep.
8. Staging presets ($150/$300/$450/$600, or $50K in place of $600) and mainnet funding: deployer 5.0, staging backer 0.75, Irys 0.01 SOL.

**QA:** #34 on 0fc8490: not clean (P1-F28; P2-105, 106, 107); F25 and F27 verified fixed on chain and in the UI. #35 next on 7a35f70. Consecutive clean: 0. Out of scope: F21, F22, paused-pair UI; USDC accepted on chain is the owner's open call.

**Live:** final-model 7a35f70 (preview), main 0fc8490 (production; 88ebc1a's code), https://seed-nu-ten.vercel.app (production builds from main on every push). ui-simplify eee8ff7, preview on Vercel's ui-simplify branch URL (it carries the account slug, so it is not written here). Devnet program 8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn at slot 515474928 (the 85dc510 build). Deployer 10.00 SOL; crank 1.12; QA founder 0.335, backer1 0.250, backer2 0.268.
