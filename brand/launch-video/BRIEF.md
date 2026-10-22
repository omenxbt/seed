---
workflow: general-video
flow: automation
storyboard: no
message: "Seeded in full, or refunded in full."
destination: youtube
aspect: 1920x1080
language: en
length: 34s
angle: product
---

## Intent

Seed's launch video. On-screen kinetic type only, no voiceover, scripted from the brand book's "Thirty seconds,
spoken". It shows how a raise works with the site's own UI (launch card, raise card, seeding steps, raise chart,
refund) and ends on "Seeded in full, or refunded in full." Brand truth is the brand book
(`brand/brandbook/Seed brand book.html`) and the live site's stylesheets; where the two disagree the code wins and the
case is listed in `brand/CONFLICTS.md`.

## Assets

- ../../css/presale.css, ../../css/delta.css and the inline `<style>` of ../../index.html: the site's stylesheets, copied in by `tools/sync-site.mjs`.
- ../fonts/: Instrument Sans 400/500, Instrument Serif 400 italic, IBM Plex Mono 400/500, the site's own files.
- ../logo/seed-mark-dark.svg: the 21-dot mark (dot geometry for the end card).
- ../../js/bg-dither.js: the dot field, in its fixed-seed mode (`?bgt=370`).
- assets/music.wav: the user's score goes here (a silent placeholder until then).

## Customizations

- Formats: 1920×1080 master, 1080×1920 and 1080×1080 recomposed (not cropped), the brand book's safe zones.
- 2026-10-20, from the user: the master 30s at most and 60fps; shorter text frames; the UI full screen; the caption
  pills over the UI replaced by full-screen text frames of their own, separate from the UI.
- 2026-10-21, from the user: the logo always as on Seed's avatar (the muted mark); the title "Start an idea, fund it
  on-chain."; "Most launches ask you to trust a founder with your money." cut; the met line "If the target is met, the
  raise seeds as a tradeable token."; "locked for good." and "fee included." cut; no corner mark; the film fades in and
  out; digital sound effects, then, the same day, no sound effects after all. CONFLICTS 31, 41 and 42.
- 2026-10-21, later, from the user: the pace slowed slightly; the lines "Set a target and deadline", "Buy with SOL or
  USDC" and "Raises seed as tradeable tokens"; two new frames, "Market cap presets" and "Find product-market fit"
  (after the title); the Launch beat rebuilt on final-model's opening market cap presets (merged in). CONFLICTS 1, 31.
  Then "Market cap presets" cut again; the Launch form is one shot after "Set a target and deadline". Then the logo
  sting at the start removed: the film opens on its title (CONFLICTS 44). Then a new opening for the master:
  "Finding product-market fit shouldn't be hard" (an ellipsis first, then none), "Introducing", the logo and wordmark, then "Start an idea, fund it
  on-chain."; the "Find product-market fit" frame cut. Then the token the film launches is Seed's own, Seed ($SEED),
  its art the muted mark (CONFLICTS 17, 25). Then "Introducing" and the logo after it cut again, and a "Pair with
  anything" frame before "Buy with SOL or USDC" (the user: the code is adding pairing with any token; CONFLICTS 45).
- A 15s teaser per format: sting, fill, "Seeded in full, or refunded in full", end card (no sting since 2026-10-21:
  the title opens it).
- Every figure, the URL and the network line are composition variables, read from the program config and LOOP.md.
  (2026-10-20: at the user's direction the end card is the mark and the wordmark alone, so the URL and the network line
  are gone from the film and from its variables; CONFLICTS 40.)
- Audio slot (music track, volume variable) and markers.json with the beat points; one render with no audio.
- Output: H.264 MP4 for every format and cut, a MOV master, an SRT of the on-screen lines, a contact sheet.
- A blind review subagent checks colour, type, easing, timing, safe zones, voice and figures before the push.

## Notes

- Motion: only cubic-bezier(.22,1,.36,1). Entrances rise 10px in .5s, 60ms a column, 45ms a card. Press .97 in 80ms. Fill bar .6s, sheen every 3.2s. Odometer .55s a digit. Chart line 1.7s, area at 1.1s, tip at 1.8s.
- Colour: charcoal and token greys; blue is the only non-data hue; green, amber, red for results only; gradients only on the fill bar and primary button.
- Type: serif italic only on a title's first line, never the name; figures in IBM Plex Mono, tabular.
- Voice: sentence case, no em dashes, no exclamation marks, no emoji, nothing from the "Never" list.
