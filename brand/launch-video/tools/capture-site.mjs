/* Captures the markup the site itself renders for the pieces the film shows, so the film is drawn from the product's own
   output, not a redraw: a seeded raise's chart panel ("How it raised") at each format's width, a filled raise's
   "Raised over time" panel (the demo raise Cobalt), the pass chip's icon and the raise page's identity card. Serves the repo on a local port and loads it in the Chrome HyperFrames uses.
   Writes site/captured/*.html. Run after tools/sync-site.mjs; the film builds from the files it leaves. */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const out = path.resolve(here, '../site/captured');
fs.mkdirSync(out, { recursive: true });

/* puppeteer-core and chrome-headless-shell come with the HyperFrames CLI; find them in the npx cache */
function findPuppeteer() {
  if (process.env.PUPPETEER_CORE) return process.env.PUPPETEER_CORE;
  const npx = path.join(os.homedir(), '.npm/_npx');
  for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, 'node_modules/puppeteer-core'); if (fs.existsSync(p)) return p; }
  throw new Error('puppeteer-core not found: run any npx hyperframes command once, or set PUPPETEER_CORE');
}
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const base = path.join(os.homedir(), '.cache/hyperframes/chrome/chrome-headless-shell');
  for (const v of fs.readdirSync(base)) for (const d of fs.readdirSync(path.join(base, v))) {
    const exe = path.join(base, v, d, 'chrome-headless-shell'); if (fs.existsSync(exe)) return exe;
  }
  throw new Error('chrome-headless-shell not found: run npx hyperframes browser ensure, or set CHROME_PATH');
}
const require = createRequire(import.meta.url);
const puppeteer = require(findPuppeteer());

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(repo, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  if (!f.startsWith(repo) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://localhost:${server.address().port}/`;

const browser = await puppeteer.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  const go = async hash => { await page.goto(base + hash, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}); await new Promise(r => setTimeout(r, 2500)); };

  await go('#/presale/cobalt');
  const chart = await page.evaluate(() => document.querySelector('[data-chartcard]').outerHTML);
  fs.writeFileSync(path.join(out, 'chart-filled.html'), chart + '\n');

  /* the seeded raise page's chart, drawn by the site's own ppChart() at each format's column width (the panel's inner
     width, as chartW() measures it): Cobalt's buys, scaled to the film's 85 SOL target and stretched over a 7-day window,
     the deadline the film's founder picks. */
  const widths = { '16x9': 588, '9x16': 473, '1x1': 376 };
  const charts = await page.evaluate((widths) => {
    const src = find('cobalt'), D7 = 7 * 86400e3, T = 85, t0 = src.openedAt, k = D7 / (src.endsAt - src.openedAt);
    const at = t => t0 + (t - t0) * k;
    const p = Object.assign({}, src, { status: 'seeded', target: T, raised: T, endsAt: t0 + D7, filledAt: at(src.filledAt), resolvedAt: at(src.filledAt),
      hist: (src.hist || []).map(([t, v]) => [at(t), v * T / src.target]), buys: (src.buys || []).map(b => Object.assign({}, b, { at: at(b.at) })) });
    const box = $('[data-dchart],[data-candles]', detailBox), out = { fillFrac: (p.filledAt - t0) / D7 };
    for (const [fk, w] of Object.entries(widths)) {   // ppChart's shell, filled the way drawCharts() fills it
      box.style.width = w + 'px';
      const t = document.createElement('template'); t.innerHTML = ppChart(p).trim();
      t.content.querySelector('[data-dchart]').innerHTML = raiseSVG(p); t.content.querySelector('[data-dbars]').innerHTML = buysSVG(p);
      out[fk] = t.content.firstElementChild.outerHTML;
    }
    box.style.width = '';
    return out;
  }, widths);
  for (const fk of Object.keys(widths)) fs.writeFileSync(path.join(out, `chart-seeded-${fk}.html`), charts[fk] + '\n');
  fs.writeFileSync(path.join(out, 'chart.json'), JSON.stringify({ fillFrac: charts.fillFrac, window: '7 days', source: 'demo raise cobalt, scaled' }) + '\n');

  await go('#/presale/osprey');
  const id = await page.evaluate(() => document.querySelector('.pp-id').outerHTML);
  fs.writeFileSync(path.join(out, 'pp-id-osprey.html'), id + '\n');
  const pass = await page.evaluate(() => document.querySelector('.pp-id .risk-chip.pass svg').outerHTML);
  fs.writeFileSync(path.join(out, 'risk-pass.svg.html'), pass + '\n');
  console.log('captured:', fs.readdirSync(out).join(', '));
} finally { await browser.close(); server.close(); }

/* the demo raise's art, which the identity card loads (Halfmoon's, from the site's demo set) */
fs.mkdirSync(path.resolve(here, '../site/demo'), { recursive: true });
fs.copyFileSync(path.join(repo, 'assets/demo/halfmoon-art.svg'), path.resolve(here, '../site/demo/halfmoon-art.svg'));
