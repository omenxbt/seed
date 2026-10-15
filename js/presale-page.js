/* ==========================================================================
   PROJECT PAGE (#/presale/<id>[/<tab>]). A raise's full page, dark and the full width of the window, in three columns:
   the project on the left (identity, stats, chat), the raise in the middle (fill and pace, raise chart, tabs) and
   the rail on the right (buy, your position). After seeding it becomes a trading view; after a miss it
   shows the refund. Reads go through the adapters in js/adapters; values from demo data carry the "Demo data" pill.
   renderDetail() draws it, patchDetail(p) updates live numbers in place, tickDetail() runs the countdowns.
   ========================================================================== */
/* charts draw at the width of their column, one unit to the pixel, so their labels keep their size however wide the window is */
const chartW = () => { const b = detailBox && $('[data-dchart],[data-candles]', detailBox), w = b ? Math.floor(b.clientWidth) : 0; return w > 0 ? Math.max(320, w) : innerWidth < 720 ? 400 : 720; };
const PTABS = ['overview', 'team', 'roadmap', 'holders', 'backers', 'info', 'reports', 'announcements', 'deck'];
const PTABS_LIVE = ['overview', 'trades', 'traders', 'holders', 'team', 'roadmap', 'backers', 'info', 'reports', 'announcements', 'deck'];
const tabsOf = p => p.status !== 'seeded' ? PTABS.filter(t => t !== 'holders') : p.live ? PTABS_LIVE : PTABS;   // holders exist once the token does; trades once a pool is indexed
const PTAB_ALIAS = { updates: 'announcements', tokenomics: 'team', risk: 'info' };   // the tabs' earlier names, so old links still open them
const pg = { id: null, status: null, tab: 'overview', tf: '1h', mode: 'mcap', side: 'buy', quoteSeq: 0, shownQuote: null, allBackers: false, deck: null, deckPage: 1, walletKey: '' };

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
const statusPill = p => `<span class="st-pill ${p.blacklisted ? 'flagged' : p.status}">${p.blacklisted ? 'Flagged' : RAISE_STATE[p.status]}</span>`;
/* the milestones live on the raise; a draft keeps them on the profile until it opens */
const roadmapOf = p => (p.roadmap && p.roadmap.length ? p.roadmap : profileOf(p).roadmap) || [];
const isFounder = p => !!state.wallet && (p.mine || roleOf(p, walletId()) === 'founder' || roleOf(p, state.wallet.pk) === 'founder');
const xUrl = h => 'https://x.com/' + encodeURIComponent(String(h || '').replace(/^@/, ''));
const fmtDays = d => d < 1 ? 'today' : d < 60 ? `${Math.round(d)} days` : d < 730 ? `${Math.round(d / 30)} months` : `${(d / 365).toFixed(1).replace(/\.0$/, '')} years`;
const initials = n => String(n || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();

/* ---------------------------------------------------------------- header */
/* the token's contract address: the chain's mint once the raise has seeded there, the demo's placeholder on a demo token */
const caOf = p => p.live ? (p.status === 'seeded' && p.mint) || '' : (p.status === 'seeded' && profileOf(p).mint) || '';
const explorer = (a, kind = 'account') => SEED.network === 'devnet' ? `https://solscan.io/${kind}/${a}?cluster=devnet` : solscan(a, kind);
function ppHeader(p) {
  const pr = profileOf(p), C = Q(p), risk = riskSummary(riskChecks(p));
  const socials = SOCIALS.filter(s => safeUrl(pr.links && pr.links[s[0]])).map(s => `<a class="soc" href="${esc(safeUrl(pr.links[s[0]]))}" target="_blank" rel="noopener" aria-label="${s[1]}" title="${s[1]}">${ICONS[s[2]]}</a>`).join('');
  return `<section class="panel pp-id">
      <div class="pp-banner">${pr.banner ? `<img class="pp-bg" src="${esc(pr.banner)}" alt="" style="object-position:${esc(pr.bannerPos || '50% 50%')}">` : ''}<a class="back" href="#">&larr; All raises</a></div>
      <div class="pp-idrow">${artHTML(p, 'pp-art')}${statusPill(p)}</div>
      <div class="pp-name"><h1>${esc(p.name)}</h1><span class="pp-tk num">$${esc(p.ticker)}</span></div>
      <div class="pp-pills"><span class="pair-pill${C.verified ? '' : ' unv'}">${esc(C.sym)} pair</span><a href="#/presale/${esc(p.id)}/info" data-jump-risk>${riskChip(risk)}</a>${p.mine ? '<span class="tag">Yours</span>' : ''}${pr.demo ? DEMO_PILL : ''}</div>
      ${caOf(p) || socials ? `<div class="pp-meta">${caOf(p) ? copyBtn(caOf(p), 'contract address', 'CA ' + shortMint(caOf(p))) : ''}<span class="pp-socials">${socials}</span></div>` : ''}
      <dl class="pp-stats" data-pstats>${ppStats(p)}</dl>
    </section>`;
}
function ppStats(p) {
  const C = Q(p), sym = esc(C.sym), pr = profileOf(p), st = (k, v, cls = '') => `<div class="${cls}"><dt>${k}</dt><dd class="num">${v}</dd></div>`;
  if (p.status === 'seeded') {
    const pool = pg.pool && pg.pool.value;
    return st('Raised', `${fmtC(p.raised, p.q, true)} <em>/ ${fmtC(p.target, p.q, true)} ${sym}</em>`) + st('Raise price', `${fmtPrice(priceOf(p))} ${sym}`) +
      st(`Price${srcMini(pg.pool)}`, pool ? (pool.quote === 'USD' ? fmtUsd(pool.price) : `${fmtPrice(pool.price)} ${esc(pool.quote)}`) : '…') + st(`Market cap${srcMini(pg.pool)}`, pool ? (pool.quote === 'USD' ? fmtUsd(pool.mcap) : `${fmtMcap(pool.mcap, p.q)} ${esc(pool.quote)}`) : '…') +
      st('Backers', p.backers) + st('Seeded', fmtDay(p.resolvedAt));
  }
  if (p.status === 'refunded') {
    const rows = backersAdapter.rows(p), claimed = rows.filter(r => r.refundClaimed).length;
    return st('Final raise', `${fmtC(p.raised, p.q, true)} <em>/ ${fmtC(p.target, p.q, true)} ${sym}</em>`) + st('Filled', Math.floor(pctOf(p) + 1e-7) + '%') + st('Backers', p.backers) +
      st('Refunds claimed', `${claimed} <em>/ ${rows.length}</em>`) + st('Raise price', `${fmtPrice(priceOf(p))} ${sym}`) + st('Closed', fmtDay(p.resolvedAt || p.endsAt));
  }
  if (p.status === 'filled') return st('Raised', `${fmtC(p.raised, p.q, true)} <em>/ ${fmtC(p.target, p.q, true)} ${sym}</em>`) + st('Backers', p.backers) + st('Raise price', `${fmtPrice(priceOf(p))} ${sym}`) +
    st('Filled', fmtAgo(Date.now() - p.filledAt)) + st('Seeding', `${SEED_STEPS.indexOf(p.seedStep || 'filled') + 1} <em>/ ${SEED_STEPS.length}</em>`) + st('Refunds if not seeded by', fmtDate(seedDeadline(p)));
  return st('Raised', `<span data-sraised>${fmtC(p.raised, p.q, true)}</span> <em>/ ${fmtC(p.target, p.q, true)} ${sym}</em>`) + st('Filled', `<span data-spct>${Math.floor(pctOf(p) + 1e-7)}%</span>`) +
    st('Backers', `<span data-sbackers>${p.backers}</span>`) + st('Raise price', `${fmtPrice(priceOf(p))} ${sym}`) + st('Time left', `<span data-stime>${fmtLeft(p.endsAt - Date.now())}</span>`) +
    st('Fee', `1% <em>on top, refunded on a miss</em>`);
}

/* ---------------------------------------------------------------- fill, pace and the raise chart */
function ppFill(p) {
  const C = Q(p), pc = pctOf(p), pi = paceInfo(p);
  if (p.status === 'refunded') {
    const why = p.refundReason, title = why === 'cancelled' ? 'Cancelled by the founder, refunded' : why === 'timeout' ? 'Did not seed in time, refunded' : 'Missed target, refunded';
    const when = why === 'cancelled' ? `Cancelled ${fmtDate(p.resolvedAt)}` : why === 'timeout' ? `Filled ${fmtDate(p.filledAt)}, timed out ${fmtDate(p.resolvedAt)}` : `Deadline passed ${fmtDate(p.resolvedAt || p.endsAt)}`;
    return `<section class="panel pp-card pp-fill pp-missed"><div class="pp-card-h"><h2>${title}</h2></div>
      <div class="readout refunded"><div class="big"><b>${fmtC(p.raised, p.q, true)} <em>/ ${fmtC(p.target, p.q, true)} ${esc(C.sym)}</em></b><span class="num">${Math.floor(pc + 1e-7)}%</span></div>
      <div class="bar"><i style="width:${pc}%"></i></div><div class="sub"><span>${when}</span><span>${plural(p.backers, 'backer')}</span></div></div>
      <p class="pp-note">The raise ${refundReason(p)}. No token was minted and no pool was opened. Every backer claims back exactly what they paid in ${esc(C.sym)}, the 1% fee included. Refund status for each wallet is on the Backers tab.</p></section>`;
  }
  if (p.status === 'seeded') return ppTrading(p);
  if (p.status === 'filled') {
    const i = SEED_STEPS.indexOf(p.seedStep || 'filled');
    return `<section class="panel pp-card pp-fill" data-fill><div class="pp-card-h"><h2>Filled, seeding</h2><span class="pace-chip on">${i + 1} of ${SEED_STEPS.length} steps</span></div>
      <div class="readout live"><div class="big"><b>${fmtC(p.raised, p.q, true)} <em>/ ${fmtC(p.target, p.q, true)} ${esc(C.sym)}</em></b><span class="num">100%</span></div>
      <div class="bar"><i style="width:100%"></i></div><div class="sub"><span>Filled ${fmtAgo(Date.now() - p.filledAt)}</span><span>${plural(p.backers, 'backer')}</span></div></div>
      <p class="pp-note">The raise is closed to buys. Seeding mints the 1,000,000,000 supply, revokes the mint and freeze authorities, opens the Meteora pool with the whole raise and locks it for good. Anyone can run the steps; if they are not all done by ${fmtDate(seedDeadline(p))}, every backer claims a refund instead.</p></section>`;
  }
  return `<section class="panel pp-card pp-fill" data-fill><div class="pp-card-h"><h2>The raise</h2>${paceChip(pi)}${isFounder(p) ? '<button type="button" class="qb qb-sm pp-cancel" data-cancel>Cancel the raise</button>' : ''}</div>
    <div class="readout live" data-dreadout><div class="big"><b><span data-draised>${fmtC(p.raised, p.q, true)}</span> <em>/ ${fmtC(p.target, p.q, true)} ${esc(C.sym)}</em></b><span class="num" data-dpct>${Math.floor(pc + 1e-7)}%</span></div>
      <div class="bar"><i data-dbar style="width:${pc}%"></i></div>
      <div class="sub"><span>Ends in <span class="num" data-dtime>${fmtLeft(p.endsAt - Date.now())}</span></span><span data-dbackers>${plural(p.backers, 'backer')}</span></div></div>
    <p class="pp-pace" data-pace>${esc(pi.text)}</p></section>`;
}
/* where the raise chart puts a time and an amount; the chart and its hover readout both draw from this */
function raiseGeom(p) {
  const W = chartW(), Hh = W < 720 ? 220 : 300, pt = 20, pb = 28, t0 = p.openedAt, t1 = p.endsAt, live = p.status === 'live', end = live ? Date.now() : (p.resolvedAt || t1);
  const X = t => (Math.min(Math.max(t, t0), t1) - t0) / (t1 - t0) * W, Y = v => pt + (1 - Math.min(Math.max(v, 0), p.target) / p.target) * (Hh - pt - pb);
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
/* the bucket the buys chart counts in: the raise's length split into 24 to 72 steps of a round size */
const BUCKETS = [[10e3, '10 seconds'], [30e3, '30 seconds'], [60e3, 'minute'], [5 * 60e3, '5 minutes'], [15 * 60e3, '15 minutes'], [H, 'hour'], [6 * H, '6 hours'], [D, 'day']];
function bucketOf(p) { const span = Math.max(1, p.endsAt - p.openedAt); return BUCKETS.find(([ms]) => span / ms <= 72) || BUCKETS[BUCKETS.length - 1]; }
function buysSVG(p) {
  const W = chartW(), Hh = 88, base = Hh - 22, t0 = p.openedAt, t1 = p.endsAt, [step, unit] = bucketOf(p), n = Math.max(1, Math.ceil((t1 - t0) / step)), c = new Array(n).fill(0);
  for (const b of p.buys || []) { const i = Math.min(n - 1, Math.floor((b.at - t0) / step)); if (i >= 0) c[i]++; }
  const mx = Math.max(1, ...c), bw = W / n, gap = Math.min(bw * 0.3, 4);
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Buys per ${unit}, at most ${mx} in one">${c.map((v, i) => v ? `<rect x="${(i * bw + gap / 2).toFixed(1)}" y="${(base - v / mx * (base - 4)).toFixed(1)}" width="${Math.max(1, bw - gap).toFixed(1)}" height="${(v / mx * (base - 4)).toFixed(1)}" rx="1.5" style="fill:var(--navy-soft);--i:${i}"/>` : '').join('')}
    <path d="M0 ${base}H${W}" style="stroke:var(--hair-2)"/><g font-family="JetBrains Mono, monospace" font-size="12" style="fill:var(--muted)"><text x="0" y="${Hh - 4}">Buys per ${unit}</text><text x="${W}" y="${Hh - 4}" text-anchor="end">Peak ${Math.max(0, ...c)}</text></g></svg>`;
}
function ppChart(p) {
  return `<section class="panel pp-card pp-chart" data-chartcard><div class="pp-card-h"><h2>${p.status === 'seeded' ? 'How it raised' : 'Raised over time'}</h2><span class="legend"><span><i></i>Raised</span>${p.status === 'live' ? '<span><i class="dash"></i>Straight line to target</span>' : ''}<span><i class="bars"></i>Buys per ${bucketOf(p)[1]}</span></span></div>
    <div class="pp-plot" data-plot><div class="pp-svg" data-dchart></div><div class="cx" data-cross aria-hidden="true"><i class="cx-line"></i><i class="cx-dot"></i><span class="cx-tip num"></span></div></div>
    <div class="pp-svg bars" data-dbars></div></section>`;
}

/* ---------------------------------------------------------------- seeded: trading view */
/* the raise price in the chart's quote: the pair asset, or USD at the SOL price the raise opened at */
/* a small note by a figure whose source is not the pool itself: a stand-in pool, the last indexed trade, or the opening price */
const srcMini = pool => { const t = pool && { standin: 'stand-in', trade: 'last trade', open: 'at open' }[pool.from]; return t ? ` <span class="st-mini">${t}</span>` : ''; };
const raiseIn = (p, quote) => quote === 'USD' ? usdOf(p, priceOf(p)) : priceOf(p);
/* Creator fees: the pool's fee so far and how it has split. Anyone can push a claim; it pays the payout wallet and Seed. */
function ppFees(p) {
  const f = feesOf(p), C = Q(p), sym = esc(C.sym), q = n => `${n > 0 && n < 100 ? fmtExact(n, p.q) : fmtC(n, p.q, true)} ${sym}`, pc = payoutChange(p), share = (p.creatorShareBps || SEED.creatorShareBps) / 100;
  return `<section class="panel pp-card pp-fees" data-fees><div class="pp-card-h"><h2>Creator fees</h2><span class="col-note">${share}% of the position's fees to the founder, ${100 - share}% to Seed, fixed at seeding. The pool charges ${poolFeePct(p)}%; Meteora keeps ${SEED.dammProtocolPct}% of that, so ${poolFeePct(p, true)}% of volume reaches the position.</span></div>
    <dl class="fee-grid"><div><dt>Volume traded</dt><dd class="num">${q(f.volume)}</dd></div><div><dt>Fees earned</dt><dd class="num">${q(f.earned)}</dd></div>
      <div><dt>Founder's ${share}%</dt><dd class="num">${q(f.founder)}</dd><span>${f.founderClaimed ? `${q(f.founderClaimed)} claimed` : 'nothing claimed yet'}</span></div>
      <div><dt>Claimable now</dt><dd class="num">${f.reading ? '…' : q(f.founderUnclaimed)}</dd><span>${f.reading ? 'reading the position' : 'to the payout wallet'}</span></div></dl>
    <div class="fee-foot"><span class="num">Payout wallet ${esc(shortMint(p.payoutWallet || ''))}</span>${p.payoutWallet ? copyBtn(p.payoutWallet, 'payout wallet') : ''}${p.takeover ? `<span class="tag">${esc(p.takeover.label || 'Community')}</span>` : ''}
      ${pc ? `<span class="fee-pend">Moving to ${esc(shortMint(pc.to))} ${pc.due ? 'now' : fmtDate(pc.at)}</span>` : ''}
      <button type="button" class="btn btn-ink btn-sm" data-claimfees${f.founderUnclaimed > 0 && !f.reading ? '' : ' disabled'}>Claim fees</button></div>
    <p class="quiet">The claim is permissionless: whoever sends it pays the transaction and the fees still go to the payout wallet and Seed. Seed also claims on a schedule.</p></section>`;
}
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
function candleSVG(series, mode, supply, quote, raise) {
  pg.cg = null;
  if (!series.length) return '<div class="pp-loading">No trades in this window.</div>';
  const W = chartW(), Hh = W < 720 ? 300 : 400, pr = 76, pt = 12, pb = 28, vH = 48, k = mode === 'mcap' ? supply : 1, n = series.length, rv = raise ? raise * k : 0;
  /* the raise price is always in view, so the chart reads as above or below what backers paid */
  const hi0 = Math.max(rv, ...series.map(c => c[2] * k)), lo0 = Math.min(rv || Infinity, ...series.map(c => c[3] * k)), pad = (hi0 - lo0 || hi0 * 0.01 || 1) * 0.06;
  const hi = hi0 + pad, lo = Math.max(0, lo0 - pad), span = (hi - lo) || 1, priceH = Hh - pt - pb - vH;
  const Y = v => pt + (1 - (v - lo) / span) * priceH, vmax = Math.max(...series.map(c => c[5])) || 1, cw = (W - pr) / n;
  const f = v => quote === 'USD' ? fmtUsd(v) : fmtPrice(v);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(q => lo + span * q).filter((v, i, a) => !i || f(v) !== f(a[i - 1])), last = series[n - 1], lastV = last[4] * k, lastUp = last[4] >= last[1];   // a tiny range would repeat labels
  const nx = Math.max(2, Math.min(4, Math.floor((W - pr) / 170) + 1)), xt = [...new Set(Array.from({ length: nx }, (_, j) => Math.round((n - 1) * j / (nx - 1))))];   // time labels that fit side by side
  pg.cg = { W, Hh, pr, pt, pb, vH, priceH, lo, span, k, cw, n, series, f };
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${mode === 'mcap' ? 'Market cap' : 'Price'} candles, last ${f(lastV)}">
    ${ticks.map(v => `<path d="M0 ${Y(v).toFixed(1)}H${W - pr}" style="stroke:var(--hair)"/>${Math.abs(Y(v) - Y(lastV)) < 15 || (rv && Math.abs(Y(v) - Y(rv)) < 15) ? '' : `<text x="${W - pr + 8}" y="${(Y(v) + 4).toFixed(1)}" font-family="JetBrains Mono, monospace" font-size="12" style="fill:var(--muted)">${f(v)}</text>`}`).join('')}
    ${series.map((c, i) => { const x = i * cw + cw / 2, up = c[4] >= c[1], col = up ? CANDLE_UP : CANDLE_DN, yo = Y(c[1] * k), yc = Y(c[4] * k), vh = c[5] / vmax * (vH - 6);
      return `<path d="M${x.toFixed(1)} ${Y(c[2] * k).toFixed(1)}V${Y(c[3] * k).toFixed(1)}" stroke="${col}" stroke-width="1"/><rect x="${(x - cw * 0.35).toFixed(1)}" y="${Math.min(yo, yc).toFixed(1)}" width="${Math.max(1, cw * 0.7).toFixed(1)}" height="${Math.max(1, Math.abs(yc - yo)).toFixed(1)}" fill="${col}" rx=".5"/>
        <rect x="${(x - cw * 0.35).toFixed(1)}" y="${(Hh - pb - vh).toFixed(1)}" width="${Math.max(1, cw * 0.7).toFixed(1)}" height="${vh.toFixed(1)}" fill="${col}" opacity=".28"/>`; }).join('')}
    ${rv ? `<path d="M0 ${Y(rv).toFixed(1)}H${W - pr}" style="stroke:var(--navy-soft)" stroke-width="1.2" stroke-dasharray="5 4"/>${Math.abs(Y(rv) - Y(lastV)) < 15 ? '' : `<text x="${W - pr + 8}" y="${(Y(rv) + 4).toFixed(1)}" font-family="JetBrains Mono, monospace" font-size="12" style="fill:var(--navy-soft)">${f(rv)}</text><text x="${W - pr - 6}" y="${(Y(rv) - 5).toFixed(1)}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="11" style="fill:var(--navy-soft)">${mode === 'mcap' ? 'Raise MC' : 'Raise price'}</text>`}` : ''}
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
/* TradingView's Lightweight Charts, loaded on the first live raise */
const LW_SRC = 'https://cdn.jsdelivr.net/npm/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js';
let lwReady = null;
function loadLw() {
  if (window.LightweightCharts) return Promise.resolve();
  return lwReady || (lwReady = new Promise((ok, no) => { const s = document.createElement('script'); s.src = LW_SRC; s.onload = ok; s.onerror = () => { lwReady = null; no(new Error('the chart library did not load')); }; document.head.appendChild(s); }));
}
const fmtSig4 = v => v >= 1000 ? fmtC(v, 'SOL', true) : v >= 1 ? String(Number(v.toPrecision(4))) : fmtPrice(v);   // market caps on the axis: four significant digits
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
/* the chart for a pool on chain: candles and volume from the indexed trades, the raise price as a line, Price or MCap */
function lwMount(box, p) {
  if (pg.lw && pg.lw.box === box && pg.lw.el.isConnected) return pg.lw;
  if (pg.lw) { try { pg.lw.ro.disconnect(); pg.lw.chart.remove(); } catch (e) {} }
  box.innerHTML = '<div class="lw"></div>'; const el = box.firstElementChild, LW = window.LightweightCharts, k = () => pg.mode === 'mcap' ? SUPPLY : 1;
  const f = v => (pg.mode === 'mcap' ? fmtSig4(v) : fmtPrice(v));
  const chart = LW.createChart(el, { width: el.clientWidth || 600, height: innerWidth < 720 ? 300 : 400, layout: { background: { color: 'transparent' }, textColor: cssVar('--muted') || '#8a8f98', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
    grid: { vertLines: { color: cssVar('--hair') || '#1f232b' }, horzLines: { color: cssVar('--hair') || '#1f232b' } }, rightPriceScale: { borderColor: cssVar('--hair-2') || '#2a2f38', scaleMargins: { top: 0.14, bottom: 0.22 } },
    timeScale: { borderColor: cssVar('--hair-2') || '#2a2f38', timeVisible: true, secondsVisible: false, tickMarkFormatter: (t, type) => { const d = new Date(t * 1000); return type >= 2 ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }); } }, localization: { timeFormatter: t => new Date(t * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), priceFormatter: f }, crosshair: { mode: LW.CrosshairMode.Normal }, handleScale: { axisPressedMouseMove: true }, handleScroll: true });
  const candles = chart.addCandlestickSeries({ upColor: CANDLE_UP, downColor: CANDLE_DN, borderVisible: false, wickUpColor: CANDLE_UP, wickDownColor: CANDLE_DN, priceFormat: { type: 'custom', formatter: f, minMove: 1e-12 } });
  const vol = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '', color: cssVar('--navy-soft') || '#5B8CFF' });
  vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
  const lw = pg.lw = { box, el, chart, candles, vol, raiseLine: null, k };
  const ro = new ResizeObserver(() => { if (!el.isConnected) return ro.disconnect(); chart.applyOptions({ width: el.clientWidth, height: innerWidth < 720 ? 300 : 400 }); });
  ro.observe(el); lw.ro = ro;
  return lw;
}
function lwData(lw, series, p) {
  const k = lw.k(), rows = series.map(c => ({ time: Math.floor(c[0] / 1000), open: c[1] * k, high: c[2] * k, low: c[3] * k, close: c[4] * k }));
  lw.candles.setData(rows); lw.vol.setData(series.map(c => ({ time: Math.floor(c[0] / 1000), value: c[5], color: c[4] >= c[1] ? 'rgba(47,191,122,.45)' : 'rgba(240,85,75,.45)' })));
  if (lw.raiseLine) lw.candles.removePriceLine(lw.raiseLine);
  lw.raiseLine = lw.candles.createPriceLine({ price: priceOf(p) * k, color: cssVar('--navy-soft') || '#5B8CFF', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: pg.mode === 'mcap' ? 'Raise MC' : 'Raise price' });
  lw.chart.timeScale().fitContent();
}
function lwSet(lw, c, p) { const k = lw.k(); lw.candles.update({ time: Math.floor(c[0] / 1000), open: c[1] * k, high: c[2] * k, low: c[3] * k, close: c[4] * k }); lw.vol.update({ time: Math.floor(c[0] / 1000), value: c[5], color: c[4] >= c[1] ? 'rgba(47,191,122,.45)' : 'rgba(240,85,75,.45)' }); }
/* the pool's price and depth re-read from its vaults after a trade: the header's Price and Market cap, the card and the
   position's worth all move together, from the same source as on load */
async function refreshSpot(p) {
  try {
    if (typeof damm === 'undefined' || !p.pool) return; damm.states[p.pool] = null;
    const rs = await damm.reserves(p); if (pg.id !== p.id) return;
    p.spot = rs.price; if (pg.pool && pg.pool.value) { pg.pool.value.price = rs.price; pg.pool.value.liquidity = rs.pair * 2; pg.pool.value.mcap = pg.pool.value.fdv = rs.price * SUPPLY; }
    const tf = detailBox && $('[data-tfee]', detailBox); if (tf) tf.textContent = `${poolFeePct(p)}%`;
    const ps = detailBox && $('[data-pstats]', detailBox); if (ps) ps.innerHTML = ppStats(p);
    const pw = detailBox && $('[data-poswrap]', detailBox); if (pw) { pw.innerHTML = positionPanel(p); const dc = $('[data-dclaim]', pw); if (dc) dc.onclick = () => claim(p, dc); }
    refreshPoolCard(p);
  } catch (e) { console.warn('spot:', e.message); }
}
/* the figures beside the chart: pool reserves, the last day's volume and trades, the holder count, the price against the raise */
async function refreshPoolCard(p) {
  const card = detailBox && $('[data-poolcard]', detailBox); if (!card || !pg.pool) return;
  const v = pg.pool.value, C = Q(p), q = n => `${n > 0 && n < 100 ? fmtExact(n, p.q) : fmtC(n, p.q, true)} ${esc(C.sym)}`;
  if (p.live) {
    if (Date.now() - (pg.statsAt || 0) > 15e3) { pg.statsAt = Date.now(); try { pg.stats = await tradesAdapter.stats(p); } catch (e) {} if (pg.holdersAt == null || Date.now() - pg.holdersAt > 60e3) { pg.holdersAt = Date.now(); backersAdapter.holderCount(p).then(n => { pg.holderCount = n; if (pg.id === p.id) refreshPoolCard(p); }).catch(() => {}); } }
    const st = pg.stats || { volume24h: 0, trades24h: 0 }, price = p.spot || v.price, x = price / priceOf(p);
    card.innerHTML = `<div class="pool-grid"><div><dt>Pair</dt><dd>${esc(v.pair)}</dd></div><div><dt>Liquidity</dt><dd class="num">${v.liquidity != null ? q(v.liquidity) : '<span class="quiet" title="The RPC did not answer for the pool just now">—</span>'}</dd></div>
      <div><dt>vs raise price</dt><dd class="num ${x >= 1 ? 'up' : 'down'}">${x.toFixed(2)}×</dd></div><div><dt>24h volume</dt><dd class="num">${q(st.volume24h)}</dd></div>
      <div><dt>24h trades</dt><dd class="num">${st.trades24h}</dd></div><div><dt>Holders</dt><dd class="num">${pg.holderCount != null ? pg.holderCount : '—'}</dd></div></div>
      <div class="pool-foot"><span class="num">${esc(v.dex)} pool ${esc(shortMint(v.address))}</span>${copyBtn(v.address, 'pool address')}<span class="pool-lock">${RISK_ICON.pass}Liquidity locked for good</span>
        <a class="bar-link" href="${esc(v.url)}" target="_blank" rel="noopener">Pool on Meteora ${ICONS.out}</a>${srcPill(pg.pool.from)}</div>`;
    return;
  }
  const x = v.price / raiseIn(p, v.quote);
  card.innerHTML = `<div class="pool-grid"><div><dt>Pair</dt><dd>${esc(v.pair)}</dd></div><div><dt>Liquidity</dt><dd class="num">${v.quote === 'USD' ? fmtUsd(v.liquidity) : `${fmtC(v.liquidity, p.q)} ${esc(v.quote)}`}</dd></div>
      <div><dt>vs raise price</dt><dd class="num ${x >= 1 ? 'up' : 'down'}">${x.toFixed(2)}×</dd></div><div><dt>24h volume</dt><dd class="num">${v.quote === 'USD' ? fmtUsd(v.volume24h) : fmtC(v.volume24h, p.q)}</dd></div></div>
      <div class="pool-foot"><span class="num">${esc(v.dex)} pool ${esc(shortMint(v.address))}</span>${copyBtn(v.address, 'pool address')}<span class="pool-lock">${RISK_ICON.pass}Liquidity locked for good</span>
        <a class="bar-link" href="${esc(isRealAddr(v.address) ? explorer(v.address) : v.url)}" target="_blank" rel="noopener">Position on chain ${ICONS.out}</a>${srcPill(pg.pool.from)}</div>`;
}
async function loadTrading(p) {
  const box = detailBox && $('[data-candles]', detailBox), card = detailBox && $('[data-poolcard]', detailBox); if (!box) return;
  if (p.live) return loadLiveTrading(p, box);
  try {
    const pool = pg.pool = await presaleAdapter.pool(p), ser = await presaleAdapter.candles(p, pg.tf);
    if (ui.sel !== p.id) return;
    pg.series = ser.value; box.innerHTML = candleSVG(ser.value, pg.mode, pool.value.supply, pool.value.quote, raiseIn(p, pool.value.quote));
    const v = pool.value, x = v.price / raiseIn(p, v.quote);
    card.innerHTML = `<div class="pool-grid"><div><dt>Pair</dt><dd>${esc(v.pair)}</dd></div><div><dt>Liquidity</dt><dd class="num">${v.quote === 'USD' ? fmtUsd(v.liquidity) : `${fmtC(v.liquidity, p.q)} ${esc(v.quote)}`}</dd></div>
      <div><dt>vs raise price</dt><dd class="num ${x >= 1 ? 'up' : 'down'}">${x.toFixed(2)}×</dd></div><div><dt>24h volume</dt><dd class="num">${v.quote === 'USD' ? fmtUsd(v.volume24h) : fmtC(v.volume24h, p.q)}</dd></div></div>
      <div class="pool-foot"><span class="num">${esc(v.dex)} pool ${esc(shortMint(v.address))}</span>${copyBtn(v.address, 'pool address')}<span class="pool-lock">${RISK_ICON.pass}Liquidity locked for good</span>
        <a class="bar-link" href="${esc(isRealAddr(v.address) ? explorer(v.address) : v.url)}" target="_blank" rel="noopener">Position on chain ${ICONS.out}</a>${srcPill(pool.from)}</div>
      `;
    const ps = detailBox && $('[data-pstats]', detailBox); if (ps) ps.innerHTML = ppStats(p);
    if (pg.syncTrade) pg.syncTrade();
  } catch (e) { box.innerHTML = `<div class="pp-loading">The pool could not be loaded (${esc(e.message)}). It retries in a minute.</div>`; }
}

/* a pool on chain: the indexed trades as candles in Lightweight Charts, the pool's figures, the position's fees */
async function loadLiveTrading(p, box) {
  if (!pg.unwatch) pg.unwatch = tradesAdapter.watch(p, t => onLiveTrade(p, t));   // first, so nothing lands between the fetch and the watch
  try {
    await loadLw(); pg.pool = await presaleAdapter.pool(p); pg.series = null; const ser = await tradesAdapter.candles(p, pg.tf);
    if (ui.sel !== p.id || !box.isConnected) return;
    (pg.pendingTrades || []).forEach(t => { if (!(pg.trades || []).some(x => x.signature === t.signature)) foldTrade(ser, pg.tf, t); }); pg.pendingTrades = null;   // what landed while the series loaded
    pg.series = ser; const lw = lwMount(box, p); lwData(lw, ser, p);
    pg.statsAt = 0; await refreshPoolCard(p);
    const tf = detailBox && $('[data-tfee]', detailBox); if (tf) tf.textContent = `${poolFeePct(p)}%`;   // the pool's own fee, now that it has been read
    const cap = detailBox && $('[data-trade="live"] .rail-cap', detailBox); if (cap) cap.textContent = `A swap on the raise's Meteora DAMM v2 pool, signed in your wallet. The pool's ${poolFeePct(p)}% fee, less Meteora's ${SEED.dammProtocolPct}%, pays the founder and Seed 70/30.`;
    const ps = detailBox && $('[data-pstats]', detailBox); if (ps) ps.innerHTML = ppStats(p);
    if (pg.syncTrade) pg.syncTrade();
    loadLiveFees(p);
  } catch (e) { if (pg.lw) { try { pg.lw.ro.disconnect(); pg.lw.chart.remove(); } catch (x) {} pg.lw = null; } box.innerHTML = `<div class="pp-loading">The chart could not be loaded (${esc(e.message)}).</div>`; }
}
async function loadLiveFees(p, fresh) {
  try { const f = await damm.fees(p, fresh); if (!f || pg.id !== p.id) return; (chain.feesLive = chain.feesLive || {})[p.id] = f; const card = detailBox && $('[data-fees]', detailBox); if (card) { card.outerHTML = ppFees(p); bindRail(p); } }
  catch (e) { console.warn('position fees:', e.message); }
}
/* ---------------------------------------------------------------- right rail */
/* The trade panel. A live raise only takes deposits: there is nothing to sell until it seeds, and a deposit comes back in full if
   the raise misses. A seeded token is bought and sold here against its pool. Both go through index.html (executeBuy, executeSwap),
   which simulate on the demo wallet and refuse a real one until the Seed program exists. bindRail() wires the panel. */
function tradePanel(p) { return p.blacklisted ? flaggedPanel(p) : p.status === 'live' ? depositPanel(p) : p.status === 'seeded' ? swapPanel(p) : p.status === 'filled' ? seedingPanel(p) : ''; }
/* a raise flagged for fraud takes no buys and gets no trade panel; the pool, if there is one, is still locked on Meteora */
function flaggedPanel(p) {
  return `<section class="panel rail-card rail-flag"><h3>${p.status === 'seeded' ? 'Trading here is off' : 'Buying is off'}</h3>
    <p class="rail-meta">Seed admins flagged this raise for fraud${p.flag ? ` on ${fmtDate(p.flag.at)}` : ''}. ${p.status === 'seeded' ? 'The pool on Meteora is still locked and open, but Seed no longer routes trades to it.' : p.status === 'live' ? 'It takes no more buys.' : ''} The founder wallet, and its X account if one is linked, cannot open another raise.</p>
    <a class="bar-link" href="#/presale/${esc(p.id)}/reports">The reports ${ICONS.out}</a></section>`;
}
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
    <p class="rail-meta num">${pr.minBuy ? `Min ${fmtC(pr.minBuy, p.q)} ${sym}${pr.minBuyPct ? ` (${pr.minBuyPct}% of supply)` : ''}` : 'No minimum'} · ${pr.maxBuy ? `Max ${fmtC(pr.maxBuy, p.q)} ${sym}${pr.maxBuyPct ? ` (${pr.maxBuyPct}% of supply)` : ''} per wallet` : 'No maximum per wallet'}</p>
    <p class="rail-err" data-buyerr role="alert"></p>
    <button type="button" class="btn btn-navy btn-block" data-go>Deposit</button>
    <p class="rail-meta">A raise only takes deposits: there is nothing to sell until it seeds. If it misses its target, you claim back everything you put in.</p>
    <p class="rail-cap">${p.live ? 'Sent from your wallet on Solana ' + esc(SEED.network) + '. The 1% fee rides on top and comes back with a refund.' : 'Simulated on the demo wallet. No transaction is sent.'}</p></section>`;
}
function swapPanel(p) {
  const side = pg.side === 'sell' ? 'sell' : 'buy', pool = profileOf(p).pool, standin = !!(pool && isRealAddr(pool.address));
  if (p.live) return liveTradePanel(p, side);
  return `<section class="panel rail-card" data-trade="swap"><div class="rail-h"><h3>Trade $${esc(p.ticker)}</h3>${p.live ? '' : DEMO_PILL}</div>
    <div class="seg mini-seg side-seg" data-side role="group" aria-label="Buy or sell">${['buy', 'sell'].map(v => `<button type="button" data-v="${v}" aria-pressed="${side === v}">${v === 'buy' ? 'Buy' : 'Sell'}</button>`).join('')}</div>
    <div class="trade-top"><label class="rail-lab" for="ppAmt">You pay</label><span class="rail-bal num" data-bal></span></div>
    <div class="inp"><input id="ppAmt" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="Amount to pay"><span class="suf" data-paysym></span></div>
    <div class="chips" data-tchips></div>
    <div class="recv"><span>You receive</span><b class="num" data-recv></b></div>
    <dl class="kv"><div><dt>Price</dt><dd data-tprice></dd></div><div><dt>Price impact</dt><dd data-timpact></dd></div></dl>
    <p class="rail-err" data-buyerr role="alert"></p>
    <button type="button" class="btn btn-navy btn-block" data-go>Buy</button>
    <p class="rail-cap">${p.live ? `Swaps on the raise's Meteora pool, signed in your wallet.` : 'Simulated pool, on the demo wallet. No transaction is sent.'}</p>
    ${standin && !p.live ? `<p class="standin-note">In-app trades run against a simulated $${esc(p.ticker)} pool that opened at the raise price. The chart and the pool figures beside it are the stand-in pool’s.</p>` : ''}</section>`;
}
/* a token on chain trades against its DAMM v2 pool right here: Meteora's SDK quotes it, the wallet signs it. The slippage
   setting bounds what the swap may return; a price impact above 5% is called out before the button. */
function liveTradePanel(p, side) {
  const C = Q(p), sym = esc(C.sym);
  return `<section class="panel rail-card" data-trade="live" data-now="${side}"><div class="rail-h"><h3>Trade $${esc(p.ticker)}</h3><span class="slip num" title="Slippage: the most the price may move against you before the swap fails"><span class="quiet">Slippage</span><input data-slip inputmode="decimal" value="${damm.slippage}" aria-label="Slippage in percent"><span class="quiet">%</span></span></div>
    <div class="pri" data-pri><span class="quiet">Priority fee</span><div class="seg mini-seg"><button type="button" data-pv="auto" aria-pressed="${damm.priority === 'auto'}">Auto</button><button type="button" data-pv="custom" aria-pressed="${damm.priority !== 'auto'}">Custom</button></div><span class="slip num"${damm.priority === 'auto' ? ' hidden' : ''}><input data-prival inputmode="decimal" value="${damm.priority === 'auto' ? '0.0001' : damm.priority}" aria-label="Priority fee in SOL"><span class="quiet">SOL</span></span></div>
    <div class="seg mini-seg side-seg" data-side role="group" aria-label="Buy or sell">${['buy', 'sell'].map(v => `<button type="button" data-v="${v}" aria-pressed="${side === v}">${v === 'buy' ? 'Buy' : 'Sell'}</button>`).join('')}</div>
    <div class="trade-top"><label class="rail-lab" for="ppAmt">You pay</label><span class="rail-bal num" data-bal></span></div>
    <div class="inp"><input id="ppAmt" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="Amount to pay"><span class="suf" data-paysym>${side === 'sell' ? '$' + esc(p.ticker) : sym}</span></div>
    <div class="chips" data-tchips></div>
    <div class="recv"><span>You receive</span><b class="num" data-recv>—</b></div>
    <dl class="kv"><div><dt>Price</dt><dd data-tprice>—</dd></div><div><dt>Price impact</dt><dd data-timpact>—</dd></div><div><dt>Minimum received</dt><dd data-tmin>—</dd></div><div><dt>Pool fee</dt><dd data-tfee>${poolFeePct(p)}%</dd></div></dl>
    <p class="rail-err" data-buyerr role="alert"></p>
    <button type="button" class="btn btn-navy btn-block" data-go>${side === 'sell' ? 'Sell' : 'Buy'} $${esc(p.ticker)}</button>
    <p class="rail-cap">A swap on the raise's Meteora DAMM v2 pool, signed in your wallet. The pool's ${poolFeePct(p)}% fee, less Meteora's ${SEED.dammProtocolPct}%, pays the founder and Seed 70/30.</p>${tradeOn(p)}</section>`;
}
/* where else the token trades, with the mint filled in. Mainnet only: none of these index devnet. Each URL form was checked
   against the live site (Axiom /t/<mint> forwards to the pool page; Birdeye's canonical path is /solana/token/<mint>). */
const TRADE_ON = [['Axiom', m => `https://axiom.trade/t/${m}`], ['GMGN', m => `https://gmgn.ai/sol/token/${m}`], ['DEXScreener', m => `https://dexscreener.com/solana/${m}`], ['Birdeye', m => `https://birdeye.so/solana/token/${m}`], ['Jupiter', m => `https://jup.ag/tokens/${m}`]];
function tradeOn(p) {
  if (SEED.network !== 'mainnet' || !p.mint) return '';
  return `<div class="trade-on"><span class="quiet">Trade on</span>${TRADE_ON.map(([n, f]) => `<a href="${esc(f(p.mint))}" target="_blank" rel="noopener">${n} ${ICONS.out}</a>`).join('')}</div>`;
}
/* the fee of this raise's pool, in percent: the pool's own once it has been read, the site's setting before that; `net` is what
   reaches the position after Meteora's share */
const poolFeePct = (p, net) => { const bps = p.poolFeeBps || SEED.poolFeeBps, pct = bps / 100 * (net ? 1 - SEED.dammProtocolPct / 100 : 1); return String(Number(pct.toFixed(3))); };
/* an amount of the pair asset with the small ones kept: 0.0227 SOL, not 0.02 */
const fmtExact = (n, q) => n >= 100 ? fmtAmt(n, q) : String(Number(n.toFixed(n >= 1 ? 4 : 6)));
/* a toast that may carry a link, for a confirmed transaction */
function toastLink(text, href, label) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `${esc(text)} <a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)} ${ICONS.out}</a>`; $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, 7000);
}
function positionPanel(p) {
  if (!state.wallet) return '';
  const C = Q(p), sym = esc(C.sym), pos = state.positions[p.id] || 0, claimed = state.claimed[p.id];
  const held = p.status === 'seeded' ? heldOf(p) : 0, row = (k, v) => `<div><dt>${k}</dt><dd class="num">${v}</dd></div>`;
  const holding = held ? row('You hold', `${fmtTok(held)} $${esc(p.ticker)}`) + row('Worth', `${fmtAmt(held * (p.live ? (p.spot || priceOf(p)) : spotOf(p)), p.q)} ${sym}`) : '';
  if (!pos) return `<section class="panel rail-card" data-position><h3>Your position</h3>${holding ? `<dl class="kv">${holding}</dl>` : `<p class="rail-meta">${esc(state.wallet.addr)} has not backed ${esc(p.name)}.</p>`}</section>`;
  const tok = tokensFor(p, pos), share = pos / (p.raised || 1) * 100;
  let act = '';
  if (p.status === 'refunded') act = claimed ? `<div class="mine"><span>Refund claimed</span><span class="num">${fmtAmt(pos, p.q)} ${sym}</span></div>` : `<button class="btn btn-navy btn-block" data-dclaim>Claim refund of ${fmtAmt(pos, p.q)} ${sym}</button>`;
  else if (p.status === 'seeded') act = claimed ? `<div class="mine"><span>Claimed</span><span class="num">${fmtTok(tok)} $${esc(p.ticker)}</span></div>` : `<button class="btn btn-navy btn-block" data-dclaim>Claim ${fmtTok(tok)} $${esc(p.ticker)}</button>`;
  return `<section class="panel rail-card" data-position><h3>Your position</h3><dl class="kv">${row('Amount in', `${fmtAmt(pos, p.q)} ${sym}`)}${row(p.status === 'refunded' ? 'Tokens' : 'Tokens owed', p.status === 'refunded' ? 'None, it refunded' : `${fmtTok(tok)} $${esc(p.ticker)}`)}
    ${row('Share of raise', share.toFixed(share < 1 ? 3 : 2) + '%')}${p.status === 'live' ? row('If it refunds', `${fmtAmt(pos, p.q)} ${sym} back`) : ''}${holding}</dl>${act}</section>`;
}
/* the info panel is a tab under the charts: what Seed checked, then the founder's choices as facts */
function tabInfo(p) {
  const checks = riskChecks(p), s = riskSummary(checks), demo = checks.some(c => c.from === 'demo'), li = c => `<li class="${c.level}">${RISK_ICON[c.level]}<div><b>${esc(c.label)}</b><span>${esc(c.reason)}</span></div></li>`;
  return tabHead('Info', '', riskChip(s)) +
    `<ul class="risk-list risk-grid" data-risk>${checks.filter(c => !isFact(c)).map(li).join('')}</ul>
    <p class="info-h">The founder's choices</p><ul class="risk-list risk-grid">${checks.filter(isFact).map(li).join('')}</ul>
    <p class="quiet risk-note">Seed enforces the cap, the refunds, the locked pool and the 90-day unlock minimum in its program, and acts on fraud. Everything else here is for you to weigh.${demo ? ` ${DEMO_PILL} Checks run on demo data where no live account exists.` : ''}</p>` + infoAddresses(p);
}
/* the accounts behind a raise that is on chain, each with a copy button and an explorer link */
function infoAddresses(p) {
  if (!p.live || !p.address) return '';
  const row = (k, a, sub) => `<div><dt>${k}</dt><dd><span class="num">${esc(shortMint(a))}</span>${copyBtn(a, k.toLowerCase())}<a class="bar-link" href="${esc(explorer(a))}" target="_blank" rel="noopener">${ICONS.out}</a>${sub ? `<span class="quiet">${sub}</span>` : ''}</dd></div>`;
  return `<p class="info-h">On chain</p><dl class="kv kv-wide addr-list">${row('Raise account', p.address, 'the program account that holds the terms, the escrow and the state')}${p.mint ? row('Token mint', p.mint, 'the contract address; mint and freeze authority revoked') : ''}${p.pool ? row('Pool', p.pool, 'Meteora DAMM v2, the position locked under the raise') : ''}${p.payoutWallet ? row('Payout wallet', p.payoutWallet, '') : ''}</dl>`;
}
/* the chat sits under the project card, open beside every tab */
function chatPanel(p) { return typeof chatCard === 'function' ? chatCard(p) : ''; }
function mountChat(p) { const c = detailBox && $('[data-chat]', detailBox); if (c && typeof chatMount === 'function') { pg.chatW = walletId(); chatMount(p, c); } }
function ppRail(p) { return tradePanel(p) + `<div class="pp-pos" data-poswrap>${positionPanel(p)}</div>`; }
/* who is behind it: the X account the founder signed in with, their earlier raises on Seed and where their money goes */
function ppFounder(p) {
  const x = p.xAccount || {}, pr = profileOf(p), f = pr.founder || {}, now = Date.now(), age = x.createdAt ? (now - x.createdAt) / D : null, past = p.pastRaises || [];
  const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  const outcome = r => ({ seeded: '<span class="btag ok">Seeded</span>', refunded: '<span class="btag">Refunded</span>', flagged: '<span class="btag bad">Flagged</span>' })[r.outcome] || esc(r.outcome || '');
  const fw = typeof founderOf === 'function' ? founderOf(p) : '';
  return `<section class="panel rail-card pp-founder"><div class="rail-h"><h3>Founder</h3>${pr.demo ? DEMO_PILL : ''}</div>
    ${x.handle ? `<a class="x-acct" href="${esc(xUrl(x.handle))}" target="_blank" rel="noopener">${ICONS.x}<span><b>@${esc(x.handle)}</b><span class="num">${x.verified ? 'Verified X' : x.typed ? 'Typed on devnet' : 'Linked'}${x.followers != null ? ` · ${plural(Number(x.followers), 'follower')}` : ''}${age != null ? ` · account ${fmtDays(age)} old` : ''}</span></span>${x.verified ? `<span class="vbadge x-ok" title="Verified: signed in with X">${RISK_ICON.pass}</span>` : ''}</a>`
      : `<p class="rail-meta">Opened with a wallet. No X account linked.</p>${isFounder(p) && p.status !== 'refunded' && (p.live || !isReal()) ? `<button type="button" class="qb" data-linkx>Link your X</button><p class="quiet">Adds a verified badge to this raise. Optional.</p>` : ''}`}
    <dl class="kv">${p.blacklisted ? row('Blacklisted', `<span class="bad">the founder wallet${x.handle ? ' and @' + esc(x.handle) : ''}</span>`) : ''}${past.length ? `<div class="wide"><dt>Raises on Seed</dt><dd><a class="past-list" href="#/founder/${esc(fw)}" title="The founder's profile">${past.slice(0, 4).map(r => `<span class="past">$${esc(r.ticker)} ${outcome(r)}</span>`).join('')}${past.length > 4 ? `<span class="past quiet">+${past.length - 4} more</span>` : ''}</a></dd></div>` : row('Raises on Seed', `<a href="#/founder/${esc(fw)}" title="The founder's profile">This is the first</a>`)}
      ${row('Payout wallet', p.payoutWallet ? `<span class="num">${esc(shortMint(p.payoutWallet))}</span>${copyBtn(p.payoutWallet, 'payout wallet')}` : 'Set at opening')}${p.takeover ? row('Held by', esc(p.takeover.label || 'the community')) : ''}</dl>
    ${past.some(r => r.note) ? `<p class="quiet">${past.filter(r => r.note).map(r => `$${esc(r.ticker)}: ${esc(r.note)}`).join(' ')}</p>` : ''}</section>`;
}
/* the strips at the top of the page: a fraud flag, a community takeover, a payout wallet on the move, the latest announcement */
function ppNotices(p) {
  const out = [], pc = payoutChange(p);
  if (p.blacklisted) out.push(`<div class="panel pp-notice bad"><span class="n-ico">${RISK_ICON.fail}</span><div><b>Flagged for fraud</b><span>Seed admins flagged this raise${p.flag ? ` on ${fmtDate(p.flag.at)}` : ''} after a backer report. Buying is off and the founder wallet is blacklisted from opening another raise, with its X account if one is linked.</span></div><a href="#/presale/${esc(p.id)}/reports">Reports</a></div>`);
  if (p.takeover) out.push(`<div class="panel pp-notice navy"><span class="n-ico">${RISK_ICON.pass}</span><div><b>Community takeover</b><span>Approved ${fmtDate(p.takeover.at)}: creator fees and the team's unlocks now go to ${esc(p.takeover.label || 'a backer wallet')} (${esc(shortMint(p.takeover.to))}), not the founder.</span></div><a href="#/presale/${esc(p.id)}/reports">Reports</a></div>`);
  if (pc) out.push(`<div class="panel pp-notice"><span class="n-ico">${ICONS.out}</span><div><b>Payout wallet changing</b><span>The founder asked to move the payout wallet to ${esc(shortMint(pc.to))}. It takes effect ${pc.due ? 'with the next claim' : fmtDate(pc.at)}, ${SEED.payoutDelayDays} days after the request.</span></div></div>`);
  return out.join('') + ppAnnounce(p);
}

/* ---------------------------------------------------------------- tabs */
function tabLabel(p, t) {
  if (t === 'info') return 'Info';
  if (t === 'team') return 'Team &amp; unlocks';
  if (t === 'reports') { const n = (p.reports || []).length; return `Reports${n ? ` <span class="ct num">${n}</span>` : ''}`; }
  if (t === 'announcements') { const n = updatesAdapter.list(p).length; return `Announcements${n ? ` <span class="ct num">${n}</span>` : ''}`; }
  return t[0].toUpperCase() + t.slice(1);
}
function ppTabs(p) {
  return `<section class="panel pp-tabs"><div class="tabbar" role="tablist" aria-label="${esc(p.name)} sections">${tabsOf(p).map(t => `<a role="tab" href="#/presale/${esc(p.id)}/${t}" data-ptab="${t}" aria-selected="${pg.tab === t}">${tabLabel(p, t)}</a>`).join('')}</div>
    <div class="tabbody" data-tabbody role="tabpanel"></div></section>`;
}
function renderTab(p) {
  const body = detailBox && $('[data-tabbody]', detailBox); if (!body) return;
  $$('[data-ptab]', detailBox).forEach(a => a.setAttribute('aria-selected', String(a.dataset.ptab === pg.tab))); placeTabInd();
  const fn = { overview: tabOverview, deck: tabDeck, team: tabTeam, roadmap: tabRoadmap, holders: tabHolders, trades: tabTrades, traders: tabTraders, backers: tabBackers, info: tabInfo, reports: tabReports, announcements: tabAnnouncements }[pg.tab] || tabOverview;
  body.innerHTML = fn(p); afterTab(p, body);
  const key = p.id + '/' + pg.tab;   // the tab's content eases in when the tab changes, not when it is redrawn in place
  if (pg.shown !== key) { pg.shown = key; body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap'); }
}
const tabHead = (title, from, extra = '') => `<div class="tab-h"><h2>${title}</h2>${from ? srcPill(from) : ''}${extra}</div>`;
const prFrom = p => profileOf(p).demo ? 'demo' : '';

function tabOverview(p) {
  const pr = profileOf(p), C = Q(p), sym = esc(C.sym), sp = splitOf(p.teamBps), pct = n => `${(n / SUPPLY * 100).toFixed(n / SUPPLY * 100 % 1 ? 1 : 0)}%`, use = p.tokenUseCase && p.tokenUseCase !== 'none' ? p.tokenUseCase : '';
  const links = SOCIALS.filter(s => safeUrl(pr.links && pr.links[s[0]])).map(s => `<a class="link-card" href="${esc(safeUrl(pr.links[s[0]]))}" target="_blank" rel="noopener">${ICONS[s[2]]}<span><b>${s[1]}</b><span>${esc(hostOf(pr.links[s[0]]))}</span></span></a>`).join('');
  const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  return `<div class="ov"><div class="ov-a">${tabHead('About', prFrom(p))}<div class="md">${md(pr.description) || `<p class="quiet">The founder has not written a description yet.</p>`}</div>
      <div class="tab-h sub"><h2>What the token does</h2></div><p class="use">${use ? esc(use) : 'None. The founder listed no use for the token: this is a bet on the team.'}</p></div>
    <div class="ov-b"><div class="tab-h sub"><h2>The token</h2></div><dl class="kv kv-wide">
      ${row('Supply', '<span class="num">1,000,000,000</span>, mint and freeze revoked at seeding')}${row('Backers', `<span class="num">${pct(sp.backers)}</span>, claimable at seeding`)}${row('Pool', `<span class="num">${pct(sp.pool)}</span> with the whole raise, locked for good`)}
      ${row('Team', sp.team ? `<span class="num">${pct(sp.team)}</span>, ${esc(fmtSchedule(p.teamSchedule))}` : '<span class="num">0%</span>, no team tokens')}${row('Raise price', `<span class="num">${fmtPrice(priceOf(p))} ${sym}</span> fixed`)}${row('FDV at the raise', `<span class="num">${fmtC(fdvOf(p), p.q, true)} ${sym}</span> (${fmtUsd(fdvUsdOf(p))})`)}
      ${row('Target', `<span class="num">${fmtC(p.target, p.q)} ${sym}</span> (${fmtUsd(p.targetUsd || usdOf(p, p.target))})`)}</dl>
    <div class="tab-h sub"><h2>Links</h2></div>${links ? `<div class="links">${links}</div>` : '<p class="quiet">No website or socials listed.</p>'}</div></div>`;
}
/* the roadmap: milestones the founder listed, shown as given; a planned one past its date reads as late */
function tabRoadmap(p) {
  const list = roadmapOf(p), now = Date.now();
  if (!list.length) return tabHead('Roadmap', '') + quietEmpty('The founder listed no milestones.');
  const items = list.slice().sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0)).map(r => { const due = r.dueAt || now, late = r.status === 'planned' && due < now - D, proof = safeUrl(r.proofUrl || r.proof), st = r.status === 'shipped' ? 'shipped' : r.status === 'missed' ? 'missed' : late ? 'late' : 'planned';
    return `<li class="${st}"><span class="rm-dot">${st === 'shipped' ? RISK_ICON.pass : st === 'missed' ? RISK_ICON.fail : st === 'late' ? RISK_ICON.warn : ''}</span>
      <div><b>${esc(r.title)}</b><span class="num">${st === 'shipped' ? 'Shipped' : st === 'missed' ? 'Missed' : st === 'late' ? `Due ${fmtDay(due)}, ${fmtDays((now - due) / D)} late` : 'Due'}${st === 'late' ? '' : ' ' + fmtDay(due)}</span>${proof ? ` <a href="${esc(proof)}" target="_blank" rel="noopener">Proof ${ICONS.out}</a>` : ''}</div></li>`; }).join('');
  const done = list.filter(r => r.status === 'shipped').length;
  return tabHead('Roadmap', prFrom(p), ` <span class="quiet">${done} of ${plural(list.length, 'milestone')} shipped</span>`) + `<ol class="roadmap">${items}</ol>
    <p class="quiet">Milestones are the founder's own list. Seed shows them as given and does not enforce them; backers who see them slip can report the raise.</p>`;
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
  const pr = profileOf(p), team = pr.team || [], sp = splitOf(p.teamBps), C = Q(p), u = unlockState(p), t = tranchesOf(p.teamSchedule), now = Date.now(), at = p.seededAt;
  const badge = (on, t) => on ? `<span class="vbadge">${RISK_ICON.pass}${t}</span>` : '';
  const members = team.length ? `<div class="team">${team.map(m => { const v = m.verified || {};
    return `<article class="member"><span class="m-av" style="--h:${hashStr(m.name) % 360}">${m.avatar && safeUrl(m.avatar) ? `<img src="${esc(m.avatar)}" alt="">` : initials(m.name)}</span>
      <div class="m-main"><b>${esc(m.name)}</b><span class="m-role">${esc(m.role || '')}</span>
        <div class="m-links">${[['x', 'X'], ['github', 'GitHub'], ['linkedin', 'LinkedIn']].filter(([k]) => safeUrl(m[k])).map(([k, l]) => `<a href="${esc(safeUrl(m[k]))}" target="_blank" rel="noopener">${ICONS[k]}${l}</a>`).join('')}</div>
        <div class="m-badges">${badge(v.x, 'X verified')}${badge(v.github, 'GitHub verified')}${badge(v.domain, 'Domain verified')}</div>
        ${m.wallet ? `<div class="m-wallet"><span class="num">${esc(shortMint(m.wallet))}</span>${copyBtn(m.wallet, 'wallet address')}</div>` : ''}</div></article>`; }).join('')}</div>` : quietEmpty('No team is listed for this raise.');
  /* the unlocks: a summary, the step chart (drawn once the tab is in the page) and every tranche */
  const al = [{ label: 'Raise backers', kind: 'presale', pct: sp.backers / SUPPLY * 100, tokens: sp.backers }, { label: 'Locked Meteora pool', kind: 'lp', pct: sp.pool / SUPPLY * 100, tokens: sp.pool }].concat(sp.team ? [{ label: 'Team', kind: 'team', pct: sp.team / SUPPLY * 100, tokens: sp.team }] : []);
  const supply = `<div class="toke"><div>${donutSVG(al)}</div><table class="dtable alloc"><thead><tr><th>Share</th><th class="r">Of supply</th><th class="r">Tokens</th><th>Unlock</th></tr></thead><tbody>
      ${al.map(a => `<tr><td><i class="sw" style="background:${KIND_COL[a.kind] || KIND_COL.other}"></i>${esc(a.label)}</td><td class="num">${a.pct.toFixed(a.pct % 1 ? 1 : 0)}%</td><td class="num">${fmtTok(a.tokens)}</td>
        <td>${a.kind === 'lp' ? 'Locked for good' : a.kind === 'presale' ? 'Claimable at seeding' : esc(fmtSchedule(p.teamSchedule))}</td></tr>`).join('')}</tbody></table></div>`;
  let unlocks = '';
  if (sp.team && t.length) {
    const row = (k, v, sub) => `<div><dt>${k}</dt><dd class="num">${v}</dd>${sub ? `<span>${sub}</span>` : ''}</div>`, days = at ? (now - at) / D : null;
    const sums = `<dl class="sums unlock-sums">${row('Team tokens', fmtTok(sp.team), `${(p.teamBps / 100).toFixed(p.teamBps % 100 ? 2 : 0)}% of supply`)}${row('Unlocked', at ? `${(u.unlockedBps / 100).toFixed(u.unlockedBps % 100 ? 1 : 0)}%` : '0%', at ? `${fmtTok(u.unlocked)} since seeding` : 'the clock starts at seeding')}
      ${row('Next unlock', u.next ? `${(u.next.bps / 100).toFixed(u.next.bps % 100 ? 2 : 0)}%` : 'Done', u.next ? (at ? fmtDay(u.next.at) : `day ${t.find(x => x.dayOffset > (days || -1)).dayOffset} after seeding`) : 'all released')}${row('Last unlock', `Day ${lastUnlockDay(p.teamSchedule)}`, at ? fmtDay(at + lastUnlockDay(p.teamSchedule) * D) : 'after seeding, 90 at least')}</dl>`;
    const rows = t.map(x => { const when = at ? at + x.dayOffset * D : null, st = when && when <= now ? 'done' : (u.next && x.dayOffset === t.find(y => y.dayOffset > (days != null ? days : -1)).dayOffset) ? 'next' : '';
      return `<tr class="${st}"><td class="num">Day ${x.dayOffset}</td><td class="num">${when ? fmtDay(when) : '—'}</td><td class="num">${(x.bps / 100).toFixed(x.bps % 100 ? 2 : 0)}%</td><td class="num">${fmtTok(Math.floor(sp.team * x.bps / BPS))}</td><td>${st === 'done' ? 'Unlocked' : st === 'next' ? '<b>Next</b>' : 'Later'}</td></tr>`; }).join('');
    unlocks = `<div class="tab-h sub"><h2>Team unlocks</h2><span class="quiet">${esc(fmtSchedule(p.teamSchedule))}</span></div>${sums}<div class="pp-svg unlock" data-unlock></div>
      <div class="tscroll"><table class="dtable tranches"><thead><tr><th>When</th><th>Date</th><th class="r">Share</th><th class="r">Tokens</th><th>State</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="quiet">Unlocked team tokens go to the payout wallet${p.takeover ? `, which the community takeover moved to ${esc(p.takeover.label || 'a backer wallet')}` : ''}. The schedule was fixed at seeding and cannot change.</p>`;
  } else unlocks = `<div class="tab-h sub"><h2>Team unlocks</h2></div><p class="quiet">No team tokens. The founder set the team share to 0%, so the whole supply went to backers and the pool.</p>`;
  return tabHead('Supply', '') + supply + `<p class="quiet">Backers and the pool get the same number of tokens, which is what opens the pool at the raise price: ${fmtPrice(priceOf(p))} ${esc(C.sym)}. The team share was set by the founder.</p>` + unlocks +
    `<div class="tab-h sub"><h2>Team</h2>${prFrom(p) ? srcPill('demo') : ''}</div>` + members + (team.length ? `<p class="quiet">A badge appears only for a check that passed.${pr.demo ? ' On demo raises the check results are part of the demo data.' : ' Checks are self-reported until verification is wired up.'}</p>` : '');
}
/* the unlock chart: the team's tokens as a step line from seeding to the last tranche, with today marked */
function unlockSVG(p, W) {
  const sp = splitOf(p.teamBps), t = tranchesOf(p.teamSchedule), at = p.seededAt, now = Date.now(), Hh = 200, pl = 8, pr = 54, pt = 16, pb = 26, last = lastUnlockDay(p.teamSchedule) || 1;
  const X = d => pl + d / last * (W - pl - pr), Y = b => pt + (1 - b / BPS) * (Hh - pt - pb);
  let acc = 0, d = `M${X(0)} ${Y(0)}`; const dots = [];
  for (const x of t) { d += ` H${X(x.dayOffset).toFixed(1)}`; acc += x.bps; d += ` V${Y(acc).toFixed(1)}`; dots.push([X(x.dayOffset), Y(acc), acc]); }
  d += ` H${X(last).toFixed(1)}`;
  const today = at ? Math.min(last, Math.max(0, (now - at) / D)) : null;
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Team unlocks over ${last} days">
    ${[0, 25, 50, 75, 100].map(v => `<path d="M${pl} ${Y(v * 100).toFixed(1)}H${W - pr}" style="stroke:var(--hair)"/><text x="${W - pr + 8}" y="${(Y(v * 100) + 4).toFixed(1)}" font-family="JetBrains Mono, monospace" font-size="11" style="fill:var(--muted)">${v}%</text>`).join('')}
    ${today != null ? `<path d="M${X(today).toFixed(1)} ${pt}V${Hh - pb}" style="stroke:var(--navy-soft)" stroke-dasharray="3 3"/><text x="${(X(today) + 5).toFixed(1)}" y="${pt + 10}" font-family="JetBrains Mono, monospace" font-size="11" style="fill:var(--navy-soft)">Today</text>` : ''}
    <path d="${d}" fill="none" style="stroke:var(--navy)" stroke-width="2" stroke-linejoin="round"/>
    ${dots.map(([x, y, b]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" style="fill:${today != null && x <= X(today) ? 'var(--navy)' : 'var(--panel-solid)'};stroke:var(--navy)" stroke-width="1.5"/>`).join('')}
    <g font-family="JetBrains Mono, monospace" font-size="11" style="fill:var(--muted)"><text x="${pl}" y="${Hh - 8}">${at ? 'Seeded ' + fmtDay(at) : 'Seeding'}</text><text x="${W - pr}" y="${Hh - 8}" text-anchor="end">Day ${last}${at ? ', ' + fmtDay(at + last * D) : ''}</text></g></svg>`;
}
const KIND_COL = { presale: '#2E63E7', lp: '#8FB4FF', team: '#D9DCE2', other: '#565B66' };
function donutSVG(allocs) {
  const R = 70, C = 2 * Math.PI * R; let acc = 0;
  return `<svg viewBox="0 0 180 180" class="donut" role="img" aria-label="Token allocation">${allocs.map((a, i) => { const len = a.pct / 100 * C, s = `<circle cx="90" cy="90" r="${R}" fill="none" stroke="${a.color || KIND_COL[a.kind] || KIND_COL.other}" stroke-width="26" stroke-dasharray="${Math.max(0, len - 1.5).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 90 90)"/>`; acc += len; return s; }).join('')}
    <text x="90" y="86" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="15" style="fill:var(--ink)">1B</text><text x="90" y="104" text-anchor="middle" font-size="11" style="fill:var(--muted)">supply</text></svg>`;
}
function tabHolders(p) { return tabHead('Holders', '') + '<div data-holders><div class="pp-loading">Loading holders…</div></div>'; }
function tabTrades(p) { return tabHead('Trades', '') + '<div data-trades><div class="pp-loading">Loading trades…</div></div>'; }
function tabTraders(p) { return tabHead('Top traders', '') + '<div data-traders><div class="pp-loading">Loading traders…</div></div>'; }
/* who has made and lost what on this token: realised from sells against an average cost, unrealised on what is still held */
async function loadTraders(p) {
  const box = detailBox && $('[data-traders]', detailBox); if (!box) return;
  try {
    const list = await tradesAdapter.traders(p); if (!box.isConnected) return;
    const C = Q(p), sym = esc(C.sym), me = state.wallet && state.wallet.pk, pn = v => `<span class="num ${v > 1e-9 ? 'up' : v < -1e-9 ? 'down' : ''}">${v > 1e-9 ? '+' : ''}${fmtExact(v, p.q)} ${sym}</span>`;
    box.innerHTML = list.length ? `<div class="tab-h"><span class="quiet">${plural(list.length, 'wallet')}, by result at the pool's price</span>${LIVE_PILL}</div>
      <div class="tscroll"><table class="dtable traders"><thead><tr><th>#</th><th>Wallet</th><th class="r">Bought</th><th class="r">Sold</th><th class="r">Holding</th><th class="r">Realised</th><th class="r">Unrealised</th><th class="r">PnL</th></tr></thead><tbody>
      ${list.slice(0, 50).map((l, i) => `<tr class="${l.wallet === me ? 'you' : ''}"><td class="num">${i + 1}</td><td class="mono">${l.wallet === me ? 'You' : `<a href="${esc(explorer(l.wallet))}" target="_blank" rel="noopener">${esc(shortMint(l.wallet))}</a>`}</td><td class="num">${fmtExact(l.bought, p.q)} ${sym}<span class="quiet"> · ${l.buys + (l.claims || 0)}</span></td><td class="num">${fmtExact(l.sold, p.q)} ${sym}<span class="quiet"> · ${l.sells}</span></td><td class="num">${l.tokens > 0 ? fmtTok(l.tokens) : '—'}</td><td>${pn(l.realised)}</td><td>${l.tokens > 0 ? pn(l.unrealised) : '—'}</td><td>${pn(l.pnl)}</td></tr>`).join('')}</tbody></table></div>
      <p class="quiet">A claim counts as a buy at what the raise cost. Tokens received another way (a team unlock, a transfer) are not in these figures.</p>` : quietEmpty('No trades on the pool yet.');
  } catch (e) { box.innerHTML = `<p class="quiet">Traders could not be loaded: ${esc(e.message)}</p>`; }
}
/* the latest swaps on the pool, newest first; a new one slides in at the top as the indexer sees it */
async function loadTrades(p) {
  const box = detailBox && $('[data-trades]', detailBox); if (!box) return;
  try { const list = await tradesAdapter.list(p, 50); if (!box.isConnected) return; pg.trades = list; box.innerHTML = tradesTable(p, list); }
  catch (e) { box.innerHTML = `<p class="quiet">Trades could not be loaded: ${esc(e.message)}</p>`; }
}
function tradeRow(p, t) {
  const C = Q(p), me = state.wallet && state.wallet.pk;
  return `<tr class="${t.side}${t.trader === me ? ' you' : ''}" data-sig="${esc(t.signature)}"><td><span class="btag ${t.side === 'buy' ? 'ok' : 'bad'}">${t.side === 'buy' ? 'Buy' : 'Sell'}</span></td><td class="num">${fmtExact(t.pair, p.q)} ${esc(C.sym)}</td><td class="num">${fmtTok(t.tokens)}</td><td class="num">${fmtPrice(t.price)} ${esc(C.sym)}</td>
    <td class="mono">${t.trader === me ? 'You' : esc(shortMint(t.trader))}</td><td class="num" title="${esc(fmtDate(t.at))}">${fmtAgo(Date.now() - t.at)}</td><td><a href="${esc(explorer(t.signature, 'tx'))}" target="_blank" rel="noopener" aria-label="View transaction">${ICONS.out}</a></td></tr>`;
}
function tradesTable(p, list) {
  if (!list.length) return quietEmpty('No trades on the pool yet. The first swap shows here within seconds of landing.');
  return `<div class="tab-h"><span class="quiet">${plural(list.length, 'latest trade')}, newest first</span>${LIVE_PILL}</div>
    <div class="tscroll"><table class="dtable trades"><thead><tr><th>Side</th><th class="r">${esc(Q(p).sym)}</th><th class="r">$${esc(p.ticker)}</th><th class="r">Price</th><th>Wallet</th><th class="r">When</th><th></th></tr></thead><tbody data-tradesbody>${list.map(t => tradeRow(p, t)).join('')}</tbody></table></div>`;
}
/* a trade the indexer just saw: the table, the chart's newest candle, the pool figures */
function onLiveTrade(p, t) {
  const cur = find(p.id) || p; if (pg.id !== cur.id) return;
  if (pg.tab === 'traders') loadTraders(cur);
  if (pg.trades && !pg.trades.some(x => x.signature === t.signature)) {
    pg.trades.unshift(t); const body = detailBox && $('[data-tradesbody]', detailBox);
    if (body) { body.insertAdjacentHTML('afterbegin', tradeRow(cur, t)); body.firstElementChild.classList.add('flash'); const h = detailBox && $('[data-trades] .tab-h .quiet', detailBox); if (h) h.textContent = `${plural(pg.trades.length, 'latest trade')}, newest first`; }
    else if (pg.tab === 'trades') renderTab(cur);
  }
  cur.spot = t.price;   // until the reserves answer
  refreshSpot(cur);
  if (pg.lw && pg.series) { const { c, redraw } = foldTrade(pg.series, pg.tf, t); if (redraw) lwData(pg.lw, pg.series, cur); else lwSet(pg.lw, c, cur); }
  else (pg.pendingTrades = pg.pendingTrades || []).push(t);   // the series is still loading: folded in once it is
  const fees = cur.fees || (cur.fees = { volume: 0, founderClaimed: 0, seedClaimed: 0 }); fees.volume = r6((fees.volume || 0) + t.pair);
  pg.statsAt = 0; refreshPoolCard(cur);
  loadLiveFees(cur, true);   // the position's fee state moved with the swap: the Creator fees card follows
}
function tabBackers(p) {
  const rows = backersAdapter.rows(p), s = backersAdapter.summary(p, rows), C = Q(p), shown = pg.allBackers ? rows : rows.slice(0, 50), refund = p.status === 'refunded', seeded = p.status === 'seeded';
  const card = (k, v, lvl, sub) => `<div class="sum ${lvl || ''}"><dt>${k}</dt><dd class="num">${v}</dd>${sub ? `<span>${sub}</span>` : ''}</div>`;
  const tag = t => `<span class="btag ${t}">${{ kol: 'KOL', tracked: 'Tracked', 'repeat-backer': 'Repeat backer' }[t] || esc(t)}</span>`;
  if (!rows.length) return tabHead('Backers', '') + quietEmpty('Nobody has backed this raise yet.');
  return tabHead('Backers', s.from, ` <span class="quiet">${plural(rows.length, 'wallet')}${rows.some(r => isRealAddr(r.wallet)) ? `, the largest ${RISK.liveLookupCap} checked live` : ''}</span>`) +
    `<dl class="sums">${card('Top 10', pctTxt(s.top10), s.top10 > RISK.top10FailPct ? 'fail' : s.top10 > RISK.top10WarnPct ? 'warn' : '', 'of the raise')}${card('Fresh wallets', pctTxt(s.fresh), s.fresh > RISK.freshWarnPct ? 'warn' : '', 'of backers')}
      ${card('Bundled', pctTxt(s.bundled), s.bundled > RISK.bundledWarnPct ? 'warn' : '', s.bundles.length ? plural(s.bundles.length, 'funding wallet') : 'of the raise')}${card('KOL and tracked', s.kol + s.tracked, '', `${s.kol} KOL, ${s.tracked} tracked`)}${card('Repeat Seed backers', s.repeat, '', 'backed an earlier Seed raise')}</dl>
    <div class="tscroll"><table class="dtable backers"><thead><tr><th>Wallet</th><th class="r">Amount</th><th class="r">Of raise</th><th class="r">Time</th><th>Funded by</th><th>Tags</th>${refund ? '<th>Refund</th>' : seeded ? '<th>Tokens</th>' : ''}</tr></thead><tbody>
      ${shown.map(r => `<tr class="${r.you ? 'you' : ''}"><td class="mono">${r.you ? 'You' : esc(walletLabel(r.wallet))}</td><td class="num">${fmtC(r.amount, p.q)} ${esc(C.sym)}</td><td class="num">${r.pct.toFixed(r.pct < 1 ? 2 : 1)}%</td><td class="num">${fmtAgo(Date.now() - r.first)}</td>
        <td>${esc(funderLabel(r.fundedBy))}${r.isFresh ? ' <span class="btag fresh">Fresh</span>' : ''}${s.bundles.some(b => r.fundedBy && b.funder === r.fundedBy.addr) ? ' <span class="btag bundle">Bundle</span>' : ''}</td>
        <td>${r.tags.map(tag).join(' ')}</td>${refund ? `<td>${r.refundClaimed ? 'Claimed' : '<b>Claimable</b>'}</td>` : seeded ? `<td>${r.tokensClaimed ? 'Claimed' : '<b>Claimable</b>'}</td>` : ''}</tr>`).join('')}</tbody></table></div>
    ${rows.length > shown.length ? `<button class="qb more" data-allbackers>Show all ${rows.length}</button>` : ''}`;
}
async function loadHolders(p) {
  const box = detailBox && $('[data-holders]', detailBox); if (!box) return;
  try {
    const h = await backersAdapter.holders(p); if (!box.isConnected) return;
    const all = pg.allHolders || h.value.length <= 100, shown = all ? h.value : h.value.slice(0, 100), wallets = h.value.filter(x => !x.label).length;
    box.innerHTML = `<div class="tab-h"><span class="quiet">${plural(h.count || h.value.length, 'holder')}${h.from === 'chain' ? `: ${plural(wallets, 'wallet')} and ${plural(h.value.length - wallets, 'pool or vault account')}` : `, top ${h.value.length} shown`}</span>${srcPill(h.from)}</div>
      <div class="tscroll"><table class="dtable backers holders"><thead><tr><th>Holder</th><th class="r">$${esc(p.ticker)}</th><th class="r">Of supply</th><th class="h-label">Label</th></tr></thead><tbody>
      ${shown.map(x => `<tr class="${x.you ? 'you' : ''}"><td class="mono">${x.you ? 'You' : h.from === 'chain' ? `<a href="${esc(explorer(x.account || x.wallet))}" target="_blank" rel="noopener">${esc(shortMint(x.wallet))}</a>` : esc(shortMint(x.wallet))}${x.label ? `<span class="h-sub">${esc(x.label)}</span>` : ''}</td><td class="num">${x.amount > 0 && x.amount < 1 ? '<1' : fmtTok(x.amount)}</td><td class="num">${x.pct < 0.01 && x.pct > 0 ? '<0.01' : x.pct.toFixed(2)}%</td><td class="h-label">${esc(x.label || '')}</td></tr>`).join('')}</tbody></table></div>
      ${h.value.length > shown.length ? `<button class="qb more" data-allholders>Show all ${h.value.length}</button>` : ''}`;
    const ah = $('[data-allholders]', box); if (ah) ah.onclick = () => { pg.allHolders = true; loadHolders(p); };
  } catch (e) { box.innerHTML = `<p class="quiet">Holders could not be loaded: ${esc(e.message)}</p>`; }
}
/* Reports: public, wallet-signed, kept off chain. Anyone with a wallet files one; Seed admins act on them: flag the raise for
   fraud, or approve a community takeover that moves the payout wallet. Both are on-chain instructions, so each is shown here. */
const REPORT_STATE = { open: 'Open', fraud: 'Fraud, flagged', takeover: 'Takeover approved', dismissed: 'Dismissed' };
function tabReports(p) {
  const list = (p.reports || []).slice().sort((a, b) => b.at - a.at), now = Date.now(), admin = isAdmin(), me = walletId();
  const mine = list.some(r => r.wallet === me);
  const form = !state.wallet ? '<p class="quiet">Connect a wallet to report this raise. Reports are signed by the wallet and shown here for everyone.</p>'
    : mine ? '<p class="quiet">You have reported this raise. One report per wallet.</p>'
    : `<form class="upd-form rep-form" data-repform novalidate><label class="upd-lab" for="repT">Report this raise</label><textarea id="repT" name="b" rows="3" maxlength="600" placeholder="What happened? Link proof where you can." required></textarea>
      <div class="upd-foot"><span class="quiet">Signed by ${esc(state.wallet.addr)} and public. Seed acts on fraud; it does not referee disagreements. <span class="num" data-repct>0 / 600</span></span><button class="btn btn-ink btn-sm">Sign and send</button></div><div class="err" data-reperr role="alert"></div></form>`;
  const act = r => !admin || r.status !== 'open' || p.blacklisted ? '' : `<div class="rep-act"><button type="button" class="qb qb-sm" data-flag="${esc(r.id)}">Flag fraud</button><button type="button" class="qb qb-sm" data-takeover="${esc(r.id)}">Approve takeover</button><button type="button" class="qb qb-sm" data-dismiss="${esc(r.id)}">Dismiss</button></div>`;
  const items = list.map(r => `<li class="rep ${r.status}"><div class="rep-h"><span class="mono">${r.wallet === me ? 'You' : esc(walletLabel(r.wallet))}</span><span class="btag ${r.status === 'fraud' ? 'bad' : r.status === 'takeover' ? 'ok' : ''}">${REPORT_STATE[r.status] || esc(r.status)}</span><span class="num">${fmtAgo(now - r.at)} · ${fmtDate(r.at)}</span></div><p>${esc(r.reason)}</p>${act(r)}</li>`).join('');
  const actions = [p.flag ? `<li class="adm bad">${RISK_ICON.fail}<div><b>Flagged for fraud</b> ${fmtDate(p.flag.at)}${p.flag.reportId ? `, on report ${esc(p.flag.reportId)}` : ''}. The founder wallet is blacklisted, with its X account if one is linked, and buying is off.</div></li>` : '',
    p.takeover ? `<li class="adm ok">${RISK_ICON.pass}<div><b>Community takeover approved</b> ${fmtDate(p.takeover.at)}: the payout wallet moved from ${esc(shortMint(p.takeover.from))} to ${esc(shortMint(p.takeover.to))} (${esc(p.takeover.label || 'backers')}).</div></li>` : ''].filter(Boolean).join('');
  return tabHead('Reports', '', ` <span class="quiet">${list.length ? `${list.length} public` : ''}</span>`) + form +
    (actions ? `<ul class="adm-list">${actions}</ul>` : '') +
    (list.length ? `<ol class="reports">${items}</ol>` : quietEmpty('No reports on this raise.')) +
    `<p class="quiet">Seed enforces its rules in the program: the cap, refunds, the locked pool and the unlock minimum. Admins (a multisig) can do two things on a report: flag fraud, which blacklists the founder wallet (and its X account, when linked) and disables buying, or approve a takeover, which moves creator fees and team unlocks to a wallet the backers chose.${admin ? ' Your wallet is an admin here.' : ''}</p>`;
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
  return tabHead('Announcements', prFrom(p), ` <span class="quiet">${list.length ? `${plural(list.length, 'announcement')} from the team` : ''}</span>`) + form + (who ? `<p class="quiet ann-who">${who}</p>` : '') +
    (list.length ? `<ol class="updates">${list.map(u => `<li${now - u.postedAt < ANN_NEW ? ' class="new"' : ''}><div class="u-h"><b>${esc(u.title)}</b>${now - u.postedAt < ANN_NEW ? '<span class="ann-new">New</span>' : ''}<span class="num">${fmtAgo(now - u.postedAt)} · ${fmtDate(u.postedAt)}</span></div><div class="md">${md(u.body)}</div>${annBy(p, u)}</li>`).join('')}</ol>`
      : quietEmpty(can && open ? 'Nothing posted yet. Your first announcement shows here and at the top of the page.' : 'The team has not posted an announcement yet.'));
}
/* the latest announcement, at the top of the page for a week after it is posted */
function ppAnnounce(p) {
  const u = updatesAdapter.list(p)[0], now = Date.now();
  if (!u || now - u.postedAt > ANN_STRIP) return '';
  return `<a class="panel pp-ann" href="#/presale/${esc(p.id)}/announcements" data-jump-ann><span class="ann-ico">${ANN_ICON}</span><span class="ann-k">Announcement</span><b>${esc(u.title)}</b><span class="ann-t num">${fmtAgo(now - u.postedAt)}</span><span class="ann-go">Read</span></a>`;
}
function refreshAnnounce(p) { const w = detailBox && $('[data-annwrap]', detailBox); if (w) w.innerHTML = ppNotices(p); }
function afterTab(p, body) {
  if (pg.tab === 'deck' && profileOf(p).deck && deckKindOf(profileOf(p)) === 'pdf') loadDeck(p, body);
  if (pg.tab === 'holders') loadHolders(p);
  if (pg.tab === 'trades') loadTrades(p);
  if (pg.tab === 'traders') loadTraders(p);
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
  const un = $('[data-unlock]', body); if (un) un.innerHTML = unlockSVG(p, Math.max(320, Math.floor(un.clientWidth) || 640));
  const rf = $('[data-repform]', body);
  if (rf) {
    const err = $('[data-reperr]', rf), ct = $('[data-repct]', rf);
    rf.oninput = () => { err.textContent = ''; ct.textContent = `${rf.b.value.length} / 600`; };
    rf.onsubmit = async e => { e.preventDefault(); const b = rf.b.value.trim(), btn = $('button', rf); if (!b) { err.textContent = 'Say what happened, in at least 20 characters.'; rf.b.focus(); return; }
      btn.disabled = true; try { await fileReport(p, b); toast('Report sent'); renderTab(p); refreshTabLabels(p); } catch (x) { err.textContent = x.message || 'The report was not sent.'; btn.disabled = false; } };
  }
  body.onclick = async e => {
    const fl = e.target.closest('[data-flag]'), tk = e.target.closest('[data-takeover]'), dm = e.target.closest('[data-dismiss]'); if (!fl && !tk && !dm) return;
    if (fl) { if (!confirm(`Flag ${p.name} for fraud? Buying stops and the founder wallet is blacklisted, with the X account if one is linked. This is an on-chain instruction from the admin wallet.`)) return; await adminFlag(p, fl.dataset.flag); }
    else if (tk) { const to = prompt('The wallet that takes over the payout: creator fees and team unlocks go there from now on.', ''); if (!to) return; if (!B58.test(to.trim())) return toast('That is not a Solana address.'); const label = prompt('A name for it, shown on the page (for example "Backer multisig, 3 of 5").', 'Backer multisig') || 'Backers'; await adminTakeover(p, tk.dataset.takeover, to.trim(), label); }
    else await dismissReport(p, dm.dataset.dismiss);
  };
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
    const doc = pg.deck.doc; cnt.textContent = plural(doc.numPages, 'page');
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
  if (typeof renderFootNote === 'function') renderFootNote();   // the footer follows the page: no demo reset on a live raise
  if (ui.tab !== 'presale') { if (pg.id) { box.innerHTML = ''; pg.id = null; leaveLive(); if (typeof chatOff !== 'undefined' && chatOff) { chatOff(); chatOff = null; } } return; }
  const p = find(ui.sel);
  if (!p) { box.innerHTML = `<div class="panel empty">No raise at this address${chain.on() ? ' on ' + esc(SEED.network) : ' in this demo'}. The link may be wrong, or the raise may be on another network.<br><a href="#">Back to all raises</a></div>`; pg.id = null; return; }
  const want = PTAB_ALIAS[ui.ptab] || ui.ptab, tab = tabsOf(p).includes(want) ? want : 'overview', wkey = (state.wallet ? walletId() : '') + '/' + (state.positions[p.id] || 0) + '/' + !!state.claimed[p.id] + '/' + (p.status === 'seeded' ? heldOf(p) : 0) + '/' + balOf(p.q);
  if (!force && pg.id === p.id && pg.status === p.status) {
    if (pg.tab !== tab) { pg.tab = tab; renderTab(p); }
    if (pg.walletKey !== wkey) { pg.walletKey = wkey; const pw = $('[data-poswrap]', box); if (pw) { pw.innerHTML = positionPanel(p); bindRail(p); } if (pg.tab === 'announcements') renderTab(p); if (pg.chatW !== walletId()) mountChat(p); }
    patchDetail(p); return;
  }
  const fresh = pg.id !== p.id;
  if (fresh) { leaveLive(); if (p.live && p.status === 'seeded') pg.tf = '1m'; }   // a new pool reads better minute by minute
  Object.assign(pg, { id: p.id, status: p.status, tab, walletKey: wkey, seen: p.raised, shown: null }); if (fresh) Object.assign(pg, { allBackers: false, allHolders: false, deck: null, pool: null, series: null, trades: null, stats: null, holderCount: null, holdersAt: null });
  else if (pg.lw) { try { pg.lw.ro.disconnect(); pg.lw.chart.remove(); } catch (e) {} pg.lw = null; }   // the page is drawn again: the chart mounts on the new box
  box.innerHTML = `<div class="pp ${p.status}${p.blacklisted ? ' flagged' : ''}"><aside class="pp-side" aria-label="Project and chat">${ppHeader(p)}${ppFounder(p)}${chatPanel(p)}</aside>
    <div class="pp-main"><div class="pp-annw" data-annwrap>${ppNotices(p)}</div>${ppFill(p)}${p.status === 'seeded' ? ppFees(p) : ''}${ppChart(p)}${ppTabs(p)}</div><aside class="pp-rail" aria-label="Buy and your position">${ppRail(p)}</aside></div>`;
  bindPage(p); renderTab(p); mountChat(p); drawCharts(p); watchCharts(p); loadAsync(p);
  if (fresh && typeof playEnter === 'function') playEnter();   // the page's cards rise into place and the raise line draws itself
}
function leaveLive() { if (pg.unwatch) { pg.unwatch(); pg.unwatch = null; } pg.pendingTrades = null; if (pg.lw) { try { pg.lw.ro.disconnect(); pg.lw.chart.remove(); } catch (e) {} pg.lw = null; } }
/* the charts are drawn again once the page is in the document, and whenever their column changes width */
function drawCharts(p) {
  const s = (k, fn) => { const e = detailBox && $(k, detailBox); if (e) fn(e); };
  s('[data-dchart]', e => e.innerHTML = raiseSVG(p)); s('[data-dbars]', e => e.innerHTML = buysSVG(p));
  s('[data-candles]', e => { if (pg.series && pg.pool && !pg.lw) e.innerHTML = candleSVG(pg.series, pg.mode, pg.pool.value.supply, pg.pool.value.quote, raiseIn(p, pg.pool.value.quote)); });
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
  const cb = $('[data-cancel]', box); if (cb) cb.onclick = async () => { if (!confirm(`Cancel the ${p.name} raise? Every backer gets a refund, fee included, and the raise cannot reopen.`)) return; cb.disabled = true; await cancelRaise(find(p.id) || p); };
  const lx = $('[data-linkx]', box); if (lx) lx.onclick = async () => {   // the founder links an X account to a raise that is already open
    const cur = find(p.id) || p, l = xAdapter.of();
    if (!l) { openXDialog(); return; }
    lx.disabled = true; lx.textContent = 'Confirm in wallet…';
    try { await adapter.linkX(cur); cur.xAccount = Object.assign({ handle: l.handle, verified: !l.demo && !l.typed, typed: !!l.typed, createdAt: l.createdAt || null, followers: l.followers != null ? l.followers : null }); toast(`@${l.handle} is linked to ${cur.name}`); save(); renderDetail(true); }
    catch (e) { toast(e.message); lx.disabled = false; lx.textContent = 'Link your X'; }
  };
  const cf = $('[data-claimfees]', box); if (cf) cf.onclick = async () => { cf.disabled = true; cf.textContent = 'Claiming…'; await claimCreatorFees(find(p.id) || p); };
  const ck = $('[data-crank]', box); if (ck) ck.onclick = async () => { ck.disabled = true; ck.textContent = 'Running…'; const cur = find(p.id) || p; cur.crankAt = Date.now(); const ok = await seedCrank(cur, true); if (!ok && detailBox) { const b = $('[data-crank]', detailBox); if (b) { b.disabled = false; b.textContent = 'Run the next step'; } } };
  const panel = $('[data-trade]', box), inp = panel && $('#ppAmt', panel); pg.syncTrade = null; if (!inp) return;
  if (panel.dataset.trade === 'live') return bindLiveTrade(p, panel);
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
      $('[data-recv]', panel).textContent = `${fmtTok(n > 0 ? tokensFor(cur, Math.min(amountFor(n), leftOf(cur))) : 0)} $${cur.ticker}`;   // the buy inside the payment, capped at the room left
      if (!msg && n > 0) msg = pr.minBuy && n < pr.minBuy ? `The minimum deposit is ${fmtC(pr.minBuy, cur.q)} ${C.sym}.` : pr.maxBuy && n + (state.positions[cur.id] || 0) > pr.maxBuy ? `A wallet can put in at most ${fmtC(pr.maxBuy, cur.q)} ${C.sym}.`
        : n > payLeft(cur) ? `Only ${fmtExact(payLeft(cur), cur.q)} ${C.sym} fits in this raise, the 1% fee included.` : state.wallet && n > bal ? `Your wallet holds ${fmtAmt(bal, cur.q)} ${C.sym}.` : '';
      go.textContent = !state.wallet ? 'Connect wallet to deposit' : n > 0 && !msg ? `Deposit ${fmtExact(Math.min(n, payLeft(cur)), cur.q)} ${C.sym}` : 'Deposit';
    }
    err.textContent = msg; go.disabled = !!state.wallet && (!!msg || !(n > 0));
  };
  inp.oninput = sync;
  panel.onclick = async e => {
    const side = e.target.closest('[data-side] button'), chip = e.target.closest('[data-chip],[data-pct]'), cur = now(), pv = e.target.closest('[data-pv]');
    if (pv) { const custom = pv.dataset.pv === 'custom'; damm.priority = custom ? (parseFloat(priVal.value) || 0.0001) : 'auto'; $$('[data-pv]', panel).forEach(b => b.setAttribute('aria-pressed', String(b === pv))); priVal.parentElement.hidden = !custom; return; }
    if (side) { pg.side = side.dataset.v; $$('[data-side] button', panel).forEach(b => b.setAttribute('aria-pressed', String(b === side))); inp.value = ''; chips(); sync(); inp.focus(); return; }
    if (chip) {
      const room = profileOf(cur).maxBuy ? Math.max(0, profileOf(cur).maxBuy - (state.positions[cur.id] || 0)) : Infinity;
      if (chip.dataset.chip === 'max' && state.wallet && spendable(cur) <= 0) { inp.value = ''; sync(); err.textContent = `This wallet has nothing to spend: add ${Q(cur).sym} first${cur.q === 'SOL' && isReal() ? ', keeping about 0.01 SOL for the fees' : ''}.`; return; }
      inp.value = chip.dataset.pct ? (chip.dataset.pct === '100' ? heldOf(cur) : Math.floor(heldOf(cur) * chip.dataset.pct / 100))
        : chip.dataset.chip !== 'max' ? chip.dataset.chip : swap ? balOf(cur.q) : r6(Math.min(spendable(cur), payLeft(cur), room));
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
/* the live trade panel: every change to the amount, the side, the slippage or the wallet asks the pool for a fresh quote */
function bindLiveTrade(p, panel) {
  const inp = $('#ppAmt', panel), go = $('[data-go]', panel), err = $('[data-buyerr]', panel), slip = $('[data-slip]', panel);
  const now = () => find(p.id) || p, num = () => parseFloat((inp.value || '').replace(/,/g, '')), C = Q(p);
  const sell = () => pg.side === 'sell', on = () => !!state.wallet && isReal();   // the demo wallet cannot trade a real pool
  const chips = () => { $('[data-tchips]', panel).innerHTML = sell() ? [25, 50, 100].map(c => `<button type="button" data-pct="${c}">${c}%</button>`).join('')
    : [0.01, 0.05, 0.1].filter(c => !on() || c <= balOf(p.q)).map(c => `<button type="button" data-chip="${c}">${c} ${esc(C.sym)}</button>`).join('') + '<button type="button" data-chip="max">Max</button>'; };
  let timer = null;
  const sync = async () => {
    if (!panel.isConnected) return;
    const cur = now(), raw = (inp.value || '').replace(/,/g, ''), n = parseFloat(raw), s = sell(), bal = on() ? (s ? heldOf(cur) : balOf(cur.q)) : 0, my = ++pg.quoteSeq;
    pg.shownQuote = null;
    panel.dataset.now = s ? 'sell' : 'buy';
    $('[data-paysym]', panel).textContent = s ? '$' + cur.ticker : C.sym;
    $('[data-bal]', panel).textContent = on() ? `Balance ${s ? fmtTok(bal) + ' $' + cur.ticker : fmtAmt(bal, cur.q) + ' ' + C.sym}` : '';
    const sl = parseFloat(slip.value); if (sl > 0 && sl <= 50) damm.slippage = sl;
    let msg = !raw ? '' : !(n > 0) ? 'Enter an amount above zero.' : !(sl > 0 && sl <= 50) ? 'Slippage must be between 0 and 50%.' : '';
    if (!msg && n > 0 && on() && n > bal + 1e-9) msg = s ? `You hold ${fmtTok(bal)} $${cur.ticker}.` : `Your wallet holds ${fmtAmt(bal, cur.q)} ${C.sym}.`;
    if (!msg && !s && n > 0 && on() && cur.q === 'SOL' && n > bal - 0.01) msg = 'Keep about 0.01 SOL for the transaction fee and the token account.';
    go.textContent = !on() ? 'Connect a wallet to trade' : `${s ? 'Sell' : 'Buy'} $${cur.ticker}`;
    err.textContent = msg; go.disabled = on() && (!!msg || !(n > 0));
    if (!(n > 0)) { ['[data-recv]', '[data-tprice]', '[data-timpact]', '[data-tmin]'].forEach(k => $(k, panel).textContent = '—'); $('[data-timpact]', panel).className = ''; return; }
    try {
      const q = await damm.quote(cur, pg.side, n); if (my !== pg.quoteSeq || !panel.isConnected) return;
      pg.shownQuote = { q, side: pg.side, n }; const imp = q.impact * 100;
      $('[data-recv]', panel).textContent = s ? `${fmtExact(q.out, cur.q)} ${C.sym}` : `${fmtTok(q.out)} $${cur.ticker}`;
      $('[data-tmin]', panel).textContent = s ? `${fmtExact(q.minOut, cur.q)} ${C.sym}` : `${fmtTok(q.minOut)} $${cur.ticker}`;
      $('[data-tprice]', panel).textContent = `${fmtPrice(q.price)} ${C.sym}`;
      const ti = $('[data-timpact]', panel); ti.textContent = imp < 0.01 ? 'under 0.01%' : imp.toFixed(2) + '%'; ti.className = imp >= 5 ? 'down' : '';
      if (imp >= 5 && !msg) { err.textContent = `This trade moves the price ${imp.toFixed(1)}%. The pool is small; a smaller amount gets a better price.`; }
    } catch (e) { if (my === pg.quoteSeq) err.textContent = `No quote: ${e.message}`; }
  };
  const later = () => { clearTimeout(timer); timer = setTimeout(sync, 250); };   // a keystroke's quote waits for the next one
  inp.oninput = later; slip.oninput = later;
  const priVal = $('[data-prival]', panel); priVal.oninput = () => { const v = parseFloat(priVal.value); if (v >= 0 && v <= 0.05) damm.priority = v; };
  panel.onclick = async e => {
    const side = e.target.closest('[data-side] button'), chip = e.target.closest('[data-chip],[data-pct]'), cur = now();
    if (side) { pg.side = side.dataset.v; $$('[data-side] button', panel).forEach(b => b.setAttribute('aria-pressed', String(b === side))); inp.value = sell() && heldOf(cur) > 0 ? String(r6(heldOf(cur))) : ''; chips(); sync(); inp.focus(); return; }
    if (chip) {
      if (chip.dataset.chip === 'max' && spendable(cur) <= 0) { inp.value = ''; sync(); err.textContent = `This wallet has nothing to spend: add ${Q(cur).sym} first${cur.q === 'SOL' ? ', keeping about 0.01 SOL for the fees' : ''}.`; return; }
      inp.value = chip.dataset.pct ? r6(heldOf(cur) * chip.dataset.pct / 100) : chip.dataset.chip !== 'max' ? chip.dataset.chip : r6(spendable(cur)); sync(); return;
    }
    if (!e.target.closest('[data-go]') || busy) return;
    if (!on()) { await connect(); return; }
    const n = num(); if (go.disabled || !(n > 0)) return;
    go.disabled = true; go.textContent = 'Confirm in wallet…'; busy = true;
    try {
      const s = sell(), shown = pg.shownQuote && pg.shownQuote.side === pg.side && pg.shownQuote.n === n ? pg.shownQuote.q : null;   // the bound the panel showed
      const { sig, quote } = await damm.swap(cur, pg.side, n, damm.slippage, shown);
      toastLink(s ? `Sold ${fmtTok(n)} $${cur.ticker} for ${fmtExact(quote.out, cur.q)} ${C.sym}` : `Bought ${fmtTok(quote.out)} $${cur.ticker} for ${fmtExact(n, cur.q)} ${C.sym}`, explorer(sig, 'tx'), 'View transaction');
      inp.value = '';
      await refreshHolding(cur); refreshBalances(true); loadTrading(cur); if (pg.tab === 'holders') renderTab(cur);
    } catch (e) { toast(e.message); }
    busy = false; if (panel.isConnected) { go.disabled = false; sync(); }
  };
  pg.syncTrade = sync; chips(); sync();
  if (on()) refreshHolding(p);   // the wallet's token balance, from the chain
}
/* what a wallet can put into a buy: its balance of the pair asset, less about 0.01 SOL a real wallet keeps for the fee and the token account */
const spendable = p => Math.max(0, r6(balOf(p.q) - (p.q === 'SOL' && isReal() ? 0.01 : 0)));
/* a real wallet's balance of the token, read from its token account and kept where the demo keeps its holdings */
async function refreshHolding(p) {
  if (!isReal() || !p.mint) return;
  try {
    await chain.init(); if (!isReal()) return;   // the wallet can be replaced while the chain client comes up
    const me = chain.me(), ata = chain.ata(me, chain.pk(p.mint));
    const info = await chain.conn.getTokenAccountBalance(ata).catch(() => null);
    if (!isReal() || state.wallet.pk !== me.toBase58()) return;   // the wallet changed while the chain answered
    const held = info ? Number(info.value.uiAmountString) : 0; (state.tokens = state.tokens || {})[p.id] = held;
    const pw = detailBox && $('[data-poswrap]', detailBox); if (pw && pg.id === p.id) { pw.innerHTML = positionPanel(p); const dc = $('[data-dclaim]', pw); if (dc) dc.onclick = () => claim(p, dc); }
    if (pg.syncTrade) pg.syncTrade();
  } catch (e) { console.warn('holding:', e.message); }
}
async function loadAsync(p) {
  const box = detailBox, id = p.id;
  /* announcements kept on the backend arrive after the page is up: the tab's count, the strip and the tab itself follow */
  if (supa.configured() && pg.updLoaded !== id) { pg.updLoaded = id; updatesAdapter.load(p).then(() => { if (pg.id !== id) return; refreshTabLabels(p); refreshAnnounce(p); if (pg.tab === 'announcements') renderTab(p); }); }
  if (p.status === 'seeded') loadTrading(p);
  const again = () => { if (ui.sel !== id || !detailBox) return; const ch = $('.pp-pills .risk-chip', detailBox); if (ch) ch.outerHTML = riskChip(riskSummary(riskChecks(p))); if (pg.tab === 'backers' || pg.tab === 'info') renderTab(p); };
  if (await founderAdapter.refresh(p)) again();
  if (await backersAdapter.enrich(p)) again();
  if (p.live && p.status === 'seeded' && !(chainChecksOf[id] && !chainChecksOf[id].some(c => c.level === 'pending'))) { try { const cc = await chainChecks(p); if (cc && pg.id === id) { chainChecksOf[id] = cc; again(); } } catch (e) { console.warn('chain checks:', e.message); } }
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
  s('[data-draised]', e => roll(e, fmtC(p.raised, p.q, true))); s('[data-dpct]', e => roll(e, Math.floor(pc + 1e-7) + '%')); s('[data-dbackers]', e => roll(e, plural(p.backers, 'backer')));
  s('[data-sraised]', e => roll(e, fmtC(p.raised, p.q, true))); s('[data-spct]', e => roll(e, Math.floor(pc + 1e-7) + '%')); s('[data-sbackers]', e => roll(e, p.backers));
  s('[data-dchart]', e => e.innerHTML = raiseSVG(p)); s('[data-dbars]', e => e.innerHTML = buysSVG(p)); s('[data-pace]', e => e.textContent = pi.text);
  s('[data-fill] .pace-chip', e => e.outerHTML = paceChip(pi));
}
function tickDetail() {
  const p = find(ui.sel); if (!detailBox || !p || pg.id !== p.id || p.status !== 'live') return;
  const left = fmtLeft(p.endsAt - Date.now());
  ['[data-dtime]', '[data-stime]', '[data-vtime]'].forEach(k => { const e = $(k, detailBox); if (e) roll(e, left); });
}
