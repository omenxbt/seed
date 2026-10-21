# Seed launch video

A HyperFrames project. The 31.3s master at 1920×1080, 1080×1920 and 1080×1080, each recomposed for its frame, and a 15s
teaser in each format, all at 60fps. On-screen type only: each line of the brand book's "Thirty seconds, spoken", as the
user rewrote it (`../CONFLICTS.md` 31), is a full-screen text frame of its own. Between the lines, every UI moment is the site itself, filling the screen: the page
the site draws at each beat of the story, flown over by one camera. Design truth: `frame.md`.
Disagreements: `../CONFLICTS.md`.

## How it moves

The camera, cuts and transitions follow the Axiom films in
`~/Desktop/crypto/launches/delta/01-video-hyperframes/_motion-refs/` (breakdowns in `_breakdowns/`): the motion only,
never their UI, colours or type.

| Axiom move | Here |
| --- | --- |
| Title frames between UI shots, about 1.5s each (portfolio-v2) | each line of the script is its own full-screen frame between the pages, Sans 500 at one size per format |
| A huge word that settles to a small title (portfolio-v2 0–7.7s) | "Start an idea," and "Seeded in full," come in filling the frame and settle |
| Zoom through the type into the next shot (ink-chain 2.9–3.2s) | the camera pushes through a line: it flies past and clears over the page already resolving under it |
| Motion-blur whip out of the UI to the next title (portfolio-v2 6–7.5s) | each page whips away left, blurred, its last edge clearing the frame, as the next line comes in from the right |
| Zoom-blur whip into tilted UI, slow 3D drift (ink-chain 2.9–4.6s) | each page shot resolves out of a fast move, tilted up to 11°, then settles slowly on the brand's curve |
| Extreme close-up on one value with shallow depth of field (bnb-v2 15–17.5s) | the opening market cap presets as $50K is pressed and the raise line it derives, the deadline segment, the readout as the odometer rolls, "Ends in 00:00:01" |
| State changes inside a held shot (portfolio-v2 2–6s) | the raise page after each wave of buys, the seeding step, seeded, refunded: the camera keeps moving while the page changes |
| Pull back to the full app on a tilt (bnb-v2 30–35s) | the whole raise page filling the screen as it fills |
| Mark alone, then the wordmark built out from it (ink-chain 6.4s) | the end card: the mark's dots arrive on the spiral and the seed brightens, then the wordmark is drawn out from it, and the film holds on the lockup alone and goes down to black |

Everything eases on `cubic-bezier(.22,1,.36,1)`. Depth of field is a masked backdrop blur over the page and motion blur
a directional SVG blur from the camera's own travel per frame (`#dof`, `#mb`), so frosted panels keep their glass. The
pages fill the screen: every camera pose is kept where the page covers the whole frame, tilt and all (`cover` in
`src/film.js`), until the whip that takes it away. There is no logo sting and no corner mark: the film opens on its
title and the mark is the end card's, the muted one (slate dots, the seed landing in the brand blue and brightening), as
on Seed's avatar. The film comes up from black over its first 0.6s and goes down to black over its last 0.9s, the sound
with it.
One dot field runs under the whole film: a page's stage draws it on the ground under its panels (for their glass to
blur), the film's own type plays straight over `#bg-dither`, and at a handoff the film's type sits over the page.

Close-ups stay sharp. Chrome draws a large layer under a perspective transform at no more than one pixel per CSS pixel,
so a page the camera held at 3.6 times its window used to be drawn at its window's size and stretched. Each page is laid
out four times its window (CSS `zoom` on `.scr`: the same layout, every length four times) and the camera scales it back,
so the closest shot is still drawn finer than the frame shows it; the film's own type is laid out at twice its size the
same way (`ZOOM` in `src/story.mjs`). The raise's banner and art are kept at four times their pixels with every dot of
the field a hard square.

## Build and render

```bash
node tools/capture-pages.mjs  # the site draws each beat (site/pages/<format>/) and its CSS at each window (site/flat-*.css)
node tools/build.mjs          # reads the figures, writes index.html and build/<cut>-<format>/
node tools/render.mjs         # renders all six to out/, plus the MOV master and the no-audio master
node tools/contact-sheet.mjs  # out/contact-sheet-master.png, out/contact-sheet-teaser.png
npm run dev                   # Studio, on the 16:9 master (index.html)
npx hyperframes check build/master-9x16   # any cut and format is its own project under build/
```

- `tools/read-figures.mjs` reads every figure from the program (`state.rs`, the production profile in
  `scripts/check-deploy.ts`, the devnet `initConfig`, `claim_refund`), `js/config/seed.js` and LOOP.md, and stops the
  build if they disagree.
- `tools/capture-pages.mjs` runs the site (`index.html`) in the Chrome HyperFrames uses, at 1920×1080, 1080×1080 and
  540×960, on its demo data with a fixed clock and every outside request refused. The film's raise is the demo raise
  Halfmoon set to `src/raise.json` (the $50K opening market cap preset, so a 168.69 SOL raise at the demo SOL price, 7
  days, eight waves of buys); the Launch form is filled by pressing its presets and deadline.
  Rerun it whenever the site changes.
- `tools/sync-site.mjs` copies the tokens, `js/bg-dither.js`, `brand/fonts/` and the mark into `site/`, with
  `fonts-extra/`: the glyphs the pages use that Google Fonts' latin subsets leave out (the subscript digits of a raise
  price, the back link's arrow), cut from the full IBM Plex Mono and Instrument Sans at the same versions.
- `src/story.mjs` is the clock and the camera: scenes, page beats, camera keys per format, the lines, the SRT and the
  beat markers. `src/film.js` is the one seekable timeline; `src/film.css` the stage and the film's own type.
- Renders use the host GPU (HyperFrames' default on a Mac). Chrome's software compositor clips a frosted panel's blur
  under a 3D tilt, so a render with `--no-browser-gpu` would show the dot field through part of a tilted panel.

## Variables

Declared on `<html data-composition-variables>`: `fee`, `feeLabel`, `presets`, `raiseRule`,
`deadlineMin`, `deadlineMax`, `supply`, `poolFee`, `poolSplit`, `refund`, `seedingSteps`, `seedingTimeout`, `unlockMin`,
and `musicVolume`. The pages show the figures because the site drew them from the same code (the cut has no
numbers strip of its own); a change in the code reaches them on the next `capture-pages.mjs`. The end card is the mark
and the wordmark alone, so it carries no URL or network line (`../CONFLICTS.md` 40).

```bash
node tools/render.mjs --variables '{"musicVolume":0.6}'
```

`musicVolume` is written into each page's `<audio data-volume>` by `tools/render.mjs` (the mixer reads the authored
attribute). With `npx hyperframes render --variables` alone, every other variable applies and the volume stays at its default.

## Audio

`assets/music.wav` (master) and `assets/music-teaser.wav` (teasers) are silent placeholders on track 10
(`<audio id="music" data-track-index="10">`), fading in and out with the picture (`data-fade-in` 0.6s, `data-fade-out`
0.9s). There are no sound effects (the user's direction, 2026-10-21). Drop the score in at the same path and rerun
`tools/render.mjs`.

`markers.json` lists the beat points (fill complete, seeded, refunded, end card, fade out) in seconds and
frames for each cut. `out/seed-master-16x9-noaudio.mp4` has no audio stream.

## Out

| File | What |
| --- | --- |
| `out/seed-master-16x9.mp4`, `-9x16`, `-1x1` | the 31.3s master, H.264 at CRF 10, 60fps |
| `out/seed-teaser-16x9.mp4`, `-9x16`, `-1x1` | the 15s teaser, H.264 at CRF 10, 60fps |
| `out/seed-master-16x9-noaudio.mp4` | the master with no audio track |
| `out/seed-master-16x9.mov` | ProRes 4444 for editing, rendered from the page (not from the MP4), written locally (not in git) |
| `out/seed-master.srt`, `out/seed-teaser.srt` | the on-screen lines |
| `out/contact-sheet-master.png`, `out/contact-sheet-teaser.png` | one still per scene per format |
