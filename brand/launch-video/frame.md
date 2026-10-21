# Seed launch video, design truth

Brand truth is the brand book, `brand/brandbook/Seed brand book.html`, and the live site's stylesheets, which `site/`
copies verbatim (`tools/sync-site.mjs`). Where they disagree the code wins; see `brand/CONFLICTS.md`.

## Colours (tokens only, from `site/tokens.css`)

- Ground `--bg` #16171A, flat charcoal. Panels `--panel` rgba(31,33,37,.18) frosted (`--frost`), `--panel-line`, top highlight.
- Text `--ink` #F3F4F6, `--ink-2` #D3D6DC, `--muted` #9DA2AC, `--faint` #868B95.
- Blue, the only colour that is not data: `--solid` #2E63E7, `--navy` #5B8CFF, `--navy-soft` #52668F, `--navy-wash`, `--pill`.
- Results only: `--ok` green (pass, on pace, done), `--caution` amber (behind), `--bad` red (fail). Refunded is grey, as the site draws it.
- Gradients only where the site draws them: the fill bar (`--progress`, red through yellow to green), the primary button
  (`--grad-btn`), the chosen segment (`--grad-seg`), the chart's area fade.
- Background: `js/bg-dither.js` in its fixed-seed mode, the field at second 370 + t, drawn every frame.

## Type

- Instrument Sans 400 and 500 for text and the wordmark (500, -3%). Instrument Serif 400 italic only on a title's first
  line ("Start an idea,", "Seeded in full,"), never the name. IBM Plex Mono 400 and 500 with tabular numerals for figures,
  tickers and addresses. Local files from `brand/fonts/`, no substitutes.
- Text frames (no captions): each line of the script full screen, Sans 500 on 1.1, -4%, `--ink`, at one size per format
  (128px in 16:9, 100px in 9:16, 86px in 1:1), balanced lines inside the safe zone; tickers in Plex Mono.

## Motion

- One curve, cubic-bezier(.22,1,.36,1), in `src/film.js` as an exact solver. No bounces, spins or other curves.
- Entrances rise 10px in .5s, 60ms a column, 45ms a card (and a word of a line). Titles sharpen in .6s (6px).
- Press .97 in 80ms, release in .28s. Fill bar .6s. Sheen every 3.2s. Odometer .55s a digit.
- Chart: line 1.7s after .3s, area at 1.1s, tip at 1.8s, bars grow from the axis. Sting: 21 dots 40ms apart, rim first,
  the seed last, brightening; wordmark fades in at 1.6s; the lockup whips away whole. End card: the dots 30ms apart,
  the seed brightening, the wordmark drawn out from the mark.
- The mark: the muted one, as on Seed's avatar: `--navy-soft` dots, the seed landing in `--solid` and brightening to
  `--navy`. No corner mark.
- The film's edges: up from black in 0.6s, down to black in 0.9s, linear, the sound with it.
- The camera (after the Axiom films in delta/01-video-hyperframes/_motion-refs/): shots resolve out of a fast move on the
  curve and settle slowly; push-ins with depth of field on one element; tilts up to 11°; pull backs to the whole page,
  which always fills the screen (no edge of it shows until the whip that takes it away); into a page through the type
  of a line, out of it on a whip left; motion blur from the camera's own travel. No bloom, no spin. 60fps.

## Layout and safe zones

- 1920×1080: 96px in from every edge. The app at a 1920×1080 window, three columns, filling the screen.
- 1080×1920: 120px sides, 250px top and 320px bottom clear. The app at its 540px phone layout, filling the screen at 2×.
- 1080×1080: 80px in. The app at a 1080×1080 window, two columns, filling the screen.
- The element the camera is on sits in the safe zone; the rest of the page runs out of focus to the edge.
- The mark top left with its clear space kept (the type under it masked away) over the film's own type: from where the
  sting's mark lands and with each line that follows a page, until the end card, where the mark is the subject.

## Avoid

- Everything on the book's "Never" list: revolutionary, seamless, unlock as a promise, game-changing, trustless,
  community-driven, safe, guaranteed returns, emoji, em dashes, exclamation marks, title case, "users".
- A second hue, a gradient on a surface, a glow other than the primary button's and the chosen segment's, a redrawn component.
