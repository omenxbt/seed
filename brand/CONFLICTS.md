# Conflicts

Where the brand book (`brand/brandbook/Seed brand book.html`), a brief, and the code disagree. The code wins until someone
decides otherwise; each case says what the launch video (`brand/launch-video/`) does. Checked 2026-10-21.

## Figures

1. **Raise sizing: presets, not a minimum target.** The launch video brief says the minimum target was decided at
   $2,000; the code later enforced 81 SOL. Since `10e9d7a` (2026-10-20, merged into this branch 2026-10-21) neither
   exists: the founder picks an opening market cap from the Config's four presets (`preset_caps_cents`, set once at
   `init_config`: $50K, $100K, $150K, $200K in the production profile of `program/scripts/check-deploy.ts` and in
   `PRESET_CAPS_CENTS`, `program/client/seed.ts`), and `open_raise` derives the raise, cap × (1 − team share) ÷ 2, in
   the pair asset at the Pyth price; the presets are the floor and the ceiling, so there is no minimum and no $100,000
   cap. The site (`presetCapsUsd` in `js/config/seed.js`, `targetForCap` in `js/model.js`) and LOOP.md agree. The video
   follows the code: its founder picks the $50K preset with no team share, so its raise is $25,000, 168.69 SOL at the
   site's demo SOL price ($148.2), and its pool opens at a $50K market cap (variables `presets` and `raiseRule`). The
   brand book's copy still speaks of a target and "Back the idea, at one fixed price."; the raise price is still fixed.
2. Every other figure agrees across the program, `program/tests/seed.ts` (the devnet `initConfig`), `js/config/seed.js`
   and LOOP.md: fee 1% on top, deadline 24 hours to 14 days, supply 1,000,000,000, pool fee 1.25% split 70/30, refund
   100% (`claim_refund` pays amount + fee), 4 seeding steps, 3-day seeding timeout.
   `brand/launch-video/tools/read-figures.mjs` checks this on every build and fails on a mismatch.
3. **The last team unlock: at least 90 days, or no minimum.** The brand book's terms table still says "Last unlock
   ≥ 90 days". Since `fc15d6c` (2026-10-20, "Team restrictions scrapped") there is no minimum: LOOP.md says "No minimum
   length, no maximum", `math::check_schedule` checks only the sum and the order, the production profile of
   `check-deploy.ts` no longer names `minUnlockDays`, and the Config keeps the field only for its layout. The video
   follows the code: `unlockMin` is "none", and nothing on screen states an unlock length.

## Paths the brief and the book name that do not exist

4. The brand book is `brand/brandbook/Seed brand book.html` (untracked in the working tree; the committed
   `brand/brandbook/index.html` and `Seed-brandbook.pdf` show as deleted). There is no `brand/index.html`.
5. There is no `css/tokens.css`, `css/base.css`, `brand/kit/`, `brand/video/` (the book's Remotion project) or
   `brand/_build/extract-tokens.mjs`. The tokens are the `:root` blocks of `index.html` and `css/delta.css`; the video's
   `tools/sync-site.mjs` extracts them verbatim to `site/tokens.css`. The mark SVGs are in `brand/logo/`.
6. There was no `brand-book` branch; it was created from `final-model` at `a218c97`.

## Motion

7. **Title sharpen.** The book says a title "sharpens out of a slight blur". The site's keyframe is `@keyframes
   sharpen{from{opacity:0;transform:translateY(6px)}}`, .6s on the curve, no blur. The video follows the code.
8. **Curves other than cubic-bezier(.22,1,.36,1) in the site's CSS:** the live bar's sheen (`ease-in-out`), the live
   pill's and the current seeding step's pulse (`livePulse`, `ease-in-out`), a buy's tick (`ease-out`), the chart's area
   and tip fades (`ease`), and `spin`. The brief allows one curve, so the video draws the sheen and the chart fades on
   the brand curve and leaves out the pulses and the tick.

## Colour and type

9. **Refunded is grey on the site, not red.** `.st-pill.refunded` is `--chip` on `--muted` and a refunded bar is hatched
   `--navy-soft`. The video follows the site. Amber appears only in the site's caution chips.
10. **Gradients and glows beyond the fill bar, the primary button and the chosen segment.** The site gives `--grad-seg`
    (`css/delta.css`) to more than the chosen segment: the current seeding step's number, the Launch form's section
    numbers (`nav.steps .num`, 01 to 06), the icon rail's current item (`.rail-nav .rn[aria-current]`, which also takes
    `--glow-sm`) and the deposit and trade boxes' pair chip ("SOL", `.rail-card .inp .suf`); and the raise chart's area
    is a `#5B8CFF` fade. A focused field's ring carries `--glow-sm` too (`.inp:focus-within`, `css/delta.css`); no field
    is focused in the film. The video shows them as the site draws them.
11. **Figures and tickers the site sets in sans.** The site sets in IBM Plex Mono its figure cells (`.num`: the raised
    figure and its odometer, the stats, prices, the pool's figures, addresses, countdowns) and everything else in
    Instrument Sans, figures and tickers included, wherever they sit in a control, a chip, a label or a sentence. On the
    pages the film shows (every beat, scanned in all three formats) those are: the Launch form's pair segment ("SOL",
    "USDC"), opening market cap segment ("$50K", "$100K", "$150K", "$200K") and deadline segment ("24h", "3 days",
    "7 days", "14 days"); the chips and pills "SOL pair", "Pairs with
    SOL", "1 of 4 steps" and "1 warning", and the unit in the app bar's chips and the deposit box ("SOL"); the titles
    and labels "Deposit into $HALF", "Seeding $HALF", "Trade $HALF", "Top 10 backers", "24h volume", "Founder's 70%",
    the pool card's pair ("HALF/SOL", a `dd` without `.num`), the chart legend "Buys per 6 hours", the filled card's
    "Filled 1m ago" and backers count ("214 backers") and "Deadline passed Oct 24, 3:36 PM"; the Launch form's hints
    (the opening market cap's "at $148.2 per SOL today; fixed at the Pyth price when the raise opens"; the uploads'
    "1500 × 500 px", "1:1, square" and "10 MB at most"; the ticker check's "top-500 Solana token"; the team and payout
    notes, "1B" and "7 days" among them; the intro's "The supply is 1B") and its preview and "What backers pay" rows
    (`#pvFacts`, `#derivedRows`: "the raise is $50K × 100% ÷ 2 =", "500,000,000 tokens", "($50K)", "each side at
    opening (337.38 SOL, $50K in all)", "Oct 24, 3:36 PM, or the moment it fills", "when the 7 days are up", "a day at
    $5K, $25K or $100K of daily volume"); the app bar's chips ("1", "$232.69K", "$148.2"); and every line of
    running text that carries a figure: the pace line (`.pp-pace`), the filled and refunded raises' notes (`.pp-note`,
    "by Oct 26, 10:01 AM", "the 1% fee included"), the seeding card's note, the Creator fees text ("70% … 30% …") and
    the About text ("Stake SOL once…"). The video shows the site's pages as the site draws them; the film's own tickers, in the text frames ("SOL or USDC"), are in IBM Plex Mono.
12. **Glyphs the site's font files leave out.** The site loads Google Fonts' latin subsets of IBM Plex Mono and
    Instrument Sans, which have no subscript digits and no left arrow, so the zero count in a raise price ("0.0₆17 SOL",
    U+2080 to U+2089) and the back link ("← All raises", U+2190) fall back to a system face on the site. The film draws
    them in the brand's own faces: `brand/launch-video/fonts-extra/` holds those glyphs cut from the full fonts at the
    same versions (IBM Plex Mono 2.3, Instrument Sans 1.000), and `tools/sync-site.mjs` adds their faces to the film's
    font CSS. Worth fixing on the site, by loading faces that carry them.
13. **Green and amber for states, on the site's pages.** The book keeps green, amber and red for results. The site also
    uses green for passing and progress states and amber for a caution. On the pages the film shows, green is the "Live"
    tag on the rail's chat card, the pace chip's "On pace" and the filled card's "1 of 4 steps", the risk chip's "All
    checks pass" and "Passing so far", the seeding card's done steps, the "Seeded" pill, the pool card's "1.00×" (at or
    above the raise price), "Liquidity locked for good", the trade panel's Buy side and its button ("Connect wallet to
    trade"; in 9:16 it sits large and out of focus under the pool's line) and the connected wallet's dot in the app bar;
    amber is the pace chip's "Behind pace" and the risk chip's "1 warning". The video shows them as the site draws them.
14. **Wordmark weight.** The book says 500 (the app bar); the lockup SVGs in `brand/logo/` set it at 600
    (`brand/README.md`). The video sets the wordmark as live text at 500.
15. **The mark's dot count at small sizes.** The book says the 13-dot mark at 56px and under. The site's app bar draws
    the 21-dot mark (`#seed21`) at every size, and the pages show it as the site draws it. The film's own mark is in the
    sting and the end card only, at 218px (16:9) and 192px (9:16, 1:1), where the 21-dot mark is the book's.
16. **Primary button contrast.** White on `--grad-btn` measures 4.01:1 in HyperFrames' contrast check, under WCAG AA's
    4.5:1 for 14px text. The video keeps the site's button.
17. **Demo art.** Every demo raise's art and banner in `assets/demo/` is a pastel gradient (Halfmoon's runs cyan to
    violet), and a raise with no banner gets the site's blue `.pp-banner` gradient. The film's raise wears the site's
    own dot field instead: its banner and art are crops of `js/bg-dither.js` at its fixed second (`site/assets/film/`),
    given to the Launch form's own upload slots as well, so its preview shows them and not the site's pastel stand-in
    glyph. So the film adds no hue but blue and no gradient to the pages.

## The site against itself

18. **The refund amount.** The raise page's "Your position" card says "Claim refund of 2 SOL" and "If it refunds: 2 SOL
    back" (`positionPanel`, `js/presale-page.js`: it shows the buy without its fee), while the program pays back amount
    + fee and the site's own toast says "Refund claimed: 2.02 SOL is back in your wallet, fee included". The video shows
    neither: its refund beat is the refunded page's own note ("Every backer claims back exactly what they paid in SOL,
    the 1% fee included") and the "Refunds claimed" count, with no wallet connected. The card is worth fixing on the
    site.

## Video specifics

19. **Text frames, not captions.** The book's caption spec (Sans 500 on a `--bar` pill, the lower third kept clear) is
    not used: at the user's direction (2026-10-20) each line of the script is a full-screen frame of its own, between
    the pages, not a pill over them. A line is Sans 500 at one size per format (128px in 16:9, 100px in 9:16, 86px in
    1:1, at the camera's scale 1, a little smaller where a phrase is wider than the safe width), wrapped with balanced lines inside the safe zone, its clauses one to a block ("If it
    misses, / every wallet gets back exactly what it paid."). The SRTs carry every line as it is on screen.
20. **The seeding note** is the site's own, dated on the raise's clock ("by Oct 26, 10:01 AM").
21. **No numbers strip.** The 30-second cut has no room for the strip (1% on top, 1,000,000,000 supply, 100% refund,
    locked for good). The figures stay composition variables, and the pages carry them as the site draws them: the 1%
    fee in the Launch form's "What backers pay" and in the refunded note, the supply in the seeding note.
22. **Music volume.** HyperFrames' mixer reads the `data-volume` written in the HTML, not one set by script, so
    `musicVolume` takes effect through `tools/render.mjs`, which writes it into each page before rendering.
23. **The book's video kit is Remotion in `brand/video/`; this video is HyperFrames,** per the brief.
24. **Frosted panels never fade,** as the site's `rise` keyframe has it (a fading card cannot blur what is behind it).
    Scenes of panels begin and end on a camera move (a whip, a push through an element); type fades, and at a handoff
    the film's own type flies past, clearing, over the scene coming in under it, or comes in from the right over a page
    whipping away (the title comes in from the right as the sting's lockup whips away left). Marks never fade either:
    the sting's dots grow in at full opacity and its lockup leaves whole on the whip, and the end card's dots grow in
    the same way. The one exception is the film's own fade to black at its very end, which takes the end card down
    with the whole frame (42).
25. **The pages are the site's own, at each beat.** `tools/capture-pages.mjs` runs `index.html` on its demo data and
    keeps the DOM the site draws: the Launch form as it opens and as its presets and deadline are pressed, the raise page
    after each of eight waves of buys, each seeding step, seeded, and the other ending at 62% with three seconds left,
    then refunded. The film's raise is the demo raise Halfmoon set to the $50K preset (168.69 SOL, the site's own
    derivation, which the capture checks against the page), 7 days and 214 backers (`src/raise.json`); the refund ending
    stops at 104.59 SOL and 122 backers. The founder is the demo wallet (7xKp…9fQa): it fills the Launch form connected, and the raise
    page it opens names it as founder and payout wallet with no X linked, as the form had it. The raise page is shown as
    any visitor sees it, with no wallet connected (a founder's own view adds founder controls). While the form is filled
    the demo raise Halfmoon is held out of the site's list, so the ticker check has no live $HALF to clash with. The
    site's own demo mode is held still (no simulated buys, no demo crank), its clock is fixed, and outside requests are
    refused, so the pages show the site's figures (the presets, the $148.2 demo SOL price) and repeat exactly. With no
    chain the site prices at its demo SOL price (`liveSolUsd`), as its demo mode does.
26. **A faster clock.** Each wave of buys lands hours later in the raise's time, so it fills at 82.4% of its window, and the refund countdown shows its last second, reaching zero as the page turns refunded (the capture has three
    left; the film's odometer shows the last one). The raise page opens two waves in, and its last six waves land .4s apart (.35s in the teaser, all eight). The Launch form's "Confirm in
    wallet…" holds about .7s of the site's 1s before the form whips away; each seeding step's "Running…" holds the site's 700ms.
    The site's buy chip (`floatChip`) floats one buy; a wave is many buys, so the film shows no chips, and the odometer
    rolls the raised figure, the percentage and the backers count at each wave as `patchDetail` rolls them. The refunded
    page's "Refunds claimed", plain text on the site that changes when the page is drawn again, rolls on the same
    odometer as every backer claims, from the moment the camera reaches it, in about a second of the film's clock.
27. **The seeded page's price chart.** The demo's stand-in pool (`demoSeries`) draws hourly candles forward from the
    moment a raise seeds, days past the page's own clock, for a pool that has just opened. The film's pool has just
    opened, so `tools/capture-pages.mjs` gives it no trades, and the site's chart draws its own empty state ("No trades
    in this window."), as the pool card's "24h volume 0" has it. The camera cuts from the seeding card to the pool's
    line ("Meteora DAMM v2 pool … Liquidity locked for good") rather than crossing the page.
28. **The last seeding step is never shown ticked.** When the fourth step lands the site turns the raise seeded and the
    seeding card becomes the trade card ("Trade $HALF"), so no page the site draws has all four steps done. The film
    holds on the card through that change, then cuts to the pool.
29. **The raise chart's entrance** (`playEnter`: the raise line in 1.7s, the area at 1.1s, the tip at 1.8s) is not in
    the 30-second cut; the pages draw their charts complete, as the site does on a page drawn again.
30. **Left out of the pages:** the app's foot note ("Prototype. Raise data is simulated…" in demo mode), the site's
    toasts ("Opened Halfmoon. It is live until Oct 24, 3:36 PM", "Halfmoon missed its target. Backers can claim
    refunds."; the text frames carry those lines), Halfmoon's demo announcement, its demo chat (a raise just opened has
    none; the demo's avatars are pastel gradients) and the demo's own "Yours" raise (Tidewater) in "Your raises", since
    this is the founder's first raise. Everything else on the pages is as the site draws it: the "Demo data" pills, the
    deposit panel's "Simulated on the demo wallet. No transaction is sent.", and the app's own 21-dot mark in its icon
    rail (34px at the full-page views in 16:9 and 1:1, under the book's 40px for 21 dots; it is the site's rail as
    drawn).
31. **The script** is "Thirty seconds, spoken", one line a frame, as the user rewrote it (2026-10-21): "Start an idea, /
    fund it on-chain." (in place of "Seed asks you to back an idea at one fixed price."), "Find product-market fit",
    "Market cap presets", "Set a target and deadline", "Buy with SOL or USDC", "Raises seed as tradeable tokens", "If it
    misses, every wallet gets back exactly what it paid." and "Seeded in full, or refunded in full." The book's "Most
    launches…", "locked for good." and "fee included." frames are cut (the pages still say "liquidity locked for good"
    and "the 1% fee included" where the site draws them), and so are "and your tokens are yours the same day", "Nothing
    is minted, nothing is held back." and "That is Seed." (the end card's wordmark says the last). Six of the lines are
    the user's short phrases, not the book's full sentences, and carry no full stop, as the user wrote them; "Market
    cap" and "product-market" are spelled as the book's vocabulary and common usage have them (the user's message wrote
    "Marketcap" and "product market"). "Set a target and deadline" follows the presets shot: the target is the one the
    preset derived, which the raise line shows beside the deadline. The master is 36.4s.
32. **The camera.** The film flies one camera over the pages and its own type, after the Axiom films in
    `delta/01-video-hyperframes/_motion-refs/` (the motion only; the README maps each move). The book has no camera, so
    these are the video's own choices, kept inside its rules: every move eases on the one curve, panels tilt (up to 11°)
    but never spin or bounce, depth of field and motion blur are blurs over the page (`#dof`, `#mb`), not glows or
    gradients on a surface. Moves over type have no motion blur, since blurred white letters read as bloom (the book:
    no glow on surfaces).
33. **The pages fill the screen.** The book's video kit puts a UI recording "inside a 16px-radius panel with the panel
    line, over the dot field" (ScreenFrame). At the user's direction (2026-10-20) the film shows the site's pages full
    screen instead, as the browser draws them: the page has no ground of its own, so the dot field runs crisp between
    its panels and blurs behind their glass, as on the site. The camera never shows a page's edge: every pose, tilted or
    not, is kept where the page covers the whole frame (`cover` in `src/film.js`), until the whip that takes the page
    away. In 1:1 the full-page views show the site's 1080 layout as drawn, its rail column emptier than the main one.
    There is no corner mark: at the user's direction (2026-10-21) the mark is in the sting and the end card only (the
    site's own app bar and rail carry theirs on the pages).
34. **Safe zones.** The element the camera is on sits inside its format's focus box, which lies inside the safe zone
    (16:9 x 160–1760, y 140–940; 9:16 x 120–960, y 300–1620; 1:1 x 100–980, y 120–960): a cut resolves onto it from no
    closer than the box allows, and the camera goes past the box only where it pushes through a button, a figure or a
    line of type on its way out of a scene. The rest of the page runs to the frame's edge, out of focus. Where the box
    and the page disagree (the seeding card at the page's right edge in 16:9), the page wins and the card sits off
    centre rather than show the page's edge. In 9:16 the Launch form's raise line is a column wide, wider than the focus
    box at the closest the page can be shown while it fills the screen, so it runs past the box at both ends; the
    line's figures ("$50K", "168.69 SOL ($25K)") stay inside the safe zone.
35. **Software rendering.** Chrome's software compositor clips a frosted panel's blur to its untilted box under a 3D
    transform. HyperFrames renders on the GPU here, where the glass is whole as long as no ancestor of a panel is
    masked; a `--no-browser-gpu` render would not be.
36. **Frame rate and length.** The brief asks for a master of about 55s at 30fps. At the user's direction (2026-10-20)
    the master was cut to 30s, the length of the book's script, and every cut renders at 60fps. On 2026-10-21 the user
    cut three lines, then asked for the pace slowed slightly and two more frames (31): it is 36.4s, the teaser 15s. Motion blur is measured over a
    thirtieth of a second, so it is the length it was at 30fps. The teaser stays 15s.
37. **The odometer's digits** sit on the baseline in the film (`.rd` as an inline flex box). On the site its
    inline-block with `overflow:hidden` takes its bottom edge as its baseline, so the digits ride above the signs beside
    them ("28%"); worth fixing in `index.html`'s `.rd`.
38. **"Deadline in 6d 24h"** beside "Ends in 6d 23:59:58" on a raise just opened, and "Deadline in 1m" beside "Ends in
    00:00:03" on one about to close, are the site's own rounding (`fmtHours`, `js/presale-page.js`), shown as the site
    draws them.
39. **The site's own labels:** the Launch form's "OPTIONAL" over its optional sections is set in capitals (`.steps-h`,
    `text-transform: uppercase` in `index.html`), against the book's sentence case, and the seeded page's "Creator fees"
    card is named for the founder's income in the site's own word (the book's vocabulary says founder). Shown as the
    site draws them; both are worth a look on the site.
40. **The end card is the mark and the wordmark alone.** The book's video kit lists the end card as "Mark, wordmark and
    the URL, the dot field drifting behind", and the brief asked for the URL and the network line as variables. At the
    user's direction (2026-10-20) the film ends on the lockup alone, at the sting's size, so it closes on the lockup it
    opened on: no URL, no network line, and neither is a variable any more. The SRTs end with the closing line.
41. **The mark is the muted one wherever the film shows it.** The book sets the mark on charcoal with ink dots and the
    navy seed, and keeps the muted version (#52668F dots) for bars and rails. At the user's direction (2026-10-21) the
    sting and the end card show the muted mark, as on Seed's avatar: `--navy-soft` dots and the seed in `--navy`, which
    lands in `--solid` and brightens to it. The wordmark beside it is ink, as in the lockup.
42. **Fades.** At the user's direction (2026-10-21) the film comes up from black over its first 0.6s and goes down to
    black over its last 0.9s, linear, the score's slot fading with it (`data-fade-in`/`data-fade-out`): a whole-frame
    fade at the film's edges, outside the book's interface motion (one curve, nothing fading under 100%), so the end
    card's mark goes down with the frame. There are no sound effects (the user's direction, 2026-10-21).
43. **The wave that fills the raise rolls.** On the site the buy that fills a raise changes its status, and a new status
    renders the raise page afresh (`patchDetail` calls `renderDetail(true)` in `js/presale-page.js`): the filled page
    comes up with its figures already at the target and its bar already full, with no roll. The book has live numbers
    roll and the bar move in .6s. The film shows the filled page as the site draws it and rolls its raised and backers
    up from the last wave's (the site's odometer, .55s a digit) and sweeps its bar from there (.6s), as on every other
    wave; "84%" to "100%" gains a digit, so it is drawn without the slide, as the site's odometer does. Worth doing on
    the site too: patch the filled readout from the live one before the re-render.
