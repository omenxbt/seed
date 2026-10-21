/* The film's script and clock: every scene's window, every beat inside it, the camera over each page and the beat
   markers. tools/build.mjs writes each cut and format from this; src/film.js reads the same data from the page (the
   #story JSON), so a time changed here moves the picture, the SRT and markers.json together. Seconds throughout.

   The cut is the brand book's "Thirty seconds, spoken" as the user rewrote it (CONFLICTS 31), paced as the Axiom films
   in delta/01-video-hyperframes/_motion-refs pace theirs: each line of the script is a full-screen text frame of its
   own, and between them the site's own pages (tools/capture-pages.mjs) fill the screen as one camera flies over them. A shot resolves out of a fast move, pushes in
   on one element with the rest of the page out of focus, pans to the next, and leaves on a whip; the camera never shows
   a page's edge (src/film.js keeps every pose inside the page) except on the whip out, when the page leaves the frame.

   A camera key is { t, d, sel, fill, rx, ry, dof, from, full, free }: at t the camera starts for the element `sel` (an
   array frames them together), so that it fills `fill` of the format's focus box, tilted rx/ry degrees, with `dof` px of
   blur away from it, and gets there in d seconds on the brand's curve. `full` frames the whole page, filling the screen;
   `away` whips the page off to the left from wherever the camera is.
   `cut` starts a shot: the camera jumps to the pose `from` describes (k times the target's scale, an offset dx/dy in px,
   extra tilt) and resolves from it, fast at first, so the cut reads as a whip. `free` lets the pose leave the page (the
   whip out). Per-format values go in `f`; `nomb` turns motion blur off for a move. A scroll key { t, d, sel, place }
   scrolls the element's scrolling column until the element sits at `place` of it. Text frames fly the same camera over
   their own type: `in` is how one arrives ('up' under the push through the shot before, 'whip' from the right as the
   shot before whips away), `exit` how it leaves ('push' through its type, 'whip' away left), `big` the huge line that
   settles; `f: { '9x16': { lines } }` sets a line's breaks for the phone frame, where balanced wrapping would split a
   phrase. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const RAISE = JSON.parse(fs.readFileSync(path.join(here, 'raise.json'), 'utf8'));

export const FPS = 60;

/* canvas and safe zones from the brand book's "Captions and safe zones"; `focus` is the box the camera puts its element
   in (inside the safe zone, centred), `persp` the stage's perspective, `win` the app's window in this format
   (tools/capture-pages.mjs draws the site at that size, and a page fills the screen from it), `fillK` how much closer the
   camera goes on a page's element here (the phone layout's elements are a column wide, so 9:16 goes in as far as the box
   allows) */
export const FORMATS = {
  '16x9': { w: 1920, h: 1080, cls: 'f169', safe: { t: 96, r: 96, b: 96, l: 96 }, mark: 48, focus: [160, 140, 1760, 940], persp: 2200, win: [1920, 1080] },
  '9x16': { w: 1080, h: 1920, cls: 'f916', safe: { t: 250, r: 120, b: 320, l: 120 }, mark: 56, focus: [120, 300, 960, 1620], persp: 2600, win: [540, 960], fillK: 1.25 },
  '1x1': { w: 1080, h: 1080, cls: 'f11', safe: { t: 80, r: 80, b: 80, l: 80 }, mark: 48, focus: [100, 120, 980, 960], persp: 2000, win: [1080, 1080] }
};

/* how many times larger than drawn the film lays out a page (its window) and its own type (its frame) before the camera
   scales them back. Chrome draws a big layer under a perspective transform at no more than one pixel per CSS pixel, so a
   page the camera holds at 3.6x its window was drawn at 1x and stretched; laid out at 4x (CSS zoom: the same layout, every
   length 4x) the closest shot is still drawn finer than the frame shows it. The type's closest pose is about 2x */
export const ZOOM = { page: 4, type: 2 };

/* the raise filling: the waves of buys `gap` apart from wave `from` on, the odometer rolling each (tools/capture-pages.mjs
   drew the page after each wave, live-1 to live-7; the last wave lands on the filled page, seeding-0) */
const buys = (t0, gap, from = 0) => RAISE.waves.slice(from).map((w, i) => +(t0 + i * gap).toFixed(2));
const fillStates = (t0, b, from = 0) => [[t0, 'live-' + from]].concat(b.map((t, i) => [t, from + i < 7 ? 'live-' + (from + i + 1) : 'seeding-0']));
/* Run the next step reads "Running…" for the site's 700ms after the press, then the step lands */
const RUN = 0.78;
const OUT = { away: true, d: 0.45 };   // the whip out: the page leaves left, fast off the mark, its last edge clearing the frame
/* the film comes up from black and goes down to black at its ends, the sound with it: seconds in and out */
export const FADE = { in: 0.6, out: 0.9 };

/* --------------------------------------------------------------------------------------------- the master */
const MB = buys(10.21, 0.35, 2), SP = 14.71, SEEDED = +(SP + RUN).toFixed(2), REFUND = 19.77;
const DTIME = '.sub > span:has([data-dtime])';   // "Ends in 00:00:01", the words and the clock in focus together
const masterScenes = [
  /* the film comes up from black over the sting and goes down to black on the end card (FADE) */
  { id: 'sting', kind: 'sting', start: 0, end: 2.7, hit: 1.5, whip: 2.2 },
  { id: 'title', kind: 'title', start: 2.23, end: 4.6, in: 'whip', l1: 'Start an idea,', l2: 'fund it on-chain.', shrink: 2.98, l2in: 3.08, out: 4.16, exit: 'whip' },
  { id: 'founder', kind: 'line', start: 4.19, end: 5.96, in: 'whip', exit: 'push', out: 5.61, lines: ['A founder sets a target and a deadline.'], f: { '9x16': { lines: ['A founder sets', 'a target and', 'a deadline.'] } } },
  {
    /* the Launch form: the Target typed (8, then 85), 7 days pressed, Open raise pressed ("Confirm in wallet…") and the
       whip out */
    id: 'launch', kind: 'launch', start: 5.76, end: 8.41,
    states: [[5.76, 'launch-0'], [6.26, 'launch-1'], [6.46, 'launch-2'], [7.09, 'launch-3'], [7.79, 'launch-4']], seg: 7.01, open: 7.71,
    cam: [
      { t: 5.76, cut: true, sel: 'fieldset:has(#fTarget)', fill: 0.9, ry: -8, rx: 5, dof: 3, d: 0.7, from: { k: 0.75, ry: -2, rx: 3 }, f: { '9x16': { fill: 0.96 }, '1x1': { fill: 0.95 } } },
      { t: 6.11, sel: '.f:has(#fTarget)', fill: 0.82, ry: -7, rx: 4, dof: 6, d: 0.55, f: { '9x16': { fill: 0.96 } } },
      { t: 6.81, sel: '.f:has(#timeSeg)', fill: 0.72, ry: -6, rx: 4, dof: 6, d: 0.45, f: { '9x16': { fill: 0.9 } } },
      /* to Open raise as the form scrolls under it (in 9:16 and 1:1 the scroll is long: the scroll carries the motion) */
      { t: 7.31, sel: '#openBtn', fill: 0.8, ry: -6, rx: 4, dof: 6, d: 0.5, f: { '9x16': { fill: 0.94, nomb: true }, '1x1': { nomb: true } } },
      { t: 8.06, ...OUT }
    ],
    scroll: [{ t: 7.33, d: 0.45, sel: '.lsubmit', place: 0.55 }]
  },
  { id: 'buy', kind: 'line', start: 8.09, end: 9.71, in: 'whip', exit: 'push', out: 9.36, lines: ['You buy in with SOL or USDC.'], f: { '9x16': { lines: ['You buy in with', 'SOL or USDC.'] } } },
  {
    /* the raise page, two waves in: the deposit panel (SOL or USDC), then across to the readout as the last six waves
       land .35s apart (the odometer rolls, the bar sweeps to green, the backers tick up), a pull back to the whole page
       as it fills, and the whip out */
    id: 'fill', kind: 'page', start: 9.56, end: 12.66, open: 9.56, states: fillStates(9.56, MB, 2), buys: MB,
    cam: [
      { t: 9.56, cut: true, sel: '[data-trade="deposit"]', fill: 0.85, ry: 8, rx: 5, dof: 5, d: 0.7, from: { k: 0.7, ry: 3 }, f: { '9x16': { fill: 0.96 } } },
      { t: 10.06, sel: '[data-dreadout]', fill: 0.9, ry: 8, rx: 5, dof: 6, d: 0.55, f: { '9x16': { fill: 0.96 } } },
      { t: 11.31, full: true, ry: 5, rx: 4, d: 0.9 },
      { t: 12.31, full: true, ry: 5, rx: 4, ...OUT }
    ]
  },
  { id: 'met', kind: 'line', start: 12.34, end: 14.46, in: 'whip', exit: 'push', out: 14.11, lines: ['If the target is met,', 'the raise seeds as a tradeable token.'], f: { '9x16': { lines: ['If the target is met,', 'the raise seeds as', 'a tradeable token.'] } } },
  {
    /* seeding: the last step pressed ("Running…"); a pull back to the whole page as it turns seeded (the identity card's
       "Seeded", the readout turning into the pool's chart, the seeding card into the trade card); a push to the pool's
       line (HALF/SOL, 170 SOL, Meteora DAMM v2, liquidity locked for good) and the whip out */
    id: 'seeding', kind: 'page', start: 14.31, end: 17.06,
    states: [[14.31, 'seeding-2'], [SP + 0.08, 'seeding-2r'], [SEEDED, 'seeded']], presses: [SP], seeded: SEEDED,
    cam: [
      { t: 14.31, cut: true, sel: '[data-seeding]', fill: 0.8, ry: 9, rx: 5, dof: 6, d: 0.8, from: { k: 0.75, ry: 3 }, f: { '9x16': { fill: 0.9 } } },
      { t: 14.86, sel: '[data-seeding]', fill: 0.9, ry: 6, rx: 4, dof: 5, d: 0.45, f: { '9x16': { fill: 0.98 } } },
      /* in 1:1 a little closer and lower, so the rail's own mark is not cut by the frame's corner */
      { t: 15.28, full: true, ry: 4, rx: 3, d: 0.6, f: { '1x1': { fill: 1.1, ax: 0.54, ay: 0.55 } } },
      { t: 15.88, sel: '[data-poolcard]', fill: 0.95, ry: 6, rx: 4, dof: 6, d: 0.65, f: { '9x16': { fill: 0.96, dof: 4 }, '1x1': { dof: 5 } } },
      { t: 16.71, ...OUT }
    ]
  },
  { id: 'misses', kind: 'line', start: 16.74, end: 18.92, in: 'whip', exit: 'push', out: 18.57, lines: ['If it misses,', 'every wallet gets back exactly what it paid.'], f: { '9x16': { lines: ['If it misses,', 'every wallet gets back', 'exactly what it paid.'] } } },
  {
    /* the other ending: "Ends in 00:00:01" running out; refunded, pulled back to "Missed target, refunded", the bar
       hatched and the site's note ("Every backer claims back exactly what they paid in SOL, the 1% fee included"), the
       identity card's "Refunds claimed" rolling up to every backer where the format shows it, and the whip out */
    id: 'refund', kind: 'refund', start: 18.77, end: 21.52,
    states: [[18.77, 'miss-live'], [REFUND, 'refunded']], ticks: [18.77, 19.37], refund: REFUND,
    claims: [[20.07, 0.3], [20.32, 0.65], [20.57, 1]],
    cam: [
      { t: 18.77, cut: true, sel: DTIME, fill: 0.5, ry: -8, rx: 5, dof: 8, d: 0.9, from: { k: 0.8, ry: -3 }, f: { '9x16': { fill: 0.7, dof: 12 } } },
      { t: 19.42, sel: DTIME, fill: 0.6, ry: -7, rx: 5, dof: 8, d: 0.55, f: { '9x16': { fill: 0.74, dof: 12 } } },
      { t: REFUND, sel: '.pp-missed', fill: 0.95, ry: -6, rx: 4, dof: 4, d: 0.8, nomb: true },
      { t: 21.17, ...OUT }
    ]
  },
  { id: 'close', kind: 'close', start: 21.2, in: 'whip', end: 27.4, l1: 'Seeded in full,', l2: 'or refunded in full.', shrink: 22.02, lineOut: 23.32, end_: 23.57 }
];
const master = {
  id: 'master', duration: 27.4,
  scenes: masterScenes,
  /* every line the film puts on screen, as it reads, for the SRT ({x} is a variable) */
  srt: [
    [2.28, 4.16, 'Start an idea, fund it on-chain.'],
    [4.23, 5.61, 'A founder sets a target and a deadline.'],
    [8.13, 9.36, 'You buy in with SOL or USDC.'],
    [12.38, 14.11, 'If the target is met, the raise seeds as a tradeable token.'],
    [16.78, 18.57, 'If it misses, every wallet gets back exactly what it paid.'],
    [21.25, 23.32, 'Seeded in full, or refunded in full.']
  ],
  markers: [
    ['sting hit', 1.5, 'the seed lands and brightens'],
    ['fill complete', MB[MB.length - 1], 'the last wave of buys fills the target'],
    ['seeded', SEEDED, 'the last seeding step lands and the page turns seeded'],
    ['refunded', REFUND, 'the deadline passes and the raise turns refunded'],
    ['end card', 23.57, 'the mark builds, then the wordmark'],
    ['fade out', +(27.4 - FADE.out).toFixed(2), 'the picture and the sound go down to black']
  ]
};

/* --------------------------------------------------------------------------------------------- the teaser */
const TB = buys(5.05, 0.35);
const teaserScenes = [
  { id: 'sting', kind: 'sting', start: 0, end: 2.7, hit: 1.5, whip: 2.2 },
  { id: 'title', kind: 'title', start: 2.23, end: 4.55, in: 'whip', l1: 'Start an idea,', l2: 'fund it on-chain.', shrink: 2.98, l2in: 3.08, out: 4.15, exit: 'push' },
  {
    id: 'fill', kind: 'page', start: 4.35, end: 8.85, open: 4.35, states: fillStates(4.35, TB), buys: TB,
    cam: [
      { t: 4.35, cut: true, sel: '[data-trade="deposit"]', fill: 0.85, ry: 8, rx: 5, dof: 5, d: 0.8, from: { k: 0.7, ry: 3 }, f: { '9x16': { fill: 0.96 } } },
      { t: 4.9, sel: '[data-dreadout]', fill: 0.9, ry: 8, rx: 5, dof: 6, d: 0.6, f: { '9x16': { fill: 0.96 } } },
      { t: 6.5, full: true, ry: 5, rx: 4, d: 1.0 },
      { t: 7.5, full: true, ry: 3, rx: 3, d: 1.0 },   // still drifting as it fills
      { t: 8.5, ...OUT }
    ]
  },
  { id: 'close', kind: 'close', start: 8.53, in: 'whip', end: 15.0, l1: 'Seeded in full,', l2: 'or refunded in full.', shrink: 9.35, lineOut: 10.65, end_: 10.9 }
];
const teaser = {
  id: 'teaser', duration: 15,
  scenes: teaserScenes,
  srt: [
    [2.28, 4.15, 'Start an idea, fund it on-chain.'],
    [8.58, 10.65, 'Seeded in full, or refunded in full.']
  ],
  markers: [
    ['sting hit', 1.5, 'the seed lands and brightens'],
    ['fill complete', TB[TB.length - 1], 'the last wave of buys fills the target'],
    ['end card', 10.9, 'the mark builds, then the wordmark'],
    ['fade out', +(15 - FADE.out).toFixed(2), 'the picture and the sound go down to black']
  ]
};

export const CUTS = { master, teaser };
