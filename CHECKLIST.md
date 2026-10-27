# Checklist

Each iteration of the loop works the first unticked item that does not need the owner, and ticks it only when verified,
with the commit or tx in brackets.

## Rules for the whole loop
- No names of any person in any project file, comment, commit message, report or notification. Not the owner's personal name, not any handle or alias. Say "the owner".
- Devnet only. Nothing touches mainnet.
- Items marked [OWNER] need the owner. Don't wait on them: skip, keep working, and list them under "Needs the owner" in PROGRESS.md.
- Push a notification only when every remaining item is [OWNER], or when blocked for over an hour.
- Stop the loop when every unticked item is [OWNER].

## A. Housekeeping
- [x] Remove every personal name and alias from tracked files (LOOP.md, PROGRESS.md, BACKLOG.md, DECISIONS.md, QA.md, docs, scripts, comments); use "the owner"; no names in future commits [8d0e1ce]
- [x] Confirm Vercel auto-deploys on push; remove the manual deploy step from LOOP.md [6bbd066; Git builds READY on their own since: dpl_BL4wLbfx, dpl_28P96Uk2, dpl_548M2PLt, dpl_6pwo4xSc]
- [x] Report what the Oct 26 10:21 AM PT CLI production deploy contained. If anything uncommitted shipped, commit it or redeploy main from git [dpl_PLUmaCPf was a clean export of commit 7e5f845: tracked files only, nothing uncommitted; main has redeployed from Git since]
- [x] Deployer ≥ 4.6 SOL free on devnet: close leftover buffers, sweep test wallets (keep 0.05 each). If still short → [OWNER] with the exact amount [11.70 SOL, no buffers left; no sweep needed]
- [x] Upgrade the devnet program to 85dc510 or later; refresh js/idl and the crank if the IDL changed; one suite run [upgraded at slot 515474928, tx 4n3PD67PTAntWw1ToLdVeUv5jgmUTVCGXYjqtwePX573ZqxYUTzkmKuPoK2cRz8H7wUaWrCWiK1gvM2JHioq185c; on-chain bytes match the build; IDL unchanged, so js/idl and the crank stand; suite 28/28 on a local validator loaded with that build. A devnet run (13 pass, 12 fail) fails on test-mode timing, a minute-long deadline passing mid-suite, and on the live crank seeding the suite's raises]

## B. Scope changes
- [x] SOL only: no pair selector on the launch form (verify on final-model) [03f8677; production serves no selector]
- [x] USDC and TSTx paused on chain with set_pair; a raise attempt on either is refused with PairPaused (save the tx) [TSTx: tx 3iMigYj8EgUg5wNRX2QWg145oUrJEP4PjdGAhB6v1CbgLdY4pH9z1FabGzsVuq8smq2hSAspcj1ozojf4xa6icaJ, a simulated open_raise fails PairPaused 6014. USDC: open_raise accepts it without the allowlist, so no set_pair can make it refuse, and B3 rules out the change → [OWNER] decide, see PROGRESS.md. USDC: accepted by the owner 2026-10-27, it stays open on chain while the site offers SOL only (DECISIONS.md)]
- [x] No program change for USDC; allowlist code stays for later [03f8677: no program change; set_pair and the allowlist intact]
- [x] MAINNET.md + staging/production init scripts set up SOL only [03f8677: MAINNET.md SOL only, check-deploy.ts fails on an active entry (devnet OK), staging init makes no entry]
- [x] Docs, FAQ and copy say SOL; no "SOL, USDC or an approved asset" anywhere [this commit: the site's meta description, the brand book, banner 05 and its source; the docs in 03f8677. The program's own BadPair message still names USDC: program text, B3]
- [x] F21 and F22 moved to BACKLOG.md under "Re-enable other pairs" [03f8677]
- [x] "What backers pay" removed from the launch form; buy panel still shows the 1% fee and fee-included total [03f8677: "Seed fee, 1%, included" on every deposit panel; the amount you deposit is the fee-included total]

## C. Remaining fixes
- [x] Demo raise no longer shows as "Yours" with no wallet connected [88ebc1a: board and tiles use isMine(); 0 "Yours" tags with no wallet]
- [x] Docs no longer say a $100K cap [88ebc1a: no cap wording left; the presets and a daily-volume example are the only $100K figures]
- [x] /r preview links use the request host, not the hard-coded production domain [e5b4152 siteOf(); production's /r names seed-nu-ten.vercel.app]
- [x] Raise links work by address [account address since f4f0d65; by mint too, 88ebc1a: /r and the page both resolve QMNt9Fdm… to Upgr]
- [x] "Refunds claimed 0/0" fixed [f4f0d65 + the 2026-10-22 backfill: Q33A 0 / 1, QALIM 2 / 2 and 1 / 1]
- [x] Every other open P2 in QA.md fixed or moved to BACKLOG.md with a reason [dfcc7f6, branch checklist-next until pass #34 ends: P2-97 to P2-104 fixed (e5b4152, 88ebc1a) and verified; P2-71, 72, 73, 75, 76 to BACKLOG with the reason (QA.md never describes them); P2-74, P2-26, P2-4, P2-15 to 19 were already there]
- [x] Axiom and GMGN trade buttons on every seeded raise page [658f153, branch checklist-next: on mainnet they open the token; on devnet they show disabled with the reason]
- [x] DexScreener profile data (logo, socials, description) prepared at seed time for mainnet [7fd0803, branch checklist-next: the Info tab's DEXScreener profile, ready at seeding, Copy as JSON and the form link]

## D. UI simplification (branch ui-simplify, kept and merged 2026-10-27)
- [x] Restore green Buy / red Sell on the trade toggle [29a8215 on ui-simplify]
- [x] Keep ui-simplify rebased on final-model, so the preview includes sections B and C [eee8ff7: final-model 0fc8490 merged in, all 17 actions pass; merged again whenever final-model moves]
- [x] Hand seed-qa a pass on the ui-simplify preview (all actions, tabs, sort, List/Grid, Show more, 1440/1024/390) [handed to seed-qa (session seed-9b) 2026-10-26 17:35 PT, queued after the final-model gate]
- [x] [OWNER] Keep or revert. Keep: merge into final-model, and the QA clean-pass count restarts. Revert: delete the branch. [keep, the owner 2026-10-27: squash-merged into final-model as aa33cd7, the clean-pass count restarted]

## E. QA gate
- [x] Tell seed-qa the scope (SOL only; F21/F22 and paused-pair UI out of scope) and start full pass #33 once A and B are live [seed-qa (session seed-9b) is running pass #33 since 03f8677; scope and commits sent 2026-10-26 17:08 PT]
- [x] Fix every P0/P1 seed-qa reports, push, wait for READY, have seed-qa run a full pass again [seed-cc's fixes 9969833, 66ea505, 2bb0188, 81d3ca3, 895ec60, each READY before the next pass; passes #33 to #37]
- [x] Two consecutive clean full passes (zero P0, zero P1) on the final code (merged UI, if kept) [#36 and #37 clean on 895ec60, dpl_5RDu6RCH; the ui-simplify UI was not merged]
- [x] Keep QA wallets ≥ 0.05 SOL from the deployer [founder 0.335, backer1 0.250, backer2 0.268 at 17:09 PT; topped up from the deployer when one nears 0.05]

## F. Ready for final testing
- [x] Write READY.md: [READY.md]
  - final commit, deploy URL, both clean pass numbers, open P2s
  - devnet balances
  - tx links proving: seed to Meteora, claims, 70/30 fees, cancel refund, deadline refund, timeout refund, PairPaused refusal
- [x] Make a 23-hour share link for the final-model preview and put it in READY.md [dpl_5RDu6RCH share link, expires 2026-10-28 01:27 PT]
- [x] Push a notification: "Ready for final testing", with the share link [sent 2026-10-26 19:46 PT, with the dpl_5RDu6RCH share link]
- [ ] [OWNER] Phantom click-through: launch a Test-preset raise, back it, watch it seed, claim, trade
- [ ] [OWNER] Refund checks: one cancelled raise, one missed deadline
- [ ] [OWNER] Phone check
- [x] [OWNER] Takeover policy for unvested team tokens: burn or keep (list what each changes in the program; don't implement) [burn, the owner 2026-10-27: implemented, see G3]
- [ ] [OWNER] Staging presets ($150/$300/$450/$600, or swap $600 for $50K) and mainnet funding: deployer 5.0, staging backer 0.75, Irys 0.01 [presets: $150/$300/$450/$600 stay unless the owner says otherwise (2026-10-27); mainnet funding still the owner's]

## G. The owner's decisions of 2026-10-27
- [x] Land seed-cc's P2-111 to P2-115 and the buy-toast rounding into final-model [7ca3ef2, a fast-forward]
- [x] Merge ui-simplify into final-model, green Buy / red Sell kept [aa33cd7, squashed; the owner's later raise-page asks kept]
- [ ] Burn on takeover: the program change, unit tests, the devnet upgrade and one suite run on devnet; docs, FAQ and the raise page say so; MAINNET.md and the audit list
- [ ] Refresh js/idl and the crank; push; the Vercel build READY
- [ ] QA gate on the new final code: the #36–#37 scope plus the new UI and burn on takeover; two consecutive clean full passes
- [ ] READY.md refreshed (tx links with the burn), a new 23-hour share link, STATUS.md, the "Ready for final testing" notification
- [ ] [OWNER] Move production (main) after the final click-through

## Status reports
At the end, and after every 5 loop iterations, write STATUS.md in the repo root. No names of any person anywhere in it. Format:

```
# Seed status — <date, time PT>
**Where it stands:** one line (e.g. "QA gate: 1 of 2 clean passes" or "Waiting on the owner for final testing").

| Section | Done | Total | State |
|---|---|---|---|
| A. Housekeeping | x | 5 | done / in progress / blocked |
| B. Scope changes | x | 7 | ... |
| C. Remaining fixes | x | 8 | ... |
| D. UI simplification | x | 4 | ... |
| E. QA gate | x | 4 | ... |
| F. Final testing | x | 9 | ... |

**Done since last update:** each item with its commit or tx link.
**In progress:** what's being worked on now.
**Blocked:** each block, what it's waiting on, and since when.
**Needs the owner:** each [OWNER] item, in the order to do them, with exactly what to do.
**QA:** last pass number, result, consecutive clean count, open P0/P1/P2.
**Live:** final-model commit and deploy URL, ui-simplify commit and preview URL, devnet program version, deployer and QA wallet balances.
```

When the loop stops, the final STATUS.md goes in the push notification as a short summary (where it stands, plus the
"Needs the owner" list), with the full file committed.
