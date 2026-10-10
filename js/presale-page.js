/* ==========================================================================
   PROJECT PAGE (#/presale/<id>[/<tab>]). A raise's full page, dark and the full width of the window, in three columns:
   the project on the left (identity, stats, chat), the raise in the middle (fill and pace, raise chart, tabs) and
   the rail on the right (buy, your position). After seeding it becomes a trading view; after a miss it
   shows the refund. Reads go through the adapters in js/adapters; values from demo data carry the "Demo data" pill.
   renderDetail() draws it, patchDetail(p) updates live numbers in place, tickDetail() runs the countdowns.
   ========================================================================== */
/* charts draw at the width of their column, one unit to the pixel, so their labels keep their size however wide the window is */
const chartW = () => { const b = detailBox && $('[data-dchart],[data-candles]', detailBox), w = b ? Math.floor(b.clientWidth) : 0; return w > 0 ? Math.max(320, w) : innerWidth < 720 ? 400 : 720; };
const PTABS = ['overview', 'deck', 'team', 'tokenomics', 'backers', 'risk', 'announcements'];
const PTAB_ALIAS = { updates: 'announcements' };   // the tab's earlier name, so old links still open it
const pg = { id: null, status: null, tab: 'overview', tf: '1h', mode: 'price', side: 'buy', allBackers: false, deck: null, deckPage: 1, walletKey: '' };

const ICONS = {
  web: '<svg class="line" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.9 4.3l-3.2 15.1c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13.1l-4.8-1.5c-1-.3-1.1-1 .2-1.5L20.5 2.8c.9-.3 1.7.2 1.4 1.5z"/></svg>',
  discord: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.3 18.3 0 0 0-5.5 0L8.7 3a19.7 19.7 0 0 0-4.9 1.4C.6 9-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2a13 13 0 0 1-1.9-.9l.4-.3a14.2 14.2 0 0 0 12.1 0l.4.3-1.9.9 1.2 2a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.4-13.7zM8 15.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.5 8 10.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/></svg>',
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2.2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21H9z"/></svg>',
  copy: '<svg class="line" viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="2"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg>',
  out: '<svg class="line" viewBox="0 0 16 16" aria-hidden="true"><path d="M9 3h4v4M13 3L7 9M12 9.5V13H3V4h3.5"/></svg>'
};
const SOCIALS = [['website', 'Website', 'web'], ['x', 'X', 'x'], ['telegram', 'Telegram', 'telegram'], ['discord', 'Discord', 'discord'], ['github', 'GitHub', 'github']];
const hostOf = u => { try { return new URL(u).host.replace(/^www\./, '') + new URL(u).pathname.replace(/\/$/, ''); } catch (e) { return u; } };
const safeUrl = u => /^https?:\/\//i.test(String(u || '')) ? String(u) : '';

/* ---------------------------------------------------------------- helpers */
function md(s) {
  if (!s) return '';
  if (window.marked && window.DOMPurify) return DOMPurify.sanitize(marked.parse(String(s), { breaks: false, gfm: true }), { ADD_ATTR: ['target'] });
  return String(s).split(/\n{2,}/).map(x => `<p>${esc(x)}</p>`).join('');
}
function fmtHours(h) { if (!isFinite(h)) return 'never'; if (h < 1) return Math.max(1, Math.round(h * 60)) + 'm'; if (h < 72) return Math.round(h) + 'h'; const d = Math.floor(h / 24); return `${d}d ${Math.round(h - d * 24)}h`; }
function fmtUsd(n) { const a = Math.abs(n); return '$' + (a >= 1e9 ? trim2(n / 1e9) + 'B' : a >= 1e6 ? trim2(n / 1e6) + 'M' : a >= 1e4 ? trim2(n / 1e3) + 'K' : a >= 1 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : fmtPrice(n)); }
const raisedAt = (p, t) => { let v = 0; for (const b of p.buys || []) if (b.at <= t) v += b.amount; return v; };
/* the fill pace: how fast the last 6 hours raised, and whether that pace fills the raise before the deadline */
function paceInfo(p) {
  const now = Date.now(), win = Math.min(6, Math.max(0.25, (now - p.openedAt) / H)), rate = (p.raised - raisedAt(p, now - win * H)) / win, left = leftOf(p), hLeft = (p.endsAt - now) / H;
  if (p.status !== 'live') return { state: p.status, text: '' };
  if (left <= 0) return { state: 'on', rate, text: 'Filled.' };
  if (rate <= 0) return { state: 'behind', rate: 0, text: `No buys in the last ${win === 6 ? '6h' : fmtHours(win)}. Deadline in ${fmtHours(hLeft)}.` };
  const fillH = left / rate;
  if (fillH > 24 * 365) return { state: 'behind', rate, fillH, text: `Buys in the last ${win === 6 ? '6h' : fmtHours(win)} are too small to fill this. Deadline in ${fmtHours(hLeft)}.` };   // a trickle: the time to fill is not a useful number
  return { state: fillH <= hLeft ? 'on' : 'behind', rate, fillH, text: `At the last ${win === 6 ? '6h' : fmtHours(win)} pace this fills in ${fmtHours(fillH)}. Deadline in ${fmtHours(hLeft)}.` };
}
const paceChip = pi => pi.state === 'on' ? '<span class="pace-chip on">On pace</span>' : pi.state === 'behind' ? '<span class="pace-chip behind">Behind pace</span>' : '';
function roleOf(p, w) {
  if (!w) return null;
  const pr = profileOf(p), f = pr.founder || {};
  if ((f.wallet && (w === f.wallet)) || (p.mine && p.creator && w === p.creator)) return 'founder';
  if ((pr.team || []).some(m => m.wallet && m.wallet === w)) return 'team';
  return null;
}
const artHTML = (p, cls) => { const pr = profileOf(p); return pr.art ? `<img class="${cls}" src="${esc(pr.art)}" alt="" style="object-position:${esc(pr.artPos || '50% 50%')}">` : `<span class="${cls} glyph-art" style="--h:${hashStr(p.ticker) % 360}"><svg viewBox="0 0 24 24" aria-hidden="true">${glyph(p)}</svg></span>`; };
const copyBtn = (val, label, text) => `<button class="copy" data-copy="${esc(val)}" data-copy-label="${esc(label)}" aria-label="Copy ${esc(label)}">${text ? `<span class="num">${esc(text)}</span>` : ''}${ICONS.copy}</button>`;
const statusPill = p => `<span class="st-pill ${p.status}">${p.blacklisted ? 'Flagged' : RAISE_STATE[p.status]}</span>`;
const initials = n => String(n || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();

/* ---------------------------------------------------------------- header */
function ppHeader(p) {
  const pr = profileOf(p), C = Q(p), risk = riskSummary(riskChecks(p));
  const socials = SOCIALS.filter(s => safeUrl(pr.links && pr.links[s[0]])).map(s => `<a class="soc" href="${esc(safeUrl(pr.links[s[0]]))}" target="_blank" rel="noopener" aria-label="${s[1]}" title="${s[1]}">${ICONS[s[2]]}</a>`).join('');
  return `<section class="panel pp-id">
      <div class="pp-banner">${pr.banner ? `<img class="pp-bg" src="${esc(pr.banner)}" alt="" style="object-position:${esc(pr.bannerPos || '50% 50%')}">` : ''}<a class="back" href="#">&larr; All raises</a></div>
      <div class="pp-idrow">${artHTML(p, 'pp-art')}${statusPill(p)}</div>
      <div class="pp-name"><h1>${esc(p.name)}</h1><span class="pp-tk num">$${esc(p.ticker)}</span></div>
      <p class="pp-tagline">${esc(pr.tagline || p.idea)}</p>
      <div class="pp-pills"><span class="pair-pill${C.verified ? '' : ' unv'}">${esc(C.sym)} pair</span><a href="#/presale/${esc(p.id)}/risk" data-jump-risk>${riskChip(risk)}</a>${p.mine ? '<span class="tag">Yours</span>' : ''}${pr.demo ? DEMO_PILL : ''}</div>
      ${pr.mint || socials ? `<div class="pp-meta">${pr.mint ? copyBtn(pr.mint, 'mint address', shortMint(pr.mint)) : ''}<span class="pp-socials">${socials}</span></div>` : ''}
      <dl class="pp-stats" data-pstats>${ppStats(p)}</dl>
    </section>`;
}
function ppStats(p) {
  const C = Q(p), sym = esc(C.sym), pr = profileOf(p), st = (k, v, cls = '') => `<div class="${cls}"><dt>${k}</dt><dd class="num">${v}</dd></div>`;
  if (p.status === 'seeded') {
    const pool = pg.pool && pg.pool.value;
    return st('Raised', `${fmtC(p.raised, p.q, true)} <em>/ ${fmtC(p.target, p.q)} ${sym}</em>`) + st('Raise price', `${fmtPrice(priceOf(p))} ${sym}`) +
      st(`Price${pg.pool && pg.pool.from === 'standin' ? ' <span class="st-mini">stand-in</span>' : ''}`, pool ? (pool.quote === 'USD' ? fmtUsd(pool.price) : `${fmtPrice(pool.price)} ${esc(pool.quote)}`) : '…') + st(`Market cap${pg.pool && pg.pool.from === 'standin' ? ' <span class="st-mini">stand-in</span>' : ''}`, pool ? (pool.quote === 'USD' ? fmtUsd(pool.mcap) : `${fmtC(pool.mcap, p.q)} ${esc(pool.quote)}`) : '…') +
      st('Backers', p.backers) + st('Seeded', fmtDay(p.resolvedAt));
  }
  if (p.status === 'refunded') {
    const rows = backersAdapter.rows(p), claimed = rows.filter(r => r.refundClaimed).length;
    return st('Final raise', `${fmtC(p.raised, p.q, true)} <em>/ ${fmtC(p.target, p.q)} ${sym}</em>`) + st('Filled', Math.floor(pctOf(p) + 1e-7) + '%') + st('Backers', p.backers) +
      st('Refunds claimed', `${claimed} <em>/ ${rows.length}</em>`) + st('Fixed price', `${fmtPrice(priceOf(p))} ${sym}`) + st('Closed', fmtDay(p.resolvedAt || p.endsAt));
  }
  return st('Raised', `<span data-sraised>${fmtC(p.raised, p.q, true)}</span> <em>/ ${fmtC(p.target, p.q)} ${sym}</em>`) + st('Filled', `<span data-spct>${Math.floor(pctOf(p) + 1e-7)}%</span>`) +
    st('Backers', `<span data-sbackers>${p.backers}</span>`) + st('Fixed price', `${fmtPrice(priceOf(p))} ${sym}`) + st('Time left', `<span data-stime>${fmtLeft(p.endsAt - Date.now())}</span>`) +
    st('Watchers', (pr.watchers || Math.round(p.backers * 2.6)).toLocaleString('en-US'));
}

/* ---------------------------------------------------------------- fill, pace and the raise chart */
function ppFill(p) {
  const C = Q(p), pc = pctOf(p), pi = paceInfo(p);
  if (p.status === 'refunded') {
    return `<section class="panel pp-card pp-fill pp-missed"><div class="pp-card-h"><h2>Missed target, refunded</h2></div>
      <div class="readout refunded"><div class="big"><b>${fmtC(p.raised, p.q, true)} <em>/ ${fmtC(p.target, p.q)} ${esc(C.sym)}</em></b><span class="num">${Math.floor(pc + 1e-7)}%</span></div>
      <div class="bar"><i style="width:${pc}%"></i></div><div class="sub"><span>Deadline passed ${fmtDate(p.resolvedAt || p.endsAt)}</span><span>${p.backers} backers</span></div></div>
      <p class="pp-note">No tokens were released and the supply was burned. Every backer can claim back what they paid in ${esc(C.sym)}, the 1% fee included. Refund status for each wallet is on the Backers tab.</p></section>`;
  }
  if (p.status === 'seeded') return ppTrading(p);
  return `<section class="panel pp-card pp-fill" data-fill><div class="pp-card-h"><h2>The raise</h2>${paceChip(pi)}</div>
    <div class="readout live" data-dreadout><div class="big"><b><span data-draised>${fmtC(p.raised, p.q, true)}</span> <em>/ ${fmtC(p.target, p.q)} ${esc(C.sym)}</em></b><span class="num" data-dpct>${Math.floor(pc + 1e-7)}%</span></div>
      <div class="bar"><i data-dbar style="width:${pc}%"></i></div>
      <div class="sub"><span>Ends in <span class="num" data-dtime>${fmtLeft(p.endsAt - Date.now())}</span></span><span><span class="num" data-dbackers>${p.backers}</span> backers</span></div></div>
    <p class="pp-pace" data-pace>${esc(pi.text)}</p></section>`;
}
/* where the raise chart puts a time and an amount; the chart and its hover readout both draw from this */
function raiseGeom(p) {
  const W = chartW(), Hh = W < 720 ? 220 : 300, pt = 20, pb = 28, t0 = p.openedAt, t1 = p.endsAt, live = p.status === 'live', end = live ? Date.now() : (p.resolvedAt || t1);
  const X = t => (Math.min(Math.max(t, t0), t1) - t0) / (t1 - t0) * W, Y = v => pt + (1 - Math.min(v, p.target * 1.02) / p.target) * (Hh - pt - pb);
  return { W, Hh, pt, pb, t0, t1, live, end, X, Y, series: (p.hist || []).filter(h => h[0] <= end).concat([[end, p.raised]]) };
}
function raiseSVG(p) {
  const { W, Hh, pt, t0, t1, live, end, X, Y, series } = raiseGeom(p);
  const pts = series.map(([t, v]) => [X(t), Y(v)]);
  const line = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' '), ex = X(end), ey = Y(p.raised);
  const dead = p.status === 'refunded';   // a refunded raise is drawn muted
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Raised over time: ${Math.floor(pctOf(p) + 1e-7)} percent of target">
    <defs><linearGradient id="raiseFade" gradientUnits="userSpaceOnUse" x1="0" y1="${pt}" x2="0" y2="${Y(0)}"><stop offset="0" stop-color="#5B8CFF" stop-opacity=".3"/><stop offset="1" stop-color="#5B8CFF" stop-opacity="0"/></linearGradient></defs>
    <path class="ar" d="${line} L${ex.toFixed(1)} ${Y(0)} L0 ${Y(0)} Z" ${dead ? 'style="fill:var(--navy-soft);fill-opacity:.12"' : 'fill="url(#raiseFade)"'}/>
    <path d="M0 ${Y(p.target)}H${W}" style="stroke:var(--ink)" stroke-width="1" stroke-dasharray="2 4" opacity=".4"/>
    <path d="M0 ${Y(0)}H${W}" style="stroke:var(--hair-2)" stroke-width="1"/>
    ${live ? `<path d="M${ex.toFixed(1)} ${ey.toFixed(1)}L${W} ${Y(p.target)}" style="stroke:var(--navy-soft)" stroke-width="1.5" stroke-dasharray="4 4" fill="none"/>` : ''}
    <path class="ln" pathLength="1" d="${line}" fill="none" style="stroke:var(${dead ? '--navy-soft' : '--navy'})" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle class="tip" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="4.5" style="fill:var(--ink);stroke:var(--panel-solid)" stroke-width="2.5"/>
    <g font-family="JetBrains Mono, monospace" font-size="12" style="fill:var(--muted)"><text x="0" y="${Hh - 6}">Opened ${fmtDay(t0)}</text><text x="${W}" y="${Hh - 6}" text-anchor="end">Deadline ${fmtDay(t1)}</text><text x="${W}" y="${Y(p.target) - 7}" text-anchor="end">Target ${fmtC(p.target, p.q)}</text></g></svg>`;
}
function buysSVG(p) {
  const W = chartW(), Hh = 88, base = Hh - 22, t0 = p.openedAt, t1 = p.endsAt, n = Math.max(1, Math.ceil((t1 - t0) / H)), c = new Array(n).fill(0);
  for (const b of p.buys || []) { const i = Math.floor((b.at - t0) / H); if (i >= 0 && i < n) c[i]++; }
  const mx = Math.max(1, ...c), bw = W / n;
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Buys per hour, at most ${mx} in one hour">${c.map((v, i) => v ? `<rect x="${(i * bw + bw * 0.15).toFixed(1)}" y="${(base - v / mx * (base - 4)).toFixed(1)}" width="${Math.max(1, bw * 0.7).toFixed(1)}" height="${(v / mx * (base - 4)).toFixed(1)}" rx="1.5" style="fill:var(--navy-soft);--i:${i}"/>` : '').join('')}
    <path d="M0 ${base}H${W}" style="stroke:var(--hair-2)"/><g font-family="JetBrains Mono, monospace" font-size="12" style="fill:var(--muted)"><text x="0" y="${Hh - 4}">Buys per hour</text><text x="${W}" y="${Hh - 4}" text-anchor="end">Peak ${Math.max(0, ...c)}</text></g></svg>`;
}
function ppChart(p) {
  return `<section class="panel pp-card pp-chart" data-chartcard><div class="pp-card-h"><h2>${p.status === 'seeded' ? 'How it raised' : 'Raised over time'}</h2><span class="legend"><span><i></i>Raised</span>${p.status === 'live' ? '<span><i class="dash"></i>Straight line to target</span>' : ''}<span><i class="bars"></i>Buys per hour</span></span></div>
    <div class="pp-plot" data-plot><div class="pp-svg" data-dchart></div><div class="cx" data-cross aria-hidden="true"><i class="cx-line"></i><i class="cx-dot"></i><span class="cx-tip num"></span></div></div>
    <div class="pp-svg bars" data-dbars></div></section>`;
}

/* ---------------------------------------------------------------- seeded: trading view */
function ppTrading(p) {
  return `<section class="panel pp-card pp-fill" data-trading><div class="pp-card-h"><h2>${pg.mode === 'mcap' ? 'Market cap' : 'Price'}</h2>
      <div class="pp-tools"><div class="seg mini-seg" data-mode>${['price', 'mcap'].map(m => `<button data-v="${m}" aria-pressed="${pg.mode === m}">${m === 'price' ? 'Price' : 'MCap'}</button>`).join('')}</div>
      <div class="seg mini-seg" data-tf>${Object.keys(TIMEFRAMES).map(t => `<button data-v="${t}" aria-pressed="${pg.tf === t}">${t}</button>`).join('')}</div></div></div>
    <div class="pp-plot" data-cplot><div class="pp-svg candles" data-candles><div class="pp-loading">Loading the pool…</div></div>
      <div class="cx" data-ccross aria-hidden="true"><i class="cx-line"></i><i class="cx-hline"></i><span class="cx-tag num"></span><span class="cx-read num"></span></div></div>
    <div class="pool-card" data-poolcard></div></section>`;
}
/* Candles, drawn at the column's width: price gridlines labelled on the right, the last price tagged on that axis, times along
   the foot, volume under the candles. pg.cg keeps the geometry so candleHover() can read any candle back. */
const CANDLE_UP = '#2FBF7A', CANDLE_DN = '#F0554B';
function candleSVG(series, mode, supply, quote) {
  pg.cg = null;
  if (!series.length) return '<div class="pp-loading">No trades in this window.</div>';
  const W = chartW(), Hh = W < 720 ? 300 : 400, pr = 76, pt = 12, pb = 28, vH = 48, k = mode === 'mcap' ? supply : 1, n = series.length;
  const hi = Math.max(...series.map(c => c[2] * k)), lo = Math.min(...series.map(c => c[3] * k)), span = (hi - lo) || hi * 0.01 || 1, priceH = Hh - pt - pb - vH;
  const Y = v => pt + (1 - (v - lo) / span) * priceH, vmax = Math.max(...series.map(c => c[5])) || 1, cw = (W - pr) / n;
  const f = v => quote === 'USD' ? fmtUsd(v) : fmtPrice(v);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(q => lo + span * q), last = series[n - 1], lastV = last[4] * k, lastUp = last[4] >= last[1];
  const xt = W < 520 ? [0, n - 1] : [0, Math.round((n - 1) / 3), Math.round((n - 1) * 2 / 3), n - 1];
  pg.cg = { W, Hh, pr, pt, pb, vH, priceH, lo, span, k, cw, n, series, f };
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${mode === 'mcap' ? 'Market cap' : 'Price'} candles, last ${f(lastV)}">
    ${ticks.map(v => `<path d="M0 ${Y(v).toFixed(1)}H${W - pr}" style="stroke:var(--hair)"/>${Math.abs(Y(v) - Y(lastV)) < 15 ? '' : `<text x="${W - pr + 8}" y="${(Y(v) + 4).toFixed(1)}" font-family="JetBrains Mono, monospace" font-size="12" style="fill:var(--muted)">${f(v)}</text>`}`).join('')}
    ${series.map((c, i) => { const x = i * cw + cw / 2, up = c[4] >= c[1], col = up ? CANDLE_UP : CANDLE_DN, yo = Y(c[1] * k), yc = Y(c[4] * k), vh = c[5] / vmax * (vH - 6);
      return `<path d="M${x.toFixed(1)} ${Y(c[2] * k).toFixed(1)}V${Y(c[3] * k).toFixed(1)}" stroke="${col}" stroke-width="1"/><rect x="${(x - cw * 0.35).toFixed(1)}" y="${Math.min(yo, yc).toFixed(1)}" width="${Math.max(1, cw * 0.7).toFixed(1)}" height="${Math.max(1, Math.abs(yc - yo)).toFixed(1)}" fill="${col}" rx=".5"/>
        <rect x="${(x - cw * 0.35).toFixed(1)}" y="${(Hh - pb - vh).toFixed(1)}" width="${Math.max(1, cw * 0.7).toFixed(1)}" height="${vh.toFixed(1)}" fill="${col}" opacity=".28"/>`; }).join('')}
    <path d="M0 ${Y(lastV).toFixed(1)}H${W - pr}" stroke="${lastUp ? CANDLE_UP : CANDLE_DN}" stroke-width="1" stroke-dasharray="2 4" opacity=".7"/>
    <rect x="${W - pr + 3}" y="${(Y(lastV) - 11).toFixed(1)}" width="${pr - 3}" height="22" rx="7" fill="${lastUp ? CANDLE_UP : CANDLE_DN}"/>
    <text x="${W - pr + 8}" y="${(Y(lastV) + 4).toFixed(1)}" font-family="JetBrains Mono, monospace" font-size="12" font-weight="500" fill="#10151A">${f(lastV)}</text>
    <g font-family="JetBrains Mono, monospace" font-size="12" style="fill:var(--muted)">${xt.map((i, j) => `<text x="${(i * cw + cw / 2).toFixed(1)}" y="${Hh - 6}" text-anchor="${j === 0 ? 'start' : j === xt.length - 1 ? 'end' : 'middle'}">${fmtDate(series[i][0])}</text>`).join('')}</g></svg>`;
}
/* hovering (or pressing, on a touch screen) the candles reads one back: a crosshair, the price at the pointer tagged on the axis,
   and the candle's open, high, low, close and volume along the top */
function candleHover(plot, e) {
  const cx = detailBox && $('[data-ccross]', detailBox), g = pg.cg; if (!cx) return;
  if (!plot || !g) return cx.classList.remove('on');
  const r = plot.getBoundingClientRect(), k = r.width / g.W, x = (e.clientX - r.left) / k, y = Math.min(Math.max((e.clientY - r.top) / k, g.pt), g.pt + g.priceH);
  const i = Math.min(g.n - 1, Math.max(0, Math.floor(x / g.cw))), c = g.series[i], px = (i * g.cw + g.cw / 2) * k, up = c[4] >= c[1], tag = $('.cx-tag', cx), read = $('.cx-read', cx);
  $('.cx-line', cx).style.cssText = `left:${px.toFixed(1)}px;top:${(g.pt * k).toFixed(1)}px;height:${((g.Hh - g.pt - g.pb) * k).toFixed(1)}px`;
  $('.cx-hline', cx).style.cssText = `top:${(y * k).toFixed(1)}px;width:${((g.W - g.pr) * k).toFixed(1)}px`;
  tag.textContent = g.f(g.lo + g.span * (1 - (y - g.pt) / g.priceH)); tag.style.cssText = `top:${(y * k).toFixed(1)}px;left:${((g.W - g.pr + 3) * k).toFixed(1)}px`;
  read.innerHTML = `<b>${esc(fmtDate(c[0]))}</b> O <i>${g.f(c[1] * g.k)}</i> H <i>${g.f(c[2] * g.k)}</i> L <i>${g.f(c[3] * g.k)}</i> C <i class="${up ? 'up' : 'down'}">${g.f(c[4] * g.k)}</i> <span class="${up ? 'up' : 'down'}">${c[1] ? ((c[4] / c[1] - 1) * 100 >= 0 ? '+' : '') + ((c[4] / c[1] - 1) * 100).toFixed(2) + '%' : ''}</span>`;
  cx.classList.add('on');
}
async function loadTrading(p) {
  const box = detailBox && $('[data-candles]', detailBox), card = detailBox && $('[data-poolcard]', detailBox); if (!box) return;
  try {
    const pool = pg.pool = await presaleAdapter.pool(p), ser = await presaleAdapter.candles(p, pg.tf);
    if (ui.sel !== p.id) return;
    pg.series = ser.value; box.innerHTML = candleSVG(ser.value, pg.mode, pool.value.supply, pool.value.quote);
    const v = pool.value;
    card.innerHTML = `<div class="pool-grid"><div><dt>Pair</dt><dd>${esc(v.pair)}</dd></div><div><dt>Liquidity</dt><dd class="num">${v.quote === 'USD' ? fmtUsd(v.liquidity) : `${fmtC(v.liquidity, p.q)} ${esc(v.quote)}`}</dd></div>
      <div><dt>24h</dt><dd class="num ${v.change24h >= 0 ? 'up' : 'down'}">${v.change24h >= 0 ? '+' : ''}${v.change24h.toFixed(2)}%</dd></div><div><dt>24h volume</dt><dd class="num">${v.quote === 'USD' ? fmtUsd(v.volume24h) : fmtC(v.volume24h, p.q)}</dd></div></div>
      <div class="pool-foot"><span class="num">${esc(v.dex)} pool ${esc(shortMint(v.address))}</span>${copyBtn(v.address, 'pool address')}
        <a class="bar-link" href="${esc(isRealAddr(v.address) ? solscan(v.address) : v.url)}" target="_blank" rel="noopener">Locked LP proof ${ICONS.out}</a>${srcPill(pool.from)}</div>
      `;
    const ps = detailBox && $('[data-pstats]', detailBox); if (ps) ps.innerHTML = ppStats(p);
    if (pg.syncTrade) pg.syncTrade();
  } catch (e) { box.innerHTML = `<div class="pp-loading">The pool could not be loaded (${esc(e.message)}). It retries in a minute.</div>`; }
}

/* ---------------------------------------------------------------- right rail */
/* The trade panel. A live raise only takes deposits: there is nothing to sell until it seeds, and a deposit comes back in full if
   the raise misses. A seeded token is bought and sold here against its pool. Both go through index.html (executeBuy, executeSwap),
   which simulate on the demo wallet and refuse a real one until the Seed program exists. bindRail() wires the panel. */
function tradePanel(p) { return p.status === 'live' ? depositPanel(p) : p.status === 'seeded' ? swapPanel(p) : p.status === 'filled' ? seedingPanel(p) : ''; }
/* a filled raise: the steps of seeding, and the timeout that refunds everyone if they do not all land */
function seedingPanel(p) {
  const i = SEED_STEPS.indexOf(p.seedStep || 'filled'), names = ['Target reached', 'Token minted, authorities revoked', 'Pool opened and locked', 'Seeded'];
  return `<section class="panel rail-card" data-seeding><h3>Seeding $${esc(p.ticker)}</h3>
    <ol class="seed-steps">${SEED_STEPS.map((k, j) => `<li class="${j < i ? 'done' : j === i ? 'now' : ''}"><span class="num">${j + 1}</span>${names[j]}</li>`).join('')}</ol>
    <p class="rail-meta">Anyone can run the next step. If seeding has not finished by ${fmtDate(seedDeadline(p))}, every backer claims a refund instead.</p>
    <button class="btn btn-navy btn-block" data-crank>Run the next step</button></section>`;
}
function depositPanel(p) {
  const C = Q(p), sym = esc(C.sym), pr = profileOf(p), amt = Math.min(quickFor(p), payLeft(p));
  return `<section class="panel rail-card" data-trade="deposit"><h3>Deposit into $${esc(p.ticker)}</h3>
    <div class="trade-top"><label class="rail-lab" for="ppAmt">You deposit</label><span class="rail-bal num" data-bal></span></div>
    <div class="inp"><input id="ppAmt" inputmode="decimal" autocomplete="off" value="${amt}" aria-label="Amount in ${sym}"><span class="suf">${sym}</span></div>
    <div class="chips">${chipsFor(p).map(c => `<button type="button" data-chip="${c}">${fmtC(c, p.q)}</button>`).join('')}<button type="button" data-chip="max">Max</button></div>
    <div class="recv"><span>You receive if it seeds</span><b class="num" data-recv></b></div>
    <p class="rail-meta num">${pr.minBuy ? `Min ${fmtC(pr.minBuy, p.q)} ${sym}` : 'No minimum'} · ${pr.maxBuy ? `Max ${fmtC(pr.maxBuy, p.q)} ${sym} per wallet` : 'No maximum per wallet'}</p>
    <p class="rail-err" data-buyerr role="alert"></p>
    <button type="button" class="btn btn-navy btn-block" data-go>Deposit</button>
    <p class="rail-meta">A raise only takes deposits: there is nothing to sell until it seeds. If it misses its target, you claim back everything you put in.</p>
    <p class="rail-cap">Simulated on the demo wallet. No transaction is sent.</p></section>`;
}
function swapPanel(p) {
  const side = pg.side === 'sell' ? 'sell' : 'buy', pool = profileOf(p).pool, standin = !!(pool && isRealAddr(pool.address));
  return `<section class="panel rail-card" data-trade="swap"><div class="rail-h"><h3>Trade $${esc(p.ticker)}</h3>${DEMO_PILL}</div>
    <div class="seg mini-seg side-seg" data-side role="group" aria-label="Buy or sell">${['buy', 'sell'].map(v => `<button type="button" data-v="${v}" aria-pressed="${side === v}">${v === 'buy' ? 'Buy' : 'Sell'}</button>`).join('')}</div>
    <div class="trade-top"><label class="rail-lab" for="ppAmt">You pay</label><span class="rail-bal num" data-bal></span></div>
    <div class="inp"><input id="ppAmt" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="Amount to pay"><span class="suf" data-paysym></span></div>
    <div class="chips" data-tchips></div>
    <div class="recv"><span>You receive</span><b class="num" data-recv></b></div>
    <dl class="kv"><div><dt>Price</dt><dd data-tprice></dd></div><div><dt>Price impact</dt><dd data-timpact></dd></div></dl>
    <p class="rail-err" data-buyerr role="alert"></p>
    <button type="button" class="btn btn-navy btn-block" data-go>Buy</button>
    <p class="rail-cap">Simulated pool, on the demo wallet. No transaction is sent.</p>
    ${standin ? `<p class="standin-note">In-app trades run against a simulated $${esc(p.ticker)} pool that opened at the raise price. The chart and the pool figures beside it are the stand-in pool’s.</p>` : ''}</section>`;
}
function positionPanel(p) {
  if (!state.wallet) return '';
  const C = Q(p), sym = esc(C.sym), pos = state.positions[p.id] || 0, claimed = state.claimed[p.id];
  const held = p.status === 'seeded' ? heldOf(p) : 0, row = (k, v) => `<div><dt>${k}</dt><dd class="num">${v}</dd></div>`;
  const holding = held ? row('You hold', `${fmtTok(held)} $${esc(p.ticker)}`) + row('Worth', `${fmtAmt(held * spotOf(p), p.q)} ${sym}`) : '';
  if (!pos) return `<section class="panel rail-card" data-position><h3>Your position</h3>${holding ? `<dl class="kv">${holding}</dl>` : `<p class="rail-meta">${esc(state.wallet.addr)} has not backed ${esc(p.name)}.</p>`}</section>`;
  const tok = tokensFor(p, pos), share = pos / (p.raised || 1) * 100;
  let act = '';
  if (p.status === 'refunded') act = claimed ? `<div class="mine"><span>Refund claimed</span><span class="num">${fmtAmt(pos, p.q)} ${sym}</span></div>` : `<button class="btn btn-navy btn-block" data-dclaim>Claim refund of ${fmtAmt(pos, p.q)} ${sym}</button>`;
  else if (p.status === 'seeded') act = claimed ? `<div class="mine"><span>Claimed</span><span class="num">${fmtTok(tok)} $${esc(p.ticker)}</span></div>` : `<button class="btn btn-navy btn-block" data-dclaim>Claim ${fmtTok(tok)} $${esc(p.ticker)}</button>`;
  return `<section class="panel rail-card" data-position><h3>Your position</h3><dl class="kv">${row('Amount in', `${fmtAmt(pos, p.q)} ${sym}`)}${row(p.status === 'refunded' ? 'Tokens' : 'Tokens owed', p.status === 'refunded' ? 'None, it refunded' : `${fmtTok(tok)} $${esc(p.ticker)}`)}
    ${row('Share of raise', share.toFixed(share < 1 ? 3 : 2) + '%')}${p.status === 'live' ? row('If it refunds', `${fmtAmt(pos, p.q)} ${sym} back`) : ''}${holding}</dl>${act}</section>`;
}
/* the risk checks are a tab under the charts; two columns of checks where the tab is wide enough */
function tabRisk(p) {
  const checks = riskChecks(p), s = riskSummary(checks), demo = checks.some(c => c.from === 'demo');
  return tabHead('Risk checks', '', riskChip(s)) +
    `<ul class="risk-list risk-grid" data-risk>${checks.map(c => `<li class="${c.level}">${RISK_ICON[c.level]}<div><b>${esc(c.label)}</b><span>${esc(c.reason)}</span></div></li>`).join('')}</ul>
    ${demo ? `<p class="quiet risk-note">${DEMO_PILL} Checks run on demo data where no live account exists. Thresholds are in js/config/risk.js.</p>` : ''}`;
}
/* the chat sits under the project card, open beside every tab */
function chatPanel(p) { return typeof chatCard === 'function' ? chatCard(p) : ''; }
function mountChat(p) { const c = detailBox && $('[data-chat]', detailBox); if (c && typeof chatMount === 'function') { pg.chatW = walletId(); chatMount(p, c); } }
function ppRail(p) { return tradePanel(p) + `<div class="pp-pos" data-poswrap>${positionPanel(p)}</div>`; }

/* ---------------------------------------------------------------- tabs */
function tabLabel(p, t) {
  if (t === 'backers') return p.status === 'seeded' ? 'Holders' : 'Backers';
  if (t === 'risk') return 'Risk checks';
  if (t === 'announcements') { const n = updatesAdapter.list(p).length; return `Announcements${n ? ` <span class="ct num">${n}</span>` : ''}`; }
  return t[0].toUpperCase() + t.slice(1);
}
function ppTabs(p) {
  return `<section class="panel pp-tabs"><div class="tabbar" role="tablist" aria-label="${esc(p.name)} sections">${PTABS.map(t => `<a role="tab" href="#/presale/${esc(p.id)}/${t}" data-ptab="${t}" aria-selected="${pg.tab === t}">${tabLabel(p, t)}</a>`).join('')}</div>
    <div class="tabbody" data-tabbody role="tabpanel"></div></section>`;
}
function renderTab(p) {
  const body = detailBox && $('[data-tabbody]', detailBox); if (!body) return;
  $$('[data-ptab]', detailBox).forEach(a => a.setAttribute('aria-selected', String(a.dataset.ptab === pg.tab))); placeTabInd();
  const fn = { overview: tabOverview, deck: tabDeck, team: tabTeam, tokenomics: tabTokenomics, backers: tabBackers, risk: tabRisk, announcements: tabAnnouncements }[pg.tab] || tabOverview;
  body.innerHTML = fn(p); afterTab(p, body);
  const key = p.id + '/' + pg.tab;   // the tab's content eases in when the tab changes, not when it is redrawn in place
  if (pg.shown !== key) { pg.shown = key; body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap'); }
}
const tabHead = (title, from, extra = '') => `<div class="tab-h"><h2>${title}</h2>${from ? srcPill(from) : ''}${extra}</div>`;
const prFrom = p => profileOf(p).demo ? 'demo' : '';

function tabOverview(p) {
  const pr = profileOf(p), today = Date.now();
  const road = (pr.roadmap || []).map(r => { const due = r.dueAt || today + (r.due || 0) * D; return `<li class="${r.status}"><span class="rm-dot">${r.status === 'shipped' ? RISK_ICON.pass : r.status === 'missed' ? RISK_ICON.fail : ''}</span>
      <div><b>${esc(r.title)}</b><span class="num">${r.status === 'shipped' ? 'Shipped' : r.status === 'missed' ? 'Missed' : 'Due'} ${fmtDay(due)}</span>${r.status === 'shipped' && safeUrl(r.proof) ? ` <a href="${esc(safeUrl(r.proof))}" target="_blank" rel="noopener">Proof ${ICONS.out}</a>` : ''}</div></li>`; }).join('');
  const links = SOCIALS.filter(s => safeUrl(pr.links && pr.links[s[0]])).map(s => `<a class="link-card" href="${esc(safeUrl(pr.links[s[0]]))}" target="_blank" rel="noopener">${ICONS[s[2]]}<span><b>${s[1]}</b><span>${esc(hostOf(pr.links[s[0]]))}</span></span></a>`).join('');
  return `<div class="ov"><div class="ov-a">${tabHead('About', prFrom(p))}<div class="md">${md(pr.description) || `<p>${esc(p.idea)}</p>`}</div></div>
    <div class="ov-b"><div class="tab-h sub"><h2>Roadmap</h2></div>${road ? `<ol class="roadmap">${road}</ol>` : '<p class="quiet">No roadmap listed.</p>'}
    <div class="tab-h sub"><h2>Links</h2></div>${links ? `<div class="links">${links}</div>` : '<p class="quiet">No website or socials listed.</p>'}</div></div>`;
}
/* a deck is a PDF (paged through here), an image (shown) or a slide file such as PowerPoint or Keynote (downloaded) */
function deckKindOf(pr) {
  if (pr.deckKind) return pr.deckKind;
  const e = (/\.([a-z0-9]+)(?:[?#]|$)/i.exec(pr.deck || '') || [, ''])[1].toLowerCase();
  return ['png', 'jpg', 'jpeg', 'webp'].includes(e) ? 'image' : ['pptx', 'ppt', 'key', 'odp'].includes(e) ? 'slides' : 'pdf';
}
function tabDeck(p) {
  const pr = profileOf(p);
  if (!pr.deck) return tabHead('Deck', '') + quietEmpty('No deck is attached to this raise.');
  const kind = deckKindOf(pr), dl = label => `<a class="btn btn-ink btn-sm" href="${esc(pr.deck)}" download${pr.deckName ? `="${esc(pr.deckName)}"` : ''}>${label}</a>`;
  if (kind === 'image') return tabHead('Deck', prFrom(p), `<span class="deck-tools">${dl('Download')}</span>`) + `<div class="deck-img"><img src="${esc(pr.deck)}" alt="${esc(p.name)} deck"></div>`;
  if (kind === 'slides') return tabHead('Deck', prFrom(p), `<span class="deck-tools">${dl('Download deck')}</span>`) +
    `<div class="col-empty"><svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><use href="#seed21"/></svg>${pr.deckName ? `<b class="num">${esc(pr.deckName)}</b><br>` : ''}This deck is a slide file, which cannot be shown in the page. Download it to open it.</div>`;
  return tabHead('Deck', prFrom(p), `<span class="deck-tools"><span class="num" data-deckcount>Loading…</span>${dl('Download PDF')}</span>`) +
    `<div class="deck"><div class="deck-thumbs" data-thumbs></div><div class="deck-main"><canvas data-deckcanvas></canvas><div class="deck-nav"><button class="qb" data-deckprev>Previous</button><span class="num" data-deckpg></span><button class="qb" data-decknext>Next</button></div></div></div>`;
}
const quietEmpty = t => `<div class="col-empty"><svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><use href="#seed21"/></svg>${esc(t)}</div>`;
function tabTeam(p) {
  const pr = profileOf(p), team = pr.team || [];
  if (!team.length) return tabHead('Team', '') + quietEmpty('No team is listed for this raise.');
  const badge = (on, t) => on ? `<span class="vbadge">${RISK_ICON.pass}${t}</span>` : '';
  return tabHead('Team', prFrom(p)) + `<div class="team">${team.map(m => { const v = m.verified || {};
    return `<article class="member"><span class="m-av" style="--h:${hashStr(m.name) % 360}">${m.avatar && safeUrl(m.avatar) ? `<img src="${esc(m.avatar)}" alt="">` : initials(m.name)}</span>
      <div class="m-main"><b>${esc(m.name)}</b><span class="m-role">${esc(m.role || '')}</span>
        <div class="m-links">${[['x', 'X'], ['github', 'GitHub'], ['linkedin', 'LinkedIn']].filter(([k]) => safeUrl(m[k])).map(([k, l]) => `<a href="${esc(safeUrl(m[k]))}" target="_blank" rel="noopener">${ICONS[k]}${l}</a>`).join('')}</div>
        <div class="m-badges">${badge(v.x, 'X verified')}${badge(v.github, 'GitHub verified')}${badge(v.domain, 'Domain verified')}</div>
        ${m.wallet ? `<div class="m-wallet"><span class="num">${esc(shortMint(m.wallet))}</span>${copyBtn(m.wallet, 'wallet address')}</div>` : ''}</div></article>`; }).join('')}</div>
    <p class="quiet">A badge appears only for a check that passed.${pr.demo ? ' On demo raises the check results are part of the demo data.' : ' Checks are self-reported until verification is wired up.'}</p>`;
}
const KIND_COL = { presale: '#2E63E7', lp: '#8FB4FF', team: '#D9DCE2', other: '#565B66' };
function donutSVG(allocs) {
  const R = 70, C = 2 * Math.PI * R; let acc = 0;
  return `<svg viewBox="0 0 180 180" class="donut" role="img" aria-label="Token allocation">${allocs.map((a, i) => { const len = a.pct / 100 * C, s = `<circle cx="90" cy="90" r="${R}" fill="none" stroke="${a.color || KIND_COL[a.kind] || KIND_COL.other}" stroke-width="26" stroke-dasharray="${Math.max(0, len - 1.5).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 90 90)"/>`; acc += len; return s; }).join('')}
    <text x="90" y="86" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="15" style="fill:var(--ink)">1B</text><text x="90" y="104" text-anchor="middle" font-size="11" style="fill:var(--muted)">supply</text></svg>`;
}
function tabTokenomics(p) {
  const sp = splitOf(p.teamBps), C = Q(p), u = unlockState(p), al = [{ label: 'Raise backers', kind: 'presale', pct: sp.backers / SUPPLY * 100, tokens: sp.backers }, { label: 'Locked Meteora pool', kind: 'lp', pct: sp.pool / SUPPLY * 100, tokens: sp.pool }].concat(sp.team ? [{ label: 'Team', kind: 'team', pct: sp.team / SUPPLY * 100, tokens: sp.team }] : []);
  return tabHead('Supply', '') +
    `<div class="toke"><div>${donutSVG(al)}</div><table class="dtable alloc"><thead><tr><th>Share</th><th class="r">Of supply</th><th class="r">Tokens</th><th>Unlock</th></tr></thead><tbody>
      ${al.map(a => `<tr><td><i class="sw" style="background:${KIND_COL[a.kind] || KIND_COL.other}"></i>${esc(a.label)}</td><td class="num">${a.pct.toFixed(a.pct % 1 ? 1 : 0)}%</td><td class="num">${fmtTok(a.tokens)}</td>
        <td>${a.kind === 'lp' ? 'Locked for good' : a.kind === 'presale' ? 'Claimable at seeding' : esc(fmtSchedule(p.teamSchedule))}</td></tr>`).join('')}</tbody></table></div>
    <p class="quiet">Backers and the pool get the same number of tokens, which is what opens the pool at the raise price: ${fmtPrice(priceOf(p))} ${esc(C.sym)}. The team share was set by the founder.${sp.team && p.status === 'seeded' ? ` ${fmtTok(u.unlocked)} of the team's ${fmtTok(sp.team)} tokens have unlocked so far.` : ''}</p>`;
}
function tabBackers(p) {
  if (p.status === 'seeded') return tabHead('Holders', '') + '<div data-holders><div class="pp-loading">Loading holders…</div></div>';
  const rows = backersAdapter.rows(p), s = backersAdapter.summary(p, rows), C = Q(p), shown = pg.allBackers ? rows : rows.slice(0, 50), refund = p.status === 'refunded';
  const card = (k, v, lvl, sub) => `<div class="sum ${lvl || ''}"><dt>${k}</dt><dd class="num">${v}</dd>${sub ? `<span>${sub}</span>` : ''}</div>`;
  const tag = t => `<span class="btag ${t}">${{ kol: 'KOL', tracked: 'Tracked', 'repeat-backer': 'Repeat backer' }[t] || esc(t)}</span>`;
  return tabHead('Backers', s.from, ` <span class="quiet">${rows.length} wallets${rows.some(r => isRealAddr(r.wallet)) ? `, the largest ${RISK.liveLookupCap} checked live` : ''}</span>`) +
    `<dl class="sums">${card('Top 10', pctTxt(s.top10), s.top10 > RISK.top10FailPct ? 'fail' : s.top10 > RISK.top10WarnPct ? 'warn' : '', 'of the raise')}${card('Fresh wallets', pctTxt(s.fresh), s.fresh > RISK.freshWarnPct ? 'warn' : '', 'of backers')}
      ${card('Bundled', pctTxt(s.bundled), s.bundled > RISK.bundledWarnPct ? 'warn' : '', s.bundles.length ? `${s.bundles.length} funding wallet${s.bundles.length > 1 ? 's' : ''}` : 'of the raise')}${card('KOL and tracked', s.kol + s.tracked, '', `${s.kol} KOL, ${s.tracked} tracked`)}${card('Repeat Seed backers', s.repeat, '', 'backed an earlier Seed raise')}</dl>
    <div class="tscroll"><table class="dtable backers"><thead><tr><th>Wallet</th><th class="r">Amount</th><th class="r">Of raise</th><th class="r">Time</th><th>Funded by</th><th>Tags</th>${refund ? '<th>Refund</th>' : ''}</tr></thead><tbody>
      ${shown.map(r => `<tr class="${r.you ? 'you' : ''}"><td class="mono">${r.you ? 'You' : esc(walletLabel(r.wallet))}</td><td class="num">${fmtC(r.amount, p.q)} ${esc(C.sym)}</td><td class="num">${r.pct.toFixed(r.pct < 1 ? 2 : 1)}%</td><td class="num">${fmtAgo(Date.now() - r.first)}</td>
        <td>${esc(funderLabel(r.fundedBy))}${r.isFresh ? ' <span class="btag fresh">Fresh</span>' : ''}${s.bundles.some(b => r.fundedBy && b.funder === r.fundedBy.addr) ? ' <span class="btag bundle">Bundle</span>' : ''}</td>
        <td>${r.tags.map(tag).join(' ')}</td>${refund ? `<td>${r.refundClaimed ? 'Claimed' : '<b>Claimable</b>'}</td>` : ''}</tr>`).join('')}</tbody></table></div>
    ${rows.length > shown.length ? `<button class="qb more" data-allbackers>Show all ${rows.length}</button>` : ''}`;
}
async function loadHolders(p) {
  const box = detailBox && $('[data-holders]', detailBox); if (!box) return;
  try {
    const h = await backersAdapter.holders(p);
    box.innerHTML = `<div class="tab-h"><span class="quiet">${h.count ? `${h.count.toLocaleString('en-US')} holders, top ${h.value.length} shown` : `Top ${h.value.length} holders`}</span>${srcPill(h.from)}</div>
      <div class="tscroll"><table class="dtable backers"><thead><tr><th>Wallet</th><th class="r">$${esc(p.ticker)}</th><th class="r">Of supply</th><th>Label</th></tr></thead><tbody>
      ${h.value.map(x => `<tr><td class="mono">${esc(shortMint(x.wallet))}</td><td class="num">${fmtTok(x.amount)}</td><td class="num">${x.pct.toFixed(2)}%</td><td>${esc(x.label || '')}</td></tr>`).join('')}</tbody></table></div>`;
  } catch (e) { box.innerHTML = `<p class="quiet">Holders could not be loaded: ${esc(e.message)}</p>`; }
}
/* Announcements: what the founder and team post for backers, newest first. Anyone can read them; only a founder or team
   wallet of this raise gets the form. */
const ANN_NEW = 2 * D, ANN_STRIP = 7 * D;   // how long a post is marked New, and how long the latest one is shown at the top of the page
const ANN_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6.4v3.2h2.2l5.3 3V3.4l-5.3 3zM12.2 6.2a2.6 2.6 0 0 1 0 3.6M4.9 9.8l.8 3.2h1.9l-.7-2.6"/></svg>';
const canAnnounce = p => !!(roleOf(p, walletId()) || roleOf(p, state.wallet && state.wallet.pk));
function annBy(p, u) {
  const pr = profileOf(p), role = u.wallet ? roleOf(p, u.wallet) : (pr.founder && u.author === pr.founder.name) ? 'founder' : 'team';
  const mine = u.wallet && u.wallet === walletId();
  return `<span class="u-by">${role ? `<span class="role-badge r-${role}">${role === 'founder' ? 'Founder' : 'Team'}</span>` : ''}<span>${mine ? 'You' : esc(u.author || 'Founder')}</span>${u.wallet && typeof xChip === 'function' ? xChip(xAdapter.of(u.wallet)) : ''}</span>`;
}
function tabAnnouncements(p) {
  const list = updatesAdapter.list(p), now = Date.now(), can = canAnnounce(p), open = p.status !== 'refunded';
  const form = can && open ? `<form class="upd-form" data-updform novalidate><label class="upd-lab" for="annT">New announcement</label>
      <input id="annT" name="t" maxlength="80" placeholder="Title" autocomplete="off" required><textarea name="b" rows="4" maxlength="2000" placeholder="What should backers know?" aria-label="Announcement" required></textarea>
      <div class="upd-foot"><span class="quiet">Markdown works: headings, lists, links and bold. <span class="num" data-annct>0 / 2000</span></span><button class="btn btn-navy btn-sm">Post announcement</button></div><div class="err" data-annerr role="alert"></div></form>` : '';
  const who = can ? (open ? '' : 'This raise refunded, so new announcements are closed.') : `Posted by the founder and team of ${esc(p.name)}.`;
  return tabHead('Announcements', prFrom(p), ` <span class="quiet">${list.length ? `${list.length} from the team` : ''}</span>`) + form + (who ? `<p class="quiet ann-who">${who}</p>` : '') +
    (list.length ? `<ol class="updates">${list.map(u => `<li${now - u.postedAt < ANN_NEW ? ' class="new"' : ''}><div class="u-h"><b>${esc(u.title)}</b>${now - u.postedAt < ANN_NEW ? '<span class="ann-new">New</span>' : ''}<span class="num">${fmtAgo(now - u.postedAt)} · ${fmtDate(u.postedAt)}</span></div><div class="md">${md(u.body)}</div>${annBy(p, u)}</li>`).join('')}</ol>`
      : quietEmpty(can && open ? 'Nothing posted yet. Your first announcement shows here and at the top of the page.' : 'The team has not posted an announcement yet.'));
}
/* the latest announcement, at the top of the page for a week after it is posted */
function ppAnnounce(p) {
  const u = updatesAdapter.list(p)[0], now = Date.now();
  if (!u || now - u.postedAt > ANN_STRIP) return '';
  return `<a class="panel pp-ann" href="#/presale/${esc(p.id)}/announcements" data-jump-ann><span class="ann-ico">${ANN_ICON}</span><span class="ann-k">Announcement</span><b>${esc(u.title)}</b><span class="ann-t num">${fmtAgo(now - u.postedAt)}</span><span class="ann-go">Read</span></a>`;
}
function refreshAnnounce(p) { const w = detailBox && $('[data-annwrap]', detailBox); if (w) w.innerHTML = ppAnnounce(p); }
function afterTab(p, body) {
  if (pg.tab === 'deck' && profileOf(p).deck && deckKindOf(profileOf(p)) === 'pdf') loadDeck(p, body);
  if (pg.tab === 'backers' && p.status === 'seeded') loadHolders(p);
  const f = $('[data-updform]', body);
  if (f) {
    const err = $('[data-annerr]', f), ct = $('[data-annct]', f);
    f.oninput = () => { err.textContent = ''; ct.textContent = `${f.b.value.length} / 2000`; };
    f.onsubmit = async e => {
      e.preventDefault(); const t = f.t.value.trim(), b = f.b.value.trim(), btn = $('button', f);
      if (!t) { err.textContent = 'Give the announcement a title.'; f.t.focus(); return; }
      if (!b) { err.textContent = 'Write the announcement.'; f.b.focus(); return; }
      btn.disabled = true;
      try { await updatesAdapter.post(p, t, b); toast('Announcement posted'); renderTab(p); refreshTabLabels(p); refreshAnnounce(p); if (typeof renderTerminal === 'function') renderTerminal(); }
      catch (x) { err.textContent = x.message || 'The announcement was not posted.'; btn.disabled = false; }
    };
  }
  const ab = $('[data-allbackers]', body); if (ab) ab.onclick = () => { pg.allBackers = true; renderTab(p); };
}
function refreshTabLabels(p) { $$('[data-ptab]', detailBox).forEach(a => a.innerHTML = tabLabel(p, a.dataset.ptab)); placeTabInd(); }
/* the underline under the open tab is one element that slides over; it appears in place the first time */
function placeTabInd() {
  const bar = detailBox && $('.tabbar', detailBox), a = bar && $('[data-ptab][aria-selected="true"]', bar); if (!a) return;
  let ind = $('.tab-ind', bar); const first = !ind;
  if (first) { ind = document.createElement('span'); ind.className = 'tab-ind first'; ind.setAttribute('aria-hidden', 'true'); bar.appendChild(ind); }
  ind.style.transform = `translateX(${a.offsetLeft + 9}px)`; ind.style.width = Math.max(0, a.offsetWidth - 18) + 'px';
  if (first) setTimeout(() => ind.classList.remove('first'), 60);   // a timer, not a frame: frames do not run in a background tab
}

/* ---------------------------------------------------------------- deck (pdf.js, loaded on first use) */
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let pdfReady = null;
function loadPdfJs() {
  return pdfReady || (pdfReady = new Promise((ok, no) => { const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js'; s.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; ok(); }; s.onerror = () => { pdfReady = null; no(new Error('pdf.js did not load')); }; document.head.appendChild(s); }));
}
async function loadDeck(p, body) {
  const url = profileOf(p).deck, cnt = $('[data-deckcount]', body);
  try {
    await loadPdfJs();
    if (!pg.deck || pg.deck.url !== url) { pg.deck = { url, doc: await pdfjsLib.getDocument(url).promise }; pg.deckPage = 1; }
    if (!body.isConnected) return;
    const doc = pg.deck.doc; cnt.textContent = `${doc.numPages} pages`;
    const thumbs = $('[data-thumbs]', body);
    for (let i = 1; i <= doc.numPages; i++) {
      const b = document.createElement('button'); b.className = 'thumb'; b.dataset.pg = i; b.setAttribute('aria-label', 'Page ' + i); const c = document.createElement('canvas'); b.appendChild(c); thumbs.appendChild(b);
      b.onclick = () => { pg.deckPage = i; drawDeckPage(body); };
      const page = await doc.getPage(i), vp = page.getViewport({ scale: 1 }), s = 120 / vp.width, v2 = page.getViewport({ scale: s * 2 });
      c.width = v2.width; c.height = v2.height; await page.render({ canvasContext: c.getContext('2d'), viewport: v2 }).promise;
      if (i === 1) drawDeckPage(body);
    }
    $('[data-deckprev]', body).onclick = () => { if (pg.deckPage > 1) { pg.deckPage--; drawDeckPage(body); } };
    $('[data-decknext]', body).onclick = () => { if (pg.deckPage < doc.numPages) { pg.deckPage++; drawDeckPage(body); } };
  } catch (e) { cnt.textContent = ''; $('.deck', body).innerHTML = `<p class="quiet">The deck could not be shown here (${esc(e.message)}). Use Download PDF.</p>`; }
}
async function drawDeckPage(body) {
  const doc = pg.deck.doc, cv = $('[data-deckcanvas]', body); if (!cv) return;
  const page = await doc.getPage(pg.deckPage), wrap = cv.parentElement, w = Math.min(wrap.clientWidth, 900), vp = page.getViewport({ scale: 1 }), dpr = Math.min(devicePixelRatio || 1, 2), v2 = page.getViewport({ scale: w / vp.width * dpr });
  cv.width = v2.width; cv.height = v2.height; cv.style.width = w + 'px'; await page.render({ canvasContext: cv.getContext('2d'), viewport: v2 }).promise;
  $('[data-deckpg]', body).textContent = `${pg.deckPage} / ${doc.numPages}`;
  $$('.thumb', body).forEach(t => t.classList.toggle('on', +t.dataset.pg === pg.deckPage));
}

/* ---------------------------------------------------------------- render, patch, tick */
let detailBox = null;
function renderDetail(force) {
  const box = $('#presalePage'); detailBox = box;
  if (ui.tab !== 'presale') { if (pg.id) { box.innerHTML = ''; pg.id = null; if (typeof chatOff !== 'undefined' && chatOff) { chatOff(); chatOff = null; } } return; }
  const p = find(ui.sel);
  if (!p) { box.innerHTML = '<div class="panel empty">That raise is not in this demo any more. It may have been reset.<br><a href="#">Back to all raises</a></div>'; pg.id = null; return; }
  const want = PTAB_ALIAS[ui.ptab] || ui.ptab, tab = PTABS.includes(want) ? want : 'overview', wkey = (state.wallet ? walletId() : '') + '/' + (state.positions[p.id] || 0) + '/' + !!state.claimed[p.id] + '/' + (p.status === 'seeded' ? heldOf(p) : 0) + '/' + balOf(p.q);
  if (!force && pg.id === p.id && pg.status === p.status) {
    if (pg.tab !== tab) { pg.tab = tab; renderTab(p); }
    if (pg.walletKey !== wkey) { pg.walletKey = wkey; const pw = $('[data-poswrap]', box); if (pw) { pw.innerHTML = positionPanel(p); bindRail(p); } if (pg.tab === 'announcements') renderTab(p); if (pg.chatW !== walletId()) mountChat(p); }
    patchDetail(p); return;
  }
  const fresh = pg.id !== p.id;
  Object.assign(pg, { id: p.id, status: p.status, tab, walletKey: wkey, seen: p.raised, shown: null }); if (fresh) Object.assign(pg, { allBackers: false, deck: null, pool: null, series: null });
  box.innerHTML = `<div class="pp ${p.status}"><aside class="pp-side" aria-label="Project and chat">${ppHeader(p)}${chatPanel(p)}</aside>
    <div class="pp-main"><div class="pp-annw" data-annwrap>${ppAnnounce(p)}</div>${ppFill(p)}${ppChart(p)}${ppTabs(p)}</div><aside class="pp-rail" aria-label="Buy and your position">${ppRail(p)}</aside></div>`;
  bindPage(p); renderTab(p); mountChat(p); drawCharts(p); watchCharts(p); loadAsync(p);
  if (fresh && typeof playEnter === 'function') playEnter();   // the page's cards rise into place and the raise line draws itself
}
/* the charts are drawn again once the page is in the document, and whenever their column changes width */
function drawCharts(p) {
  const s = (k, fn) => { const e = detailBox && $(k, detailBox); if (e) fn(e); };
  s('[data-dchart]', e => e.innerHTML = raiseSVG(p)); s('[data-dbars]', e => e.innerHTML = buysSVG(p));
  s('[data-candles]', e => { if (pg.series && pg.pool) e.innerHTML = candleSVG(pg.series, pg.mode, pg.pool.value.supply, pg.pool.value.quote); });
}
let chartRO = null;
function watchCharts(p) {
  if (chartRO) chartRO.disconnect();
  const el = detailBox && $('[data-dchart]', detailBox); if (!el || !('ResizeObserver' in window)) return;
  let w = el.clientWidth;
  chartRO = new ResizeObserver(() => { if (!el.isConnected) return chartRO.disconnect(); if (Math.abs(el.clientWidth - w) < 2) return; w = el.clientWidth; const cur = find(p.id); if (cur && pg.id === cur.id) drawCharts(cur); });
  chartRO.observe(el);
}
function bindPage(p) {
  const box = detailBox;
  box.onclick = e => {
    const c = e.target.closest('[data-copy]');
    if (c) { e.preventDefault(); try { navigator.clipboard.writeText(c.dataset.copy).catch(() => {}); } catch (x) {} toast(`${c.dataset.copyLabel[0].toUpperCase() + c.dataset.copyLabel.slice(1)} copied`); return; }
    if (e.target.closest('[data-jump-risk],[data-jump-ann]')) { setTimeout(() => { const r = $('.pp-tabs', box); if (r) r.scrollIntoView({ block: 'start' }); }, 0); return; }   // the link opens its tab; this brings the tab into view
    const tf = e.target.closest('[data-tf] button'); if (tf) { pg.tf = tf.dataset.v; $$('[data-tf] button', box).forEach(b => b.setAttribute('aria-pressed', String(b === tf))); loadTrading(p); return; }
    const mo = e.target.closest('[data-mode] button'); if (mo) { pg.mode = mo.dataset.v; $$('[data-mode] button', box).forEach(b => b.setAttribute('aria-pressed', String(b === mo))); $('[data-trading] h2', box).textContent = pg.mode === 'mcap' ? 'Market cap' : 'Price'; loadTrading(p); }
  };
  /* pointer events, so the chart readouts work with a mouse, a pen or a finger */
  box.onpointermove = box.onpointerdown = e => { const t = e.target.closest ? e.target : null, plot = t && t.closest('[data-plot]'), cplot = t && t.closest('[data-cplot]');
    if (plot) chartHover(find(p.id) || p, plot, e); else chartHover(null);
    candleHover(cplot, e); };
  box.onpointerleave = box.onpointercancel = () => { chartHover(null); candleHover(null); };
  bindRail(p);
}
/* hovering the raise chart reads it: a hairline, a dot on the line, and what had been raised by then */
function chartHover(p, plot, e) {
  const cx = detailBox && $('[data-cross]', detailBox); if (!cx) return;
  if (!p) return cx.classList.remove('on');
  const g = raiseGeom(p), r = plot.getBoundingClientRect(), k = r.width / g.W, x = Math.min(Math.max((e.clientX - r.left) / k, 0), g.X(g.end)), t = g.t0 + x / g.W * (g.t1 - g.t0);
  let v = g.series[0] ? g.series[0][1] : 0;
  for (let i = 1; i < g.series.length; i++) { const a = g.series[i - 1], b = g.series[i]; if (t >= b[0]) { v = b[1]; continue; } if (t >= a[0]) v = a[1] + (b[1] - a[1]) * (t - a[0]) / ((b[0] - a[0]) || 1); break; }
  const tip = $('.cx-tip', cx), px = x * k, py = g.Y(v) * k;
  $('.cx-line', cx).style.cssText = `left:${px.toFixed(1)}px;top:${(g.pt * k).toFixed(1)}px;height:${((g.Y(0) - g.pt) * k).toFixed(1)}px`;
  $('.cx-dot', cx).style.cssText = `left:${px.toFixed(1)}px;top:${py.toFixed(1)}px`;
  tip.textContent = `${fmtC(v, p.q, true)} ${Q(p).sym} · ${fmtDate(t)}`;
  tip.style.cssText = `left:${Math.min(Math.max(px, tip.offsetWidth / 2 + 2), r.width - tip.offsetWidth / 2 - 2).toFixed(1)}px;top:${Math.max(py - 14, 22).toFixed(1)}px`;
  cx.classList.add('on');
}
/* a buy landing floats its amount up beside the raise figure */
function floatChip(p, amt) {
  const host = detailBox && $('[data-dreadout] .big b', detailBox); if (!host || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('span'); c.className = 'buy-chip num'; c.textContent = `+${fmtC(amt, p.q)} ${Q(p).sym}`;
  c.addEventListener('animationend', () => c.remove()); host.appendChild(c);
}
function bindRail(p) {
  const box = detailBox, dc = $('[data-dclaim]', box); if (dc) dc.onclick = () => claim(p, dc);
  const ck = $('[data-crank]', box); if (ck) ck.onclick = async () => { ck.disabled = true; ck.textContent = 'Running…'; const cur = find(p.id) || p; cur.crankAt = Date.now(); const ok = await seedCrank(cur, true); if (!ok && detailBox) { const b = $('[data-crank]', detailBox); if (b) { b.disabled = false; b.textContent = 'Run the next step'; } } };
  const panel = $('[data-trade]', box), inp = panel && $('#ppAmt', panel); pg.syncTrade = null; if (!inp) return;
  const swap = panel.dataset.trade === 'swap', go = $('[data-go]', panel), err = $('[data-buyerr]', panel);
  const now = () => find(p.id) || p, num = () => parseFloat((inp.value || '').replace(/,/g, ''));
  /* the quick amounts: presets of the pair asset when paying with it, shares of the holding when selling */
  const chips = () => { if (swap) $('[data-tchips]', panel).innerHTML = pg.side === 'sell' ? [25, 50, 100].map(c => `<button type="button" data-pct="${c}">${c === 100 ? 'Max' : c + '%'}</button>`).join('')
    : chipsFor(p).map(c => `<button type="button" data-chip="${c}">${fmtC(c, p.q)}</button>`).join('') + '<button type="button" data-chip="max">Max</button>'; };
  /* everything the panel shows follows the amount, the side and the wallet: balance, what you receive, the error line, the button */
  const sync = () => {
    if (!panel.isConnected) return;
    const cur = now(), C = Q(cur), pr = profileOf(cur), raw = (inp.value || '').replace(/,/g, ''), n = parseFloat(raw), sell = swap && pg.side === 'sell', bal = sell ? heldOf(cur) : balOf(cur.q);
    $('[data-bal]', panel).textContent = state.wallet ? `Balance ${sell ? fmtTok(bal) + ' $' + cur.ticker : fmtAmt(bal, cur.q) + ' ' + C.sym}` : '';
    let msg = !raw ? '' : !(n > 0) ? 'Enter an amount above zero.' : '';
    if (swap) {
      panel.dataset.now = sell ? 'sell' : 'buy';   // buying is green, selling is red
      const q = quoteSwap(cur, pg.side, n > 0 ? n : 0), imp = q.impact * 100;
      $('[data-paysym]', panel).textContent = sell ? '$' + cur.ticker : C.sym;
      $('[data-recv]', panel).textContent = sell ? `${fmtAmt(q.out, cur.q)} ${C.sym}` : `${fmtTok(q.out)} $${cur.ticker}`;
      $('[data-tprice]', panel).textContent = `${fmtPrice(q.price)} ${C.sym}`;
      const ti = $('[data-timpact]', panel); ti.textContent = !(n > 0) ? '0%' : imp < 0.01 ? 'under 0.01%' : imp.toFixed(2) + '%'; ti.className = imp >= 5 ? 'down' : '';
      if (!msg && n > 0 && state.wallet && n > bal + 1e-9) msg = sell ? `You hold ${fmtTok(bal)} $${cur.ticker}.` : `Your wallet holds ${fmtAmt(bal, cur.q)} ${C.sym}.`;
      go.textContent = !state.wallet ? 'Connect wallet to trade' : `${sell ? 'Sell' : 'Buy'} $${cur.ticker}`;
    } else {
      $('[data-recv]', panel).textContent = `${fmtTok(n > 0 ? tokensFor(cur, Math.min(n, payLeft(cur))) : 0)} $${cur.ticker}`;
      if (!msg && n > 0) msg = pr.minBuy && n < pr.minBuy ? `The minimum deposit is ${fmtC(pr.minBuy, cur.q)} ${C.sym}.` : pr.maxBuy && n + (state.positions[cur.id] || 0) > pr.maxBuy ? `A wallet can put in at most ${fmtC(pr.maxBuy, cur.q)} ${C.sym}.`
        : n > payLeft(cur) ? `Only ${fmtAmt(payLeft(cur), cur.q)} ${C.sym} fits in this raise.` : state.wallet && n > bal ? `Your wallet holds ${fmtAmt(bal, cur.q)} ${C.sym}.` : '';
      go.textContent = !state.wallet ? 'Connect wallet to deposit' : n > 0 && !msg ? `Deposit ${fmtAmt(n, cur.q)} ${C.sym}` : 'Deposit';
    }
    err.textContent = msg; go.disabled = !!state.wallet && (!!msg || !(n > 0));
  };
  inp.oninput = sync;
  panel.onclick = async e => {
    const side = e.target.closest('[data-side] button'), chip = e.target.closest('[data-chip],[data-pct]'), cur = now();
    if (side) { pg.side = side.dataset.v; $$('[data-side] button', panel).forEach(b => b.setAttribute('aria-pressed', String(b === side))); inp.value = ''; chips(); sync(); inp.focus(); return; }
    if (chip) {
      const room = profileOf(cur).maxBuy ? Math.max(0, profileOf(cur).maxBuy - (state.positions[cur.id] || 0)) : Infinity;
      inp.value = chip.dataset.pct ? (chip.dataset.pct === '100' ? heldOf(cur) : Math.floor(heldOf(cur) * chip.dataset.pct / 100))
        : chip.dataset.chip !== 'max' ? chip.dataset.chip : swap ? balOf(cur.q) : r6(Math.min(state.wallet ? balOf(cur.q) : Infinity, payLeft(cur), room));
      sync(); return;
    }
    if (!e.target.closest('[data-go]') || busy) return;
    if (!state.wallet) { await connect(); return; }   // connecting is its own step; the amount stays for the next press
    const n = num(); if (go.disabled || !(n > 0)) return;
    go.disabled = true; go.textContent = 'Confirming…';
    const ok = swap ? await executeSwap(cur, pg.side, n) : await executeBuy(cur, n);
    if (ok && swap) { const i = detailBox && $('#ppAmt', detailBox); if (i) i.value = ''; }
    if (pg.syncTrade) pg.syncTrade();
  };
  pg.syncTrade = sync; chips(); sync();
}
async function loadAsync(p) {
  const box = detailBox, id = p.id;
  /* announcements kept on the backend arrive after the page is up: the tab's count, the strip and the tab itself follow */
  if (supa.configured() && pg.updLoaded !== id) { pg.updLoaded = id; updatesAdapter.load(p).then(() => { if (pg.id !== id) return; refreshTabLabels(p); refreshAnnounce(p); if (pg.tab === 'announcements') renderTab(p); }); }
  if (p.status === 'seeded') loadTrading(p);
  const again = () => { if (ui.sel !== id || !detailBox) return; const ch = $('.pp-pills .risk-chip', detailBox); if (ch) ch.outerHTML = riskChip(riskSummary(riskChecks(p))); if (pg.tab === 'backers' || pg.tab === 'risk') renderTab(p); };
  if (await founderAdapter.refresh(p)) again();
  if (await backersAdapter.enrich(p)) again();
}
/* live numbers in place, so the tab, the chat box and the buy input keep their state */
function patchDetail(p) {
  if (!detailBox || pg.id !== p.id) return;
  if (pg.status !== p.status) return renderDetail(true);
  const s = (k, fn) => { const e = $(k, detailBox); if (e) fn(e); }, pc = pctOf(p), pi = paceInfo(p);
  if (pg.seen != null && p.raised > pg.seen + 1e-9) floatChip(p, p.raised - pg.seen);
  if (pg.syncTrade) pg.syncTrade();   // the room left in the raise has moved
  pg.seen = p.raised;
  s('[data-dbar]', e => { if (pc > parseFloat(e.style.width) + 1e-6) bump($('[data-dreadout]', detailBox)); e.style.width = pc + '%'; });
  s('[data-draised]', e => roll(e, fmtC(p.raised, p.q, true))); s('[data-dpct]', e => roll(e, Math.floor(pc + 1e-7) + '%')); s('[data-dbackers]', e => roll(e, p.backers));
  s('[data-sraised]', e => roll(e, fmtC(p.raised, p.q, true))); s('[data-spct]', e => roll(e, Math.floor(pc + 1e-7) + '%')); s('[data-sbackers]', e => roll(e, p.backers));
  s('[data-dchart]', e => e.innerHTML = raiseSVG(p)); s('[data-dbars]', e => e.innerHTML = buysSVG(p)); s('[data-pace]', e => e.textContent = pi.text);
  s('[data-fill] .pace-chip', e => e.outerHTML = paceChip(pi));
}
function tickDetail() {
  const p = find(ui.sel); if (!detailBox || !p || pg.id !== p.id || p.status !== 'live') return;
  const left = fmtLeft(p.endsAt - Date.now());
  ['[data-dtime]', '[data-stime]', '[data-vtime]'].forEach(k => { const e = $(k, detailBox); if (e) roll(e, left); });
}
