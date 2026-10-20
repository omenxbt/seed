/* The film's script and clock: every scene's window, every beat inside it, the camera over each page and the beat
   markers. tools/build.mjs writes each cut and format from this; src/film.js reads the same data from the page (the
   #story JSON), so a time changed here moves the picture, the SRT and markers.json together. Seconds throughout.

   The cut is the brand book's "Thirty seconds, spoken", as the Axiom films in delta/01-video-hyperframes/_motion-refs
   pace theirs: each line of the script is a full-screen text frame of its own, and between them the site's own pages
   (tools/capture-pages.mjs) fill the screen as one camera flies over them. A shot resolves out of a fast move, pushes in
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

/* the raise filling: the waves of buys `gap` apart from wave `from` on, the odometer rolling each (tools/capture-pages.mjs
   drew the page after each wave, live-1 to live-7; the last wave lands on the filled page, seeding-0) */
const buys = (t0, gap, from = 0) => RAISE.waves.slice(from).map((w, i) => +(t0 + i * gap).toFixed(2));
const fillStates = (t0, b, from = 0) => [[t0, 'live-' + from]].concat(b.map((t, i) => [t, from + i < 7 ? 'live-' + (from + i + 1) : 'seeding-0']));
/* Run the next step reads "Running…" for the site's 700ms after the press, then the step lands */
const RUN = 0.78;
const OUT = { away: true, d: 0.45 };   // the whip out: the page leaves left, fast off the mark, its last edge clearing the frame

/* the corner mark rides with the film's own type: from where the sting's mark lands, and from each text frame that
   follows a page once that page has left the frame, until the next page fills the screen; the last flies home to the
   end card's mark (src/film.js) */
const TYPE = { line: 1, title: 1, close: 1 }, UI = { launch: 1, page: 1, refund: 1 };
function corner(scenes) {
  const w = []; let open = null, gone = 0;
  for (const s of scenes) {
    if (s.kind === 'sting') open = s.end;
    else if (TYPE[s.kind] && open == null) open = Math.max(s.start, gone);
    else if (UI[s.kind] && open != null) { w.push([open, s.start]); open = null; }
    if (UI[s.kind]) gone = s.end;
    if (s.kind === 'close') { w.push([open, +(s.end_ + 0.6).toFixed(2)]); open = null; }
  }
  return w;
}

/* --------------------------------------------------------------------------------------------- the master */
const MB = buys(12.35, 0.35, 2), SP = 16.85, SEEDED = +(SP + RUN).toFixed(2), REFUND = 22.75;
const masterScenes = [
  { id: 'sting', kind: 'sting', start: 0, end: 2.6, hit: 1.5, fly: 2.25 },
  { id: 'trust', kind: 'line', start: 2.35, end: 4.75, in: 'up', exit: 'push', out: 4.4, lines: ['Most launches ask you to trust a founder with your money.'], f: { '9x16': { lines: ['Most launches ask', 'you to trust a founder', 'with your money.'] } } },
  { id: 'title', kind: 'title', start: 4.5, end: 6.75, l1: 'Back an idea', l2: 'at one fixed price.', shrink: 5.12, l2in: 5.22, out: 6.3, exit: 'whip' },
  { id: 'founder', kind: 'line', start: 6.33, end: 8.1, in: 'whip', exit: 'push', out: 7.75, lines: ['A founder sets a target and a deadline.'], f: { '9x16': { lines: ['A founder sets', 'a target and', 'a deadline.'] } } },
  {
    /* the Launch form: the Target typed (8, then 85), 7 days pressed, Open raise pressed ("Confirm in wallet…") and the
       whip out */
    id: 'launch', kind: 'launch', start: 7.9, end: 10.55,
    states: [[7.9, 'launch-0'], [8.4, 'launch-1'], [8.6, 'launch-2'], [9.23, 'launch-3'], [9.93, 'launch-4']], seg: 9.15, open: 9.85,
    cam: [
      { t: 7.9, cut: true, sel: 'fieldset:has(#fTarget)', fill: 0.9, ry: -8, rx: 5, dof: 3, d: 0.7, from: { k: 0.75, ry: -2, rx: 3 }, f: { '9x16': { fill: 0.96 }, '1x1': { fill: 0.95 } } },
      { t: 8.25, sel: '.f:has(#fTarget)', fill: 0.82, ry: -7, rx: 4, dof: 6, d: 0.55, f: { '9x16': { fill: 0.96 } } },
      { t: 8.95, sel: '.f:has(#timeSeg)', fill: 0.72, ry: -6, rx: 4, dof: 6, d: 0.45, f: { '9x16': { fill: 0.9 } } },
      /* to Open raise as the form scrolls under it (in 9:16 and 1:1 the scroll is long: the scroll carries the motion) */
      { t: 9.45, sel: '#openBtn', fill: 0.8, ry: -6, rx: 4, dof: 6, d: 0.5, f: { '9x16': { fill: 0.94, nomb: true }, '1x1': { nomb: true } } },
      { t: 10.2, ...OUT }
    ],
    scroll: [{ t: 9.47, d: 0.45, sel: '.lsubmit', place: 0.55 }]
  },
  { id: 'buy', kind: 'line', start: 10.23, end: 11.85, in: 'whip', exit: 'push', out: 11.5, lines: ['You buy in with SOL or USDC.'], f: { '9x16': { lines: ['You buy in with', 'SOL or USDC.'] } } },
  {
    /* the raise page, two waves in: the deposit panel (SOL or USDC), then across to the readout as the last six waves
       land .35s apart (the odometer rolls, the bar sweeps to green, the backers tick up), a pull back to the whole page
       as it fills, and the whip out */
    id: 'fill', kind: 'page', start: 11.7, end: 14.8, open: 11.7, states: fillStates(11.7, MB, 2), buys: MB,
    cam: [
      { t: 11.7, cut: true, sel: '[data-trade="deposit"]', fill: 0.85, ry: 8, rx: 5, dof: 5, d: 0.7, from: { k: 0.7, ry: 3 }, f: { '9x16': { fill: 0.96 } } },
      { t: 12.2, sel: '[data-dreadout]', fill: 0.9, ry: 8, rx: 5, dof: 6, d: 0.55, f: { '9x16': { fill: 0.96 } } },
      { t: 13.45, full: true, ry: 5, rx: 4, d: 0.9 },
      { t: 14.45, full: true, ry: 5, rx: 4, ...OUT }
    ]
  },
  { id: 'met', kind: 'line', start: 14.48, end: 16.6, in: 'whip', exit: 'push', out: 16.25, lines: ['If the target is met,', 'the whole raise opens a Meteora pool,'], f: { '9x16': { lines: ['If the target is met,', 'the whole raise opens', 'a Meteora pool,'] } } },
  {
    /* seeding: the last step pressed ("Running…"); a pull back to the whole page as it turns seeded (the identity card's
       "Seeded", the readout turning into the pool's chart, the seeding card into the trade card); a push to the pool's
       line (HALF/SOL, 170 SOL, Meteora DAMM v2, liquidity locked for good) and the whip out */
    id: 'seeding', kind: 'page', start: 16.45, end: 19.2,
    states: [[16.45, 'seeding-2'], [SP + 0.08, 'seeding-2r'], [SEEDED, 'seeded']], presses: [SP], seeded: SEEDED,
    cam: [
      { t: 16.45, cut: true, sel: '[data-seeding]', fill: 0.8, ry: 9, rx: 5, dof: 6, d: 0.8, from: { k: 0.75, ry: 3 }, f: { '9x16': { fill: 0.9 } } },
      { t: 17.0, sel: '[data-seeding]', fill: 0.9, ry: 6, rx: 4, dof: 5, d: 0.45, f: { '9x16': { fill: 0.98 } } },
      { t: 17.42, full: true, ry: 4, rx: 3, d: 0.6 },
      { t: 18.02, sel: '[data-poolcard]', fill: 0.95, ry: 6, rx: 4, dof: 6, d: 0.65, f: { '9x16': { fill: 0.96, dof: 4 }, '1x1': { dof: 5 } } },
      { t: 18.85, ...OUT }
    ]
  },
  { id: 'locked', kind: 'line', big: true, start: 18.88, end: 20.0, in: 'whip', exit: 'push', out: 19.65, lines: ['locked for good.'], f: { '9x16': { lines: ['locked', 'for good.'] } } },
  { id: 'misses', kind: 'line', start: 19.72, end: 21.9, in: 'up', exit: 'push', out: 21.55, lines: ['If it misses,', 'every wallet gets back exactly what it paid,'], f: { '9x16': { lines: ['If it misses,', 'every wallet gets back', 'exactly what it paid,'] } } },
  {
    /* the other ending: "Ends in 00:00:01" running out; refunded, pulled back to "Missed target, refunded", the bar
       hatched and the site's note ("Every backer claims back exactly what they paid in SOL, the 1% fee included"), the
       identity card's "Refunds claimed" rolling up to every backer where the format shows it, and the whip out */
    id: 'refund', kind: 'refund', start: 21.75, end: 24.5,
    states: [[21.75, 'miss-live'], [REFUND, 'refunded']], ticks: [21.75, 22.35], refund: REFUND,
    claims: [[23.05, 0.3], [23.3, 0.65], [23.55, 1]],
    cam: [
      { t: 21.75, cut: true, sel: '[data-dtime]', fill: 0.5, ry: -8, rx: 5, dof: 8, d: 0.9, from: { k: 0.8, ry: -3 }, f: { '9x16': { fill: 0.7, dof: 12 } } },
      { t: 22.4, sel: '[data-dtime]', fill: 0.6, ry: -7, rx: 5, dof: 8, d: 0.55, f: { '9x16': { fill: 0.74, dof: 12 } } },
      { t: REFUND, sel: '.pp-missed', fill: 0.95, ry: -6, rx: 4, dof: 4, d: 0.8, nomb: true },
      { t: 24.15, ...OUT }
    ]
  },
  { id: 'fee', kind: 'line', big: true, start: 24.18, end: 25.3, in: 'whip', exit: 'push', out: 24.95, lines: ['fee included.'], f: { '9x16': { lines: ['fee', 'included.'] } } },
  { id: 'close', kind: 'close', start: 25.0, end: 30.0, l1: 'Seeded in full,', l2: 'or refunded in full.', shrink: 25.6, lineOut: 26.95, end_: 27.2 }
];
const master = {
  id: 'master', duration: 30,
  corner: corner(masterScenes),
  scenes: masterScenes,
  /* every line the film puts on screen, as it reads, for the SRT ({x} is a variable) */
  srt: [
    [2.4, 4.4, 'Most launches ask you to trust a founder with your money.'],
    [4.55, 6.3, 'Back an idea at one fixed price.'],
    [6.38, 7.75, 'A founder sets a target and a deadline.'],
    [10.27, 11.5, 'You buy in with SOL or USDC.'],
    [14.52, 16.25, 'If the target is met, the whole raise opens a Meteora pool,'],
    [18.92, 19.65, 'locked for good.'],
    [19.76, 21.55, 'If it misses, every wallet gets back exactly what it paid,'],
    [24.22, 24.95, 'fee included.'],
    [25.05, 26.95, 'Seeded in full, or refunded in full.'],
    [28.2, 30.0, '{url}']
  ],
  markers: [
    ['sting hit', 1.5, 'the seed lands and brightens'],
    ['fill complete', MB[MB.length - 1], 'the last wave of buys fills the target'],
    ['seeded', SEEDED, 'the last seeding step lands and the page turns seeded'],
    ['refunded', REFUND, 'the deadline passes and the raise turns refunded'],
    ['end card', 27.2, 'mark, wordmark and URL']
  ]
};

/* --------------------------------------------------------------------------------------------- the teaser */
const TB = buys(5.15, 0.35);
const teaserScenes = [
  { id: 'sting', kind: 'sting', start: 0, end: 2.6, hit: 1.5, fly: 2.25 },
  { id: 'title', kind: 'title', start: 2.45, end: 4.65, l1: 'Back an idea', l2: 'at one fixed price.', shrink: 3.05, l2in: 3.15, out: 4.25, exit: 'push' },
  {
    id: 'fill', kind: 'page', start: 4.45, end: 8.95, open: 4.45, states: fillStates(4.45, TB), buys: TB,
    cam: [
      { t: 4.45, cut: true, sel: '[data-trade="deposit"]', fill: 0.85, ry: 8, rx: 5, dof: 5, d: 0.8, from: { k: 0.7, ry: 3 }, f: { '9x16': { fill: 0.96 } } },
      { t: 5.0, sel: '[data-dreadout]', fill: 0.9, ry: 8, rx: 5, dof: 6, d: 0.6, f: { '9x16': { fill: 0.96 } } },
      { t: 6.6, full: true, ry: 5, rx: 4, d: 1.0 },
      { t: 8.6, ...OUT }
    ]
  },
  { id: 'close', kind: 'close', start: 8.63, in: 'whip', end: 15.0, l1: 'Seeded in full,', l2: 'or refunded in full.', shrink: 9.45, lineOut: 10.75, end_: 11.0 }
];
const teaser = {
  id: 'teaser', duration: 15,
  corner: corner(teaserScenes),
  scenes: teaserScenes,
  srt: [
    [2.5, 4.25, 'Back an idea at one fixed price.'],
    [8.68, 10.75, 'Seeded in full, or refunded in full.'],
    [12.0, 15.0, '{url}']
  ],
  markers: [
    ['sting hit', 1.5, 'the seed lands and brightens'],
    ['fill complete', TB[TB.length - 1], 'the last wave of buys fills the target'],
    ['end card', 11.0, 'mark, wordmark and URL']
  ]
};

export const CUTS = { master, teaser };
