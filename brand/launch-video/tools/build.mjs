/* Writes the film: index.html (the 16:9 master, the project's own entry for Studio) and one renderable project per cut
   and format under build/<cut>-<format>/, each its own index.html at its own canvas size, recomposed rather than cropped.
   Every UI moment is the site's own page: the DOM the site drew at each beat and its stylesheets resolved at that
   format's window (tools/capture-pages.mjs, site/pages/ and site/flat-<format>.css), mounted beat by beat under the
   film's camera (src/film.js). Also writes markers.json and the SRTs. Usage: node tools/build.mjs [--no-sync] */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CUTS, FORMATS, FPS, RAISE } from '../src/story.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, '..');
const P = (...a) => path.join(proj, ...a);
const run = f => execFileSync(process.execPath, [P('tools', f)], { stdio: 'inherit' });

if (!process.argv.includes('--no-sync')) { run('read-figures.mjs'); run('sync-site.mjs'); }
if (!fs.existsSync(P('site/pages/pages.json'))) run('capture-pages.mjs');

const { figures } = JSON.parse(fs.readFileSync(P('src/figures.json'), 'utf8'));
const PAGES = JSON.parse(fs.readFileSync(P('site/pages/pages.json'), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const words = s => s.split(' ').map(w => `<span class="w">${esc(w)}</span>`).join(' ');

/* ------------------------------------------------------------------ variables: the URL, the network line, every figure.
   The figures drive the film's own type (the numbers strip, the SRT); the pages carry the same figures because the site
   drew them from the same code (js/config/seed.js), so a figure changed in the code reaches both on the next capture. */
const VARS = [
  { id: 'url', type: 'string', label: 'Site URL', default: 'seed-nu-ten.vercel.app' },
  { id: 'networkLine', type: 'string', label: 'Network line', default: 'Live on Solana devnet' },
  { id: 'fee', type: 'string', label: 'Seed fee on each buy', default: figures.fee },
  { id: 'feeLabel', type: 'string', label: 'Fee label', default: figures.feeLabel },
  { id: 'minTarget', type: 'string', label: 'Minimum target', default: figures.minTarget },
  { id: 'maxTarget', type: 'string', label: 'Maximum target', default: figures.maxTarget },
  { id: 'deadlineMin', type: 'string', label: 'Shortest deadline', default: figures.deadlineMin },
  { id: 'deadlineMax', type: 'string', label: 'Longest deadline', default: figures.deadlineMax },
  { id: 'supply', type: 'string', label: 'Supply', default: figures.supply },
  { id: 'poolFee', type: 'string', label: 'Pool fee', default: figures.poolFee },
  { id: 'poolSplit', type: 'string', label: 'Pool fee split, founder/Seed', default: figures.poolSplit },
  { id: 'refund', type: 'string', label: 'Refund on a miss', default: figures.refund },
  { id: 'seedingSteps', type: 'string', label: 'Seeding steps', default: figures.seedingSteps },
  { id: 'seedingTimeout', type: 'string', label: 'Seeding timeout', default: figures.seedingTimeout },
  { id: 'unlockMin', type: 'string', label: 'Shortest team unlock (none since 2026-10-20)', default: figures.unlockMin },
  { id: 'musicVolume', type: 'number', label: 'Music volume', default: 0.8, min: 0, max: 1, step: 0.05 }
];
const V = Object.fromEntries(VARS.map(v => [v.id, v.default]));

/* ------------------------------------------------------------------ pieces */
const site = f => fs.readFileSync(P('site', f), 'utf8');
const symbols = site('mark-symbols.svg.html').trim();
const markSvg = fs.readFileSync(P('site/seed-mark-dark.svg'), 'utf8');
const dots = [...markSvg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map(m => m.slice(1, 4).map(Number));
const lockup = (cls, dotsSvg) => `<div class="lockup ${cls}">${dotsSvg}<span class="word">Seed</span></div>`;
/* the 21-dot mark as circles, so the sting and the end card can bring its dots in one by one */
const markDots = cls => `<svg class="mark ${cls}" viewBox="0 0 100 100" aria-hidden="true">${dots.map(([x, y, r], i) => `<circle class="${i ? 'dot' : 'seed'}" data-n="${i}" cx="${x}" cy="${y}" r="${r}"></circle>`).join('')}</svg>`;

let F = null;   // the format page() is writing
/* scenes alternate between two tracks, so Studio shows where one comes in under the one going out */
const sec = (s, cls, inner) => `  <section id="s-${s.id}" class="clip scene ${cls}" data-start="${s.start}" data-duration="${+(s.end - s.start).toFixed(3)}" data-track-index="${s.track}">
    <div class="sc">${inner}</div>
  </section>`;
/* a stage with the camera over the film's own type (the frame's size, straight over the dot field), or over a page of the
   site (the app's window, with the field under its panels for their glass to blur) */
const field = '<canvas class="field" aria-hidden="true"></canvas>';
const typeStage = inner => `<div class="stage type"><div class="cam" style="width:${F.w}px;height:${F.h}px"><div class="tw">${inner}</div></div></div>`;
const pageStage = () => `<div class="stage" data-layout-ignore>${field}<div class="cam" style="width:${F.win[0]}px;height:${F.win[1]}px"><div class="scr hf-html" style="width:${F.win[0]}px;height:${F.win[1]}px"><div class="hf-body"></div></div></div></div>`;
const stat = (i, fig, lab, labVar) => `<div class="stat" data-stat="${i}">${fig}<div class="lab"${labVar ? ` data-var-text="${labVar}"` : ''}>${esc(lab)}</div></div>`;
const SCENES = {
  sting: s => sec(s, 's-sting', lockup('sting', markDots('sting-mark'))),
  title: s => sec(s, 's-title', typeStage(`<h1 class="t"><span class="l1">${esc(s.l1)}</span><span class="l2">${esc(s.l2)}</span></h1>`)),
  trust: s => sec(s, 's-trust', typeStage(`<div class="kin"><p class="ka">${words('Most launches ask you to trust a founder with your money.')}</p><p class="kb">${words('Seed asks you to back an\u00a0idea at one fixed price.')}</p></div>`)),
  launch: s => sec(s, 's-launch', pageStage()),
  page: s => sec(s, 's-page', pageStage()),
  refund: s => sec(s, 's-refund', pageStage()),
  numbers: s => sec(s, 's-numbers', typeStage(`<div class="nrow" data-layout-allow-overflow>${[
    stat(0, `<div class="fig num" data-fig="fee">${esc(V.fee)}</div>`, V.feeLabel, 'feeLabel'),
    stat(1, `<div class="fig num" data-fig="supply">${esc(V.supply)}</div>`, 'supply'),
    stat(2, `<div class="fig num" data-fig="refund">${esc(V.refund)}</div>`, 'refund'),
    stat(3, `<div class="fig word">Locked for good</div>`, 'the pool')
  ].join('<span class="sep" aria-hidden="true">·</span>')}</div>`)),
  close: s => sec(s, 's-close', typeStage(`<h1 class="t"><span class="l1">${esc(s.l1)}</span><span class="l2">${esc(s.l2)}</span></h1>
      <div class="endcard">${lockup('end', markDots('end-mark'))}<p class="url num" data-var-text="url">${esc(V.url)}</p><p class="net" data-var-text="networkLine">${esc(V.networkLine)}</p></div>`))
};

/* ------------------------------------------------------------------ one root */
function page(cut, fk) {
  const f = FORMATS[fk], c = CUTS[cut], id = `seed-${cut}-${fk}`;
  F = f;
  /* a caption's tickers and figures are set in IBM Plex Mono, as the book's caption rule has it */
  const mono = l => esc(l).replace(/\b(SOL|USDC|\d[\d,.%]*)\b/g, '<span class="num">$1</span>');
  const caps = c.captions[fk].map(([a, b, lines], i) => `  <div id="cap-${i}" class="clip cap" data-start="${a}" data-duration="${+(b - a).toFixed(3)}" data-track-index="3">${lines.map(l => `<span class="ln">${mono(l)}</span>`).join('')}</div>`).join('\n');
  /* the site's pages this cut mounts, each beat once */
  const used = [...new Set(c.scenes.flatMap(s => (s.states || []).map(x => x[1])))];
  const pages = used.map(n => `<template data-page="${n}">${fs.readFileSync(P('site/pages', fk, n + '.html'), 'utf8').trim()}</template>`).join('\n');
  const meta = { window: PAGES[fk].window, states: Object.fromEntries(used.map(n => [n, { body: PAGES[fk].states[n].body, docH: PAGES[fk].states[n].docH }])) };
  const story = { cut, format: fk, fps: FPS, duration: c.duration, size: [f.w, f.h], persp: f.persp, focus: f.focus, frame: f.frame, fillK: f.fillK || 1, cornerBox: [f.safe.l, f.safe.t, f.mark], corner: c.corner, scenes: c.scenes, raise: { name: RAISE.name, ticker: RAISE.ticker, target: RAISE.target } };
  const music = cut === 'master' ? 'assets/music.wav' : 'assets/music-teaser.wav';
  return `<!doctype html>
<html lang="en" data-composition-variables='${JSON.stringify(VARS).replace(/'/g, '&#39;')}'>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${f.w}, height=${f.h}">
<meta name="color-scheme" content="dark">
<title>Seed, ${cut} ${fk}</title>
<!-- the site's own fonts and tokens, and its stylesheets as the browser resolved them at this format's window -->
<link rel="stylesheet" href="site/fonts/fonts.css">
<link rel="stylesheet" href="site/tokens.css">
<link rel="stylesheet" href="site/flat-${fk}.css">
<link rel="stylesheet" href="src/film.css">
<script src="vendor/gsap.min.js"></script>
</head>
<body>
<div id="root" class="film ${f.cls}" style="--persp:${f.persp}px;--frx:${f.frame[0]}px;--fry:${f.frame[1]}px;--frw:${f.frame[2]}px;--frh:${f.frame[3]}px" data-composition-id="${id}" data-start="0" data-duration="${c.duration}" data-width="${f.w}" data-height="${f.h}">
  ${symbols}
  <svg width="0" height="0" aria-hidden="true"><filter id="mbf" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feGaussianBlur id="mbg" stdDeviation="0 0" edgeMode="duplicate"></feGaussianBlur></filter></svg>
  <div id="world">
  <canvas id="bg-dither" aria-hidden="true"></canvas>
${c.scenes.map((s, i) => SCENES[s.kind]({ ...s, track: i % 2 ? 4 : 1 })).join('\n')}
  <div id="dof" aria-hidden="true"></div><div id="mb" aria-hidden="true"></div>
  <canvas id="mat" aria-hidden="true"></canvas><div id="matline" aria-hidden="true"></div>
  </div>
${c.corner.map(([a, b], i) => `  <div id="corner-${i}" class="clip corner" data-start="${a}" data-duration="${+(b - a).toFixed(3)}" data-track-index="2"><svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><use href="#seed21"></use></svg></div>`).join('\n')}
${caps}
  <audio id="music" src="${music}" data-start="0" data-duration="${c.duration}" data-track-index="10" data-volume="${V.musicVolume}"></audio>
</div>
<script type="application/json" id="story">${JSON.stringify(story)}</script>
<script type="application/json" id="pages">${JSON.stringify(meta)}</script>
${pages}
<script>
  /* js/bg-dither.js runs its own clock unless the viewer asks for reduced motion, when it draws one frame and stops. The
     film asks for that, then draws every frame itself through BG_DITHER.seek(370 + t): the field's fixed-seed mode
     (?bgt=370), one frame per frame, so a render repeats exactly. */
  (function () { var mm = window.matchMedia.bind(window); window.matchMedia = function (q) { return /prefers-reduced-motion:\\s*reduce/.test(q) ? { matches: true, media: q, addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} } : mm(q); }; })();
</script>
<script src="site/bg-dither.js"></script>
<script>
${fs.readFileSync(P('src/film.js'), 'utf8').replace(/<\/script/gi, '<\\/script').replace('__COMP_ID__', id)}
</script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ write */
const copyDir = (a, b) => { fs.mkdirSync(b, { recursive: true }); for (const e of fs.readdirSync(a, { withFileTypes: true })) { if (e.name.startsWith('.')) continue; const s = path.join(a, e.name), d = path.join(b, e.name); e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d); } };
fs.writeFileSync(P('index.html'), page('master', '16x9'));
fs.rmSync(P('build'), { recursive: true, force: true });
for (const cut of Object.keys(CUTS)) for (const fk of Object.keys(FORMATS)) {
  const dir = P('build', `${cut}-${fk}`);
  for (const d of ['src', 'vendor', 'assets']) copyDir(P(d), path.join(dir, d));
  /* the site's files this format needs: its resolved stylesheet, fonts, tokens, the field, the art the pages show */
  fs.mkdirSync(path.join(dir, 'site'), { recursive: true });
  for (const f of ['tokens.css', `flat-${fk}.css`, 'bg-dither.js']) fs.copyFileSync(P('site', f), path.join(dir, 'site', f));
  for (const d of ['fonts', 'assets']) if (fs.existsSync(P('site', d))) copyDir(P('site', d), path.join(dir, 'site', d));
  fs.writeFileSync(path.join(dir, 'index.html'), page(cut, fk));
  fs.writeFileSync(path.join(dir, 'hyperframes.json'), fs.readFileSync(P('hyperframes.json')));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ id: `seed-${cut}-${fk}`, name: `Seed ${cut} ${fk}` }, null, 2) + '\n');
}

/* markers.json: the beat points to score to, in seconds and frames, per cut (the same in every format) */
const markers = { fps: FPS, note: 'Beat points for scoring. Times are from the start of each cut and are the same in every format.', cuts: {} };
for (const [k, c] of Object.entries(CUTS)) markers.cuts[k] = { duration: c.duration, frames: Math.round(c.duration * FPS), markers: c.markers.map(([name, t, what]) => ({ name, t, frame: Math.round(t * FPS), what })) };
fs.writeFileSync(P('markers.json'), JSON.stringify(markers, null, 2) + '\n');

/* SRTs of the on-screen lines */
const ts = t => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
fs.mkdirSync(P('out'), { recursive: true });
for (const [k, c] of Object.entries(CUTS)) fs.writeFileSync(P('out', `seed-${k}.srt`), c.srt.map(([a, b, txt], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${txt.replace(/\{(\w+)\}/g, (m, v) => V[v])}\n`).join('\n'));
console.log('built index.html, build/{' + Object.keys(CUTS).flatMap(c => Object.keys(FORMATS).map(f => `${c}-${f}`)).join(',') + '}, markers.json, out/seed-*.srt');
