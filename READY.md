# Ready for final testing

**Final code:** final-model at 895ec60 (site and program client), devnet program 8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn
at slot 515474928 (the 85dc510 build). Commits after 895ec60 are docs only (STATUS.md, PROGRESS.md, BACKLOG.md, this file).

**Deploy:** the final code's preview, deployment dpl_5RDu6RCHKWof6UMq37L4i9ATPxJ3 (the build seed-qa passed). A 23-hour share
link opens it without a Vercel login, until 2026-10-28 01:27 PT:
https://seed-hshov08uk-omenxbts-projects.vercel.app/?_vercel_share=35RYBT7w8yMMiEBeUqgP9BmKda2CPsDg
Production (https://seed-nu-ten.vercel.app, main) still runs 0fc8490: it moves to the final code on the owner's word.

**QA gate: passed.** Full passes #36 and #37 on 895ec60, both CLEAN (0 P0, 0 P1), consecutive (seed-qa, QA.md).
Open P2s: P2-111 (a refund claim bundled with
settle fails if the crank settles first; the retry lands), P2-112 (the refund toast rounds 0.0101 to 0.01), P2-113 (the
deposit prefill offers an amount under the minimum when a wallet's remaining maximum is below it), P2-114 (the page marks
a stalled live raise refunded before the chain does), P2-115 (one stalled-seeding event toasts twice, with two different texts, from the tick and from the alert), and the buy toast rounding 0.0202
to 0.02 (with P2-112). Fixes for all of them are ready and held on seed-cc's branch qa-p2-111-113 (5faf0b6 for P2-111 to
113, fc21800 for P2-114, P2-115 and the toast), a fast-forward from final-model: landing them before final testing means
two more full passes, so that is the owner's call. P2-74 was re-measured as fixed in pass #35. USDC is still accepted
on chain: the owner's open call (CHECKLIST B2 against B3).

## The raise, end to end on devnet (from seed-qa's pass #36, raise A6 unless named)
| Step | Transaction |
|---|---|
| Seeding, step 1: the supply minted, authorities revoked | [Kko5Z4Dr…](https://solscan.io/tx/Kko5Z4DrykpQCnVBiakDBre1tGLfkeg1QM84dBPdhzUmV9LmGDYA6UhMxA1BRsfzBqtwNHAmzMSPVpZXHXnhLxN?cluster=devnet) |
| Seeding, step 2: the Meteora DAMM v2 pool opened with the whole raise, position locked | [QAYwfYu7…](https://solscan.io/tx/QAYwfYu7m1E1WbFXUTAQKfLZiVKne41XP27YiL9q9rMNo6GkS3wTG4qusst3S8sJpmWnpFdzCDHkts8rSRLrEGu?cluster=devnet) |
| Seeding, step 3: seeded | [5BaRy6jf…](https://solscan.io/tx/5BaRy6jfvf7VhHaoarT8GAgX8QoCX3W32ne9QNSxD5FoGoVjCRoMPZKYG9pjKQ8VadeGnJmsTMPs8auQNWKoJoqc?cluster=devnet) |
| A backer claims their tokens (through the site) | [2eBdvj1S…](https://solscan.io/tx/2eBdvj1S1Qbdu4rx66hRwddhPjYAkhhyKQbzmJ8xsfy6rFqP84ihyVMhkLw9N4DsUVvuDi26ZPaaLwx9NZzw9H5c?cluster=devnet) |
| Creator fees split 70/30 (109,113 → 76,379 / 32,734 lamports) | [2t5BZW8Y…](https://solscan.io/tx/2t5BZW8Y3CVGV9rfEtYRJibqA6zj6o3hqZYKQmfcNujFvfxsjF5TgZ36CjES3mjKstAnEzqqM4anHYw9fG7xyA1R?cluster=devnet) |
| Team unlock paid to the payout wallet | [QJ2CNKuD…](https://solscan.io/tx/QJ2CNKuDZZDqUfGaDxwMre4gu5JPJQ6zYsCYjHGwQgxNEoiY7XZr8rzp96xJgJbqQzzXC2y3SVyzhv69GUrn3Jk?cluster=devnet) |
| Cancel refund: raise C6 cancelled, then a backer's refund in full with the fee | [4DqaLt4S…](https://solscan.io/tx/4DqaLt4SffrZTmU25e5Doiq23kuKRHEKkKitUriK7pSeb7xzGeveGs1JTeScsBUT5bbE3JAbHVq2Mgqtf4wDm1bq?cluster=devnet), [41qQrVJW…](https://solscan.io/tx/41qQrVJWrVBViPCNcsWWvt5rxhL1CPvGSWy5xqKnGGVnxysK12Ht5seXuZm7nUr5fNujRZegWqeGT429ad5m9Jag?cluster=devnet) |
| Deadline refund: raise B6 missed and settled, then the refund | [5wMj2soU…](https://solscan.io/tx/5wMj2soUXhnM57qpb1ywU2cjEdrGoxYVr4vVBPvAXdLoVoWvQeQ4qSQT8wePa7JUd35hEyXjDRF4SYx7bCswXf86?cluster=devnet), [5qyBbdop…](https://solscan.io/tx/5qyBbdoptyuguUYYvgfCb8Msv8mXuJ1zezsM4pgy6Ai4F817z6YymJ8SPasgLYPkbgj56cQEQDwSNeXbpXFPtnaV?cluster=devnet) |
| Timeout refund: raise D6 never pooled, timeout_refund, then the refund | [4qrnojMU…](https://solscan.io/tx/4qrnojMUc5TTxsqNcZg9EMsbHNWi68iWxSrMRHbGxzXrBRL3jbdFiD3VCYNP1LDHfUfyQKnQpWAV4w7zPj2nfUne?cluster=devnet), [5P7kzoSZ…](https://solscan.io/tx/5P7kzoSZi3evAttxgiCGGw4HWYbKZ4qwnEWZWcKef3QJguUNfKkthxNTTMroSzP996D7oKj8jvWjCeNomkctGhZ6?cluster=devnet) |
| PairPaused: open_raise on the paused TSTx pair, refused on chain (a failed transaction, error 6014) | [5xv4hHTM…](https://solscan.io/tx/5xv4hHTMSdLbpX9hEHw4wcyfZpFXxhLoqHBJXaEvoGb3otDY6zm9XrVmfcZ69ij24HSfFMevkFLBg3QMvZtFm2SY?cluster=devnet) |
| TSTx paused with set_pair | [3iMigYj8…](https://solscan.io/tx/3iMigYj8EgUg5wNRX2QWg145oUrJEP4PjdGAhB6v1CbgLdY4pH9z1FabGzsVuq8smq2hSAspcj1ozojf4xa6icaJ?cluster=devnet) |

## Devnet balances (2026-10-26, 19:10 PT)
| Wallet | SOL |
|---|---|
| Deployer (upgrade authority) 6GTuondHNLSJkYemhVw8GYFTK3ANHPFXdVYUM5JP5zyf | 9.80 |
| Crank 3YYcjx21rw2wyQRPjawRNr2QCwUFs1nDbtJucmJq8CQc | 0.89 |
| QA founder 6D8kCB4YDGqxpWCjShRVy6g5RoV6id1WerD7SeY8cm1Q | 0.145 |
| QA backer1 6BBLE48ir6gKVkX47riXj1aKPGFNsBQAXQxKVar3VgXr | 0.135 |
| QA backer2 29utGNk1kbtNpjVAcaKvamLqf8WhME2mskNNVJLwWRMh | 0.224 |
| Config admin and treasury 6xFrba28fk6RyiLREzLPHBP4xPXutDs69Ju69hCixAFZ | 2.78 |

## What the owner tests next (CHECKLIST F, [OWNER])
1. Phantom click-through: launch a Test-preset raise, back it, watch it seed, claim, trade.
2. Refund checks: one cancelled raise, one missed deadline.
3. Phone check.
4. Decide the takeover policy for unvested team tokens (burn or keep).
5. Staging presets and mainnet funding.
6. The admin actions seed-qa could not run: flag fraud on Q34X, approve the takeover on Q34D (PROGRESS.md has the steps).
7. Whether the held P2 fixes (5faf0b6 and fc21800, P2-111 to P2-115) land before final testing (two more full passes) or after it.
8. When production (main) moves to the final code.
9. USDC on chain (CHECKLIST B2 against B3), and keep or revert for ui-simplify (D4).
