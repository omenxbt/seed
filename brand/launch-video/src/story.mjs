/* The film's script and clock: every scene's window, every beat inside it, the captions per format and the beat markers.
   tools/build.mjs writes each cut and format from this; src/film.js reads the same data from the page (the #story JSON),
   so a time changed here moves the picture, the captions, the SRT and markers.json together. Seconds throughout. */

export const FPS = 30;

/* canvas, safe zones and caption specs from the brand book's "Captions and safe zones"; zoom is how much larger than the
   site's own CSS pixels the product's panels are drawn, so they read at video size */
export const FORMATS = {
  '16x9': { w: 1920, h: 1080, cls: 'f169', zoom: 1.5, safe: { t: 96, r: 96, b: 96, l: 96 }, cap: { size: 48, lines: 2, bottom: 144 }, mark: 48 },
  '9x16': { w: 1080, h: 1920, cls: 'f916', zoom: 1.6, safe: { t: 250, r: 120, b: 320, l: 120 }, cap: { size: 56, lines: 3, bottom: 420 }, mark: 56 },
  '1x1': { w: 1080, h: 1080, cls: 'f11', zoom: 1.25, safe: { t: 80, r: 80, b: 80, l: 80 }, cap: { size: 48, lines: 2, bottom: 120 }, mark: 48 }
};

/* the demo raise the film follows. Its figures are a demo, so they are fractions of the raiseTarget variable; the terms
   (fee, supply, floor, cap, deadlines) come from src/figures.json */
const BUY_FRACS = [0.0753, 0.1676, 0.2812, 0.4129, 0.5718, 0.6965, 0.8453, 1];
const BACKER_FRACS = [0.08, 0.18, 0.29, 0.41, 0.57, 0.71, 0.86, 1];
const buysFrom = (t0, gap = 0.55) => BUY_FRACS.map((f, i) => ({ t: +(t0 + i * gap).toFixed(2), frac: f, backers: BACKER_FRACS[i] }));

const master = {
  id: 'master', duration: 55,
  corner: [3.0, 52.25],
  scenes: [
    { id: 'sting', kind: 'sting', start: 0, end: 3.0, hit: 1.5, out: 2.7 },
    { id: 'title', kind: 'title', start: 3.0, end: 8.0, l1: 'Back an idea', l2: 'at one fixed price.', out: 7.7 },
    { id: 'trust', kind: 'trust', start: 8.0, end: 14.0, a: 8.1, b: 10.7, out: 13.7 },
    {
      id: 'raise', kind: 'raise', start: 14.0, end: 24.0,
      launch: { in: 14.0, type: [[15.0, '8'], [15.25, '85']], press: 16.1, choose: 2, open: 17.4, out: 17.9 },
      card: { in: 17.9, from: '6d 23:59:58', buys: buysFrom(19.0), chips: [0, 4, 7], filled: 23.0 },
    },
    /* the filled page's seeding card, then, as the third step lands, the seeded page: its status and its chart revealing */
    { id: 'seeded', kind: 'seeded', start: 24.0, end: 34.0, in: 24.0, presses: [25.0, 26.2, 27.4], seeded: 27.48 },
    /* the same cards at 62%, the deadline running out a second at a time, refunded; refunds claimed roll up to every backer */
    { id: 'refunded', kind: 'refunded', start: 34.0, end: 42.0, in: 34.0, ticks: [34.0, 35.1, 36.1, 37.1], refund: 37.2, claims: [[37.7, 0.17], [38.4, 0.45], [39.1, 0.74], [39.8, 1]], toast: 38.4, frac: 0.62 },
    { id: 'numbers', kind: 'numbers', start: 42.0, end: 50.0, items: [42.0, 44.0, 46.0, 48.0], each: 2.0 },
    { id: 'close', kind: 'close', start: 50.0, end: 55.0, l1: 'Seeded in full,', l2: 'or refunded in full.', lineOut: 52.1, end_: 52.4 }
  ],
  captions: {
    '16x9': [
      [14.3, 17.9, ['A founder sets a target and a deadline.']],
      [18.6, 23.7, ['You buy in with SOL or USDC.']],
      [24.3, 33.7, ['If the target is met,', 'the whole raise opens a Meteora pool, locked for good.']],
      [34.3, 39.3, ['If it misses, every wallet gets back exactly what it paid,', 'fee included.']],
      [39.4, 41.7, ['Nothing is minted, nothing is held back.']]
    ],
    '9x16': [
      [14.3, 17.9, ['A founder sets a target', 'and a deadline.']],
      [18.6, 23.7, ['You buy in with', 'SOL or USDC.']],
      [24.3, 27.4, ['If the target is met,', 'the whole raise opens']],
      [27.5, 33.7, ['a Meteora pool,', 'locked for good.']],
      [34.3, 37.1, ['If it misses,', 'every wallet gets back', 'exactly what it paid,']],
      [37.2, 39.3, ['fee included.']],
      [39.4, 41.7, ['Nothing is minted,', 'nothing is held back.']]
    ],
    '1x1': [
      [14.3, 17.9, ['A founder sets a target', 'and a deadline.']],
      [18.6, 23.7, ['You buy in with SOL or USDC.']],
      [24.3, 27.4, ['If the target is met,', 'the whole raise opens']],
      [27.5, 33.7, ['a Meteora pool,', 'locked for good.']],
      [34.3, 37.1, ['If it misses,', 'every wallet gets back']],
      [37.2, 39.3, ['exactly what it paid,', 'fee included.']],
      [39.4, 41.7, ['Nothing is minted,', 'nothing is held back.']]
    ]
  },
  /* every line the film puts on screen, as full sentences, for the SRT ({x} is a variable) */
  srt: [
    [3.05, 7.7, 'Back an idea at one fixed price.'],
    [8.1, 10.6, 'Most launches ask you to trust a founder with your money.'],
    [10.7, 13.7, 'Seed asks you to back an idea at one fixed price.'],
    [14.3, 17.9, 'A founder sets a target and a deadline.'],
    [18.6, 23.7, 'You buy in with SOL or USDC.'],
    [24.3, 33.7, 'If the target is met, the whole raise opens a Meteora pool, locked for good.'],
    [34.3, 39.3, 'If it misses, every wallet gets back exactly what it paid, fee included.'],
    [39.4, 41.7, 'Nothing is minted, nothing is held back.'],
    [42.05, 43.72, '{fee} {feeLabel}'],
    [44.05, 45.72, '{supply} supply'],
    [46.05, 47.72, '{refund} refund'],
    [48.05, 49.72, 'Locked for good'],
    [50.05, 52.1, 'Seeded in full, or refunded in full.'],
    [52.45, 55.0, '{url}']
  ],
  markers: [
    ['sting hit', 1.5, 'the seed lands and brightens'],
    ['fill complete', 22.85, 'the last buy fills the target'],
    ['seeded', 27.48, 'the last seeding step lands and the page turns seeded'],
    ['refunded', 37.2, 'the deadline passes and the raise turns refunded'],
    ['end card', 52.4, 'mark, wordmark and URL']
  ]
};

const teaser = {
  id: 'teaser', duration: 15,
  corner: [3.0, 11.25],
  scenes: [
    { id: 'sting', kind: 'sting', start: 0, end: 3.0, hit: 1.5, out: 2.7 },
    { id: 'fill', kind: 'fill', start: 3.0, end: 8.4, card: { in: 3.0, from: '6d 23:59:58', buys: buysFrom(3.6), chips: [0, 4, 7], filled: 7.6 } },
    { id: 'close', kind: 'close', start: 8.4, end: 15.0, l1: 'Seeded in full,', l2: 'or refunded in full.', lineOut: 11.1, end_: 11.4 }
  ],
  captions: {
    '16x9': [[3.4, 8.1, ['Back an idea at one fixed price.']]],
    '9x16': [[3.4, 8.1, ['Back an idea', 'at one fixed price.']]],
    '1x1': [[3.4, 8.1, ['Back an idea at one fixed price.']]]
  },
  srt: [
    [3.4, 8.1, 'Back an idea at one fixed price.'],
    [8.45, 11.1, 'Seeded in full, or refunded in full.'],
    [11.45, 15.0, '{url}']
  ],
  markers: [
    ['sting hit', 1.5, 'the seed lands and brightens'],
    ['fill complete', 7.45, 'the last buy fills the target'],
    ['end card', 11.4, 'mark, wordmark and URL']
  ]
};

export const CUTS = { master, teaser };
