# Conflicts

Where the brand book (`brand/brandbook/Seed brand book.html`), a brief, and the code disagree. The code wins until someone
decides otherwise; each case says what the launch video (`brand/launch-video/`) does. Checked 2026-10-19.

## Figures

1. **Minimum target: 81 SOL or $2,000.** The launch video brief says the decision was $2,000. The code enforces
   **81 SOL**: at `a218c97` as `MIN_TARGET_LAMPORTS = 81_000_000_000` in `program/programs/seed/src/state.rs`, checked in
   `open_raise` (`UnderFloor`; a USDC raise must meet the same dollars at the SOL price). Commit `6d687c6` (2026-10-19)
   moved it into the Config (`min_target_lamports`, set once at `init_config`, refused as `TargetBelowMinimum`), with
   81 SOL in the production profile of `program/scripts/check-deploy.ts` and 0.1 SOL on devnet. The site agrees:
   `minTargetSol: 81` in `js/config/seed.js`, the Launch form's hint "at least 81 SOL, at most $100,000", and LOOP.md
   ("at least 81 SOL or its worth in USDC"). The devnet test floor was 0.05 SOL at `a218c97` (`TEST_MIN_TARGET_LAMPORTS`)
   and is 0.1 SOL from `6d687c6`. History:
   PROGRESS.md listed "minimum raise target ≈$2,000" as an open decision, then commit `ef86848` set "The minimum raise
   is 81 SOL (Josh)". The brand book agrees with the code. **The video uses 81 SOL** (variable `minTarget`, shown in the
   launch card's hint). A $2,000 floor would need a program change and an upgrade on devnet; then re-render with
   `--variables '{"minTarget":"$2,000"}'` or rerun `tools/build.mjs`, which rereads the program.
2. Every other figure agrees across the program, `program/tests/seed.ts` (the devnet `initConfig`), `js/config/seed.js`
   and LOOP.md: fee 1% on top, maximum target $100,000, deadline 24 hours to 14 days, supply 1,000,000,000, pool fee
   1.25% split 70/30, refund 100% (`claim_refund` pays amount + fee), 4 seeding steps, 3-day seeding timeout, last
   unlock at least 90 days. `brand/launch-video/tools/read-figures.mjs` checks this on every build and fails on a mismatch.

## Paths the brief and the book name that do not exist

3. The brand book is `brand/brandbook/Seed brand book.html` (untracked in the working tree; the committed
   `brand/brandbook/index.html` and `Seed-brandbook.pdf` show as deleted). There is no `brand/index.html`.
4. There is no `css/tokens.css`, `css/base.css`, `brand/kit/`, `brand/video/` (the book's Remotion project) or
   `brand/_build/extract-tokens.mjs`. The tokens are the `:root` blocks of `index.html` and `css/delta.css`; the video's
   `tools/sync-site.mjs` extracts them verbatim to `site/tokens.css`. The mark SVGs are in `brand/logo/`.
5. There was no `brand-book` branch; it was created from `final-model` at `a218c97`.

## Motion

6. **Title sharpen.** The book says a title "sharpens out of a slight blur". The site's keyframe is
   `@keyframes sharpen{from{opacity:0;transform:translateY(6px)}}`, .6s on the curve, no blur. The video follows the code.
7. **Curves other than cubic-bezier(.22,1,.36,1) in the site's CSS:** the live bar's sheen (`ease-in-out`), the live
   pill's and the current seeding step's pulse (`livePulse`, `ease-in-out`), a buy's tick (`ease-out`), the chart's area
   and tip fades (`ease`), and `spin`. The brief allows one curve, so the video draws the sheen and the chart fades on the
   brand curve and leaves out the pulses and the tick.

## Colour and type

8. **Refunded is grey on the site, not red.** `.st-pill.refunded` is `--chip` on `--muted` and a refunded bar is hatched
   `--navy-soft`. The video follows the site. Amber appears once, as the site's "Behind" pace chip.
9. **Gradients beyond the fill bar and the primary button.** The chosen segment and the current seeding step's number use
   `--grad-seg` (`css/delta.css`), and the raise chart's area is a `#5B8CFF` fade. The video shows them as the site draws them.
10. **Figures and tickers the site sets in sans:** the backers count in a raise's fill card, the Launch form's target hint
    ("at least 81 SOL, at most $100,000", then "$12.6K at $148.2 per SOL"), "Deadline passed Oct 24, 3:36 PM", the
    seeding card's title ("Seeding $HALF") and the refund toast. The video keeps the site's markup.
11. **Wordmark weight.** The book says 500 (the app bar); the lockup SVGs in `brand/logo/` set it at 600
    (`brand/README.md`). The video sets the wordmark as live text at 500.
12. **Primary button contrast.** White on `--grad-btn` measures 4.01:1 in HyperFrames' contrast check, under WCAG AA's
    4.5:1 for 14px text. The video keeps the site's button.
13. **Demo art.** Every demo raise's art in `assets/demo/` is a pastel gradient. The video uses Halfmoon's (blue), so
    blue stays the only hue that is not data.

## The site against itself

19. **The refund amount.** The raise page's "Your position" card says "Claim refund of 2 SOL" and "If it refunds: 2 SOL
    back" (`positionPanel`, `js/presale-page.js`: it shows the buy without its fee), while the program pays back
    amount + fee and the site's own toast says "Refund claimed: 2.02 SOL is back in your wallet, fee included". The video
    shows the toast. The card is worth fixing on the site.

## Video specifics

14. **One clause a line against the line limits.** In 9:16 and 1:1 some sentences need more lines than the format allows,
    so they run across two caption cards, broken at a clause or phrase.
15. **The seeding note.** The site says "If seeding has not finished by Oct 22, 3:37 PM"; the video says "3 days after the
    fill", from the `seedingTimeout` variable, since a date means nothing in a film.
16. **"Locked for good" in the numbers strip** is not a figure, so it is set in Sans 500 with the label "the pool".
17. **Music volume.** HyperFrames' mixer reads the `data-volume` written in the HTML, not one set by script, so
    `musicVolume` takes effect through `tools/render.mjs`, which writes it into each page before rendering.
18. **The book's video kit is Remotion in `brand/video/`; this video is HyperFrames,** per the brief.
20. **Frosted panels rise without fading,** as the site's `rise` keyframe does (a fading card cannot blur what is behind
    it), so scenes of panels begin and end on a cut; type fades.
21. **The raise page's states, as the site draws them.** The fill is the raise page's live card; seeding is the filled page's seeding card
    (step 1 current, as at Filled), and the third step turns it into the seeded page, whose chart ("How it raised") draws
    itself as the page opens; the refunded card keeps the final raise (52.70 of 85.00, 62%) while its "Refunds claimed"
    stat rolls up to every backer. The chart is the site's `raiseSVG`/`buysSVG` at each format's column width, from the
    demo raise Cobalt's buys scaled to the film's 85 SOL and 7-day window.
22. **A faster clock.** The raise's countdown drops hours with each buy, so it fills where the chart says (82% of the
    window), and the refund countdown runs its last three seconds in real time.
23. **Trimmed site panels.** The launch card is the Launch form's Raise fieldset with the pair, target and deadline;
    "What backers pay" and the optional minimum buy and maximum per wallet are left out. The identity card is the raise
    page's `pp-id` without its banner, socials and six `ppStats` (the fill card carries the same figures); only the
    refunded page's Backers and Refunds claimed are kept, two abreast as on a desktop window.
24. **The script** is "Thirty seconds, spoken" as the brief places it; "and your tokens are yours the same day" and
    "That is Seed." are left out (the end card's wordmark says the last).
25. **The toast** sits under the cards, not 22px from the foot as on the site, because the captions own the foot.
26. **Zoom per scene.** Panels are drawn at 1.5× (16:9), 1.6× (9:16) and 1.25× (1:1) of the site's CSS pixels, less where
    the site's own chart needs the height (the seeded page: 1.15× and 1.35×), the toast does (9:16 refunded: 1.35×) or
    the two raise cards need the width at the site's own sizes (1:1 launch, fill and refunded: 1.18×).
