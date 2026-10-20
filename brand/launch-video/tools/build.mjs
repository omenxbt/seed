/* Writes the film: index.html (the 16:9 master, the project's own entry for Studio) and one renderable project per cut
   and format under build/<cut>-<format>/, each its own index.html at its own canvas size, recomposed rather than cropped.
   Every UI moment is the site's markup (index.html's launch form, the raise page's cards as the site renders them, see
   tools/capture-site.mjs) styled by the site's stylesheets (site/, see tools/sync-site.mjs). Also writes markers.json and
   the SRTs. Usage: node tools/build.mjs [--no-sync] */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CUTS, FORMATS, FPS } from '../src/story.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, '..');
const repo = path.resolve(proj, '../..');
const P = (...a) => path.join(proj, ...a);
const run = f => execFileSync(process.execPath, [P('tools', f)], { stdio: 'inherit' });

if (!process.argv.includes('--no-sync')) { run('read-figures.mjs'); run('sync-site.mjs'); }
if (!fs.existsSync(P('site/captured/chart.json'))) run('capture-site.mjs');

const { figures, stepNames } = JSON.parse(fs.readFileSync(P('src/figures.json'), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const words = s => s.split(' ').map(w => `<span class="w">${esc(w)}</span>`).join(' ');

/* ------------------------------------------------------------------ variables: the URL, the network line, every figure */
/* the site's demo raise Halfmoon (js/data/demo.js: SOL pair, 7 days), at an 85 SOL target */
const RAISE = { name: 'Halfmoon', ticker: 'HALF', target: 85, backers: 214, art: 'site/demo/halfmoon-art.svg' };
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
  { id: 'unlockMin', type: 'string', label: 'Last team unlock, at least', default: figures.unlockMin },
  { id: 'raiseName', type: 'string', label: 'Demo raise name', default: RAISE.name },
  { id: 'raiseTicker', type: 'string', label: 'Demo raise ticker', default: RAISE.ticker },
  { id: 'raiseTarget', type: 'number', label: 'Demo raise target (SOL)', default: RAISE.target, min: 81, max: 600, step: 1 },
  { id: 'raiseBackers', type: 'number', label: 'Demo raise backers', default: RAISE.backers, min: 20, max: 999, step: 1 },
  { id: 'backerBuy', type: 'number', label: 'Demo backer\'s buy (SOL), refunded with its fee', default: 2, min: 0.1, max: 50, step: 0.1 },
  { id: 'solUsd', type: 'number', label: 'SOL price for the launch hint (USD)', default: figures.solUsd, min: 1, max: 10000, step: 0.1 },
  { id: 'musicVolume', type: 'number', label: 'Music volume', default: 0.8, min: 0, max: 1, step: 0.05 }
];
const V = Object.fromEntries(VARS.map(v => [v.id, v.default]));

/* ------------------------------------------------------------------ the site's markup */
const site = f => fs.readFileSync(P('site', f), 'utf8');
const symbols = site('mark-symbols.svg.html').trim();
const passIcon = site('captured/risk-pass.svg.html').trim();
const markSvg = fs.readFileSync(P('site/seed-mark-dark.svg'), 'utf8');
const dots = [...markSvg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map(m => m.slice(1, 4).map(Number));

/* the Launch form's "02 Raise" fieldset, verbatim from index.html, keeping the fields a founder fills in a raise's terms:
   pair, target and deadline (the hidden stock and mint rows, the derived rows and the optional limits are left out) */
function launchCard() {
  const index = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  const fs02 = index.match(/<fieldset><legend><span class="num">02<\/span>Raise<\/legend>[\s\S]*?<\/fieldset>/)[0];
  const keep = [...fs02.matchAll(/<div class="f(?: full)?"(?: id="[^"]*")?>[\s\S]*?(?=\n\s*<div class="f|\n\s*<\/div><\/fieldset>)/g)].map(m => m[0])
    .filter(f => /Pair with|fTarget|Deadline/.test(f) && !/id="(stockRow|mintRow)"/.test(f));
  const submit = index.match(/<div class="lsubmit">[\s\S]*?<\/div>\s*\n/)[0].trim();
  const hint = `at least ${esc(V.minTarget)}, at most ${esc(V.maxTarget)}, at the SOL price when it opens`;
  return `<form class="panel lform" data-launch novalidate autocomplete="off" onsubmit="return false">
        <fieldset><legend><span class="num">02</span>Raise</legend><div class="form">
        ${keep.join('\n        ')}
        </div></fieldset>
        ${submit}
      </form>`
    .replace(/ id="(pairSeg|timeSeg|fTarget|fCur|targetUsd|fErr|openBtn|upNote)"/g, (m, id) => ` data-id="${id}"`)
    .replace(/for="fTarget"/, '')
    .replace(/<span class="hint" data-id="targetUsd">[^<]*/, () => `<span class="hint" data-id="targetUsd" data-hint>${hint}`)
    .replace(/<input data-id="fTarget"/, '<input data-id="fTarget" value=""');
}

/* the raise page's identity card (pp-id, without the banner), as js/presale-page.js draws it; a refunded raise's card
   carries its "Refunds claimed" stat (ppStats) */
const idCard = (st, stText, stats = '') => `<section class="panel pp-id rc-id">
        <div class="pp-idrow"><img class="pp-art" src="${RAISE.art}" alt=""><span class="st-pill ${st}" data-st>${stText}</span></div>
        <div class="pp-name"><h1 data-var-text="raiseName">${esc(V.raiseName)}</h1><span class="pp-tk num" data-tk>$${esc(V.raiseTicker)}</span></div>
        <div class="pp-pills"><span class="pair-pill">SOL pair</span><span class="risk-chip pass">${passIcon}All checks pass</span><span class="tag demo-pill">Demo data</span></div>${stats}
      </section>`;
const claimsRow = `<dl class="pp-stats"><div><dt>Backers</dt><dd class="num" data-backers-n>${V.raiseBackers}</dd></div><div><dt>Refunds claimed</dt><dd class="num"><span data-odo="claims">0</span> <em>/ <span data-backers-n>${V.raiseBackers}</span></em></dd></div></dl>`;
/* and its fill card (pp-fill) */
const raiseCard = (stats = '') => `<div class="pp live rc" data-card>
      ${idCard('live', 'Live', stats)}
      <section class="panel pp-card pp-fill"><div class="pp-card-h"><h2 data-title>The raise</h2><span class="pace-chip on" data-chip>On pace</span></div>
        <div class="readout live" data-readout><div class="big"><b><span data-odo="raised">0.00</span> <em data-of>/ ${V.raiseTarget.toFixed(2)} SOL</em>${Array.from({ length: 8 }, () => '<span class="buy-chip num" data-buy></span>').join('')}</b><span class="num" data-odo="pct">0%</span></div>
        <div class="bar"><i data-bar style="width:0%"></i></div>
        <div class="sub"><span data-left><span data-lt>Ends in </span><span class="num" data-odo="time"></span></span><span data-odo="backers"></span></div></div>
      </section>
    </div>`;

const seedingCard = () => `<div class="pp seed-col"><section class="panel rail-card" data-seeding><h3>Seeding <span data-tk>$${esc(V.raiseTicker)}</span></h3>
      <ol class="seed-steps">${stepNames.map((s, i) => `<li${i === 0 ? ' class="now"' : ''}><span class="num">${i + 1}</span>${esc(s)}</li>`).join('')}</ol>
      <p class="rail-meta">Anyone can run the next step. If seeding has not finished <span data-var-text="seedingTimeout">${esc(V.seedingTimeout)}</span> after the fill, every backer claims a refund instead.</p>
      <button class="btn btn-navy btn-block" data-crank>Run the next step</button></section></div>`;

/* the seeded raise page's chart, as the site's ppChart() draws it at this format's column width (tools/capture-site.mjs) */
const chartCard = fk => `<div class="pp chart-col">${site(`captured/chart-seeded-${fk}.html`).trim().replace(/ data-chartcard(="")?/, ' data-chart')}</div>`;

/* ------------------------------------------------------------------ scenes */
let curFk = '';   // the format page() is writing, stamped on each scene as data-f
const sec = (s, cls, inner) => `  <section id="s-${s.id}" class="clip scene ${cls}" data-f="${curFk}" data-start="${s.start}" data-duration="${+(s.end - s.start).toFixed(3)}" data-track-index="1">
    <div class="sc">${inner}</div>
  </section>`;
const lockup = (cls, dotsSvg) => `<div class="lockup ${cls}">${dotsSvg}<span class="word">Seed</span></div>`;
const toast = `<div class="toast-slot"><div class="toast" data-toast>Refund claimed: <span data-refund></span> SOL is back in your wallet, fee included</div></div>`;
const SCENES = {
  sting: (s, fk) => sec(s, 's-sting', lockup('sting', `<svg class="mark sting-mark" viewBox="0 0 100 100" aria-hidden="true">${dots.map(([x, y, r], i) => `<circle class="${i ? 'dot' : 'seed'}" data-n="${i}" cx="${x}" cy="${y}" r="${r}"></circle>`).join('')}</svg>`)),
  title: (s, fk) => sec(s, 's-title', `<h1 class="t"><span class="l1">${esc(s.l1)}</span><span class="l2">${esc(s.l2)}</span></h1>`),
  trust: (s, fk) => sec(s, 's-trust', `<div class="kin"><p class="ka">${words('Most launches ask you to trust a founder with your money.')}</p><p class="kb">${words('Seed asks you to back an idea at one fixed price.')}</p></div>`),
  raise: (s, fk) => sec(s, 's-raise', `<div class="ui-area"><div class="ui"><div class="ws launch-col">${launchCard()}</div>${raiseCard()}</div></div>`),
  fill: (s, fk) => sec(s, 's-fill', `<div class="ui-area"><div class="ui">${raiseCard()}</div></div>`),
  seeded: (s, fk) => sec(s, 's-seeded', `<div class="ui-area"><div class="ui">${seedingCard()}<div class="pp rc seeded-b">${idCard('seeded', 'Seeded')}${chartCard(fk)}</div></div></div>`),
  refunded: (s, fk) => sec(s, 's-refunded', `<div class="ui-area"><div class="ui">${raiseCard(claimsRow)}${toast}</div></div>`),
  numbers: (s, fk) => sec(s, 's-numbers', [
    ['fee', 'feeLabel'], ['supply', null, 'supply'], ['refund', null, 'refund'], [null, null, 'the pool', 'Locked for good']
  ].map(([fig, labVar, lab, word], i) => `<div class="stat" data-stat="${i}">${fig ? `<div class="fig num" data-odo="stat" data-fig="${fig}">${esc(V[fig])}</div>` : `<div class="fig word">${esc(word)}</div>`}<div class="lab"${labVar ? ` data-var-text="${labVar}"` : ''}>${esc(labVar ? V[labVar] : lab)}</div></div>`).join('')),
  close: (s, fk) => sec(s, 's-close', `<h1 class="t"><span class="l1">${esc(s.l1)}</span><span class="l2">${esc(s.l2)}</span></h1>
      <div class="endcard">${lockup('end', '<svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><use href="#seed21"></use></svg>')}<p class="url num" data-var-text="url">${esc(V.url)}</p><p class="net" data-var-text="networkLine">${esc(V.networkLine)}</p></div>`)
};

/* ------------------------------------------------------------------ one root */
function page(cut, fk) {
  const f = FORMATS[fk], c = CUTS[cut], id = `seed-${cut}-${fk}`;
  curFk = fk;
  const caps = c.captions[fk].map(([a, b, lines], i) => `  <div id="cap-${i}" class="clip cap" data-start="${a}" data-duration="${+(b - a).toFixed(3)}" data-track-index="3">${lines.map(l => `<span class="ln">${esc(l)}</span>`).join('')}</div>`).join('\n');
  const story = { cut, format: fk, fps: FPS, duration: c.duration, corner: c.corner, scenes: c.scenes, zoom: f.zoom, raise: RAISE, chart: JSON.parse(site('captured/chart.json')) };
  const music = cut === 'master' ? 'assets/music.wav' : 'assets/music-teaser.wav';
  return `<!doctype html>
<html lang="en" data-composition-variables='${JSON.stringify(VARS).replace(/'/g, '&#39;')}'>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${f.w}, height=${f.h}">
<meta name="color-scheme" content="dark">
<title>Seed, ${cut} ${fk}</title>
<!-- the site's own fonts, tokens and stylesheets, in the site's order (presale.css, the inline sheet, delta.css) -->
<link rel="stylesheet" href="site/fonts/fonts.css">
<link rel="stylesheet" href="site/tokens.css">
<link rel="stylesheet" href="site/presale.css">
<link rel="stylesheet" href="site/site.css">
<link rel="stylesheet" href="site/delta.css">
<link rel="stylesheet" href="src/film.css">
<script src="vendor/gsap.min.js"></script>
</head>
<body>
<div id="root" class="film ${f.cls}" data-composition-id="${id}" data-start="0" data-duration="${c.duration}" data-width="${f.w}" data-height="${f.h}">
  ${symbols}
  <canvas id="bg-dither" aria-hidden="true"></canvas>
  <div id="corner" class="clip corner" data-start="${c.corner[0]}" data-duration="${+(c.corner[1] - c.corner[0]).toFixed(3)}" data-track-index="2"><svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><use href="#seed21"></use></svg></div>
${c.scenes.map(s => SCENES[s.kind](s, fk)).join('\n')}
${caps}
  <audio id="music" src="${music}" data-start="0" data-duration="${c.duration}" data-track-index="10" data-volume="${V.musicVolume}"></audio>
</div>
<script type="application/json" id="story">${JSON.stringify(story)}</script>
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
  for (const d of ['site', 'src', 'vendor', 'assets']) copyDir(P(d), path.join(dir, d));
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
