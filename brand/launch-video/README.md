# Seed launch video

A HyperFrames project. The 55s master at 1920×1080, 1080×1920 and 1080×1080, each recomposed for its frame, and a 15s
teaser in each format. On-screen type only, scripted from the brand book's "Thirty seconds, spoken". Every UI moment is
the site itself: the page the site draws at each beat of the story, flown over by one camera. Design truth: `frame.md`.
Disagreements: `../CONFLICTS.md`.

## How it moves

The camera, cuts and transitions follow the Axiom films in
`~/Desktop/crypto/launches/delta/01-video-hyperframes/_motion-refs/` (breakdowns in `_breakdowns/`): the motion only,
never their UI, colours or type.

| Axiom move | Here |
| --- | --- |
| A huge word that settles to a small title, then a whip into the UI (portfolio-v2 0–7.7s) | "Back an idea" sharpens in under the sting's flying mark, fills the frame, settles as "at one fixed price." comes under it |
| Zoom through the type into the next shot (ink-chain 2.9–3.2s) | the camera pushes through each title and the trust line: the lines fly past and clear over the next scene, already resolving under them (the trust line into the Launch form) |
| Zoom-blur whip into tilted UI, slow 3D drift (ink-chain 2.9–4.6s) | each page shot resolves out of a fast move, tilted 7–16°, then settles slowly on the brand's curve |
| Extreme close-up on one value with shallow depth of field (bnb-v2 15–17.5s) | the Target field as it is typed, the deadline segment, the readout as the odometer rolls, "Ends in 00:00:03" |
| State changes inside a held shot (portfolio-v2 2–6s) | the raise page after each wave of buys, each seeding step, seeded, refunded: the camera keeps moving while the page changes |
| Pull back to the full app on a tilt (bnb-v2 30–35s) | the whole raise page floating in the dot field, in the brand book's screen frame (16px radius, the panel line) |
| Horizontal pans between stations (portfolio-v2 12–17.5s) | the numbers strip: a whip from figure to figure, then a pull back to the strip in one line |
| Mark alone, then the wordmark built out from it (ink-chain 6.4s) | the end card: the corner mark flies home to the centre, then the wordmark is drawn out from it |

Everything eases on `cubic-bezier(.22,1,.36,1)`. Depth of field is a masked backdrop blur over the page and motion blur
a directional SVG blur from the camera's own travel per frame (`#dof`, `#mb`), so frosted panels keep their glass. The
pages play inside the brand book's screen frame (a 16px-radius panel over the dot field, `#mat` and `#matline`), below
the corner mark, which stays top left from 3s to the end card. One dot field runs under the whole film: a page's stage
draws it on the ground under its panels (for their glass to blur), the film's own type plays straight over `#bg-dither`,
and at a handoff the scene going out sits over the one coming in.

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
  Halfmoon set to `src/raise.json` (85 SOL, 7 days, eight waves of buys); the Launch form is filled by typing into it.
  Rerun it whenever the site changes.
- `tools/sync-site.mjs` copies the tokens, `js/bg-dither.js`, `brand/fonts/` and the mark into `site/`, with
  `fonts-extra/`: the glyphs the pages use that Google Fonts' latin subsets leave out (the subscript digits of a raise
  price, the back link's arrow), cut from the full IBM Plex Mono and Instrument Sans at the same versions.
- `src/story.mjs` is the clock and the camera: scenes, page beats, camera keys per format, captions, the SRT lines and
  the beat markers. `src/film.js` is the one seekable timeline; `src/film.css` the stage and the film's own type.
- Renders use the host GPU (HyperFrames' default on a Mac). Chrome's software compositor clips a frosted panel's blur
  under a 3D tilt, so a render with `--no-browser-gpu` would show the dot field through part of a tilted panel.

## Variables

Declared on `<html data-composition-variables>`: `url`, `networkLine`, `fee`, `feeLabel`, `minTarget`, `maxTarget`,
`deadlineMin`, `deadlineMax`, `supply`, `poolFee`, `poolSplit`, `refund`, `seedingSteps`, `seedingTimeout`, `unlockMin`
and `musicVolume`. The figures set the film's own type (the numbers strip, the SRT). The pages show the same figures
because the site drew them from the same code; a change in the code reaches them on the next `capture-pages.mjs`.

```bash
node tools/render.mjs --variables '{"url":"seed.example","networkLine":"Live on Solana mainnet","musicVolume":0.6}'
```

`musicVolume` is written into each page's `<audio data-volume>` by `tools/render.mjs` (the mixer reads the authored
attribute). With `npx hyperframes render --variables` alone, every other variable applies and the volume stays at its default.

## Audio

`assets/music.wav` (master) and `assets/music-teaser.wav` (teasers) are silent placeholders on track 10
(`<audio id="music" data-track-index="10">`). Drop the score in at the same path and rerun `tools/render.mjs`.
`markers.json` lists the beat points (sting hit, fill complete, seeded, refunded, end card) in seconds and frames for each cut.
`out/seed-master-16x9-noaudio.mp4` has no audio stream.

## Out

| File | What |
| --- | --- |
| `out/seed-master-16x9.mp4`, `-9x16`, `-1x1` | the 55s master, H.264 |
| `out/seed-teaser-16x9.mp4`, `-9x16`, `-1x1` | the 15s teaser, H.264 |
| `out/seed-master-16x9-noaudio.mp4` | the master with no audio track |
| `out/seed-master-16x9.mov` | ProRes 422 HQ for editing, written locally (not in git) |
| `out/seed-master.srt`, `out/seed-teaser.srt` | the on-screen lines |
| `out/contact-sheet-master.png`, `out/contact-sheet-teaser.png` | one still per scene per format |
