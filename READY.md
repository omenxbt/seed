# Ready for final testing

**Final code:** final-model at fd7ed1c (the site, the program and its client, the crank and the indexer), on top of
7ca3ef2 (seed-cc's P2-111 to P2-115 and the buy-toast rounding) and aa33cd7 (ui-simplify, kept). Commits after fd7ed1c are
docs only, plus `program/scripts/admin.ts` (a devnet admin script outside the site).
**Devnet program:** 8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn at slot 515598307, the fd7ed1c build with burn on takeover
(upgrade tx [3yRKSMof…](https://solscan.io/tx/3yRKSMofprPWLqRX9am8BzPPArV5ScVvGtPebsnoNAGGzcvoxeez7NdB5JVdaZEquKodWxoBykrWYC6gweTAhD9t?cluster=devnet);
the on-chain bytes match the build, sha256 fe30ee512f2d4c9bd7fd7d00f762d58ee76cf6d61c16d96fde67f2e4451bf7d4).

**Deploy:** the final code's preview, deployment dpl_3wXC3JzZaS1WTmNtVnvzw5efZExt (the build seed-qa passed). A 23-hour share
link opens it without a Vercel login, until 2026-10-28 00:57 PT:
https://seed-rilajyfuq-omenxbts-projects.vercel.app/?_vercel_share=uf6QWRM2fOX1uQVZA9PrIXCUVq1twq1O
Production (https://seed-nu-ten.vercel.app, main) still runs 0fc8490 and moves on the owner's word. Its older IDL cannot send
the new admin instructions, so Flag fraud and Approve takeover work on the preview only until main moves.

**QA gate: passed.** Full passes #38 and #39 on fd7ed1c, both CLEAN (0 P0, 0 P1), consecutive (seed-qa, QA.md). Scope: the
#36–#37 scope, the kept ui-simplify UI, burn on takeover, and P1-F31 (fixed in fd7ed1c: set_pair accepted another program's
ProgramData; all three admin instructions now check it is Seed's own).

**Open P2s, fixes held for the owner's call** (landing them before final testing means two more full passes):
- P2-116: one stalled seeding still toasts once per crank step.
- P2-117: the refund button rounds 0.0101 to 0.01.
- P2-120: an expired blockhash shows the raw web3 text.
- P2-122: the Portfolio creator row shows fees the crank already claimed.
- P2-123: one miss toasts twice, one of them rounded.
- P2-118: after a second takeover, Reports and the notice pair the latest move with the first takeover's burn.
- P2-119: a returning visitor's saved demo keeps the old demo schedules (Lattice reads "No team tokens").
- P2-121: after a takeover, the Portfolio creator row still says "your 70%".

Fixes: P2-116, 117 and 120 are seed-cc's db4a54c on local branch qa-fixes, with 122 and 123 coming on the same branch.
P2-118, 119 and 121 are 93a4453 on checklist-next. Both are fast-forwards or clean merges on fd7ed1c.

**Ops note:** the crank's backfill reads hit the devnet RPC's rate limit ("Connection rate limits exceeded", ops_runs 1933);
its seeding, unlock and fee transactions still land, sometimes a pass late.

## Burn on takeover, on devnet (the owner's policy)
A takeover of a seeded raise pays what had unlocked and not been paid to the payout wallet of before, burns every team token
not yet unlocked, moves the payout, and ends the unlocks (claim_vested: UnlocksEnded, 6049). Each takeover carries
VestedClaimed (when it paid), TeamBurned (paid, burned, the supply after) and TakeoverApproved. On devnet the deployer signs as
the upgrade authority; on mainnet only the Config admin can.

| Case | Raise | Takeover | Paid to the old payout | Burned | Supply after |
|---|---|---|---|---|---|
| Lagging crank, every minute ×20, 90% team (#39) | Q39H 7HtnBvrs… | [5PJNeBFP…](https://solscan.io/tx/5PJNeBFPQHPWbHedSKGxCGWXesLyxMG83RhXAuFwdVToc2HRHKuRaaPpurbvtZCNZE7p2NedAFwbPkziqnXuCyKQ?cluster=devnet) | 180M | 720M | 280M |
| Crank kept up, every minute ×20, 90% team (#38) | Q38H BW1nZqER… | [4ARj5R63…](https://solscan.io/tx/4ARj5R634D6HKr6WZUXq3zkWwUNNbVC95vCmdcPEfHwPZTz1z3Y2LVcnDdto1ytcHAik5CCRpq79x2qMDc8x3DRG?cluster=devnet) | 0 (225M paid before) | 675M | 325M |
| A quarter due, half locked, 20% team (the suite) | 8RysLTpC… | [2mahKwJP…](https://solscan.io/tx/2mahKwJPa5VmSyfQxiKMNjJJwHDpPY1rqHYMP3CLvU6wrkjcM3EYcpXzSuN7WtP4gL7ToawqqSxB3ohsRDaRWQAK?cluster=devnet) | 50M | 100M | 900M |
| All at seeding, unpaid, 90% team (#38) | Q38I AWz9SoKN… | [43Ubnxmi…](https://solscan.io/tx/43UbnxmiWUPiXFcy2DvTKBMkeF29HcVJjffMKW2XEmuaxyTBS9w15HtXb57pyvzVfMWQZR11n5qt632csA3UgdCp?cluster=devnet) | 900M | 0 | 1B |
| Fully unlocked and paid (#38) | QA Pass 37A 3j7Je33G… | [3FrGv6Pa…](https://solscan.io/tx/3FrGv6PaDTsLPpJYKHUogsuvQtu9M2ff5wDWXCp3ejxJWo34tqh3HqKQCm2LSoQc1ZS316bG95Xgof1F8kaCnip7?cluster=devnet) | 0 | 0 | 1B |
| No team share (#39) | qalast 3ZfvoVam… | [5Zoq7xBN…](https://solscan.io/tx/5Zoq7xBNWS7KehssRqVxovq54nm4mjWSXYb4PQWanTDYngr5eqGZmMuWXT6zzrgPATNJHsQvrud2aTiEMt2ccGyn?cluster=devnet) | 0 | 0 | 1B |
| A second takeover (#39) | Q39H | [3iWz45Mt…](https://solscan.io/tx/3iWz45Mty5oxnhNDExF3fgU8zYJSAboCyU8UgeTttaiCR9pPPkbPXfMszif4jtBXV79uTGESejJDnPT43CWtSmSz?cluster=devnet) | 0 | 0 | 280M |

Refused before seeding: a filled and minted raise, and a refunded one, give NotSeeded; with no mint yet the accounts do not
validate. After every takeover claim_vested gives UnlocksEnded.
Fraud flags signed by the deployer: Q34X [UHmPn1Xx…](https://solscan.io/tx/UHmPn1XxeVJfAH9MuRABRxE5u9YkHazR6TE3CZJuvLt9Dsrw8yJrriTRdFRf9oa4Yi2Ju4Yo7kYEXUVEmp3AzW9?cluster=devnet) (X handle blacklisted too), and the live Q39F [5Dbmah8o…](https://solscan.io/tx/5Dbmah8ocTgFoGuSKc2NReRE7sNyzKgUzmeL7nPjaPZZREV1LZ8DeaiV6CfoGFNNeQBcMBW1vcKk1p27Xhm6re2i?cluster=devnet).
On Q39F, buying is refused with Flagged and the founder with Blacklisted, and the backer's refund came back exact.

## The raise, end to end on devnet (seed-qa's pass #39 on fd7ed1c, raise A9 unless named)
| Step | Transaction |
|---|---|
| Seeding, step 1: the supply minted, authorities revoked | [34ojQfPx…](https://solscan.io/tx/34ojQfPx72WyWNqCCGQRz7av4frPWvoKKaRJYzGxprF9h4YBXALuxy1EgNFjDSkfYHcT499eaoncj5PmtzpQiJpB?cluster=devnet) |
| Seeding, step 2: the Meteora DAMM v2 pool opened with the whole raise, position locked | [4Yrc77ns…](https://solscan.io/tx/4Yrc77nsecrd9wgNwAYx1NtJnQ9MYHdrnNbuMHL186B5M5GzSjxintFWxnhE5Bx5gbcsLvYNb61PAvTGaHVzZ9Fj?cluster=devnet) |
| Seeding, step 3: seeded | [2BtMkP1b…](https://solscan.io/tx/2BtMkP1bwG41UyeMEQKGn3mQ9tDVPWg9ECYsU7UFxDYo9w13gwm8UT6KzuKrFJy8MXjftYb4hBq2uK7bRHwFUbwi?cluster=devnet) |
| A backer claims their tokens through the site (133,133,333.339546, exact) | [KBn4CEgW…](https://solscan.io/tx/KBn4CEgWBAWDbQqNytUvc4JUeNLB8SZEGn46JzgXNybgEQ2H1Eq2vRsFht4j9u96xhbzpArLz55WfqLGqXDg7YK?cluster=devnet) |
| Creator fees split 70/30 by the crank (76,957 / 32,982 lamports) | [kTuPTggb…](https://solscan.io/tx/kTuPTggbNdq2CkuJJUNjCe7RvZ2k36MRAXyi8G9xewMD2WrbdPx9VfPpSFJDhC1DNrjMPgiKxTCJLofMJ4ewWPQ?cluster=devnet) |
| Creator fees through the site's permissionless claim (#38: 13,999 / 6,000) | [9JRqCjPv…](https://solscan.io/tx/9JRqCjPvxpttf9JVEXWFDvyQQnnLiNJyj8uCG2gAzyodG4nVVk7uWZy3FECdM1uN2BdfW19DZSgcdjwCivS79CJ?cluster=devnet) |
| Team unlock paid to the payout wallet (500M, custom dates) | [4KFpYU4n…](https://solscan.io/tx/4KFpYU4nYEHo4TfD89P6BbczhcD1U6TTDxZxaUhxVH3kA5AhCeiDoUnmMh66GjRLtSfqATBZrd2ZKaorWKyGqBF8?cluster=devnet) |
| A payout wallet change applied by the crank after its delay | [qhMs5Tbr…](https://solscan.io/tx/qhMs5TbrefdiSZXdsdEYHx6Zxq8RjQk9wLXTjfeVKsDG7pgq8pPfNz4tyvSVw8X2G6tWNJBVD1e5CZBZchurvgP?cluster=devnet) |
| Cancel refund: raise C9 cancelled, then a backer's refund in full with the fee (10,100,000) | [4VPwQo9N…](https://solscan.io/tx/4VPwQo9NHtEBWNEnLEmyw4i3pHypvszuUQFEJMf8UQCeqmCrFiQm6AWhwHgyPEspLYSPwh7PpyuF5KnbS6yrFRxy?cluster=devnet), [4W2gdb6z…](https://solscan.io/tx/4W2gdb6zzXTocyRtUEHXyXh4h5U4Eg8DrbrtKncCKQMVCH7vhp7tqw5pcBhg2YWLEUQPh8779peqZAzzZiWpNMp1?cluster=devnet) |
| Deadline refund: raise B9 settled and refunded in one transaction through the site (10,100,000) | [2SZzt1f6…](https://solscan.io/tx/2SZzt1f6jJ9rwVNsaAzz8h9DofNAsfvxKKJNwnt6eT8pPso5d6FfRnqHTxoNWKETB7YHVZFXXPAVwibeZg3QSvKp?cluster=devnet) |
| Timeout refund: raise D9 never pooled, timeout_refund, then the refund (15,194,063) | [5SfMCWqd…](https://solscan.io/tx/5SfMCWqdyG4sXBSVz25eqDyerwMrr3yvYL7yUz393HzN8KCf8ngFMv6Ks3UNbEFZyZHhKQgT3fAfna9pM4bMmfxT?cluster=devnet), [5iq8ePNZ…](https://solscan.io/tx/5iq8ePNZy36ngxPbuBiT57fo1NBeKBT5f3gnphGU6TnacVqcRV1YDS6rf55h4QqppjCbvrVM1wuKUQUtkTn8NtvA?cluster=devnet) |
| PairPaused: open_raise on the paused TSTx pair, refused on chain (a failed transaction, error 6014; pass #36) | [5xv4hHTM…](https://solscan.io/tx/5xv4hHTMSdLbpX9hEHw4wcyfZpFXxhLoqHBJXaEvoGb3otDY6zm9XrVmfcZ69ij24HSfFMevkFLBg3QMvZtFm2SY?cluster=devnet) |
| TSTx paused with set_pair | [3iMigYj8…](https://solscan.io/tx/3iMigYj8EgUg5wNRX2QWg145oUrJEP4PjdGAhB6v1CbgLdY4pH9z1FabGzsVuq8smq2hSAspcj1ozojf4xa6icaJ?cluster=devnet) |

## Devnet balances (2026-10-27, 01:58 PT)
| Wallet | SOL |
|---|---|
| Deployer (upgrade authority) 6GTuondHNLSJkYemhVw8GYFTK3ANHPFXdVYUM5JP5zyf | 7.43 |
| Crank 3YYcjx21rw2wyQRPjawRNr2QCwUFs1nDbtJucmJq8CQc | 0.55 |
| QA founder 6D8kCB4YDGqxpWCjShRVy6g5RoV6id1WerD7SeY8cm1Q | 0.126 |
| QA backer1 6BBLE48ir6gKVkX47riXj1aKPGFNsBQAXQxKVar3VgXr | 0.094 |
| QA backer2 29utGNk1kbtNpjVAcaKvamLqf8WhME2mskNNVJLwWRMh | 0.086 |
| Config admin and treasury 6xFrba28fk6RyiLREzLPHBP4xPXutDs69Ju69hCixAFZ | 2.78 |

## What the owner does next (CHECKLIST F and G, [OWNER])
1. Phantom click-through on the share link: launch a Test-preset raise, back it, watch it seed, claim, trade.
2. Refund checks: one cancelled raise, one missed deadline.
3. Phone check.
4. Whether the held P2 fixes (P2-116 to P2-123) land before final testing (two more full passes) or after it.
5. A policy question from seed-qa: claim_vested has no fraud-flag check, so a flagged raise keeps paying unlocks to the
   founder's payout wallet, and a takeover after a flag pays the unlocked-but-unpaid part to that founder. Keep as is, or
   burn everything on a flagged raise (a program change).
6. Mainnet funding (deployer 5.0, staging backer 0.75, Irys 0.01 SOL); the staging presets stay $150/$300/$450/$600.
7. When production (main) moves to the final code.
