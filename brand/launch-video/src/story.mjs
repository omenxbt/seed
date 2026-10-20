/* The film's script and clock: every scene's window, every beat inside it, the camera over each page, the captions per
   format and the beat markers. tools/build.mjs writes each cut and format from this; src/film.js reads the same data
   from the page (the #story JSON), so a time changed here moves the picture, the captions, the SRT and markers.json
   together. Seconds throughout.

   The camera. Every UI moment is the site's own page (tools/capture-pages.mjs) flown over by one camera, as the Axiom
   films in delta/01-video-hyperframes/_motion-refs do it: a shot resolves out of a fast move, pushes in on one element
   with the rest of the page out of focus, pans or tilts to the next, and pulls back to the whole app floating in the dot
   field. A camera key is { t, d, sel, fill, rx, ry, dof, from, win }: at t the camera starts for the element `sel`
   (`.scr` is the whole page; with `win` it frames a window of the app's size around the element), so that it fills `fill`
   of the format's focus box, tilted rx/ry degrees, with `dof` px of blur away from it, and gets there in d seconds on
   the brand's curve. `cut` starts a shot: the camera jumps to the pose `from` describes (k times the target's scale, an
   offset dx/dy in px, extra tilt) and resolves from it, fast at first, so the cut reads as a whip. Per-format values go
   in `f`; `nomb` turns motion blur off for a move. A scroll key { t, d, sel, place } scrolls the element's scrolling
   column until the element sits at `place` of it. Text scenes fly the same camera over their own type. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const RAISE = JSON.parse(fs.readFileSync(path.join(here, 'raise.json'), 'utf8'));

export const FPS = 30;

/* canvas, safe zones and caption specs from the brand book's "Captions and safe zones"; `focus` is the box the camera
   puts its element in (inside the safe zone, clear of the caption pill), `persp` the stage's perspective, `win` the app's
   window in this format (tools/capture-pages.mjs draws the site at that size), `frame` the brand book's screen frame the
   pages play in (a 16px-radius panel over the dot field, below the corner mark and its clear space), `fillK` how much
   closer the camera goes on a page's element here (never past the focus box: the phone layout's elements are a column
   wide, so 9:16 goes in as far as the box allows) */
export const FORMATS = {
  '16x9': { w: 1920, h: 1080, cls: 'f169', safe: { t: 96, r: 96, b: 96, l: 96 }, cap: { size: 48, lines: 2, bottom: 144 }, mark: 48, frame: [96, 168, 1728, 816], focus: [160, 210, 1760, 790], persp: 2200, win: [1920, 1080] },
  '9x16': { w: 1080, h: 1920, cls: 'f916', safe: { t: 250, r: 120, b: 320, l: 120 }, cap: { size: 56, lines: 3, bottom: 420 }, mark: 56, frame: [120, 330, 840, 1270], focus: [150, 380, 930, 1180], persp: 2600, win: [540, 960], fillK: 1.25 },
  '1x1': { w: 1080, h: 1080, cls: 'f11', safe: { t: 80, r: 80, b: 80, l: 80 }, cap: { size: 48, lines: 2, bottom: 120 }, mark: 48, frame: [80, 152, 920, 848], focus: [120, 190, 960, 800], persp: 2000, win: [1080, 1080] }
};

/* the raise filling: eight waves of buys .55s apart, the odometer rolling each (tools/capture-pages.mjs drew the page
   after each wave); the last lands on the filled page */
const buys = t0 => RAISE.waves.map((w, i) => +(t0 + i * 0.55).toFixed(2));

/* --------------------------------------------------------------------------------------------- camera keys */
/* each scene keeps one tilt direction, as the Axiom shots hold one slow drift: the Launch form leans left, the raise page
   right, the refunded page left again */
const launchCam = [
  /* in: the form resolves under the trust line as the camera pushes through it, the line flying past on top */
  { t: 13.72, cut: true, sel: 'fieldset:has(#fTarget)', fill: 0.92, ry: -14, rx: 8, dof: 3, d: 1.0, from: { k: 0.72, ry: -2, rx: 4 }, f: { '9x16': { fill: 0.96 }, '1x1': { fill: 0.95 } } },
  { t: 14.95, sel: '.f:has(#fTarget)', fill: 0.82, ry: -9, rx: 5, dof: 6, d: 0.8, f: { '9x16': { fill: 0.96 } } },
  { t: 15.95, sel: '.f:has(#timeSeg)', fill: 0.72, ry: -8, rx: 5, dof: 6, d: 0.6, f: { '9x16': { fill: 0.9 } } },
  /* to Open raise as the form scrolls under it (in 9:16 and 1:1 the scroll is long: the scroll carries the motion, with
     no blur on top) */
  { t: 16.7, sel: '#openBtn', fill: 0.8, ry: -7, rx: 5, dof: 6, d: 0.55, f: { '9x16': { fill: 0.94, nomb: true }, '1x1': { nomb: true } } },
  /* out: the camera pushes through the pressed button */
  { t: 17.7, sel: '#openBtn', fill: 2.6, ry: -5, rx: 3, dof: 8, d: 0.5 }
];
const launchScroll = [{ t: 16.72, d: 0.5, sel: '.lsubmit', place: 0.55 }];

/* the raise page, from opening through the fill, seeding and the seeded page */
const pageCam = (open, b, presses, seeded, reveal) => [
  { t: open, cut: true, sel: '[data-dreadout]', fill: 0.86, ry: 10, rx: 6, dof: 6, d: 0.8, from: { k: 0.7, ry: 6 }, f: { '9x16': { fill: 0.96 } } },
  { t: open + 0.95, sel: '[data-trade="deposit"]', fill: 0.88, dx: 300, ry: 9, rx: 5, dof: 6, d: 0.6, f: { '9x16': { fill: 0.96, dx: 0 }, '1x1': { fill: 0.86, dx: 120 } } },
  { t: b[0] - 0.1, sel: '[data-dreadout]', fill: 0.9, ry: 9, rx: 5, dof: 6, d: 0.55, f: { '9x16': { fill: 0.96 } } },
  { t: b[4] + 0.25, sel: '.scr', win: true, box: 'frame', fill: 0.94, ry: 8, rx: 6, dof: 0, d: 1.5, f: { '9x16': { fill: 0.84 }, '1x1': { fill: 1.2 } } },
  /* the seeding card is the rail's, at the page's right edge: in 16:9 and 1:1 it sits right of centre, so the page runs to
     the frame's edge and no edge of it shows */
  { t: b[7] + 0.4, sel: '[data-seeding]', fill: 0.82, dy: -40, ry: 10, rx: 6, dof: 6, d: 0.75, f: { '16x9': { dx: 530 }, '9x16': { fill: 0.92, dy: 0 }, '1x1': { fill: 0.7, dy: -60, dx: 192 } } },
  /* held on the card through the three presses, each step ticking, with a slow push */
  { t: presses[0] + 0.2, sel: '[data-seeding]', fill: 0.86, dy: -40, ry: 8, rx: 5, dof: 5, d: seeded - presses[0] - 0.2, f: { '16x9': { dx: 511 }, '9x16': { fill: 0.96, dy: 0 }, '1x1': { fill: 0.76, dy: -60, dx: 166 } } },
  /* seeded: the shot holds on the seeding card as the last step lands and the site turns it into the trade card, then
     cuts to the pool's line, the stand-in chart above the frame (9:16, where the pool's card lands just under it, moves) */
  { t: seeded + 0.32, cut: true, sel: '[data-poolcard]', fill: 0.92, dy: -60, ry: 8, rx: 5, dof: 7, d: 0.8, from: { k: 0.88, ry: 4 }, f: { '9x16': { cut: false, fill: 0.96, dy: -120, dof: 4 }, '1x1': { dy: -60, dof: 5 } } },
  /* held on the pool's line with a slow push while "locked for good." reads */
  { t: seeded + 1.12, sel: '[data-poolcard]', fill: 1.0, dy: -60, ry: 6, rx: 4, dof: 7, d: 0.95, f: { '9x16': { fill: 1.0, dy: -120, dof: 4 }, '1x1': { dy: -60, dof: 5 } } },
  /* the raise chart, landing as its line starts to draw (9:16 cuts to it: a move down its one column would cross the
     trade card's green buttons) */
  { t: reveal, sel: '[data-chartcard]', fill: 0.9, ry: 9, rx: 6, dof: 4, d: 0.8, f: { '9x16': { fill: 0.96, cut: true, from: { k: 0.9, ry: 3 } }, '1x1': { cut: true, from: { k: 0.9, ry: 3 } } } },
  { t: reveal + 2.6, sel: '.scr', win: true, box: 'frame', fill: 0.94, ry: 8, rx: 6, dof: 0, d: 1.2, f: { '9x16': { fill: 0.84 }, '1x1': { fill: 1.2 } } },
  /* out: the app whips away left, mid-flight at the cut; the other ending comes in from the right */
  { t: reveal + 4.33, sel: '.scr', win: true, box: 'frame', fill: 0.94, ry: 8, rx: 6, dof: 0, d: 0.7, dx: -1500, f: { '9x16': { fill: 0.84 }, '1x1': { fill: 1.2 } } }
];
const pageScroll = reveal => [{ t: reveal, d: 0.6, sel: '[data-chartcard]', place: 0.45 }];

const refundCam = (t0, refund) => [
  { t: t0, cut: true, sel: '[data-dtime]', fill: 0.5, ry: -10, rx: 6, dof: 8, d: 1.1, from: { k: 1.0, dx: 760, ry: -4 }, f: { '9x16': { fill: 0.7, dy: 120, dof: 14 } } },
  /* a slow push on the countdown as its last seconds run out (in 9:16 the deposit card's title stays behind the
     caption's widest line, out of focus) */
  { t: t0 + 1.1, sel: '[data-dtime]', fill: 0.62, ry: -8, rx: 5, dof: 8, d: 2.0, f: { '9x16': { fill: 0.74, dy: 120, dof: 14 } } },
  /* refunded: a pull back across the page, too much zoom for a directional blur to draw, so none */
  { t: refund, sel: '.pp-fill', fill: 0.9, ry: -7, rx: 5, dof: 4, d: 0.8, nomb: true, f: { '9x16': { fill: 0.96 } } },
  /* a cut on the motion to the identity card's stats, where "Refunds claimed" rolls up (a move across the page this fast
     would leave the frame a smear) */
  { t: refund + 1.15, cut: true, sel: '.pp-id .pp-stats', fill: 0.84, ry: -8, rx: 5, dof: 5, d: 0.7, from: { k: 0.9, ry: -4 }, f: { '9x16': { fill: 0.94 } } },
  { t: refund + 2.7, sel: '.pp-missed .pp-note', fill: 0.92, ry: -6, rx: 4, dof: 6, d: 0.8, f: { '9x16': { fill: 0.96 } } },
  /* out: the page whips away left, mid-flight at the cut, and the numbers strip comes in from the right */
  { t: refund + 4.68, sel: '.pp-missed .pp-note', fill: 0.92, ry: -6, rx: 4, dof: 6, d: 0.7, dx: -1300, f: { '9x16': { fill: 0.96 } } }
];

/* --------------------------------------------------------------------------------------------- the master */
/* Run the next step reads "Running…" for the site's 700ms after each press, then the step lands */
const RUN = 0.78, MB = buys(19.6), MP = [24.3, 25.5, 26.7], MS = +(MP[2] + RUN).toFixed(2), MR = 29.55;
/* the corner mark: top left from where the sting's mark lands until the end card, when it flies home to the centre and
   becomes the end card's mark (the close's end_ + 0.72); the pages play inside the screen frame, below it and its clear
   space */
const master = {
  id: 'master', duration: 55,
  corner: [[3.0, 52.62]],
  scenes: [
    { id: 'sting', kind: 'sting', start: 0, end: 3.0, hit: 1.5, fly: 2.55 },
    { id: 'title', kind: 'title', start: 2.68, end: 8.0, l1: 'Back an idea', l2: 'at one fixed price.', shrink: 4.1, l2in: 4.3, out: 7.6 },
    { id: 'trust', kind: 'trust', start: 7.72, end: 14.0, a: 7.76, b: 10.7, out: 13.6 },
    {
      id: 'launch', kind: 'launch', start: 13.72, end: 17.9,
      states: [[13.72, 'launch-0'], [15.0, 'launch-1'], [15.25, 'launch-2'], [16.18, 'launch-3'], [17.5, 'launch-4']],
      seg: 16.1, open: 17.42, cam: launchCam, scroll: launchScroll
    },
    {
      id: 'page', kind: 'page', start: 17.9, end: 34.0, open: 17.9,
      states: [[17.9, 'live-0']].concat(MB.slice(0, 7).map((t, i) => [t, 'live-' + (i + 1)]), [[MB[7], 'seeding-0']], MP.map((t, i) => [t + 0.08, 'seeding-' + i + 'r']), [[MP[0] + RUN, 'seeding-1'], [MP[1] + RUN, 'seeding-2'], [MS, 'seeded']]).sort((a, b) => a[0] - b[0]),
      buys: MB, chips: [], presses: MP, seeded: MS, reveal: MR, cam: pageCam(17.9, MB, MP, MS, MR), scroll: pageScroll(MR)
    },
    {
      id: 'refund', kind: 'refund', start: 34.0, end: 42.0,
      states: [[34.0, 'miss-live'], [37.2, 'refunded']], ticks: [34.0, 35.1, 36.1, 37.1], refund: 37.2,
      claims: [[38.4, 0.17], [38.8, 0.45], [39.2, 0.74], [39.6, 1]], cam: refundCam(34.0, 37.2), scroll: [], out: 41.72
    },
    { id: 'numbers', kind: 'numbers', start: 42.0, end: 49.5, items: [42.0, 43.8, 45.6, 47.4], pull: 48.6, out: 49.28 },
    { id: 'close', kind: 'close', start: 49.4, end: 55.0, l1: 'Seeded in full,', l2: 'or refunded in full.', shrink: 50.35, lineOut: 51.62, end_: 51.9 }
  ],
  captions: {
    '16x9': [
      [14.3, 17.9, ['A founder sets a target and a deadline.']],
      [18.6, 23.7, ['You buy in with SOL or USDC.']],
      [24.3, 27.4, ['If the target is met,', 'the whole raise opens a Meteora pool,']],
      [27.82, 33.7, ['locked for good.']],
      [34.3, 37.1, ['If it misses,', 'every wallet gets back exactly what it paid,']],
      [37.2, 39.3, ['fee included.']],
      [39.4, 41.7, ['Nothing is minted, nothing is held back.']]
    ],
    '9x16': [
      [14.3, 17.9, ['A founder sets a target', 'and a deadline.']],
      [18.6, 23.7, ['You buy in with SOL or USDC.']],
      [24.3, 27.4, ['If the target is met,', 'the whole raise opens', 'a Meteora pool,']],
      [27.82, 33.7, ['locked for good.']],
      [34.3, 37.1, ['If it misses,', 'every wallet gets back', 'exactly what it paid,']],
      [37.2, 39.3, ['fee included.']],
      [39.4, 41.7, ['Nothing is minted,', 'nothing is held back.']]
    ],
    '1x1': [
      [14.3, 17.9, ['A founder sets a target', 'and a deadline.']],
      [18.6, 23.7, ['You buy in with SOL or USDC.']],
      [24.3, 25.5, ['If the target is met,']],
      [25.6, 27.45, ['the whole raise opens', 'a Meteora pool,']],
      [27.85, 33.7, ['locked for good.']],
      [34.3, 35.6, ['If it misses,']],
      [35.7, 37.9, ['every wallet gets back', 'exactly what it paid,']],
      [38.0, 39.3, ['fee included.']],
      [39.4, 41.7, ['Nothing is minted,', 'nothing is held back.']]
    ]
  },
  /* every line the film puts on screen, as full sentences, for the SRT ({x} is a variable) */
  srt: [
    [2.72, 7.6, 'Back an idea at one fixed price.'],
    [7.85, 10.6, 'Most launches ask you to trust a founder with your money.'],
    [10.7, 13.7, 'Seed asks you to back an idea at one fixed price.'],
    [14.3, 17.9, 'A founder sets a target and a deadline.'],
    [18.6, 23.7, 'You buy in with SOL or USDC.'],
    [24.3, 33.7, 'If the target is met, the whole raise opens a Meteora pool, locked for good.'],
    [34.3, 39.3, 'If it misses, every wallet gets back exactly what it paid, fee included.'],
    [39.4, 41.7, 'Nothing is minted, nothing is held back.'],
    [42.05, 43.7, '{fee} {feeLabel}'],
    [43.85, 45.5, '{supply} supply'],
    [45.65, 47.3, '{refund} refund'],
    [47.45, 49.28, 'Locked for good'],
    [49.45, 51.6, 'Seeded in full, or refunded in full.'],
    [53.2, 55.0, '{url}']
  ],
  markers: [
    ['sting hit', 1.5, 'the seed lands and brightens'],
    ['fill complete', MB[7], 'the last wave of buys fills the target'],
    ['seeded', MS, 'the last seeding step lands and the page turns seeded'],
    ['refunded', 37.2, 'the deadline passes and the raise turns refunded'],
    ['end card', 51.9, 'mark, wordmark and URL']
  ]
};

/* --------------------------------------------------------------------------------------------- the teaser */
const TB = buys(3.6);
const teaserCam = [
  /* in: the readout resolves under the sting as its mark flies to the corner */
  { t: 2.82, cut: true, sel: '[data-dreadout]', fill: 0.86, ry: 10, rx: 6, dof: 6, d: 1.0, from: { k: 0.45, ry: 6 }, f: { '9x16': { fill: 0.96 } } },
  { t: 4.9, sel: '[data-dreadout]', fill: 0.96, ry: 7, rx: 4, dof: 4, d: 1.0, f: { '9x16': { fill: 0.98 } } },
  { t: 6.3, sel: '.scr', win: true, box: 'frame', fill: 0.94, ry: 8, rx: 6, dof: 0, d: 1.5, f: { '9x16': { fill: 0.84 }, '1x1': { fill: 1.2 } } },
  /* out: the camera pushes through the readout, the closing line coming up over it */
  { t: 8.24, sel: '.pp-fill .big', fill: 3.4, ry: 5, rx: 3, dof: 12, d: 0.45 }
];
const teaser = {
  id: 'teaser', duration: 15,
  corner: [[3.0, 12.12]],
  scenes: [
    { id: 'sting', kind: 'sting', start: 0, end: 3.0, hit: 1.5, fly: 2.55 },
    { id: 'page', kind: 'page', start: 2.82, end: 8.4, open: 2.82, states: [[2.82, 'live-0']].concat(TB.slice(0, 7).map((t, i) => [t, 'live-' + (i + 1)]), [[TB[7], 'seeding-0']]), buys: TB, chips: [], cam: teaserCam, scroll: [] },
    { id: 'close', kind: 'close', start: 8.37, end: 15.0, l1: 'Seeded in full,', l2: 'or refunded in full.', shrink: 9.25, lineOut: 11.1, end_: 11.4 }
  ],
  captions: {
    '16x9': [[3.4, 8.1, ['Back an idea at one fixed price.']]],
    '9x16': [[3.4, 8.1, ['Back an idea', 'at one fixed price.']]],
    '1x1': [[3.4, 8.1, ['Back an idea at one fixed price.']]]
  },
  srt: [
    [3.4, 8.1, 'Back an idea at one fixed price.'],
    [8.42, 11.1, 'Seeded in full, or refunded in full.'],
    [12.7, 15.0, '{url}']
  ],
  markers: [
    ['sting hit', 1.5, 'the seed lands and brightens'],
    ['fill complete', TB[7], 'the last wave of buys fills the target'],
    ['end card', 11.4, 'mark, wordmark and URL']
  ]
};

export const CUTS = { master, teaser };
