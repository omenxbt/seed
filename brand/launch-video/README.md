# Seed launch video

A HyperFrames project. The 55s master at 1920×1080, 1080×1920 and 1080×1080, each recomposed for its frame, and a 15s
teaser in each format. On-screen type only, scripted from the brand book's "Thirty seconds, spoken"; every UI moment is
the site's own markup drawn by the site's own stylesheets. Design truth: `frame.md`. Disagreements: `../CONFLICTS.md`.

## Build and render

```bash
node tools/build.mjs          # reads the figures, copies the site's CSS, writes index.html and build/<cut>-<format>/
node tools/render.mjs         # renders all six to out/, plus the MOV master and the no-audio master
node tools/contact-sheet.mjs  # out/contact-sheet-master.png, out/contact-sheet-teaser.png
npm run dev                   # Studio, on the 16:9 master (index.html)
npx hyperframes check build/master-9x16   # any cut and format is its own project under build/
```

- `tools/read-figures.mjs` reads every figure from the program (`state.rs`, the devnet `initConfig`, `claim_refund`),
  `js/config/seed.js` and LOOP.md, and stops the build if they disagree.
- `tools/sync-site.mjs` copies `index.html`'s inline sheet, `css/presale.css`, `css/delta.css`, the `:root` tokens,
  `js/bg-dither.js`, `brand/fonts/` and the mark into `site/`. `tools/capture-site.mjs` saves the markup the site renders
  for a filled raise's chart.
- `src/story.mjs` is the clock: scenes, beats, captions per format, the SRT lines and the beat markers.
  `src/film.css` places the site's panels in each format; `src/film.js` is the one seekable timeline.

## Variables

Declared on `<html data-composition-variables>`: `url`, `networkLine`, `fee`, `feeLabel`, `minTarget`, `maxTarget`,
`deadlineMin`, `deadlineMax`, `supply`, `poolFee`, `poolSplit`, `refund`, `seedingSteps`, `seedingTimeout`, `unlockMin`,
the demo raise (`raiseName`, `raiseTicker`, `raiseTarget`, `raiseBackers`) and `musicVolume`.

```bash
node tools/render.mjs --variables '{"url":"seed.example","networkLine":"Live on Solana mainnet","musicVolume":0.6}'
```

`musicVolume` is written into each page's `<audio data-volume>` by `tools/render.mjs` (the mixer reads the authored
attribute). With `npx hyperframes render --variables` alone, every other variable applies and the volume stays at its default.

## Audio

`assets/music.wav` (master) and `assets/music-teaser.wav` (teasers) are one-second silent placeholders on track 10
(`<audio id="music" data-track-index="10">`). Drop the score in at the same path and rerun `tools/render.mjs`.
`markers.json` lists the beat points (sting hit, fill complete, seeded, refunded, end card) in seconds and frames for each cut.
`out/seed-master-16x9-noaudio.mp4` has no audio stream.

## Out

| File | What |
| --- | --- |
| `out/seed-master-16x9.mp4`, `-9x16`, `-1x1` | the 55s master, H.264 |
| `out/seed-teaser-16x9.mp4`, `-9x16`, `-1x1` | the 15s teaser, H.264 |
| `out/seed-master-16x9-noaudio.mp4` | the master with no audio track |
| `out/seed-master-16x9.mov` | ProRes 422 HQ for editing, written locally (1.3 GB, not in git) |
| `out/seed-master.srt`, `out/seed-teaser.srt` | the on-screen lines |
| `out/contact-sheet-master.png`, `out/contact-sheet-teaser.png` | one still per scene per format |
