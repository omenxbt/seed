# Seed status — 2026-10-27, 02:05 PT
**Where it stands:** Waiting on the owner for final testing. The QA gate passed on fd7ed1c (full passes #38 and #39 clean), with the owner's four decisions built in.

| Section | Done | Total | State |
|---|---|---|---|
| A. Housekeeping | 5 | 5 | done |
| B. Scope changes | 7 | 7 | done (USDC on chain accepted by the owner) |
| C. Remaining fixes | 8 | 8 | done |
| D. UI simplification | 4 | 4 | done (kept and merged) |
| E. QA gate | 4 | 4 | done |
| F. Final testing | 4 | 8 | the rest are the owner's |
| G. The owner's decisions of 2026-10-27 | 6 | 7 | moving production is the owner's |

**Done since last update (2026-10-26, 19:45):**
- G1 seed-cc's P2-111 to P2-115 and the buy-toast rounding landed (7ca3ef2, a fast-forward)
- G2 ui-simplify kept and squash-merged, green Buy / red Sell, the owner's later raise-page asks kept (aa33cd7)
- G3 burn on takeover in the program: unit tests, the suite, docs, FAQ, raise page, MAINNET.md and its new audit list (fd7ed1c). Devnet upgraded at slot 515598307 (tx [3yRKSMof…](https://solscan.io/tx/3yRKSMofprPWLqRX9am8BzPPArV5ScVvGtPebsnoNAGGzcvoxeez7NdB5JVdaZEquKodWxoBykrWYC6gweTAhD9t?cluster=devnet)), bytes match the build
- G4 js/idl and the crank's IDL refreshed; crank v35 and helius-webhook v29 deployed; final-model READY as dpl_3wXC3JzZ
- G5 the gate: #38 and #39 clean and consecutive on fd7ed1c. The burn was verified on chain in seven cases (lagging crank [5PJNeBFP…](https://solscan.io/tx/5PJNeBFPQHPWbHedSKGxCGWXesLyxMG83RhXAuFwdVToc2HRHKuRaaPpurbvtZCNZE7p2NedAFwbPkziqnXuCyKQ?cluster=devnet): 180M paid, 720M burned, supply 280M). Also fixed: P1-F31, where set_pair accepted another program's ProgramData
- G6 READY.md with the burn table and the lifecycle on the new build; a 23-hour share link; this file; the notification
- B2 closed: USDC stays open on chain (the owner's decision, DECISIONS.md). D4: kept. F: the takeover policy is burn
- 0.2 SOL each to the QA founder and backer1 from the deployer ([4uEdMBTF…](https://solscan.io/tx/4uEdMBTFSKppgFKQ4zAisJrQk3aVQ7zVEWc8DeE3WHtiWk62re8nxNSMZ3NzQcXkxVAdejGzkzSJhANe2zRk2yjB?cluster=devnet), [2WKscq2V…](https://solscan.io/tx/2WKscq2VcBFXnLD8VCaFPdnu4ZL6Km7s2FipFJjDdFkSr3APeLGaD9ZJQyjS3j7ZKvpBUE5czEC7deL3yEfVbzTH?cluster=devnet))

**In progress:** nothing on final-model. Held, unlanded fixes for the open P2s: seed-cc's db4a54c (P2-116, 117, 120) on local branch qa-fixes, with P2-122 and P2-123 coming there, and 93a4453 (P2-118, 119, 121) on checklist-next.

**Blocked:** nothing.

**Needs the owner** (in this order):
1. Phantom click-through on the share link (READY.md, until 2026-10-28 00:57 PT): launch a Test-preset raise, back it, watch it seed, claim, trade.
2. Refund checks: one cancelled raise, one missed deadline.
3. Phone check.
4. The held P2 fixes (P2-116 to P2-123): land before final testing (two more full passes) or after.
5. Fraud flag and unlocks: claim_vested has no flag check, so a flagged raise keeps paying unlocks to the founder, and a takeover after a flag pays the founder what had unlocked. Keep, or burn everything on a flagged raise (a program change).
6. Mainnet funding: deployer 5.0, staging backer 0.75, Irys 0.01 SOL. The staging presets stay $150/$300/$450/$600.
7. Move production (main, now 0fc8490) to the final code after the click-through.

**QA:** pass #39 on fd7ed1c: CLEAN (0 P0, 0 P1). Consecutive clean: 2, the gate is met. Open P2s: P2-116 to P2-123 (READY.md lists them). Out of scope: F21, F22, the paused-pair UI. USDC on chain was accepted by the owner.

**Live:** final-model fd7ed1c plus docs. The passed build is deployment dpl_3wXC3JzZ (https://seed-rilajyfuq-omenxbts-projects.vercel.app; share link in READY.md). Production https://seed-nu-ten.vercel.app runs main 0fc8490. ui-simplify is merged (aa33cd7); its branch is left as it was. Devnet program 8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn at slot 515598307 (the fd7ed1c build). Deployer 7.43 SOL; crank 0.55; QA founder 0.126, backer1 0.094, backer2 0.086.
