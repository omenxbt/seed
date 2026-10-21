/* One still per scene per format, taken from the rendered MP4s in out/, laid out on a sheet set in the site's own fonts and
   colours and screenshot to out/contact-sheet-<cut>.png. The stills stay in out/stills/ for review.
     node tools/contact-sheet.mjs            after tools/render.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CUTS, FORMATS, FPS } from '../src/story.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, '..');
const P = (...a) => path.join(proj, ...a);
fs.mkdirSync(P('out/stills'), { recursive: true });

/* the moment each scene is shown at: its state once its motion has settled */
const STILLS = {
  master: [['Logo sting', 1.9], ['Title card', 3.6], ['A founder sets', 5.26], ['Launch form', 6.66], ['You buy in', 9.06], ['Raise filling', 10.86], ['Target met', 13.66], ['Seeding', 15.16], ['The pool', 16.36], ['If it misses', 18.22], ['Countdown', 19.32], ['Refunded', 20.72], ['Seeded in full', 22.9], ['End card', 26.0]],
  teaser: [['Logo sting', 1.9], ['Title card', 3.6], ['Raise filling', 5.9], ['Filled', 8.2], ['Seeded in full', 10.2], ['End card', 13.5]]
};

const shots = {};
for (const cut of Object.keys(CUTS)) for (const fk of Object.keys(FORMATS)) {
  const mp4 = P('out', `seed-${cut}-${fk}.mp4`);
  if (!fs.existsSync(mp4)) { console.warn(`missing ${mp4}, skipped`); continue; }
  STILLS[cut].forEach(([label, t], i) => {
    const png = P('out/stills', `${cut}-${fk}-${String(i + 1).padStart(2, '0')}.png`);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(t), '-i', mp4, '-frames:v', '1', png]);
    (shots[cut] = shots[cut] || []).push({ fk, i, label, t, png });
  });
}

const require = createRequire(import.meta.url);
const npx = path.join(os.homedir(), '.npm/_npx');
const pup = process.env.PUPPETEER_CORE || fs.readdirSync(npx).map(d => path.join(npx, d, 'node_modules/puppeteer-core')).find(p => fs.existsSync(p));
const base = path.join(os.homedir(), '.cache/hyperframes/chrome/chrome-headless-shell');
const exe = process.env.CHROME_PATH || fs.readdirSync(base).flatMap(v => fs.readdirSync(path.join(base, v)).map(d => path.join(base, v, d, 'chrome-headless-shell'))).find(p => fs.existsSync(p));
const puppeteer = require(pup);
const browser = await puppeteer.launch({ executablePath: exe, args: ['--no-sandbox', '--allow-file-access-from-files'] });
try {
  for (const [cut, list] of Object.entries(shots)) {
    const cols = STILLS[cut].length, cell = 260;
    const rows = Object.keys(FORMATS).map(fk => `<div class="row"><div class="fk num">${fk.replace('x', ':')}</div>${list.filter(s => s.fk === fk).map(s => `<figure><div class="frame"><img src="${pathToFileURL(s.png)}"></div><figcaption><span>${s.label}</span><span class="num">${s.t.toFixed(1)}s</span></figcaption></figure>`).join('')}</div>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${pathToFileURL(P('site/fonts/fonts.css'))}"><link rel="stylesheet" href="${pathToFileURL(P('site/tokens.css'))}"><style>
      body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);letter-spacing:-.011em;padding:40px 44px}
      h1{font-weight:500;font-size:26px;letter-spacing:-.03em;margin:0 0 4px} p{color:var(--muted);margin:0 0 28px;font-size:15px}
      .num{font-family:var(--mono);font-variant-numeric:tabular-nums;letter-spacing:-.03em}
      .row{display:grid;grid-template-columns:70px repeat(${cols},${cell}px);gap:14px;align-items:start;margin-bottom:22px}
      .fk{color:var(--muted);font-size:14px;padding-top:6px}
      figure{margin:0}.frame{width:${cell}px;height:${cell}px;display:block;background:var(--paper);border:1px solid var(--panel-line);border-radius:12px;overflow:hidden}
      img{width:100%;height:100%;object-fit:contain;display:block}
      figcaption{display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-top:8px}figcaption .num{color:var(--faint)}
    </style></head><body><h1>Seed launch video, ${cut}, ${CUTS[cut].duration}s at ${FPS}fps</h1><p>One still per scene per format, from the rendered files in out/.</p>${rows}</body></html>`;
    const file = P('out', `contact-sheet-${cut}.html`);
    fs.writeFileSync(file, html);
    const page = await browser.newPage();
    await page.setViewport({ width: 88 + 70 + cols * (cell + 14) + 20, height: 600 });
    await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: P('out', `contact-sheet-${cut}.png`), fullPage: true });
    await page.close();
    fs.rmSync(file);
    console.log(`out/contact-sheet-${cut}.png`);
  }
} finally { await browser.close(); }
