/* Has the site draw every page the film flies over, in its own code, and keeps what it drew. For each format the app runs
   at that format's window (16x9: 1920x1080, three columns; 1x1: 1080x1080, two; 9x16: 540x960, the phone layout), and
   the tool writes:
   - site/flat-<fk>.css: the site's stylesheets as the browser resolved them at that window (the media queries that match,
     viewport units in pixels), so the film's own canvas size cannot change the site's layout;
   - site/pages/<fk>/<state>.html: the app's DOM at each beat of the film (the Launch form as the founder fills it, the
     raise page after each buy, while seeding, seeded, at 62% with seconds left, refunded), with every hidden element
     dropped and input values and scroll positions kept;
   - site/pages/pages.json: per state, the scroll positions and the document height.
   The film's raise is Seed's own token, Seed ($SEED): the demo raise Halfmoon renamed and set to the film's terms (the
   $50K opening market cap preset, no team share,
   so a $25,000 raise in SOL at the demo SOL price; 7 days, 214 backers), drawn by renderDetail(); the clock is fixed (the
   raise opens 2026-10-17 15:36 UTC) and every request off this machine is refused, so the site runs on its demo data and
   its own figures (the presets, the demo SOL price), and two runs write the same files. Usage: node tools/capture-pages.mjs [16x9 9x16 1x1] */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, '..');
const repo = path.resolve(proj, '../..');
const story = JSON.parse(fs.readFileSync(path.join(proj, 'src/raise.json'), 'utf8'));
/* the raise its preset derives, as the site does it (js/model.js targetForCap): cap × (1 − team share) ÷ 2 in dollars, in
   SOL at the demo price, floored to the lamport; checked against the page's own figure once the site is loaded */
const demoSolUsd = Number(fs.readFileSync(path.join(repo, 'js/config/seed.js'), 'utf8').match(/demoSolUsd: ([\d.]+)/)[1]);
story.targetUsd = story.cap * (10000 - story.teamBps) / 10000 / 2;
story.target = Math.floor(story.targetUsd / demoSolUsd * 1e9) / 1e9;

const WINDOWS = { '16x9': [1920, 1080], '1x1': [1080, 1080], '9x16': [540, 960] };
const only = process.argv.slice(2).filter(a => WINDOWS[a]);

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
const puppeteer = createRequire(import.meta.url)(findPuppeteer());

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  const p = path.join(repo, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  if (!f.startsWith(repo) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

/* the brand's own font files stand in for the Google Fonts stylesheet the site links, so the capture measures text with
   the faces the film draws it in */
const fontsCss = fs.readFileSync(path.join(proj, 'site/fonts/fonts.css'), 'utf8').replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => `url(${origin}/brand/launch-video/site/fonts/${u.replace(/^\.\//, '')})`);

/* --------------------------------------------------------------------------------------------- in the page */
/* a fixed clock the tool moves by hand, so every time the site prints comes from the film's story; and reduced motion, so
   the site draws every figure as plain text and every chart whole (the film rolls and draws them itself) */
const CLOCK = `(() => {
  const R = Date; let now = ${story.t0};
  class D extends R { constructor(...a) { a.length ? super(...a) : super(now); } static now() { return now; } }
  D.UTC = R.UTC; D.parse = R.parse; window.Date = D; window.__setNow = t => { now = t; };
  const mm = window.matchMedia.bind(window);
  window.matchMedia = q => /prefers-reduced-motion/.test(q) ? { matches: /:\\s*reduce\\b/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q);
  /* the demo's simulated buys (setInterval(simulate, 3600)) never start: the tool lands every buy itself */
  const si = window.setInterval.bind(window);
  window.setInterval = (f, ms, ...a) => (f && f.name === 'simulate') ? 0 : si(f, ms, ...a);
  try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
})();`;

/* the site's stylesheets, resolved at this window: read from their source text (a rule's cssText drops a shorthand that
   carries a var()), each @media and @supports block kept or dropped as this window answers it, viewport units turned
   into pixels, and html and body selectors moved onto the film's stand-ins (.hf-html, .hf-body) */
async function flatten() {
  const vw = innerWidth, vh = innerHeight;
  const px = s => s.replace(/(-?\d*\.?\d+)(?:d|s|l)?(vw|vh|vmin|vmax)\b/g, (m, n, u) => {
    const k = u === 'vw' ? vw : u === 'vh' ? vh : u === 'vmin' ? Math.min(vw, vh) : Math.max(vw, vh);
    return +(n * k / 100).toFixed(3) + 'px';
  });
  const sel = s => s.replace(/(^|[\s>+~,(])(html|body)(?=[\s.#:\[>+~,)]|$)/g, (m, a, t) => a + '.hf-' + t);
  /* the index of the brace that closes the block opening at i, skipping strings */
  const close = (t, i) => { let d = 0, q = null; for (; i < t.length; i++) { const c = t[i]; if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; } if (c === '"' || c === "'") q = c; else if (c === '{') d++; else if (c === '}' && --d === 0) return i; } return t.length; };
  const next = (t, i, chars) => { let q = null; for (; i < t.length; i++) { const c = t[i]; if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; } if (c === '"' || c === "'") q = c; else if (chars.includes(c)) return i; } return t.length; };
  const block = t => {
    let out = '', i = 0;
    while (i < t.length) {
      while (i < t.length && /\s/.test(t[i])) i++;
      if (i >= t.length) break;
      const j = next(t, i, '{;');
      const head = t.slice(i, j).trim();
      if (t[j] === ';' || j >= t.length) { i = j + 1; if (/^@(charset|import|namespace)/.test(head)) continue; continue; }
      const k = close(t, j), body = t.slice(j + 1, k);
      i = k + 1;
      if (/^@media\b/i.test(head)) { if (matchMedia(head.replace(/^@media\s*/i, '')).matches) out += block(body); continue; }
      if (/^@supports\b/i.test(head)) { let ok = false; try { ok = CSS.supports(head.replace(/^@supports\s*/i, '')); } catch (e) {} if (ok) out += block(body); continue; }
      if (/^@font-face\b/i.test(head)) continue;
      if (head[0] === '@') { out += head + '{' + px(body) + '}\n'; continue; }
      out += sel(head) + '{' + px(body) + '}\n';
      /* a saved page carries no focus: grab() marks the focused element, and its focus rules are kept on the mark */
      if (/:focus/.test(head)) out += sel(head.replace(/:focus-within/g, ':has([data-hf-focus])').replace(/:focus-visible/g, '[data-hf-focus-visible]').replace(/:focus(?![-\w])/g, '[data-hf-focus]')) + '{' + px(body) + '}\n';
    }
    return out;
  };
  let out = '';
  for (const n of document.querySelectorAll('link[rel="stylesheet"], style')) {
    if (n.tagName === 'LINK') { if (!n.href.startsWith(location.origin)) continue; out += block((await (await fetch(n.href)).text()).replace(/\/\*[\s\S]*?\*\//g, '')); }
    else out += block(n.textContent.replace(/\/\*[\s\S]*?\*\//g, ''));
  }
  return out;
}

/* the app's DOM as drawn now: hidden elements dropped, input values and scroll positions kept, asset paths under site/ */
function grab() {
  const ae = document.activeElement;
  if (ae && ae !== document.body) { ae.setAttribute('data-hf-focus', ''); if (ae.matches(':focus-visible')) ae.setAttribute('data-hf-focus-visible', ''); }
  const live = [], all = document.body.querySelectorAll('*');
  all.forEach((e, i) => { e.setAttribute('data-hf-i', i); });
  const keep = e => {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') return true;
    const cs = getComputedStyle(e);
    return cs.display !== 'none';
  };
  const marks = [];
  all.forEach(e => {
    const i = e.getAttribute('data-hf-i');
    if (/^(SCRIPT|NOSCRIPT|TEMPLATE|CANVAS|IFRAME|LINK|STYLE)$/.test(e.tagName) || !keep(e)) { marks.push([i, 'drop']); return; }
    const m = {};
    if ((e.tagName === 'INPUT' || e.tagName === 'TEXTAREA') && e.value) m.value = e.value;
    if (e.scrollTop || e.scrollLeft) m.scroll = [e.scrollTop, e.scrollLeft];
    if (Object.keys(m).length) marks.push([i, m]);
  });
  const clone = document.body.cloneNode(true);
  const byI = {}; clone.querySelectorAll('[data-hf-i]').forEach(e => { byI[e.getAttribute('data-hf-i')] = e; });
  for (const [i, m] of marks) {
    const e = byI[i]; if (!e) continue;
    if (m === 'drop') { e.remove(); continue; }
    if (m.value != null) { if (e.tagName === 'TEXTAREA') e.textContent = m.value; else e.setAttribute('value', m.value); }
    if (m.scroll) e.setAttribute('data-hf-scroll', m.scroll.join(','));
  }
  clone.querySelectorAll('[data-hf-i]').forEach(e => e.removeAttribute('data-hf-i'));
  all.forEach(e => e.removeAttribute('data-hf-i'));
  if (ae && ae !== document.body) { ae.removeAttribute('data-hf-focus'); ae.removeAttribute('data-hf-focus-visible'); }
  clone.querySelectorAll('[src^="assets/"], [src^="brand/"], [href^="assets/"]').forEach(e => { for (const a of ['src', 'href']) { const v = e.getAttribute(a); if (v && /^(assets|brand)\//.test(v)) e.setAttribute(a, v.startsWith('brand/launch-video/site/') ? v.slice('brand/launch-video/'.length) : 'site/' + v); } });
  return { html: clone.innerHTML.replace(/\s{2,}/g, ' '), body: document.body.className, root: document.documentElement.className, scrollY: scrollY, docH: document.documentElement.scrollHeight, vw: innerWidth, vh: innerHeight };
}

/* the film's raise, set on the demo raise Halfmoon: Seed's own token, its terms, its buys up to this beat, its status */
function setRaise(o) {
  const x = find('halfmoon'), pr = profileOf(x);
  pr.updates = []; pr.announcements = []; pr.chat = [];   // a raise just opened has no chat yet (the demo's avatars are pastel gradients)
  pr.banner = o.banner; pr.art = o.art; pr.bannerPos = pr.artPos = '50% 50%';
  /* Seed ($SEED): its name and ticker and its own About; no links (its Launch form gave none) and none of Halfmoon's
     team, deck or roadmap */
  Object.assign(x, { name: o.name, ticker: o.ticker, roadmap: [] });
  Object.assign(pr, { description: o.about, links: { website: null, x: null, telegram: null, discord: null, github: null }, team: [], deck: null });
  /* the raise is the one the demo wallet just opened: its founder and payout wallet are that wallet (shown 7xKp…9fQa, as
     the wallet chip shows it), with no X linked, as on the Launch form */
  const me = '7xKpHm3vQ8sYc2RkT9bW4nJdLz6uFgE5aXq1PrNt9fQa';
  pr.founder = Object.assign({}, pr.founder, { name: 'Founder', x: null, xAgeDays: null, wallet: me, pastLaunches: [] });
  Object.assign(x, { xAccount: null, creator: me, payoutWallet: me, pendingPayoutWallet: null, payoutEffectiveAt: null, pastRaises: [] });
  Object.assign(x, { target: o.target, targetUsd: o.targetUsd, capUsd: o.cap, preset: presetIndex(o.cap), solUsdAtOpen: SEED.demoSolUsd, q: 'SOL', openedAt: o.t0, endsAt: o.t0 + o.window, raised: o.raised, backers: o.backers, buys: o.buys, hist: o.hist, status: o.status, teamBps: o.teamBps });
  for (const k of ['filledAt', 'resolvedAt', 'seedStep', 'refundReason', 'crankAt']) delete x[k];
  if (o.filledAt) x.filledAt = o.filledAt;
  if (o.resolvedAt) x.resolvedAt = o.resolvedAt;
  if (o.seedStep) x.seedStep = o.seedStep;
  if (state.positions) delete state.positions.halfmoon;
  if (state.claimed) delete state.claimed.halfmoon;
  if (window.pg) { pg.pool = null; pg.series = null; }
}

/* --------------------------------------------------------------------------------------------- the story's beats */
/* a button pressed, as the site's own handler draws it before it waits on the wallet or the chain */
const PRESS_OPEN = `(() => { const b = document.querySelector('#openBtn'); b.disabled = true; b.textContent = 'Confirm in wallet…'; })()`;
const PRESS_CRANK = `(() => { const c = document.querySelector('[data-crank]'); if (c) { c.disabled = true; c.textContent = 'Running…'; } })()`;
/* the raise's buys: 214 backers in eight waves, so the odometer climbs where the film says, the chart's line steps up
   with each wave and no backer holds much of it (the site's top-10 check passes) */
const R = story;
function wave(i) {   // the buys of waves 0..i, and the history the chart draws
  const buys = [], hist = [[R.t0, 0]];
  let cum = 0, prevFrac = 0;
  for (let w = 0; w <= i; w++) {
    const f = R.waves[w], amt = R.target * (f.frac - prevFrac), n = Math.max(1, Math.round(R.backers * (f.backers - (w ? R.waves[w - 1].backers : 0))));
    const tEnd = R.t0 + f.at, tStart = R.t0 + (w ? R.waves[w - 1].at : 0);
    for (let k = 0; k < n; k++) {
      const a = amt / n * (0.6 + 0.8 * ((k * 7919 + w * 104729) % 1000) / 1000), at = Math.round(tStart + (tEnd - tStart) * (k + 1) / (n + 1));
      buys.push({ wallet: 'w' + w + '_' + k, amount: a, at, isFresh: false, tags: [] });
    }
    prevFrac = f.frac;
  }
  const scale = R.target * R.waves[i].frac / buys.reduce((s, b) => s + b.amount, 0);
  buys.forEach(b => { b.amount *= scale; cum += b.amount; hist.push([b.at, cum]); });
  return { buys, hist, raised: +cum.toFixed(6) };
}
function beats(fk) {
  const B = [];
  /* the Launch form: the project named, the Raise section in view as the form opens (the site's own $100K preset and 3
     days chosen), the film's preset pressed, the deadline picked */
  const L = { name: R.name, ticker: R.ticker, cap: 100000, deadline: null };
  B.push({ name: 'launch-0', page: '#/launch', wallet: true, now: R.t0, blur: true, launch: L });
  B.push({ name: 'launch-1', page: '#/launch', wallet: true, now: R.t0, blur: true, launch: Object.assign({}, L, { cap: R.cap }) });
  B.push({ name: 'launch-2', page: '#/launch', wallet: true, now: R.t0, blur: true, launch: Object.assign({}, L, { cap: R.cap, deadline: R.deadlineLabel }) });
  /* Open raise pressed: the site's openPresale disables the button and asks for the wallet (js/launch.js) */
  B.push({ name: 'launch-3', page: '#/launch', wallet: true, now: R.t0, blur: true, launch: Object.assign({}, L, { cap: R.cap, deadline: R.deadlineLabel }), then: PRESS_OPEN });
  /* the raise page as it opens and after each wave of buys */
  /* a backer is a wallet that bought: the count the page shows is the wallets in the buy list, as the site's backers tab counts them */
  const live = i => { const w = i < 0 ? { buys: [], hist: [], raised: 0 } : wave(i); return { status: 'live', raised: w.raised, backers: w.buys.length, buys: w.buys, hist: w.hist }; };
  B.push({ name: 'live-0', page: '#/presale/halfmoon', now: R.t0 + 2e3, raise: live(-1), wallet: false });
  R.waves.forEach((f, i) => B.push({ name: 'live-' + (i + 1), page: '#/presale/halfmoon', now: R.t0 + f.at + 1e3, raise: live(i), wallet: false }));
  /* filled, each seeding step, then seeded */
  const full = wave(R.waves.length - 1), tf = R.t0 + R.waves[R.waves.length - 1].at;
  /* each seeding step, then the same page with Run the next step pressed: the site's crank disables it, "Running…", until
     the step lands (js/presale-page.js) */
  ['filled', 'minted', 'pooled'].forEach((s, k) => {
    const raise = { status: 'filled', raised: R.target, backers: full.buys.length, buys: full.buys, hist: full.hist, filledAt: tf, seedStep: s };
    B.push({ name: 'seeding-' + k, page: '#/presale/halfmoon', now: tf + 60e3 + k * 30e3, raise, wallet: false });
    B.push({ name: 'seeding-' + k + 'r', page: '#/presale/halfmoon', now: tf + 60e3 + k * 30e3, raise, wallet: false, then: PRESS_CRANK });
  });
  B.push({ name: 'seeded', page: '#/presale/halfmoon', now: tf + 3 * 60e3, raise: { status: 'seeded', raised: R.target, backers: full.buys.length, buys: full.buys, hist: full.hist, filledAt: tf, resolvedAt: tf + 2.5 * 60e3, seedStep: 'seeded' }, wallet: false });
  /* the other ending: the same raise at 62% with three seconds left, then refunded */
  const miss = (() => { const n = R.waves.findIndex(f => f.frac >= R.missFrac); const w = wave(Math.max(0, n - 1)); const k = R.target * R.missFrac / w.raised; w.buys.forEach(b => b.amount *= k); let c = 0; w.hist = [[R.t0, 0]].concat(w.buys.map(b => [b.at, c += b.amount])); w.raised = R.target * R.missFrac; return w; })();
  const tEnd = R.t0 + R.window;
  B.push({ name: 'miss-live', page: '#/presale/halfmoon', now: tEnd - 3e3, raise: { status: 'live', raised: miss.raised, backers: miss.buys.length, buys: miss.buys, hist: miss.hist }, wallet: false });
  B.push({ name: 'refunded', page: '#/presale/halfmoon', now: tEnd + 60e3, raise: { status: 'refunded', raised: miss.raised, backers: miss.buys.length, buys: miss.buys, hist: miss.hist, resolvedAt: tEnd }, wallet: false });
  return B;
}

/* --------------------------------------------------------------------------------------------- run */
const browser = await puppeteer.launch({ executablePath: findChrome(), args: ['--no-sandbox', '--force-color-profile=srgb'] });
const index = {};
try {
  for (const [fk, [W, H]] of Object.entries(WINDOWS)) {
    if (only.length && !only.includes(fk)) continue;
    const page = await browser.newPage();
    await page.emulateTimezone('UTC');
    await page.setViewport({ width: W, height: H });
    await page.evaluateOnNewDocument(CLOCK);
    await page.setRequestInterception(true);
    page.on('request', rq => {
      const u = rq.url();
      if (u.startsWith(origin) || u.startsWith('data:')) return rq.continue();
      if (u.startsWith('https://fonts.googleapis.com/')) return rq.respond({ status: 200, contentType: 'text/css', body: fontsCss });
      if (u.startsWith('https://cdnjs.cloudflare.com/ajax/libs/marked/') || u.startsWith('https://cdnjs.cloudflare.com/ajax/libs/dompurify/')) return rq.continue();
      return rq.abort();
    });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await page.goto(origin + '/index.html', { waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(`window.setRaise = ${setRaise.toString()}`);
    /* the site's own demo mode, held still: no chain (the app-bar chips count the demo raises at the demo SOL price), no
       simulated buys landing on their own and no demo crank running a seeding step every half minute; the tool moves
       every state itself */
    await page.evaluate(() => { window.tick = () => {}; window.simulate = () => {}; if (window.chain) chain.on = () => false; renderAll(); });
    const siteTarget = await page.evaluate(R => targetForCap(R.cap, R.teamBps, 'SOL'), R);
    if (Math.abs(siteTarget - R.target) > 1e-9) throw new Error(`the site derives ${siteTarget} SOL for the $${R.cap} preset; the film has ${R.target}`);
    /* the film's pool has just opened, so no trade has landed on it: the site's chart draws its own empty state ("No trades
       in this window.") in place of the demo's stand-in pool, whose hourly walk runs forward from the moment of seeding */
    await page.evaluate(() => { const c = presaleAdapter.candles; presaleAdapter.candles = (p, tf) => p.id === 'halfmoon' ? Promise.resolve(withSrc([], 'demo')) : c.call(presaleAdapter, p, tf); });
    await sleep(800);
    /* the film's raise wears the site's own dot field as its banner (the demo's are pastel gradients, a second hue): a
       crop of js/bg-dither.js at its fixed second 370, where the field's mass is, low and to the right, kept 4x with
       every dot a hard square (the camera goes in close on the identity card). Its art is Seed's own avatar: the muted
       mark on the charcoal ground, drawn from the mark's SVG at 1600px */
    if (fk === '16x9' || !fs.existsSync(path.join(proj, 'site/assets/film/banner.png'))) {
      const shots = await page.evaluate(async () => {
        BG_DITHER.seek(370);
        const c = document.getElementById('bg-dither'), k = c.width / innerWidth, css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
        const crop = (x, y, w, h, W, H) => { const o = document.createElement('canvas'); o.width = W; o.height = H; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = css('--panel-solid') || '#1F2125'; g.fillRect(0, 0, W, H); g.drawImage(c, x * k, y * k, w * k, h * k, 0, 0, W, H); return o.toDataURL('image/png'); };
        const mark = new Image(); mark.src = '/brand/logo/seed-mark-muted.svg'; await mark.decode();
        const a = document.createElement('canvas'); a.width = a.height = 1600; const g = a.getContext('2d');
        g.fillStyle = css('--bg') || '#16171A'; g.fillRect(0, 0, 1600, 1600); g.drawImage(mark, 304, 304, 992, 992);   // the mark 62% of the square, as the app icon sets it
        return { banner: crop(innerWidth - 1500, innerHeight - 500, 1500, 500, 6000, 2000), art: a.toDataURL('image/png') };
      });
      fs.mkdirSync(path.join(proj, 'site/assets/film'), { recursive: true });
      for (const [k, v] of Object.entries(shots)) fs.writeFileSync(path.join(proj, 'site/assets/film', k + '.png'), Buffer.from(v.split(',')[1], 'base64'));
    }
    const dir = path.join(proj, 'site/pages', fk);
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    index[fk] = { window: [W, H], states: {} };
    let walletOn = false;
    for (const b of beats(fk)) {
      await page.evaluate(t => window.__setNow(t), b.now);
      if (b.wallet !== undefined && b.wallet !== walletOn) {
        if (b.wallet) await page.evaluate(() => connectWith('demo')); else await page.evaluate(() => dropWallet());
        walletOn = b.wallet; await sleep(700);
        await page.evaluate(() => { document.querySelectorAll('#toasts > *').forEach(t => t.remove()); });
      }
      if (b.launch) {
        /* this is the wallet's first raise: the demo's own "Yours" raise (Tidewater) is not its, so "Your raises" is empty,
           as the founder card's "This is the first" says */
        await page.evaluate(() => { if (!window.__hm) window.__hm = find('halfmoon'); state.presales = state.presales.filter(p => p.id !== 'halfmoon'); state.presales.forEach(p => { p.mine = false; }); });
        await page.evaluate(h => { if (location.hash !== h) location.hash = h; }, b.page); await sleep(900);
        await page.evaluate(L => {
          const set = (sel, v) => { const e = document.querySelector(sel); if (!e) return; e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
          set('#fName', L.name); set('#fTicker', L.ticker);
          const cap = document.querySelector(`#capSeg button[data-v="${L.cap}"]`); if (cap) cap.click();
          if (L.deadline) { const btn = [...document.querySelectorAll('#timeSeg button')].find(x => x.textContent.trim() === L.deadline); if (btn) btn.click(); }
          /* the founder has given the raise its art and banner (the form's own upload slots), so the preview is not the
             site's pastel stand-in glyph */
          lf.urls.art = 'brand/launch-video/site/assets/film/art.png'; lf.urls.banner = 'brand/launch-video/site/assets/film/banner.png';
          renderPreview();
          const s2 = document.querySelector('[data-step="2"]'); if (s2) s2.click();
        }, b.launch);
        await sleep(900);
      } else {
        await page.evaluate(h => { if (location.hash !== h) location.hash = h; }, b.page); await sleep(700);
        await page.evaluate((o, R) => { if (window.__hm && !state.presales.includes(window.__hm)) state.presales.push(window.__hm); setRaise(Object.assign({ t0: R.t0, window: R.window, target: R.target, targetUsd: R.targetUsd, cap: R.cap, teamBps: R.teamBps, name: R.name, ticker: R.ticker, about: R.about, banner: 'brand/launch-video/site/assets/film/banner.png', art: 'brand/launch-video/site/assets/film/art.png' }, o)); renderDetail(true); if (typeof renderStatChips === 'function') renderStatChips(); }, b.raise, R).catch(e => { throw new Error(b.name + ': ' + e.message); });
        await sleep(1400);
      }
      if (b.focus) await page.evaluate(q => { const e = document.querySelector(q); if (e) e.focus({ preventScroll: true }); }, b.focus);
      if (b.blur) await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });   // a click on the deadline takes the field's focus
      if (b.then) await page.evaluate(b.then);
      await page.evaluate(() => { document.querySelectorAll('#toasts > *').forEach(t => t.remove()); });
      const g = await page.evaluate(grab);
      fs.writeFileSync(path.join(dir, b.name + '.html'), g.html + '\n');
      index[fk].states[b.name] = { body: g.body, root: g.root, scrollY: g.scrollY, docH: g.docH, bytes: g.html.length };
      if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, `${fk}-${b.name}.png`) });
    }
    fs.writeFileSync(path.join(proj, `site/flat-${fk}.css`), await page.evaluate(flatten) + '\n');
    await page.close();
  }
} finally { await browser.close(); server.close(); }

/* the files the captured pages point at (art, banners, icons), copied beside the film under site/ */
const refs = new Set();
for (const fk of Object.keys(index)) for (const f of fs.readdirSync(path.join(proj, 'site/pages', fk))) {
  const html = fs.readFileSync(path.join(proj, 'site/pages', fk, f), 'utf8');
  for (const m of html.matchAll(/(?:src|href)="site\/((?:assets|brand)\/[^"#?]+)"/g)) refs.add(m[1]);
}
for (const fk of Object.keys(index)) for (const m of fs.readFileSync(path.join(proj, `site/flat-${fk}.css`), 'utf8').matchAll(/url\("?((?:assets|brand|img)\/[^")#?]+)"?\)/g)) refs.add(m[1]);
for (const r of refs) { const s = path.join(repo, r), d = path.join(proj, 'site', r); if (fs.existsSync(s)) { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(s, d); } }
const prev = fs.existsSync(path.join(proj, 'site/pages/pages.json')) ? JSON.parse(fs.readFileSync(path.join(proj, 'site/pages/pages.json'), 'utf8')) : {};
fs.writeFileSync(path.join(proj, 'site/pages/pages.json'), JSON.stringify(Object.assign(prev, index), null, 1) + '\n');
for (const [fk, v] of Object.entries(index)) console.log(fk, Object.entries(v.states).map(([k, s]) => `${k} ${(s.bytes / 1024).toFixed(0)}K`).join(', '));
console.log('assets:', [...refs].join(', ') || 'none');
