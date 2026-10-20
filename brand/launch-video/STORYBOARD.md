---
message: "Seeded in full, or refunded in full."
mode: autonomous
fps: 30
formats: [1920x1080, 1080x1920, 1080x1080]
cuts: { master: 55s, teaser: 15s }
---

Times, page beats and camera keys live in `src/story.mjs`; each scene is a `<section class="clip scene">` in the page
`tools/build.mjs` writes. The camera, cuts and transitions follow the Axiom films in
`delta/01-video-hyperframes/_motion-refs/` (the README maps each move); the site's own motion (rise, sharpen, press,
odometer, fill bar, sheen, chart reveal) plays inside the shots. Every move eases on cubic-bezier(.22,1,.36,1).

## Frame 1 · sting · 0 to 3s
status: built · src: index.html#s-sting
The 21 dots arrive on the spiral 40ms apart, rim first; the seed lands last and brightens (sting hit 1.5s); the wordmark
fades in at 1.6s, the lockup pushing in slowly. At 2.55s the mark flies to the top left and becomes the corner mark,
"Back an idea" sharpening in under it as it goes.

## Frame 2 · title · 2.6 to 8s
status: built · src: index.html#s-title
"Back an idea" fills the frame as it sharpens in; at 4.1s it settles to its size as "at one fixed price." sharpens in
under it (Axiom's huge word to small title). A slow push, then the camera pushes through the type, the lines flying past
and clearing as the next scene comes up under them.

## Frame 3 · trust · 7.7 to 14s
status: built · src: index.html#s-trust
The camera arrives out of the push; "Most launches ask you to trust a founder with your money." rises word by word,
steps back to muted as the camera moves to "Seed asks you to back an idea at one fixed price.", then pushes through it
into the Launch form, which resolves under the line as it flies past.

## Frame 4 · launch · 13.7 to 17.9s
status: built · src: index.html#s-launch
The Launch form resolves out of the push, tilted. Close on the Target field as 8, then 85, is typed ($12.6K at $148.2
per SOL); pan to the deadline, 7 days pressed and the segment sliding; across to "How backers will see it" (the raise
price, the pool at seeding, locked for good); the form scrolls to Open raise, pressed ("Confirm in wallet…"), and the
camera pushes through it.

## Frame 5 · the raise page · 17.9 to 34s
status: built · src: index.html#s-page
The raise page opens, its cards rising. The deposit panel (SOL); back to the readout as eight waves of buys land .55s
apart: the odometer rolls, the bar sweeps red through yellow to green, the backers tick up, the countdown drops; a pull
back to the whole app floating in the field; filled (fill complete 23.45s). A push to the seeding card, held with a slow
push: Run the next step three times, each reading "Running…" until its step ticks; seeded (27.48s): the shot holds as
the site turns the seeding card into the trade card, then cuts to the pool (HALF/SOL, 170 SOL, Meteora DAMM v2,
liquidity locked for good; the price chart above it has no trades yet), then the column scrolls to "How it raised" as it
draws itself (line 1.7s, area at 1.1s, tip at 1.8s); pull back, then the app whips away left.

## Frame 6 · refunded · 34 to 42s
status: built · src: index.html#s-refund
The other ending whips in from the right: an extreme close-up on "Ends in 00:00:03" running out a second at a time;
refunded (37.2s): pull back to "Missed target, refunded", the bar hatched; a cut on the motion to "Refunds claimed"
rolling up to every backer; push to the site's note ("Every backer claims back exactly what they paid in SOL, the 1% fee
included"); the page whips away left.

## Frame 7 · numbers · 42 to 49.4s
status: built · src: index.html#s-numbers
One strip, coming in from the right as the page leaves, the camera whipping from figure to figure (IBM Plex Mono, the
label muted), each figure rolling in as its label rises: 1% on top, 1,000,000,000 supply, 100% refund, Locked for good;
then a pull back to the strip in one line, which whips away left, clearing.

## Frame 8 · close · 49.4 to 55s
status: built · src: index.html#s-close
"Seeded in full," comes up under the strip, fills the frame and settles as "or refunded in full." comes under it. Then
the end card (51.9s): the corner mark flies home to the centre as the end card's mark, the wordmark drawn out from it,
the URL and the network line over the drifting dot field.
