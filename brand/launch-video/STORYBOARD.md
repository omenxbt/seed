---
message: "Seeded in full, or refunded in full."
mode: autonomous
fps: 60
formats: [1920x1080, 1080x1920, 1080x1080]
cuts: { master: 31.3s, teaser: 15s }
---

Times, page beats and camera keys live in `src/story.mjs`; each scene is a `<section class="clip scene">` in the page
`tools/build.mjs` writes; `src/story.mjs` writes each scene from its own start and lays them end to end. The cut is the brand book's "Thirty seconds, spoken" as the user rewrote it (CONFLICTS 31), paced as the Axiom films in
`delta/01-video-hyperframes/_motion-refs/` pace theirs: each line of the script is a full-screen text frame, and between
them the site's own pages fill the screen under one camera. A text frame goes into a page by the camera pushing through
its type, the page resolving under it; a page goes out on a whip left, the next line coming in from the right. The
site's own motion (rise, press, odometer, fill bar, sheen) plays inside the shots. Every move eases on
cubic-bezier(.22,1,.36,1).

## Master, 31.3s

The film comes up from black over its first 0.6s, straight onto the title, and goes down to black over its last 0.9s,
the score's slot with it. The logo is the end card's alone (CONFLICTS 44).

| Time | Frame | On screen |
| --- | --- | --- |
| 0 to 2.9 | title | Up from black: "Start an idea," comes in huge from a little further out, then settles as "fund it on-chain." comes under it; whips away left. |
| 2.48 to 4.58 | line | "Find product-market fit" comes in from the right; the camera pushes through it. |
| 4.3 to 6.4 | line | "Set a target and deadline" comes up under it; push through. |
| 6.2 to 10.3 | Launch form | The form resolves under the line, tilted, on its Raise section: the opening market cap segment on the site's own $100K ("Opens at $100K market cap · raise 337.38 SOL ($50K), all into the pool"); the founder presses $50K (7.2s), the segment's mark slides across and the raise line turns to "raise 168.69 SOL ($25K)"; the camera goes in on the line, then across to the deadline, 7 days pressed (8.25s); the form scrolls to Open raise, pressed ("Confirm in wallet…"); whip left. |
| 9.98 to 12.08 | line | "Buy with SOL or USDC" comes in from the right; push through. |
| 11.88 to 15.68 | raise page | Two waves in: the deposit panel (SOL or USDC), then across to the readout as six waves land .4s apart (the odometer rolls, the bar sweeps red through yellow to green, the backers tick up); a pull back towards the whole page as it fills (14.63s, 168.69 / 168.69 SOL), the figures rolling to the target; whip left. |
| 15.36 to 17.56 | line | "Raises seed as / tradeable tokens" comes in from the right; push through. |
| 17.36 to 20.51 | seeding | The seeding card, three steps done; Run the next step pressed ("Running…"); a pull back to the whole page as it turns seeded (18.59s): "Seeded" on the identity card, its market cap $50K, the readout turning into the pool's chart, the seeding card into the trade card; a push to the pool's line (HALF/SOL, 337.38 SOL, Meteora DAMM v2, liquidity locked for good); whip left. |
| 20.19 to 22.49 | line | "If it misses, / every wallet gets back exactly what it paid." comes in from the right; push through. |
| 22.29 to 25.24 | refunded | The other ending: an extreme close-up on "Ends in 00:00:01" running out; refunded as it reaches zero (23.39s), a pull back to "Missed target, refunded" (104.59 / 168.69 SOL), the bar hatched, and the site's note ("…the 1% fee included"); whip left. |
| 24.92 to 31.27 | close | "Seeded in full," comes in from the right, filling the frame, and settles as "or refunded in full." comes under it. The end card (27.57s): the mark's dots arrive 30ms apart, the seed lands and brightens, the wordmark is drawn out from it, and the film holds on the mark and the wordmark alone over the drifting dot field (CONFLICTS 40), then goes down to black from 30.37s. |

There is no corner mark (CONFLICTS 33) and no logo sting (CONFLICTS 44): the mark is the end card's, the muted mark, as
on Seed's avatar (CONFLICTS 41).

## Teaser, 15s

| Time | Frame | On screen |
| --- | --- | --- |
| 0 to 3.05 | title | Up from black: "Start an idea, / fund it on-chain."; the camera pushes through it. |
| 2.75 to 8.1 | raise page | The deposit panel, across to the readout as eight waves land .45s apart, a pull back towards the whole page as it fills (6.7s), still drifting; whip left. |
| 7.78 to 15.0 | close | "Seeded in full, / or refunded in full." comes in from the right, then the end card (10.43s): the mark and the wordmark alone, down to black from 14.1s. |
