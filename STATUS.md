# Seed status — 2026-10-26, 19:45 PT
**Where it stands:** Waiting on the owner for final testing. The QA gate passed on 895ec60 (full passes #36 and #37 clean).

| Section | Done | Total | State |
|---|---|---|---|
| A. Housekeeping | 5 | 5 | done |
| B. Scope changes | 6 | 7 | B2's USDC half needs the owner |
| C. Remaining fixes | 8 | 8 | done |
| D. UI simplification | 3 | 4 | the owner: keep or revert |
| E. QA gate | 4 | 4 | done |
| F. Final testing | 3 | 9 | the rest are the owner's |

**Done since last update (18:00):**
- E2 every P0/P1 from passes #33 to #37 fixed (9969833, 66ea505, 2bb0188, 81d3ca3, 895ec60), each READY before the next pass
- E3 the gate: #36 and #37 clean and consecutive on 895ec60 (dpl_5RDu6RCH)
- F1 READY.md: the final code, the open P2s, devnet balances, and the lifecycle on chain with Solscan links (seeding to Meteora, claims, the 70/30 fees, the team unlock, cancel, deadline and timeout refunds, the PairPaused refusal as a failed transaction, tx 5xv4hHTM…FtZm2SY)
- F2 a 23-hour share link for the passed build, in READY.md (until 2026-10-28 01:27 PT)
- F3 the "Ready for final testing" notification, sent with the share link
- BACKLOG: P2-71 to P2-76 as seed-qa closed them

**In progress:** nothing in the loop. seed-cc holds the fixes for P2-111 to P2-115 unlanded on branch qa-p2-111-113 (5faf0b6, fc21800), pending the owner's call. seed-qa leaves the ui-simplify pass (D3) until the owner says keep. 

**Blocked:** B2's USDC half since 16:00 PT, waiting on the owner (no config can make open_raise refuse USDC, and B3 rules out the program change).

**Needs the owner** (in this order):
1. USDC (B2 against B3): accept that USDC stays open on chain while the site offers SOL only, or allow the small program change.
2. ui-simplify (D4): "revert" deletes the branch (its two kept pieces are on the original), "keep" merges it (the QA count restarts).
3. Admin actions for seed-qa, signed in your Phantom (the Config admin): flag fraud on QA Q34X (raise G1aiNZzasd81rXfNcNTjia1tRFhQYPU422rs26xkQW7B); approve the takeover on QA Pass 34D (Eev4YwcBrHH85jXmKps7LHcFSXv3WCqZZzK5GZ2dEzA6) to 6D8kCB4YDGqxpWCjShRVy6g5RoV6id1WerD7SeY8cm1Q; send seed-qa the signatures.
4. The held P2 fixes (5faf0b6 and fc21800, P2-111 to P2-115): land before final testing (two more full passes) or after. And when production (main, now 0fc8490) moves to 895ec60.
5. Phantom click-through on the share link: launch a Test-preset raise, back it, watch it seed, claim, trade.
6. Refund checks: one cancelled raise, one missed deadline.
7. Phone check.
8. Takeover policy for unvested team tokens: burn or keep (nothing is implemented; PROGRESS.md has the question).
9. Staging presets ($150/$300/$450/$600, or $50K in place of $600) and mainnet funding: deployer 5.0, staging backer 0.75, Irys 0.01 SOL.

**QA:** pass #37 on 895ec60: CLEAN (0 P0, 0 P1). Consecutive clean: 2, the gate is met. Open P2s: P2-111 to P2-114; P2-115 (one stalled-seeding event toasts twice, with two texts); the buy toast's rounding (with P2-112). P2-74 re-measured fixed in #35. Out of scope: F21, F22, the paused-pair UI; USDC on chain is the owner's call.

**Live:** final-model 895ec60 plus docs, the passed build at deployment dpl_5RDu6RCH (share link in READY.md). Production https://seed-nu-ten.vercel.app runs main 0fc8490. ui-simplify eee8ff7 (its preview is Vercel's ui-simplify branch URL). Devnet program 8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn at slot 515474928 (the 85dc510 build). Deployer 9.80 SOL; crank 0.89; QA founder 0.145, backer1 0.135, backer2 0.224.
