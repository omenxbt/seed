# Conflicts

Where the brand book (`brand/brandbook/Seed brand book.html`), a brief, and the code disagree. The code wins until someone
decides otherwise; each case says what the launch video (`brand/launch-video/`) does. Checked 2026-10-20.

## Figures

1. **Minimum target: 81 SOL or $2,000.** The launch video brief says the decision was $2,000. The code enforces **81
   SOL**: at `a218c97` as `MIN_TARGET_LAMPORTS = 81_000_000_000` in `program/programs/seed/src/state.rs`, checked in
   `open_raise` (`UnderFloor`; a USDC raise must meet the same dollars at the SOL price). Commit `6d687c6` (2026-10-19)
   moved it into the Config (`min_target_lamports`, set once at `init_config`, refused as `TargetBelowMinimum`), with 81
   SOL in the production profile of `program/scripts/check-deploy.ts` and 0.1 SOL on devnet. The site agrees:
   `minTargetSol: 81` in `js/config/seed.js`, the Launch form's hint "at least 81 SOL, at most $100,000", and LOOP.md
   ("at least 81 SOL or its worth in USDC"). The devnet test floor was 0.05 SOL at `a218c97`
   (`TEST_MIN_TARGET_LAMPORTS`) and is 0.1 SOL from `6d687c6`. History: PROGRESS.md listed "minimum raise target
   ≈$2,000" as an open decision, then commit `ef86848` set "The minimum raise is 81 SOL (Josh)". The brand book agrees
   with the code. **The video uses 81 SOL** (variable `minTarget`, shown in the launch card's hint). A $2,000 floor
   would need a program change and an upgrade on devnet; then re-render with `--variables '{"minTarget":"$2,000"}'` or
   rerun `tools/build.mjs`, which rereads the program. The end card's network line names devnet, where the site's Launch
   form, connected to the chain, reads its floor from the Config (`minTargetSol()` in `js/model.js`: 0.1 SOL from
   `initConfig`); the film's pages are the site's demo mode, which shows `SEED.minTargetSol`, the production 81 SOL.
2. Every other figure agrees across the program, `program/tests/seed.ts` (the devnet `initConfig`), `js/config/seed.js`
   and LOOP.md: fee 1% on top, maximum target $100,000, deadline 24 hours to 14 days, supply 1,000,000,000, pool fee
   1.25% split 70/30, refund 100% (`claim_refund` pays amount + fee), 4 seeding steps, 3-day seeding timeout.
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
    is a `#5B8CFF` fade. A focused field's ring carries `--glow-sm` too (`.inp:focus-within`, `css/delta.css`), as the
    Launch form's Target has while it is typed. The video shows them as the site draws them.
11. **Figures and tickers the site sets in sans.** The site sets in IBM Plex Mono its figure cells (`.num`: the raised
    figure and its odometer, the stats, prices, the pool's figures, addresses, countdowns) and everything else in
    Instrument Sans, figures and tickers included, wherever they sit in a control, a chip, a label or a sentence. On the
    pages the film shows (every beat, scanned in all three formats) those are: the Launch form's pair segment ("SOL",
    "USDC") and deadline segment ("24h", "3 days", "7 days", "14 days"); the chips and pills "SOL pair", "Pairs with
    SOL", "1 of 4 steps" and "1 warning", and the unit in the app bar's chips and the deposit box ("SOL"); the titles
    and labels "Deposit into $HALF", "Seeding $HALF", "Trade $HALF", "Top 10 backers", "24h volume", "Founder's 70%",
    the pool card's pair ("HALF/SOL", a `dd` without `.num`), the chart legend "Buys per 6 hours", the filled card's
    "Filled 1m ago" and backers count ("214 backers") and "Deadline passed Oct 24, 3:36 PM"; the Launch form's hints
    (the target's "at least 81 SOL, at most $100,000, at the SOL price when it opens", "$1,185.6 at $148.2 per SOL,
    under the 81 SOL minimum" while it is typed and "$12.6K at $148.2 per SOL"; the uploads' "1500 × 500 px", "1:1,
    square" and "10 MB at most"; the ticker check's "top-500 Solana token"; the team and payout notes) and its "What
    backers pay" rows (`#derivedRows`: "500,000,000 tokens", "($25.19K)", "each side at opening (170 SOL, $25.19K in
    all)", "Oct 20, 3:36 PM, or the moment it fills", "a day at $5K, $25K or $100K of daily volume"); and every line of
    running text that carries a figure: the pace line (`.pp-pace`), the filled and refunded raises' notes (`.pp-note`,
    "by Oct 26, 10:01 AM", "the 1% fee included"), the seeding card's note, the Creator fees text ("70% … 30% …") and
    the About text ("Stake SOL once…"). The video shows the site's pages as the site draws them; the film's own figures,
    in the numbers strip and the captions, are in IBM Plex Mono.
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
    the 21-dot mark (`#seed21`) at every size, and the film's corner mark is that mark, 21 dots at 48px (16:9, 1:1) and
    56px (9:16), above the book's 40px floor for it; it also lets the sting's 21-dot mark fly into the corner and back
    to the end card as one mark.
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

19. **One clause a line against the line limits.** At the book's caption sizes some clauses are wider than a line: in
    9:16 "A founder sets a target / and a deadline.", "the whole raise opens / a Meteora pool," and "every wallet gets
    back / exactly what it paid,", and the same in 1:1. Such a clause wraps at a phrase inside its own card, and a
    sentence with more clauses than the format has lines runs across cards, each card holding whole clauses (16:9
    "If the target is met, / the whole raise opens a Meteora pool," then "locked for good."; 1:1 "If the target is
    met," then "the whole raise opens / a Meteora pool," then "locked for good.").
20. **The seeding note** is the site's own, dated on the raise's clock ("by Oct 26, 10:01 AM").
21. **"Locked for good" in the numbers strip** is not a figure, so it is set in Sans 500 with the label "the pool".
22. **Music volume.** HyperFrames' mixer reads the `data-volume` written in the HTML, not one set by script, so
    `musicVolume` takes effect through `tools/render.mjs`, which writes it into each page before rendering.
23. **The book's video kit is Remotion in `brand/video/`; this video is HyperFrames,** per the brief.
24. **Frosted panels never fade,** as the site's `rise` keyframe has it (a fading card cannot blur what is behind it).
    Scenes of panels begin and end on a camera move (a whip, a push through an element); type fades, and at a handoff
    the film's own type flies past, clearing, over the scene coming in under it (the title comes up under the sting's
    flying mark from 2.68s, a little before the brief's 3s, so the mark hands straight on to it). Marks never fade
    either: the sting's dots grow in at full opacity, its mark flies to the corner and becomes the corner mark, and at
    the end the corner mark flies home to the centre and becomes the end card's mark.
25. **The pages are the site's own, at each beat.** `tools/capture-pages.mjs` runs `index.html` on its demo data and
    keeps the DOM the site draws: the Launch form as it is typed into, the raise page after each of eight waves of buys,
    each seeding step, seeded, and the other ending at 62% with three seconds left, then refunded. The film's raise is
    the demo raise Halfmoon set to 85 SOL, 7 days and 214 backers (`src/raise.json`); the refund ending stops at 52.70
    SOL and 122 backers. The founder is the demo wallet (7xKp…9fQa): it fills the Launch form connected, and the raise
    page it opens names it as founder and payout wallet with no X linked, as the form had it. The raise page is shown as
    any visitor sees it, with no wallet connected (a founder's own view adds founder controls). While the form is filled
    the demo raise Halfmoon is held out of the site's list, so the ticker check has no live $HALF to clash with. The
    site's own demo mode is held still (no simulated buys, no demo crank), its clock is fixed, and outside requests are
    refused, so the pages show the site's figures (81 SOL minimum, the $148.2 demo SOL price) and repeat exactly.
26. **A faster clock.** Each wave of buys lands hours later in the raise's time, so it fills at 82.4% of its window, and
    the refund countdown runs its last three seconds in real time. The Launch form's "Confirm in wallet…" holds .4s of
    the site's 1s before the camera pushes through into the page; each seeding step's "Running…" holds the site's 700ms.
    The site's buy chip (`floatChip`) floats one buy; a wave is many buys, so the film shows no chips, and the odometer
    rolls the raised figure, the percentage and the backers count at each wave as `patchDetail` rolls them. The refunded
    page's "Refunds claimed", plain text on the site that changes when the page is drawn again, rolls on the same
    odometer as every backer claims, from the moment the camera reaches it, in under two seconds of the film's clock.
27. **The seeded page's price chart.** The demo's stand-in pool (`demoSeries`) draws hourly candles forward from the
    moment a raise seeds, days past the page's own clock, for a pool that has just opened. The film's pool has just
    opened, so `tools/capture-pages.mjs` gives it no trades, and the site's chart draws its own empty state ("No trades
    in this window."), as the pool card's "24h volume 0" has it. The camera cuts from the rail to the pool's line below
    it ("Meteora DAMM v2 pool … Liquidity locked for good") rather than crossing the page (in 9:16, where the pool's
    card lands just under the rail's, it moves there).
28. **The last seeding step is never shown ticked.** When the fourth step lands the site turns the raise seeded and the
    seeding card becomes the trade card ("Trade $HALF"), so no page the site draws has all four steps done. The film
    holds on the card through that change, then cuts to the pool.
29. **The raise chart's entrance.** The site plays an entrance when a raise page opens (`playEnter`: the raise line
    draws in 1.7s after .3s, its area fades in at 1.1s and its tip at 1.8s, the buy bars grow from the axis); a page
    that turns seeded while it is open draws its charts again at once, complete. The brief asks for that reveal in the
    seeded beat, so the film plays the site's entrance on the seeded page's "How it raised" as the camera arrives on it,
    as when the seeded page is opened, on the brand curve.
30. **Left out of the pages:** the app's foot note ("Prototype. Raise data is simulated…" in demo mode), the site's
    toasts ("Opened Halfmoon. It is live until Oct 24, 3:36 PM", "Halfmoon missed its target. Backers can claim
    refunds."; the captions carry those lines), Halfmoon's demo announcement, its demo chat (a raise just opened has
    none; the demo's avatars are pastel gradients) and the demo's own "Yours" raise (Tidewater) in "Your raises", since
    this is the founder's first raise. Everything else on the pages is as the site draws it: the "Demo data" pills, the
    deposit panel's "Simulated on the demo wallet. No transaction is sent.", and the app's own 21-dot mark in its icon
    rail, about 15 to 20px in the pull-backs (under the book's 40px for 21 dots; it is the site's rail as drawn, beside
    the film's corner mark).
31. **The script** is "Thirty seconds, spoken" as the brief places it; "and your tokens are yours the same day" and
    "That is Seed." are left out (the end card's wordmark says the last).
32. **The camera.** The film flies one camera over the pages and its own type, after the Axiom films in
    `delta/01-video-hyperframes/_motion-refs/` (the motion only; the README maps each move). The book has no camera, so
    these are the video's own choices, kept inside its rules: every move eases on the one curve, panels tilt (up to 16°)
    but never spin or bounce, depth of field and motion blur are blurs over the page (`#dof`, `#mb`), not glows or
    gradients on a surface. Moves over type have no motion blur, since blurred white letters read as bloom (the book:
    no glow on surfaces).
33. **The pages play in the screen frame.** The book's video kit puts a UI recording "inside a 16px-radius panel with
    the panel line, over the dot field", and the film does so: while the camera is on the site's pages they show through
    a frame of that kind (16:9 x 96–1824, y 168–984; 9:16 x 120–960, y 330–1600; 1:1 x 80–1000, y 152–1000), the field
    around it, so the corner mark stays top left with its clear space from 3s, where the sting's mark lands, to the end
    card. The frame is the site's window, not a frosted panel: the site draws its pages with no ground of their own,
    over the dot field, so inside the frame the field runs crisp between the site's panels as it does on the site, and
    runs on outside it. Where the camera pulls back past the app's own edges (16:9 and 9:16), the app's window keeps its
    16px corners and panel line inside the frame, a window floating in it. The camera's pushes, tilts and pull-backs
    happen inside the frame. Where the film's own type grows past the mark (the pushes through the title and the trust
    line), the type's stage fades away round the mark into the same field.
34. **Safe zones.** The element the camera is on sits inside its format's focus box, which lies inside the safe zone and
    the screen frame: a cut resolves onto it from no closer than the box allows, and the camera goes past the box only
    where it pushes through a button, a figure or a line of type on its way out of a scene, or whips an element in from
    the side. The rest of the page runs to the frame's edge, out of focus, as a recording would; in 1:1 the pull-backs
    frame the app's window a little wider than the frame, so it fills the frame as a recording does rather than floating
    with strips of field at its sides. In 16:9 and 1:1 a two-line caption pill can sit over the lower edge of a card.
35. **Software rendering.** Chrome's software compositor clips a frosted panel's blur to its untilted box under a 3D
    transform. HyperFrames renders on the GPU here, where the glass is whole as long as no ancestor of a panel is
    masked; a `--no-browser-gpu` render would not be.
36. **Captions** are a --bar pill per line, each 20px 28px, so a two-line caption is two pills, not one rounded block.
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
