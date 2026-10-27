# Seed status — 2026-10-26, 17:10 PT
**Where it stands:** QA gate: full pass #33 in progress and not clean (F24 and F25 fixed mid-pass, F27 open); 0 of 2 clean passes.

| Section | Done | Total | State |
|---|---|---|---|
| A. Housekeeping | 5 | 5 | done |
| B. Scope changes | 6 | 7 | blocked: B2's USDC half needs the owner |
| C. Remaining fixes | 5 | 8 | in progress |
| D. UI simplification | 0 | 4 | in progress (the owner kept two pieces on the original UI, b8abe02) |
| E. QA gate | 2 | 4 | in progress: pass #33 running |
| F. Final testing | 0 | 9 | not started |

**Done since last update:**
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

**In progress:** C6, the remaining P2s in QA.md: P2-97 to P2-104 verified fixed on the live code; P2-71 to P2-76, which QA.md names without a description, go to BACKLOG.md with that reason. seed-cc is fixing seed-qa's pass #33 findings (F25 done in 66ea505, F27 next).

**Blocked:**
- B2 (USDC refused on chain), since 16:00 PT: `open_raise` takes USDC without the allowlist, and B3 rules out the program change. Waiting on the owner.

**Needs the owner:**
1. USDC (B2 against B3): accept that USDC stays open on chain while the site offers SOL only, or allow the small program change.
2. ui-simplify (D): "revert" to delete the branch (its two kept pieces are already on the original), or "keep" to merge it.
3. After the QA gate: the Phantom click-through (launch a Test-preset raise, back it, watch it seed, claim, trade).
4. Refund checks: one cancelled raise, one missed deadline.
5. Phone check.
6. Takeover policy for unvested team tokens: burn or keep.
7. Staging presets ($150/$300/$450/$600, or $50K in place of $600) and mainnet funding: deployer 5.0, staging backer 0.75, Irys 0.01 SOL.

**QA:** pass #33 (seed-qa, started on 03f8677): not clean. P1-F24 fixed (9969833), P0-F25 fixed (66ea505), P1-F27 open; out of scope: F21, F22. Consecutive clean: 0. Open P2s: being sorted under C6.

**Live:** final-model and main 88ebc1a, https://seed-nu-ten.vercel.app (production builds from main on every push). ui-simplify c91608e, preview on Vercel's ui-simplify branch URL (it carries the account slug, so it is not written here). Devnet program 8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn at slot 515474928 (the 85dc510 build). Deployer 10.00 SOL; crank 1.12; QA founder 0.335, backer1 0.250, backer2 0.268.
