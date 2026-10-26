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
- [ ] Upgrade the devnet program to 85dc510 or later; refresh js/idl and the crank if the IDL changed; one suite run

## B. Scope changes
- [x] SOL only: no pair selector on the launch form (verify on final-model) [03f8677; production serves no selector]
- [ ] USDC and TSTx paused on chain with set_pair; a raise attempt on either is refused with PairPaused (save the tx)
- [x] No program change for USDC; allowlist code stays for later [03f8677: no program change; set_pair and the allowlist intact]
- [x] MAINNET.md + staging/production init scripts set up SOL only [03f8677: MAINNET.md SOL only, check-deploy.ts fails on an active entry (devnet OK), staging init makes no entry]
- [x] Docs, FAQ and copy say SOL; no "SOL, USDC or an approved asset" anywhere [this commit: the site's meta description, the brand book, banner 05 and its source; the docs in 03f8677. The program's own BadPair message still names USDC: program text, B3]
- [x] F21 and F22 moved to BACKLOG.md under "Re-enable other pairs" [03f8677]
- [x] "What backers pay" removed from the launch form; buy panel still shows the 1% fee and fee-included total [03f8677: "Seed fee, 1%, included" on every deposit panel; the amount you deposit is the fee-included total]

## C. Remaining fixes
- [ ] Demo raise no longer shows as "Yours" with no wallet connected
- [ ] Docs no longer say a $100K cap
- [ ] /r preview links use the request host, not the hard-coded production domain
- [ ] Raise links work by address
- [ ] "Refunds claimed 0/0" fixed
- [ ] Every other open P2 in QA.md fixed or moved to BACKLOG.md with a reason
- [ ] Axiom and GMGN trade buttons on every seeded raise page
- [ ] DexScreener profile data (logo, socials, description) prepared at seed time for mainnet

## D. UI simplification (branch ui-simplify, not merged)
- [ ] Restore green Buy / red Sell on the trade toggle
- [ ] Keep ui-simplify rebased on final-model, so the preview includes sections B and C
- [ ] Hand seed-qa a pass on the ui-simplify preview (all actions, tabs, sort, List/Grid, Show more, 1440/1024/390)
- [ ] [OWNER] Keep or revert. Keep: merge into final-model, and the QA clean-pass count restarts. Revert: delete the branch.

## E. QA gate
- [ ] Tell seed-qa the scope (SOL only; F21/F22 and paused-pair UI out of scope) and start full pass #33 once A and B are live
- [ ] Fix every P0/P1 seed-qa reports, push, wait for READY, have seed-qa run a full pass again
- [ ] Two consecutive clean full passes (zero P0, zero P1) on the final code (merged UI, if kept)
- [ ] Keep QA wallets ≥ 0.05 SOL from the deployer

## F. Ready for final testing
- [ ] Write READY.md:
  - final commit, deploy URL, both clean pass numbers, open P2s
  - devnet balances
  - tx links proving: seed to Meteora, claims, 70/30 fees, cancel refund, deadline refund, timeout refund, PairPaused refusal
- [ ] Make a 23-hour share link for the final-model preview and put it in READY.md
- [ ] Push a notification: "Ready for final testing", with the share link
- [ ] [OWNER] Phantom click-through: launch a Test-preset raise, back it, watch it seed, claim, trade
- [ ] [OWNER] Refund checks: one cancelled raise, one missed deadline
- [ ] [OWNER] Phone check
- [ ] [OWNER] Takeover policy for unvested team tokens: burn or keep (list what each changes in the program; don't implement)
- [ ] [OWNER] Staging presets ($150/$300/$450/$600, or swap $600 for $50K) and mainnet funding: deployer 5.0, staging backer 0.75, Irys 0.01

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
