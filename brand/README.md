# Seed brand

Everything here is derived from the site as it ships (index.html's `:root` tokens, `css/delta.css`, the `#seed21` mark). Regenerate with `python3 _src/build.py && zsh _src/render.sh` from this directory (headless Chrome renders the PNGs and the PDF).

## brandbook/
- `Seed brand book.html` — the brand book as one self-contained page (it replaces the generated `index.html` and `Seed-brandbook.pdf`; `_src/build.py` still writes `index.html` if it is run). Open in a browser.

## logo/ (SVG source + PNG render; 1024 px, icons 512 px)
1. The mark — `seed-mark-dark` (ink dots, navy seed, for charcoal), `seed-mark-light` (charcoal dots, blue seed, for light), `seed-mark-muted` (the rail's #52668F dots)
2. Horizontal lockup — `seed-lockup-dark`, `seed-lockup-light`
3. Stacked lockup — `seed-stacked-dark`, `seed-stacked-light`
4. One colour — `seed-mono-white`, `seed-mono-black`, `seed-mono-blue`, and `seed-mono-lockup-{white,black,blue}`
5. The bloom — `seed-bloom-dark`, `seed-bloom-light` (dots fade with size, the seed glows; a texture and banner piece, not a stand-in for the mark)
- App icon — `seed-icon-charcoal` (default), `seed-icon-blue`, `seed-icon-light`; 512 px rounded squares. Use `seed-icon-charcoal.png` as the X avatar.

The wordmark in the lockups is Instrument Sans 600 at −3% tracking, converted to paths, so the SVGs need no fonts.

## banner/ (1500 × 500 PNG + the HTML source each was rendered from)
1. `banner-01-minimal` — the mark alone over a thinned dot field, lockup top right
2. `banner-02-tagline` — "Back the idea, at one fixed price.", the hero paragraph, the two buttons
3. `banner-03-terminal` — the stat chips and three board rows
4. `banner-04-dotfield` — the bloom mark in a blue field, stacked wordmark
5. `banner-05-split` — a hatched paper panel with the mark, a plain half with the line

All five keep the lower-left clear for X's avatar. Edit the copy or figures in the HTML and re-render.

## fonts/
Instrument Sans (variable), Instrument Serif, IBM Plex Mono — the site's three families from Google Fonts, kept locally so the HTML sources and the brand book render offline.

## _src/
`build.py` (writes every SVG, banner and the brand book from the tokens), `render.sh` (Chrome renders), `wrap/` (the 1024/512 px PNG wrappers), `manifest.txt`.
