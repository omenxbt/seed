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
const DTIME = '.sub > span:has([data-dtime])';   // "Ends in 00:00:01", the words and the clock in focus together

/* --------------------------------------------------------------------------------------------- laying the cut out
   Every scene is written from its own start (0) and laid end to end: each comes in where the one before hands over (a
   sting or a text frame at its `out`, a page at its whip), `GAP` after it: 0.03s under a whip (the next comes in from the
   right as it goes), 0.15s after a push through type into a page (the page resolves under the flying type), 0.07s after a
   push into the next line (it comes up under). So a hold made longer here moves everything after it, the SRT and the
   markers with it. */
const GAP = { whip: 0.03, page: 0.15, line: 0.07 };
const TYPE = { line: 1, title: 1, close: 1 };
const shift = (o, dt) => {
  const r = t => +(t + dt).toFixed(3), x = { ...o };
  for (const k of ['start', 'end', 'out', 'shrink', 'l2in', 'lineOut', 'end_', 'hit', 'whip', 'open', 'seeded', 'refund']) if (x[k] != null) x[k] = r(x[k]);
  for (const k of ['buys', 'presses', 'ticks']) if (x[k]) x[k] = x[k].map(r);
  for (const k of ['states', 'claims']) if (x[k]) x[k] = x[k].map(([t, v]) => [r(t), v]);
  for (const k of ['cam', 'scroll', 'segs']) if (x[k]) x[k] = x[k].map(c => ({ ...c, t: r(c.t) }));
  return x;
};
function lay(list) {
  const out = []; let at = 0, how = null;
  for (const s of list) {
    const gap = !out.length ? 0 : how === 'whip' ? GAP.whip : TYPE[s.kind] ? GAP.line : GAP.page;
    const p = shift(s, at + gap); out.push(p);
    if (TYPE[p.kind] && out.length > 1) p.in = how === 'whip' ? 'whip' : 'up';   // in from the right under a whip, or up under a push
    const away = (p.cam || []).find(k => k.away);
    at = away ? away.t : p.kind === 'sting' ? p.whip : p.out; how = away || p.kind === 'sting' || p.exit === 'whip' ? 'whip' : 'push';
  }
  return out;
}
/* every line the film puts on screen, as it reads, from the scenes themselves, for the SRT */
const srtOf = sc => sc.filter(s => TYPE[s.kind]).map(s => s.kind === 'line' ? [+(s.start + 0.04).toFixed(2), s.out, s.lines.join(' ')] : [+(s.start + 0.05).toFixed(2), s.kind === 'close' ? s.lineOut : s.out, `${s.l1} ${s.l2}`]);
const byId = (sc, id) => sc.find(s => s.id === id);

/* a text frame: its words rise as the camera arrives (from the right after a whip, under the push before), it holds on a
   slow push and leaves on its exit; `hold` is the time to its exit */
const line = (id, text, hold, exit, f) => ({ id, kind: 'line', start: 0, end: +(hold + 0.35).toFixed(2), exit, out: hold, lines: text, ...(f ? { f } : {}) });

/* --------------------------------------------------------------------------------------------- the scenes */
const sting = { id: 'sting', kind: 'sting', start: 0, end: 2.9, hit: 1.5, whip: 2.4 };
const title = exit => ({ id: 'title', kind: 'title', start: 0, end: 2.6, in: 'whip', l1: 'Start an idea,', l2: 'fund it on-chain.', shrink: 0.82, l2in: 0.92, out: 2.15, exit });
const close = end => ({ id: 'close', kind: 'close', start: 0, in: 'whip', end, l1: 'Seeded in full,', l2: 'or refunded in full.', shrink: 0.9, lineOut: 2.4, end_: 2.65 });
/* the raise page from two waves in (the master) or from its opening (the teaser): the deposit panel (SOL or USDC), across
   to the readout as the waves land (the odometer rolls, the bar sweeps to green, the backers tick up), a pull back to the
   whole page as it fills, and the whip out */
const CLEAR = { fill: 1.07, ax: 0.535, ay: 0.54 };
const fill = (from, t0, gap, full, out) => {
  const b = buys(t0, gap, from);
  return {
    id: 'fill', kind: 'page', start: 0, end: +(out + 0.35).toFixed(2), open: 0, states: fillStates(0, b, from), buys: b,
    cam: [
      { t: 0, cut: true, sel: '[data-trade="deposit"]', fill: 0.85, ry: 8, rx: 5, dof: 5, d: 0.8, from: { k: 0.7, ry: 3 }, f: { '9x16': { fill: 0.96 } } },
      { t: 0.6, sel: '[data-dreadout]', fill: 0.9, ry: 8, rx: 5, dof: 6, d: 0.6, f: { '9x16': { fill: 0.96 } } },
      /* in 16:9 a little closer and lower, so the rail's own mark is not cut by the frame's corner */
      { t: full, full: true, ry: 5, rx: 4, d: 1.0, f: { '16x9': CLEAR } },
      { t: +(full + 1.0).toFixed(2), full: true, ry: 3, rx: 3, d: out - full - 1.0, f: { '16x9': CLEAR } },   // still drifting as it fills
      { t: out, full: true, ry: 3, rx: 3, ...OUT }
    ]
  };
};

/* --------------------------------------------------------------------------------------------- the master */
const SP = 0.45, SEEDED = +(SP + RUN).toFixed(2), REFUND = 1.1;
const masterScenes = lay([
  /* the film comes up from black over the sting and goes down to black on the end card (FADE) */
  sting,
  title('whip'),
  line('pmf', ['Find product-market fit'], 1.75, 'push', { '9x16': { lines: ['Find', 'product-market fit'] } }),
  line('presetline', ['Market cap presets'], 1.75, 'push', { '9x16': { lines: ['Market cap', 'presets'] } }),
  {
    /* the Launch form as it opens, the Raise section in view: the opening market cap segment on the site's own $100K, then
       the founder's $50K pressed, the raise line deriving the raise from it ("Opens at $50K market cap · raise 168.69 SOL
       ($25K), all into the pool"); the whip out */
    id: 'presets', kind: 'launch', start: 0, end: 2.7, enter: true,
    states: [[0, 'launch-0'], [1.08, 'launch-1']], segs: [{ t: 1.0, seg: '#capSeg', v: String(RAISE.cap) }],
    cam: [
      { t: 0, cut: true, sel: '.f:has(#capSeg)', fill: 0.86, ry: -8, rx: 5, dof: 3, d: 0.8, from: { k: 0.75, ry: -2, rx: 3 }, f: { '9x16': { fill: 0.96 }, '1x1': { fill: 0.94 } } },
      /* in 9:16 the phone layout's fields run the column's width, so the camera holds the segment and the whole raise line
         as close as the page allows, its figures inside the safe zone, and only turns towards the line */
      { t: 0.55, sel: ['#capSeg', '#raiseLine'], text: true, fill: 0.86, ry: -7, rx: 4, dof: 6, d: 0.55, f: { '9x16': { fill: 0.96 } } },
      { t: 1.35, sel: '#raiseLine', text: true, fill: 1.0, ry: -6, rx: 4, dof: 6, d: 0.7, f: { '9x16': { sel: ['#capSeg', '#raiseLine'], fill: 0.96, ry: -4 } } },
      { t: 2.35, ...OUT }
    ]
  },
  line('target', ['Set a target and deadline'], 1.75, 'push', { '9x16': { lines: ['Set a target', 'and deadline'] } }),
  {
    /* the same form, on: the raise line and the deadline, 7 days pressed; the form scrolls to Open raise, pressed ("Confirm
       in wallet…"); the whip out */
    id: 'launch', kind: 'launch', start: 0, end: 2.8,
    states: [[0, 'launch-1'], [0.83, 'launch-2'], [1.73, 'launch-3']], segs: [{ t: 0.75, seg: '#timeSeg', v: '168' }], open: 1.65,
    cam: [
      { t: 0, cut: true, sel: ['#raiseLine', '#timeSeg'], text: true, fill: 0.86, ry: -8, rx: 5, dof: 4, d: 0.8, from: { k: 0.75, ry: -2, rx: 3 }, f: { '9x16': { fill: 1.2, ax: 0.42 }, '1x1': { fill: 0.94 } } },
      { t: 0.45, sel: '.f:has(#timeSeg)', fill: 0.74, ry: -6, rx: 4, dof: 6, d: 0.5, f: { '9x16': { sel: '#timeSeg', fill: 0.8 } } },
      /* to Open raise as the form scrolls under it (in 9:16 and 1:1 the scroll is long: the scroll carries the motion) */
      { t: 1.15, sel: '#openBtn', fill: 0.8, ry: -6, rx: 4, dof: 6, d: 0.5, f: { '9x16': { fill: 0.94, nomb: true }, '1x1': { nomb: true } } },
      { t: 2.45, ...OUT }
    ],
    scroll: [{ t: 1.17, d: 0.45, sel: '.lsubmit', place: 0.55 }]
  },
  line('buy', ['Buy with SOL or USDC'], 1.75, 'push', { '9x16': { lines: ['Buy with', 'SOL or USDC'] } }),
  fill(2, 0.75, 0.4, 2.0, 3.45),
  line('met', ['Raises seed as tradeable tokens'], 1.85, 'push', { '9x16': { lines: ['Raises seed as', 'tradeable tokens'] } }),
  {
    /* seeding: the last step pressed ("Running…"); a pull back to the whole page as it turns seeded (the identity card's
       "Seeded", the readout turning into the pool's chart, the seeding card into the trade card); a push to the pool's
       line (HALF/SOL, 337.38 SOL, Meteora DAMM v2, liquidity locked for good) and the whip out */
    id: 'seeding', kind: 'page', start: 0, end: 3.15,
    states: [[0, 'seeding-2'], [SP + 0.08, 'seeding-2r'], [SEEDED, 'seeded']], presses: [SP], seeded: SEEDED,
    cam: [
      { t: 0, cut: true, sel: '[data-seeding]', fill: 0.8, ry: 9, rx: 5, dof: 6, d: 0.85, from: { k: 0.75, ry: 3 }, f: { '9x16': { fill: 0.9 } } },
      { t: 0.6, sel: '[data-seeding]', fill: 0.9, ry: 6, rx: 4, dof: 5, d: 0.5, f: { '9x16': { fill: 0.98 } } },
      /* in 1:1 a little closer and lower, so the rail's own mark is not cut by the frame's corner */
      { t: 1.1, full: true, ry: 4, rx: 3, d: 0.7, f: { '1x1': { fill: 1.1, ax: 0.54, ay: 0.55 } } },
      { t: 1.85, sel: '[data-poolcard]', fill: 0.95, ry: 6, rx: 4, dof: 6, d: 0.7, f: { '9x16': { fill: 0.96, dof: 4 }, '1x1': { dof: 5 } } },
      { t: 2.8, ...OUT }
    ]
  },
  line('misses', ['If it misses,', 'every wallet gets back exactly what it paid.'], 1.95, 'push', { '9x16': { lines: ['If it misses,', 'every wallet gets back', 'exactly what it paid.'] } }),
  {
    /* the other ending: "Ends in 00:00:01" running out; refunded, pulled back to "Missed target, refunded", the bar
       hatched and the site's note ("Every backer claims back exactly what they paid in SOL, the 1% fee included"), the
       identity card's "Refunds claimed" rolling up to every backer where the format shows it, and the whip out */
    id: 'refund', kind: 'refund', start: 0, end: 2.95,
    states: [[0, 'miss-live'], [REFUND, 'refunded']], ticks: [0, 0.7], refund: REFUND,
    claims: [[1.4, 0.3], [1.65, 0.65], [1.9, 1]],
    cam: [
      { t: 0, cut: true, sel: DTIME, fill: 0.5, ry: -8, rx: 5, dof: 8, d: 1.0, from: { k: 0.8, ry: -3 }, f: { '9x16': { fill: 0.7, dof: 12 } } },
      { t: 0.72, sel: DTIME, fill: 0.6, ry: -7, rx: 5, dof: 8, d: 0.6, f: { '9x16': { fill: 0.74, dof: 12 } } },
      { t: REFUND, sel: '.pp-missed', fill: 0.95, ry: -6, rx: 4, dof: 4, d: 0.85, nomb: true },
      { t: 2.6, ...OUT }
    ]
  },
  close(6.35)
]);
const mClose = byId(masterScenes, 'close'), mFill = byId(masterScenes, 'fill');
const master = {
  id: 'master', duration: mClose.end,
  scenes: masterScenes,
  srt: srtOf(masterScenes),
  markers: [
    ['sting hit', 1.5, 'the seed lands and brightens'],
    ['fill complete', mFill.buys[mFill.buys.length - 1], 'the last wave of buys fills the target'],
    ['seeded', byId(masterScenes, 'seeding').seeded, 'the last seeding step lands and the page turns seeded'],
    ['refunded', byId(masterScenes, 'refund').refund, 'the deadline passes and the raise turns refunded'],
    ['end card', mClose.end_, 'the mark builds, then the wordmark'],
    ['fade out', +(mClose.end - FADE.out).toFixed(2), 'the picture and the sound go down to black']
  ]
};

/* --------------------------------------------------------------------------------------------- the teaser: 15s */
const teaserScenes = lay([sting, title('push'), fill(0, 0.7, 0.35, 2.15, 4.1), close(6.14)]);
const tClose = byId(teaserScenes, 'close'), tFill = byId(teaserScenes, 'fill');
const teaser = {
  id: 'teaser', duration: tClose.end,
  scenes: teaserScenes,
  srt: srtOf(teaserScenes),
  markers: [
    ['sting hit', 1.5, 'the seed lands and brightens'],
    ['fill complete', tFill.buys[tFill.buys.length - 1], 'the last wave of buys fills the target'],
    ['end card', tClose.end_, 'the mark builds, then the wordmark'],
    ['fade out', +(tClose.end - FADE.out).toFixed(2), 'the picture and the sound go down to black']
  ]
};

export const CUTS = { master, teaser };
