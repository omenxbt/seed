---
message: "Seeded in full, or refunded in full."
mode: autonomous
fps: 60
formats: [1920x1080, 1080x1920, 1080x1080]
cuts: { master: 30s, teaser: 15s }
---

Times, page beats and camera keys live in `src/story.mjs`; each scene is a `<section class="clip scene">` in the page
`tools/build.mjs` writes. The cut is the brand book's "Thirty seconds, spoken", paced as the Axiom films in
`delta/01-video-hyperframes/_motion-refs/` pace theirs: each line of the script is a full-screen text frame, and between
them the site's own pages fill the screen under one camera. A text frame goes into a page by the camera pushing through
its type, the page resolving under it; a page goes out on a whip left, the next line coming in from the right. The
site's own motion (rise, press, odometer, fill bar, sheen) plays inside the shots. Every move eases on
cubic-bezier(.22,1,.36,1).

## Master, 30s

| Time | Frame | On screen |
| --- | --- | --- |
| 0 to 2.6 | sting | The 21 dots arrive on the spiral 40ms apart, rim first; the seed lands last and brightens (1.5s); the wordmark fades in at 1.6s. At 2.25s the mark flies to the top left and becomes the corner mark. |
| 2.35 to 4.75 | line | "Most launches ask you to trust a founder with your money." rises word by word under the flying mark; the camera pushes through it. |
| 4.5 to 6.75 | title | "Back an idea" fills the frame, then settles as "at one fixed price." comes under it; whips away left. |
| 6.33 to 8.1 | line | "A founder sets a target and a deadline." comes in from the right; the camera pushes through it. |
| 7.9 to 10.55 | Launch form | The form resolves under the line, tilted. Close on Target as 8, then 85, is typed ($12.6K at $148.2 per SOL); across to the deadline, 7 days pressed; the form scrolls to Open raise, pressed ("Confirm in wallet…"); whip left. |
| 10.23 to 11.85 | line | "You buy in with SOL or USDC." comes in from the right; the camera pushes through it. |
| 11.7 to 14.8 | raise page | Two waves in: the deposit panel (SOL or USDC), then across to the readout as six waves land .35s apart (the odometer rolls, the bar sweeps red through yellow to green, the backers tick up); a pull back to the whole page as it fills (14.1s); whip left. |
| 14.48 to 16.6 | line | "If the target is met, / the whole raise opens a Meteora pool," comes in from the right; push through. |
| 16.45 to 19.2 | seeding | The seeding card, three steps done; Run the next step pressed ("Running…"); a pull back to the whole page as it turns seeded (17.63s): "Seeded" on the identity card, the readout turning into the pool's chart, the seeding card into the trade card; a push to the pool's line (HALF/SOL, 170 SOL, Meteora DAMM v2, liquidity locked for good); whip left. |
| 18.88 to 20.0 | line | "locked for good." comes in huge from the right and settles; push through. |
| 19.72 to 21.9 | line | "If it misses, / every wallet gets back exactly what it paid," rises; push through. |
| 21.75 to 24.5 | refunded | The other ending: an extreme close-up on "Ends in 00:00:01" running out; refunded as it reaches zero (22.75s), a pull back to "Missed target, refunded", the bar hatched, and the site's note ("…the 1% fee included"); whip left. |
| 24.18 to 25.3 | line | "fee included." comes in huge and settles; push through. |
| 25.0 to 30.0 | close | "Seeded in full," fills the frame and settles as "or refunded in full." comes under it. The end card (27.2s): the corner mark flies home to the centre as the end card's mark, the wordmark is drawn out from it, the URL and the network line under it, over the drifting dot field. |

The corner mark is up over the film's own type only: from where the sting's mark lands and with each line that
follows a page, until the next page fills the screen.

## Teaser, 15s

| Time | Frame | On screen |
| --- | --- | --- |
| 0 to 2.6 | sting | As in the master. |
| 2.45 to 4.65 | title | "Back an idea / at one fixed price."; the camera pushes through it. |
| 4.45 to 8.95 | raise page | The deposit panel, across to the readout as eight waves land .35s apart, a pull back to the whole page as it fills (7.6s), whip left. |
| 8.63 to 15.0 | close | "Seeded in full, / or refunded in full." comes in from the right, then the end card (11.0s). |
