/* ==========================================================================
   PROJECT PAGE (#/presale/<id>[/<tab>]). A presale's full page: banner and header strip, stats, fill and pace, raise chart,
   a right rail (buy, your position, vault, risk checks) and tabs. After seeding it becomes a trading view; after a miss it
   shows the refund. Reads go through the adapters in js/adapters; values from demo data carry the "Demo data" pill.
   renderDetail() draws it, patchDetail(p) updates live numbers in place, tickDetail() runs the countdowns.
   ========================================================================== */
/* charts draw in a narrower coordinate space on a phone, so their labels stay legible */
const chartW = () => innerWidth < 720 ? 400 : 720;
const PTABS = ['overview', 'deck', 'team', 'tokenomics', 'backers', 'chat', 'updates'];
const pg = { id: null, status: null, tab: 'overview', tf: '1h', mode: 'price', allBackers: false, deck: null, deckPage: 1, walletKey: '' };

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
const artHTML = (p, cls) => { const pr = profileOf(p); return pr.art ? `<img class="${cls}" src="${esc(pr.art)}" alt="">` : `<span class="${cls} glyph-art" style="--h:${hashStr(p.ticker) % 360}"><svg viewBox="0 0 24 24" aria-hidden="true">${glyph(p)}</svg></span>`; };
const copyBtn = (val, label, text) => `<button class="copy" data-copy="${esc(val)}" data-copy-label="${esc(label)}" aria-label="Copy ${esc(label)}">${text ? `<span class="num">${esc(text)}</span>` : ''}${ICONS.copy}</button>`;
const statusPill = p => `<span class="st-pill ${p.status}">${{ live: 'Live', seeded: 'Seeded', refunded: 'Refunded' }[p.status]}</span>`;
const initials = n => String(n || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();

/* ---------------------------------------------------------------- header */
function ppHeader(p) {
  const pr = profileOf(p), C = Q(p), risk = riskSummary(riskChecks(p));
  const socials = SOCIALS.filter(s => safeUrl(pr.links && pr.links[s[0]])).map(s => `<a class="soc" href="${esc(safeUrl(pr.links[s[0]]))}" target="_blank" rel="noopener" aria-label="${s[1]}" title="${s[1]}">${ICONS[s[2]]}</a>`).join('');
  return `<div class="pp-banner">${pr.banner ? `<img class="pp-bg" src="${esc(pr.banner)}" alt="">` : ''}${artHTML(p, 'pp-art')}</div>
    <div class="pp-strip">
      <div class="pp-name"><h1>${esc(p.name)}</h1><span class="pp-tk num">$${esc(p.ticker)}</span>${pr.mint ? copyBtn(pr.mint, 'mint address', shortMint(pr.mint)) : ''}<span class="pp-socials">${socials}</span></div>
      <div class="pp-pills"><span class="pair-pill${C.verified ? '' : ' unv'}">${esc(C.sym)} pair</span>${statusPill(p)}<a href="#/presale/${esc(p.id)}/overview" data-jump-risk>${riskChip(risk)}</a>${p.mine ? '<span class="tag">Yours</span>' : ''}${pr.demo ? DEMO_PILL : ''}</div>
      <p class="pp-tagline">${esc(pr.tagline || p.idea)}</p>
    </div>
    <dl class="pp-stats" data-pstats>${ppStats(p)}</dl>`;
}
function ppStats(p) {
  const C = Q(p), sym = esc(C.sym), pr = profileOf(p), st = (k, v, cls = '') => `<div class="${cls}"><dt>${k}</dt><dd class="num">${v}</dd></div>`;
  if (p.status === 'seeded') {
    const pool = pg.pool && pg.pool.value;
    return st('Raised', `${fmtC(p.raised, p.q, true)} <em>/ ${fmtC(p.target, p.q)} ${sym}</em>`) + st('Presale price', `${fmtPrice(priceOf(p))} ${sym}`) +
      st('Price', pool ? (pool.quote === 'USD' ? fmtUsd(pool.price) : `${fmtPrice(pool.price)} ${esc(pool.quote)}`) : '…', 'wide-ok') + st('Market cap', pool ? (pool.quote === 'USD' ? fmtUsd(pool.mcap) : `${fmtC(pool.mcap, p.q)} ${esc(pool.quote)}`) : '…') +
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
    return `<section class="panel pp-card pp-missed"><div class="pp-card-h"><h2>Missed target, refunded</h2></div>
      <div class="readout refunded"><div class="big"><b>${fmtC(p.raised, p.q, true)} <em>/ ${fmtC(p.target, p.q)} ${esc(C.sym)}</em></b><span class="num">${Math.floor(pc + 1e-7)}%</span></div>
      <div class="bar"><i style="width:${pc}%"></i></div><div class="sub"><span>Deadline passed ${fmtDate(p.resolvedAt || p.endsAt)}</span><span>${p.backers} backers</span></div></div>
      <p class="pp-note">No tokens were released and the supply was burned. Every backer can claim back what they paid in ${esc(C.sym)}, the 1% fee included. Refund status for each wallet is on the Backers tab.</p></section>`;
  }
  if (p.status === 'seeded') return ppTrading(p);
  return `<section class="panel pp-card" data-fill><div class="pp-card-h"><h2>The raise</h2>${paceChip(pi)}</div>
    <div class="readout live" data-dreadout><div class="big"><b><span data-draised>${fmtC(p.raised, p.q, true)}</span> <em>/ ${fmtC(p.target, p.q)} ${esc(C.sym)}</em></b><span class="num" data-dpct>${Math.floor(pc + 1e-7)}%</span></div>
      <div class="bar"><i data-dbar style="width:${pc}%"></i></div>
      <div class="sub"><span>Ends in <span class="num" data-dtime>${fmtLeft(p.endsAt - Date.now())}</span></span><span><span class="num" data-dbackers>${p.backers}</span> backers</span></div></div>
    <p class="pp-pace" data-pace>${esc(pi.text)}</p></section>`;
}
function raiseSVG(p) {
  const W = chartW(), Hh = W < 720 ? 200 : 190, pt = 16, pb = 22, t0 = p.openedAt, t1 = p.endsAt, live = p.status === 'live', end = live ? Date.now() : (p.resolvedAt || t1);
  const X = t => (Math.min(Math.max(t, t0), t1) - t0) / (t1 - t0) * W, Y = v => pt + (1 - Math.min(v, p.target * 1.02) / p.target) * (Hh - pt - pb);
  const pts = (p.hist || []).filter(h => h[0] <= end).map(([t, v]) => [X(t), Y(v)]); pts.push([X(end), Y(p.raised)]);
  const line = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' '), ex = X(end), ey = Y(p.raised);
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Raised over time: ${Math.floor(pctOf(p) + 1e-7)} percent of target">
    <path d="${line} L${ex.toFixed(1)} ${Y(0)} L0 ${Y(0)} Z" style="fill:var(--navy);fill-opacity:.12"/>
    <path d="M0 ${Y(p.target)}H${W}" style="stroke:var(--ink)" stroke-width="1" stroke-dasharray="2 4" opacity=".5"/>
    <path d="M0 ${Y(0)}H${W}" style="stroke:var(--navy-deep);stroke-opacity:.25" stroke-width="1"/>
    ${live ? `<path d="M${ex.toFixed(1)} ${ey.toFixed(1)}L${W} ${Y(p.target)}" style="stroke:var(--navy-soft)" stroke-width="1.5" stroke-dasharray="4 4" fill="none"/>` : ''}
    <path d="${line}" fill="none" style="stroke:var(${p.status === 'refunded' ? '--navy-soft' : '--navy'})" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="3.5" style="fill:#fff;stroke:var(--navy-deep)" stroke-width="2"/>
    <g font-family="JetBrains Mono, monospace" font-size="10.5" style="fill:var(--muted)"><text x="0" y="${Hh - 5}">Opened ${fmtDay(t0)}</text><text x="${W}" y="${Hh - 5}" text-anchor="end">Deadline ${fmtDay(t1)}</text><text x="${W}" y="${Y(p.target) - 6}" text-anchor="end">Target ${fmtC(p.target, p.q)}</text></g></svg>`;
}
function buysSVG(p) {
  const W = chartW(), Hh = 64, t0 = p.openedAt, t1 = p.endsAt, n = Math.max(1, Math.ceil((t1 - t0) / H)), c = new Array(n).fill(0);
  for (const b of p.buys || []) { const i = Math.floor((b.at - t0) / H); if (i >= 0 && i < n) c[i]++; }
  const mx = Math.max(1, ...c), bw = W / n;
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Buys per hour, at most ${mx} in one hour">${c.map((v, i) => v ? `<rect x="${(i * bw + bw * 0.15).toFixed(1)}" y="${(Hh - 14 - v / mx * (Hh - 20)).toFixed(1)}" width="${Math.max(1, bw * 0.7).toFixed(1)}" height="${(v / mx * (Hh - 20)).toFixed(1)}" rx="1" style="fill:var(--navy-soft)"/>` : '').join('')}
    <path d="M0 ${Hh - 14}H${W}" style="stroke:var(--navy-deep);stroke-opacity:.2"/><g font-family="JetBrains Mono, monospace" font-size="10" style="fill:var(--muted)"><text x="0" y="${Hh - 2}">Buys per hour</text><text x="${W}" y="${Hh - 2}" text-anchor="end">Peak ${mx}</text></g></svg>`;
}
function ppChart(p) {
  return `<section class="panel pp-card" data-chartcard><div class="pp-card-h"><h2>${p.status === 'seeded' ? 'How it raised' : 'Raised over time'}</h2><span class="legend"><span><i></i>Raised</span>${p.status === 'live' ? '<span><i class="dash"></i>Straight line to target</span>' : ''}<span><i class="bars"></i>Buys per hour</span></span></div>
    <div class="pp-svg" data-dchart>${raiseSVG(p)}</div><div class="pp-svg bars" data-dbars>${buysSVG(p)}</div></section>`;
}

/* ---------------------------------------------------------------- seeded: trading view */
function ppTrading(p) {
  return `<section class="panel pp-card" data-trading><div class="pp-card-h"><h2>${pg.mode === 'mcap' ? 'Market cap' : 'Price'}</h2>
      <div class="pp-tools"><div class="seg mini-seg" data-mode>${['price', 'mcap'].map(m => `<button data-v="${m}" aria-pressed="${pg.mode === m}">${m === 'price' ? 'Price' : 'MCap'}</button>`).join('')}</div>
      <div class="seg mini-seg" data-tf>${Object.keys(TIMEFRAMES).map(t => `<button data-v="${t}" aria-pressed="${pg.tf === t}">${t}</button>`).join('')}</div></div></div>
    <div class="pp-svg candles" data-candles><div class="pp-loading">Loading the pool…</div></div>
    <div class="pool-card" data-poolcard></div></section>`;
}
function candleSVG(series, mode, supply, quote) {
  if (!series.length) return '<div class="pp-loading">No trades in this window.</div>';
  const W = chartW(), Hh = W < 720 ? 300 : 260, pr = 64, pt = 10, pb = 22, vH = 40, k = mode === 'mcap' ? supply : 1;
  const hi = Math.max(...series.map(c => c[2] * k)), lo = Math.min(...series.map(c => c[3] * k)), span = (hi - lo) || hi * 0.01 || 1;
  const Y = v => pt + (1 - (v - lo) / span) * (Hh - pt - pb - vH), vmax = Math.max(...series.map(c => c[5])) || 1, cw = (W - pr) / series.length;
  const f = v => quote === 'USD' ? fmtUsd(v) : fmtPrice(v);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(q => lo + span * q);
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${mode === 'mcap' ? 'Market cap' : 'Price'} candles, last ${f(series[series.length - 1][4] * k)}">
    ${ticks.map(v => `<path d="M0 ${Y(v).toFixed(1)}H${W - pr}" style="stroke:var(--navy-deep);stroke-opacity:.08"/><text x="${W - pr + 6}" y="${(Y(v) + 3.5).toFixed(1)}" font-family="JetBrains Mono, monospace" font-size="10" style="fill:var(--muted)">${f(v)}</text>`).join('')}
    ${series.map((c, i) => { const x = i * cw + cw / 2, up = c[4] >= c[1], col = up ? '#1F9D63' : '#E0483F', yo = Y(c[1] * k), yc = Y(c[4] * k), vh = c[5] / vmax * (vH - 6);
      return `<path d="M${x.toFixed(1)} ${Y(c[2] * k).toFixed(1)}V${Y(c[3] * k).toFixed(1)}" stroke="${col}" stroke-width="1"/><rect x="${(x - cw * 0.35).toFixed(1)}" y="${Math.min(yo, yc).toFixed(1)}" width="${Math.max(1, cw * 0.7).toFixed(1)}" height="${Math.max(1, Math.abs(yc - yo)).toFixed(1)}" fill="${col}" rx=".5"/>
        <rect x="${(x - cw * 0.35).toFixed(1)}" y="${(Hh - pb - vh).toFixed(1)}" width="${Math.max(1, cw * 0.7).toFixed(1)}" height="${vh.toFixed(1)}" fill="${col}" opacity=".25"/>`; }).join('')}
    <g font-family="JetBrains Mono, monospace" font-size="10" style="fill:var(--muted)"><text x="0" y="${Hh - 5}">${fmtDate(series[0][0])}</text><text x="${W - pr}" y="${Hh - 5}" text-anchor="end">${fmtDate(series[series.length - 1][0])}</text></g></svg>`;
}
async function loadTrading(p) {
  const box = detailBox && $('[data-candles]', detailBox), card = detailBox && $('[data-poolcard]', detailBox); if (!box) return;
  try {
    const pool = pg.pool = await presaleAdapter.pool(p), ser = await presaleAdapter.candles(p, pg.tf);
    if (ui.sel !== p.id) return;
    box.innerHTML = candleSVG(ser.value, pg.mode, pool.value.supply, pool.value.quote);
    const v = pool.value, st = presaleAdapter.vaultIsStandin(p) || pool.from === 'standin';
    card.innerHTML = `<div class="pool-grid"><div><dt>Pair</dt><dd>${esc(v.pair)}</dd></div><div><dt>Liquidity</dt><dd class="num">${v.quote === 'USD' ? fmtUsd(v.liquidity) : `${fmtC(v.liquidity, p.q)} ${esc(v.quote)}`}</dd></div>
      <div><dt>24h</dt><dd class="num ${v.change24h >= 0 ? 'up' : 'down'}">${v.change24h >= 0 ? '+' : ''}${v.change24h.toFixed(2)}%</dd></div><div><dt>24h volume</dt><dd class="num">${v.quote === 'USD' ? fmtUsd(v.volume24h) : fmtC(v.volume24h, p.q)}</dd></div></div>
      <div class="pool-foot"><span class="num">${esc(v.dex)} pool ${esc(shortMint(v.address))}</span>${copyBtn(v.address, 'pool address')}
        <a class="bar-link" href="${esc(isRealAddr(v.address) ? solscan(v.address) : v.url)}" target="_blank" rel="noopener">Locked LP proof ${ICONS.out}</a>${srcPill(pool.from)}</div>
      ${pool.from === 'standin' ? `<p class="standin-note">${esc(STANDINS.pool.note)}</p>` : ''}`;
    const ps = detailBox && $('[data-pstats]', detailBox); if (ps) ps.innerHTML = ppStats(p);
    const sw = detailBox && $('[data-swap]', detailBox); if (sw) sw.outerHTML = swapPanel(p);
  } catch (e) { box.innerHTML = `<div class="pp-loading">The pool could not be loaded (${esc(e.message)}). It retries in a minute.</div>`; }
}

/* ---------------------------------------------------------------- right rail */
function buyPanel(p) {
  const C = Q(p), sym = esc(C.sym), pr = profileOf(p), amt = Math.min(quickFor(p), payLeft(p));
  return `<section class="panel rail-card" data-buy><h3>Buy $${esc(p.ticker)}</h3>
    <div class="inp"><input id="ppAmt" inputmode="decimal" autocomplete="off" value="${amt}" aria-label="Amount in ${sym}"><span class="suf">${sym}</span></div>
    <div class="chips">${chipsFor(p).map(c => `<button data-chip="${c}">${fmtC(c, p.q)}</button>`).join('')}</div>
    <div class="recv"><span>You receive</span><b class="num" data-recv></b></div>
    <p class="rail-meta num">${pr.minBuy ? `Min ${fmtC(pr.minBuy, p.q)} ${sym}` : 'No minimum'} · ${pr.maxBuy ? `Max ${fmtC(pr.maxBuy, p.q)} ${sym} per wallet` : 'No maximum per wallet'}</p>
    <p class="rail-err" data-buyerr role="alert"></p>
    <button class="btn btn-navy btn-block" disabled>Buy</button><p class="rail-cap">Prototype, no transactions</p></section>`;
}
function swapPanel(p) {
  const pool = pg.pool && pg.pool.value, url = pool ? pool.url : 'https://app.meteora.ag';
  return `<section class="panel rail-card" data-swap><h3>Trade $${esc(p.ticker)}</h3>
    <p class="rail-meta">Seeded ${fmtDay(p.resolvedAt)}. $${esc(p.ticker)} trades in a ${esc(DEX)} pool that opened at the presale price, with the liquidity locked for good.</p>
    ${pool ? `<div class="recv"><span>Pool price</span><b class="num">${pool.quote === 'USD' ? fmtUsd(pool.price) : fmtPrice(pool.price) + ' ' + esc(pool.quote)}</b></div>` : ''}
    <a class="btn btn-navy btn-block" href="${esc(url)}" target="_blank" rel="noopener">Swap on Meteora ${ICONS.out}</a>
    ${pg.pool && pg.pool.from === 'standin' ? '<p class="rail-cap">Opens the stand-in pool, not Quill’s</p>' : ''}</section>`;
}
function positionPanel(p) {
  if (!state.wallet) return '';
  const C = Q(p), sym = esc(C.sym), pos = state.positions[p.id] || 0, claimed = state.claimed[p.id];
  if (!pos) return `<section class="panel rail-card" data-position><h3>Your position</h3><p class="rail-meta">${esc(state.wallet.addr)} has not backed ${esc(p.name)}.</p></section>`;
  const tok = tokensFor(p, pos), share = netOf(pos) / (p.raised || 1) * 100, row = (k, v) => `<div><dt>${k}</dt><dd class="num">${v}</dd></div>`;
  let act = '';
  if (p.status === 'refunded') act = claimed ? `<div class="mine"><span>Refund claimed</span><span class="num">${fmtAmt(pos, p.q)} ${sym}</span></div>` : `<button class="btn btn-navy btn-block" data-dclaim>Claim refund of ${fmtAmt(pos, p.q)} ${sym}</button>`;
  else if (p.status === 'seeded') act = claimed ? `<div class="mine"><span>Claimed</span><span class="num">${fmtTok(tok)} $${esc(p.ticker)}</span></div>` : `<button class="btn btn-navy btn-block" data-dclaim>Claim ${fmtTok(tok)} $${esc(p.ticker)}</button>`;
  return `<section class="panel rail-card" data-position><h3>Your position</h3><dl class="kv">${row('Amount in', `${fmtAmt(pos, p.q)} ${sym}`)}${row(p.status === 'refunded' ? 'Tokens' : 'Tokens owed', p.status === 'refunded' ? 'None, it refunded' : `${fmtTok(tok)} $${esc(p.ticker)}`)}
    ${row('Share of raise', share.toFixed(share < 1 ? 3 : 2) + '%')}${p.status === 'live' ? row('If it refunds', `${fmtAmt(pos, p.q)} ${sym} back`) : ''}</dl>${act}</section>`;
}
function vaultPanel(p) {
  const addr = presaleAdapter.vaultAddress(p), st = presaleAdapter.vaultIsStandin(p), real = isRealAddr(addr), C = Q(p);
  const when = p.status === 'live' ? `Refunds open in <span class="num" data-vtime>${fmtLeft(p.endsAt - Date.now())}</span> if it misses` : p.status === 'seeded' ? `Released into the pool ${fmtDay(p.resolvedAt)}` : `Refunds open since ${fmtDay(p.resolvedAt || p.endsAt)}`;
  return `<section class="panel rail-card" data-vault><h3>Vault</h3>
    <div class="vault-addr"><span class="num">${esc(shortMint(addr))}</span>${copyBtn(addr, 'vault address')}${real ? `<a class="soc" href="${solscan(addr)}" target="_blank" rel="noopener" aria-label="Open on Solscan">${ICONS.out}</a>` : ''}</div>
    <div class="recv"><span>Balance</span><b class="num" data-vbal>…</b></div><div class="vault-src" data-vsrc></div>
    <p class="rail-meta">${when}.</p>${st ? `<p class="standin-note">${esc(STANDINS.vault.note)}</p>` : ''}</section>`;
}
function riskPanel(p) {
  const checks = riskChecks(p), s = riskSummary(checks), demo = checks.some(c => c.from === 'demo');
  return `<section class="panel rail-card" data-risk id="risk"><div class="rail-h"><h3>Risk checks</h3>${riskChip(s)}</div>
    <ul class="risk-list">${checks.map(c => `<li class="${c.level}">${RISK_ICON[c.level]}<div><b>${esc(c.label)}</b><span>${esc(c.reason)}</span></div></li>`).join('')}</ul>
    ${demo ? `<p class="rail-cap">${DEMO_PILL} Checks run on demo data where no live account exists. Thresholds are in js/config/risk.js.</p>` : ''}</section>`;
}
function ppRail(p) { return (p.status === 'seeded' ? swapPanel(p) : p.status === 'live' ? buyPanel(p) : '') + `<div data-poswrap>${positionPanel(p)}</div>` + vaultPanel(p) + riskPanel(p); }

/* ---------------------------------------------------------------- tabs */
function tabLabel(p, t) {
  if (t === 'backers') return p.status === 'seeded' ? 'Holders' : 'Backers';
  if (t === 'updates') { const n = updatesAdapter.list(p).length; return `Updates${n ? ` <span class="ct num">${n}</span>` : ''}`; }
  return t[0].toUpperCase() + t.slice(1);
}
function ppTabs(p) {
  return `<section class="panel pp-tabs"><div class="tabbar" role="tablist" aria-label="${esc(p.name)} sections">${PTABS.map(t => `<a role="tab" href="#/presale/${esc(p.id)}/${t}" data-ptab="${t}" aria-selected="${pg.tab === t}">${tabLabel(p, t)}</a>`).join('')}</div>
    <div class="tabbody" data-tabbody role="tabpanel"></div></section>`;
}
function renderTab(p) {
  const body = detailBox && $('[data-tabbody]', detailBox); if (!body) return;
  $$('[data-ptab]', detailBox).forEach(a => a.setAttribute('aria-selected', String(a.dataset.ptab === pg.tab)));
  const fn = { overview: tabOverview, deck: tabDeck, team: tabTeam, tokenomics: tabTokenomics, backers: tabBackers, chat: tabChat, updates: tabUpdates }[pg.tab] || tabOverview;
  body.innerHTML = fn(p); afterTab(p, body);
}
const tabHead = (title, from, extra = '') => `<div class="tab-h"><h2>${title}</h2>${from ? srcPill(from) : ''}${extra}</div>`;
const prFrom = p => profileOf(p).demo ? 'demo' : '';

function tabOverview(p) {
  const pr = profileOf(p), today = Date.now();
  const road = (pr.roadmap || []).map(r => { const due = r.dueAt || today + (r.due || 0) * D; return `<li class="${r.status}"><span class="rm-dot">${r.status === 'shipped' ? RISK_ICON.pass : r.status === 'missed' ? RISK_ICON.fail : ''}</span>
      <div><b>${esc(r.title)}</b><span class="num">${r.status === 'shipped' ? 'Shipped' : r.status === 'missed' ? 'Missed' : 'Due'} ${fmtDay(due)}</span>${r.status === 'shipped' && safeUrl(r.proof) ? ` <a href="${esc(safeUrl(r.proof))}" target="_blank" rel="noopener">Proof ${ICONS.out}</a>` : ''}</div></li>`; }).join('');
  const links = SOCIALS.filter(s => safeUrl(pr.links && pr.links[s[0]])).map(s => `<a class="link-card" href="${esc(safeUrl(pr.links[s[0]]))}" target="_blank" rel="noopener">${ICONS[s[2]]}<span><b>${s[1]}</b><span>${esc(hostOf(pr.links[s[0]]))}</span></span></a>`).join('');
  return tabHead('About', prFrom(p)) + `<div class="md">${md(pr.description) || `<p>${esc(p.idea)}</p>`}</div>
    <div class="tab-h sub"><h2>Roadmap</h2></div>${road ? `<ol class="roadmap">${road}</ol>` : '<p class="quiet">No roadmap listed.</p>'}
    <div class="tab-h sub"><h2>Links</h2></div>${links ? `<div class="links">${links}</div>` : '<p class="quiet">No website or socials listed.</p>'}`;
}
function tabDeck(p) {
  const pr = profileOf(p);
  if (!pr.deck) return tabHead('Deck', '') + quietEmpty('No deck is attached to this presale.');
  return tabHead('Deck', prFrom(p), `<span class="deck-tools"><span class="num" data-deckcount>Loading…</span><a class="btn btn-ink btn-sm" href="${esc(pr.deck)}" download>Download PDF</a></span>`) +
    `<div class="deck"><div class="deck-thumbs" data-thumbs></div><div class="deck-main"><canvas data-deckcanvas></canvas><div class="deck-nav"><button class="qb" data-deckprev>Previous</button><span class="num" data-deckpg></span><button class="qb" data-decknext>Next</button></div></div></div>`;
}
const quietEmpty = t => `<div class="col-empty"><svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><use href="#seed21"/></svg>${esc(t)}</div>`;
function tabTeam(p) {
  const pr = profileOf(p), team = pr.team || [];
  if (!team.length) return tabHead('Team', '') + quietEmpty('No team is listed for this presale.');
  const badge = (on, t) => on ? `<span class="vbadge">${RISK_ICON.pass}${t}</span>` : '';
  return tabHead('Team', prFrom(p)) + `<div class="team">${team.map(m => { const v = m.verified || {};
    return `<article class="member"><span class="m-av" style="--h:${hashStr(m.name) % 360}">${m.avatar && safeUrl(m.avatar) ? `<img src="${esc(m.avatar)}" alt="">` : initials(m.name)}</span>
      <div class="m-main"><b>${esc(m.name)}</b><span class="m-role">${esc(m.role || '')}</span>
        <div class="m-links">${[['x', 'X'], ['github', 'GitHub'], ['linkedin', 'LinkedIn']].filter(([k]) => safeUrl(m[k])).map(([k, l]) => `<a href="${esc(safeUrl(m[k]))}" target="_blank" rel="noopener">${ICONS[k]}${l}</a>`).join('')}</div>
        <div class="m-badges">${badge(v.x, 'X verified')}${badge(v.github, 'GitHub verified')}${badge(v.domain, 'Domain verified')}</div>
        ${m.wallet ? `<div class="m-wallet"><span class="num">${esc(shortMint(m.wallet))}</span>${copyBtn(m.wallet, 'wallet address')}</div>` : ''}</div></article>`; }).join('')}</div>
    <p class="quiet">A badge appears only for a check that passed.${pr.demo ? ' On demo presales the check results are part of the demo data.' : ' Checks are self-reported until verification is wired up.'}</p>`;
}
const KIND_COL = { presale: '#2E63E7', lp: '#7A9AE6', team: '#0A1E4F', treasury: '#9799C9', other: '#E2A6C0' };
function donutSVG(allocs) {
  const R = 70, C = 2 * Math.PI * R; let acc = 0;
  return `<svg viewBox="0 0 180 180" class="donut" role="img" aria-label="Token allocation">${allocs.map((a, i) => { const len = a.pct / 100 * C, s = `<circle cx="90" cy="90" r="${R}" fill="none" stroke="${a.color || KIND_COL[a.kind] || KIND_COL.other}" stroke-width="26" stroke-dasharray="${Math.max(0, len - 1.5).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 90 90)"/>`; acc += len; return s; }).join('')}
    <text x="90" y="86" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="15" style="fill:var(--ink)">1B</text><text x="90" y="104" text-anchor="middle" font-size="11" style="fill:var(--muted)">supply</text></svg>`;
}
function vestingSVG(allocs, t0) {
  const W = 640, rowH = 30, maxD = Math.max(365, ...allocs.map(a => a.vesting ? a.vesting.cliffDays + a.vesting.durationDays : 0)), X = d => 150 + d / maxD * (W - 170), Hh = allocs.length * rowH + 30;
  const months = Math.ceil(maxD / 30), stepM = months > 18 ? 6 : 3;
  return `<svg viewBox="0 0 ${W} ${Hh}" class="vesting" role="img" aria-label="Unlock schedule">
    ${Array.from({ length: Math.floor(months / stepM) + 1 }, (_, i) => i * stepM).map(m => `<path d="M${X(m * 30).toFixed(1)} 4V${Hh - 22}" style="stroke:var(--navy-deep);stroke-opacity:.08"/><text x="${X(m * 30).toFixed(1)}" y="${Hh - 8}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" style="fill:var(--muted)">${m ? 'M' + m : 'Seed'}</text>`).join('')}
    ${allocs.map((a, i) => { const y = 8 + i * rowH, col = KIND_COL[a.kind] || KIND_COL.other, v = a.vesting;
      const bar = a.kind === 'lp' ? `<rect x="${X(0)}" y="${y + 6}" width="${W - 20 - X(0)}" height="10" rx="5" fill="${col}" opacity=".35"/><text x="${X(0) + 8}" y="${y + 15}" font-size="10" style="fill:var(--ink-2)">Locked in the pool for good</text>`
        : !v || !v.durationDays ? `<circle cx="${X(0)}" cy="${y + 11}" r="6" fill="${col}"/><text x="${X(0) + 12}" y="${y + 15}" font-size="10" style="fill:var(--ink-2)">${a.kind === 'presale' ? 'Claimable at seed' : 'Unlocked at seed, no vesting'}</text>`
        : `<rect x="${X(0)}" y="${y + 9}" width="${(X(v.cliffDays) - X(0)).toFixed(1)}" height="4" rx="2" fill="${col}" opacity=".3"/><rect x="${X(v.cliffDays).toFixed(1)}" y="${y + 6}" width="${(X(v.cliffDays + v.durationDays) - X(v.cliffDays)).toFixed(1)}" height="10" rx="5" fill="${col}"/>
           <text x="${(X(v.cliffDays + v.durationDays) + 6).toFixed(1)}" y="${y + 15}" font-size="10" style="fill:var(--ink-2)">${v.cliffDays ? `${Math.round(v.cliffDays / 30)}mo cliff, ` : ''}${Math.round(v.durationDays / 30)}mo linear</text>`;
      return `<text x="0" y="${y + 15}" font-size="12" style="fill:var(--ink)">${esc(a.label)}</text><text x="140" y="${y + 15}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="11" style="fill:var(--muted)">${a.pct}%</text>${bar}`; }).join('')}</svg>`;
}
function tabTokenomics(p) {
  const pr = profileOf(p), t = pr.tokenomics || {}, al = t.allocations || [], uf = t.useOfFunds || [];
  const ins = al.filter(a => a.kind === 'team' || a.kind === 'treasury').reduce((a, x) => a + x.pct, 0);
  return tabHead('Tokenomics', prFrom(p)) +
    (ins > RISK.teamTreasuryMaxPct ? `<div class="flag warn">${RISK_ICON.warn}<span>Team and treasury hold <b>${ins}%</b> of supply, over the ${RISK.teamTreasuryMaxPct}% guideline.${al.some(a => (a.kind === 'team' || a.kind === 'treasury') && !a.vesting) ? ' Some of it has no vesting.' : ''}</span></div>` : '') +
    `<div class="toke"><div>${donutSVG(al)}</div><table class="dtable alloc"><thead><tr><th>Allocation</th><th class="r">Share</th><th class="r">Tokens</th><th>Vesting</th></tr></thead><tbody>
      ${al.map(a => `<tr><td><i class="sw" style="background:${KIND_COL[a.kind] || KIND_COL.other}"></i>${esc(a.label)}${a.wallet ? ` <span class="num quiet">${esc(shortMint(a.wallet))}</span>` : ''}</td><td class="num">${a.pct}%</td><td class="num">${fmtTok(SUPPLY * a.pct / 100)}</td>
        <td>${a.kind === 'lp' ? 'Locked for good' : a.vesting && a.vesting.durationDays ? `${a.vesting.cliffDays}d cliff, ${a.vesting.durationDays}d linear` : a.kind === 'presale' ? 'At seed' : '<b class="bad">None</b>'}</td></tr>`).join('')}</tbody></table></div>
    <p class="quiet">The presale share and the pool share are equal. That is what makes the pool open at the presale price.</p>
    <div class="tab-h sub"><h2>Unlock schedule</h2></div><div class="pp-svg">${vestingSVG(al, p.resolvedAt || p.endsAt)}</div>
    <div class="tab-h sub"><h2>Use of funds</h2></div><div class="uof">${uf.map(u => `<div><span>${esc(u.label)}</span><span class="uof-bar"><i style="width:${u.pct}%"></i></span><span class="num">${u.pct}%</span></div>`).join('') || '<p class="quiet">Not listed.</p>'}</div>`;
}
function tabBackers(p) {
  if (p.status === 'seeded') return tabHead('Holders', '') + '<div data-holders><div class="pp-loading">Loading holders…</div></div>';
  const rows = backersAdapter.rows(p), s = backersAdapter.summary(p, rows), C = Q(p), shown = pg.allBackers ? rows : rows.slice(0, 50), refund = p.status === 'refunded';
  const card = (k, v, lvl, sub) => `<div class="sum ${lvl || ''}"><dt>${k}</dt><dd class="num">${v}</dd>${sub ? `<span>${sub}</span>` : ''}</div>`;
  const tag = t => `<span class="btag ${t}">${{ kol: 'KOL', tracked: 'Tracked', 'repeat-backer': 'Repeat backer' }[t] || esc(t)}</span>`;
  return tabHead('Backers', s.from, ` <span class="quiet">${rows.length} wallets${rows.some(r => isRealAddr(r.wallet)) ? `, the largest ${RISK.liveLookupCap} checked live` : ''}</span>`) +
    `<dl class="sums">${card('Top 10', pctTxt(s.top10), s.top10 > RISK.top10FailPct ? 'fail' : s.top10 > RISK.top10WarnPct ? 'warn' : '', 'of the raise')}${card('Fresh wallets', pctTxt(s.fresh), s.fresh > RISK.freshWarnPct ? 'warn' : '', 'of backers')}
      ${card('Bundled', pctTxt(s.bundled), s.bundled > RISK.bundledWarnPct ? 'warn' : '', s.bundles.length ? `${s.bundles.length} funding wallet${s.bundles.length > 1 ? 's' : ''}` : 'of the raise')}${card('KOL and tracked', s.kol + s.tracked, '', `${s.kol} KOL, ${s.tracked} tracked`)}${card('Repeat Seed backers', s.repeat, '', 'backed an earlier Seed presale')}</dl>
    <div class="tscroll"><table class="dtable backers"><thead><tr><th>Wallet</th><th class="r">Amount</th><th class="r">Of raise</th><th class="r">Time</th><th>Funded by</th><th>Tags</th>${refund ? '<th>Refund</th>' : ''}</tr></thead><tbody>
      ${shown.map(r => `<tr class="${r.you ? 'you' : ''}"><td class="mono">${r.you ? 'You' : esc(shortMint(r.wallet))}</td><td class="num">${fmtC(r.amount, p.q)} ${esc(C.sym)}</td><td class="num">${r.pct.toFixed(r.pct < 1 ? 2 : 1)}%</td><td class="num">${fmtAgo(Date.now() - r.first)}</td>
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
function tabChat(p) { return typeof chatTab === 'function' ? chatTab(p) : tabHead('Chat', '') + '<p class="quiet">Chat is not available.</p>'; }
function tabUpdates(p) {
  const list = updatesAdapter.list(p), w = walletId(), canPost = roleOf(p, w) || roleOf(p, state.wallet && state.wallet.pk);
  const form = canPost && p.status !== 'refunded' ? `<form class="upd-form" data-updform><input name="t" maxlength="80" placeholder="Title" required><textarea name="b" rows="3" maxlength="2000" placeholder="What changed?" required></textarea><button class="btn btn-navy btn-sm">Post update</button></form>` : '';
  return tabHead('Updates', prFrom(p), ` <span class="quiet">${list.length} from the team</span>`) + form +
    (list.length ? `<ol class="updates">${list.map(u => `<li><div class="u-h"><b>${esc(u.title)}</b><span class="num">${fmtDate(u.postedAt)}</span></div><div class="md">${md(u.body)}</div><span class="u-by">${esc(u.author || 'Founder')}</span></li>`).join('')}</ol>` : quietEmpty('No updates posted yet.'));
}
function afterTab(p, body) {
  if (pg.tab === 'deck' && profileOf(p).deck) loadDeck(p, body);
  if (pg.tab === 'backers' && p.status === 'seeded') loadHolders(p);
  if (pg.tab === 'chat' && typeof chatMount === 'function') chatMount(p, body);
  const f = $('[data-updform]', body);
  if (f) f.onsubmit = async e => { e.preventDefault(); const t = f.t.value.trim(), b = f.b.value.trim(); if (!t || !b) return; try { await updatesAdapter.post(p, t, b); toast('Update posted'); renderTab(p); refreshTabLabels(p); } catch (x) { toast(x.message || 'The update was not posted.'); } };
  const ab = $('[data-allbackers]', body); if (ab) ab.onclick = () => { pg.allBackers = true; renderTab(p); };
}
function refreshTabLabels(p) { $$('[data-ptab]', detailBox).forEach(a => a.innerHTML = tabLabel(p, a.dataset.ptab)); }

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
  if (ui.tab !== 'presale') { if (pg.id) { box.innerHTML = ''; pg.id = null; } return; }
  const p = find(ui.sel);
  if (!p) { box.innerHTML = '<div class="panel empty">That presale is not in this demo any more. It may have been reset.<br><a href="#">Back to all presales</a></div>'; pg.id = null; return; }
  const tab = PTABS.includes(ui.ptab) ? ui.ptab : 'overview', wkey = (state.wallet ? walletId() : '') + '/' + (state.positions[p.id] || 0) + '/' + !!state.claimed[p.id];
  if (!force && pg.id === p.id && pg.status === p.status) {
    if (pg.tab !== tab) { pg.tab = tab; renderTab(p); }
    if (pg.walletKey !== wkey) { pg.walletKey = wkey; const pw = $('[data-poswrap]', box); if (pw) { pw.innerHTML = positionPanel(p); bindRail(p); } if (pg.tab === 'updates' || pg.tab === 'chat') renderTab(p); }
    patchDetail(p); return;
  }
  const fresh = pg.id !== p.id;
  Object.assign(pg, { id: p.id, status: p.status, tab, walletKey: wkey }); if (fresh) Object.assign(pg, { allBackers: false, deck: null, pool: null });
  box.innerHTML = `<div class="pp ${p.status}"><a class="textlink back" href="#">&larr; All presales</a>${ppHeader(p)}
    <div class="pp-grid"><div class="pp-a">${ppFill(p)}</div><div class="pp-b">${ppChart(p)}</div><aside class="pp-rail" aria-label="Buy and checks">${ppRail(p)}</aside><div class="pp-c">${ppTabs(p)}</div></div></div>`;
  bindPage(p); renderTab(p); loadAsync(p);
}
function bindPage(p) {
  const box = detailBox;
  box.onclick = e => {
    const c = e.target.closest('[data-copy]');
    if (c) { e.preventDefault(); try { navigator.clipboard.writeText(c.dataset.copy).catch(() => {}); } catch (x) {} toast(`${c.dataset.copyLabel[0].toUpperCase() + c.dataset.copyLabel.slice(1)} copied`); return; }
    if (e.target.closest('[data-jump-risk]')) { e.preventDefault(); const r = $('#risk', box); if (r) r.scrollIntoView({ block: 'start' }); return; }
    const tf = e.target.closest('[data-tf] button'); if (tf) { pg.tf = tf.dataset.v; $$('[data-tf] button', box).forEach(b => b.setAttribute('aria-pressed', String(b === tf))); loadTrading(p); return; }
    const mo = e.target.closest('[data-mode] button'); if (mo) { pg.mode = mo.dataset.v; $$('[data-mode] button', box).forEach(b => b.setAttribute('aria-pressed', String(b === mo))); $('[data-trading] h2', box).textContent = pg.mode === 'mcap' ? 'Market cap' : 'Price'; loadTrading(p); }
  };
  bindRail(p);
}
function bindRail(p) {
  const box = detailBox, dc = $('[data-dclaim]', box); if (dc) dc.onclick = () => claim(p, dc);
  const inp = $('#ppAmt', box); if (!inp) return;
  const sync = () => {
    const pr = profileOf(p), C = Q(p), raw = (inp.value || '').replace(/,/g, ''), n = parseFloat(raw), err = $('[data-buyerr]', box);
    $('[data-recv]', box).textContent = n > 0 ? `${fmtTok(tokensFor(p, Math.min(n, payLeft(p))))} $${p.ticker}` : `0 $${p.ticker}`;
    err.textContent = !raw ? '' : !(n > 0) ? 'Enter an amount above zero.' : pr.minBuy && n < pr.minBuy ? `The minimum buy is ${fmtC(pr.minBuy, p.q)} ${C.sym}.` : pr.maxBuy && n + (state.positions[p.id] || 0) > pr.maxBuy ? `A wallet can put in at most ${fmtC(pr.maxBuy, p.q)} ${C.sym}.` : n > payLeft(p) ? `Only ${fmtAmt(payLeft(p), p.q)} ${C.sym} fits in this raise.` : '';
  };
  inp.oninput = sync; $$('[data-chip]', box).forEach(b => b.onclick = () => { inp.value = b.dataset.chip; sync(); }); sync();
}
async function loadAsync(p) {
  const box = detailBox, id = p.id;
  presaleAdapter.vaultBalance(p).then(v => { if (ui.sel !== id) return; const b = $('[data-vbal]', box), s = $('[data-vsrc]', box); if (b) b.textContent = `${fmtAmt(v.value, v.asset && ASSETS[v.asset] ? v.asset : p.q)} ${v.asset || Q(p).sym}`; if (s) s.innerHTML = srcPill(v.from); })
    .catch(e => { const b = $('[data-vbal]', box); if (b) b.textContent = 'Unavailable'; const s = $('[data-vsrc]', box); if (s) s.innerHTML = `<span class="quiet">Solana did not answer: ${esc(e.message)}</span>`; });
  if (p.status === 'seeded') loadTrading(p);
  const again = () => { if (ui.sel !== id || !detailBox) return; const r = $('[data-risk]', detailBox); if (r) r.outerHTML = riskPanel(p); const ch = $('.pp-pills .risk-chip', detailBox); if (ch) ch.outerHTML = riskChip(riskSummary(riskChecks(p))); if (pg.tab === 'backers') renderTab(p); };
  if (await founderAdapter.refresh(p)) again();
  if (await backersAdapter.enrich(p)) again();
}
/* live numbers in place, so the tab, the chat box and the buy input keep their state */
function patchDetail(p) {
  if (!detailBox || pg.id !== p.id) return;
  if (pg.status !== p.status) return renderDetail(true);
  const s = (k, fn) => { const e = $(k, detailBox); if (e) fn(e); }, pc = pctOf(p), pi = paceInfo(p);
  s('[data-dbar]', e => { if (pc > parseFloat(e.style.width) + 1e-6) bump($('[data-dreadout]', detailBox)); e.style.width = pc + '%'; });
  s('[data-draised]', e => e.textContent = fmtC(p.raised, p.q, true)); s('[data-dpct]', e => e.textContent = Math.floor(pc + 1e-7) + '%'); s('[data-dbackers]', e => e.textContent = p.backers);
  s('[data-sraised]', e => e.textContent = fmtC(p.raised, p.q, true)); s('[data-spct]', e => e.textContent = Math.floor(pc + 1e-7) + '%'); s('[data-sbackers]', e => e.textContent = p.backers);
  s('[data-dchart]', e => e.innerHTML = raiseSVG(p)); s('[data-dbars]', e => e.innerHTML = buysSVG(p)); s('[data-pace]', e => e.textContent = pi.text);
  s('[data-fill] .pace-chip', e => e.outerHTML = paceChip(pi));
}
function tickDetail() {
  const p = find(ui.sel); if (!detailBox || !p || pg.id !== p.id || p.status !== 'live') return;
  const left = fmtLeft(p.endsAt - Date.now());
  ['[data-dtime]', '[data-stime]', '[data-vtime]'].forEach(k => { const e = $(k, detailBox); if (e) e.textContent = left; });
}
