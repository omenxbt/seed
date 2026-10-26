/* ==========================================================================
   BOARD FILTERS and the site's own drop-down menus.
   Menus: one floating list for the whole page (openMenu), opened under the button that asked for it, in place of the
   browser's <select>. The board's sort menus and the quick-deposit asset use it.
   Filters: each board column keeps its own set (keywords, pair, checks, metrics, socials) in `filters`, saved in this
   browser. renderTerminal() asks boardHit(k) for the raises a column shows. The Filters dialog edits them, live.
   ========================================================================== */

/* ---------------------------------------------------------------- menus */
const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';
const menuPop = (() => { const el = document.createElement('div'); el.className = 'menu'; el.setAttribute('role', 'listbox'); el.hidden = true; document.body.appendChild(el); return el; })();
let menuFor = null;
function openMenu(btn, items, value, onPick) {
  if (menuFor === btn) return closeMenu();
  if (menuFor) closeMenu(false);
  menuFor = btn; btn.setAttribute('aria-expanded', 'true');
  menuPop.innerHTML = items.map(it => `<button type="button" role="option" data-v="${esc(it.v)}" aria-selected="${it.v === value}">${it.v === value ? CHECK : '<i></i>'}<span>${esc(it.label)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</button>`).join('');
  menuPop.hidden = false; menuPop.style.minWidth = Math.max(btn.getBoundingClientRect().width, 176) + 'px';
  const r = btn.getBoundingClientRect(), w = menuPop.offsetWidth, h = menuPop.offsetHeight;
  const left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)), top = r.bottom + 8 + h > innerHeight - 8 ? r.top - h - 8 : r.bottom + 8;
  menuPop.style.left = left + 'px'; menuPop.style.top = top + 'px';
  menuPop.onclick = e => { const o = e.target.closest('[data-v]'); if (!o) return; closeMenu(); onPick(o.dataset.v); };
  const sel = $('[aria-selected="true"]', menuPop) || $('button', menuPop); if (sel) sel.focus({ preventScroll: true });
}
function closeMenu(refocus = true) {
  if (!menuFor) return; const b = menuFor; menuFor = null;
  b.setAttribute('aria-expanded', 'false'); menuPop.hidden = true; if (refocus) b.focus({ preventScroll: true });
}
document.addEventListener('click', e => { if (menuFor && !e.target.closest('.menu') && !e.target.closest('[aria-haspopup="listbox"]')) closeMenu(false); });
document.addEventListener('keydown', e => {
  if (!menuFor) return; const opts = $$('[role="option"]', menuPop), i = opts.indexOf(document.activeElement);
  if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); (opts[i + 1] || opts[0]).focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); (opts[i - 1] || opts[opts.length - 1]).focus(); }
  else if (e.key === 'Tab') closeMenu(false);
});
addEventListener('resize', () => closeMenu(false)); addEventListener('scroll', () => closeMenu(false), true);

/* the sort menu of each tab and the quick-buy asset. Seeded raises are all at 100%, refunded ones have no
   market cap: those tabs leave that sort out. */
const SORT_ITEMS = k => [{ v: 'new', label: 'Newest' }, ...(k === 'refunded' ? [] : [{ v: 'mcap', label: 'Market cap' }]), ...(k === 'seeded' ? [] : [{ v: 'filled', label: '% to target' }]), { v: 'ending', label: k === 'seeded' ? 'Recently seeded' : k === 'refunded' ? 'Recently closed' : 'Ending soon' }];

const sortLabel = (k, v) => (SORT_ITEMS(k).find(i => i.v === v) || SORT_ITEMS(k)[0]).label;
document.addEventListener('click', e => {
  const s = e.target.closest('button[data-sort]');
  if (s) { const k = s.dataset.sort === 'feed' ? ui.feed : s.dataset.sort; return openMenu(s, SORT_ITEMS(k), ui.sort[k], v => { ui.sort[k] = v; $('[data-label]', s).textContent = sortLabel(k, v); showBoard(); }); }
  const a = e.target.closest('#qbAsset');
  if (a) { const keys = quickKeys(); return openMenu(a, keys.map(k => ({ v: k, label: asset(k).sym, sub: k === 'SOL' || k === 'USDC' ? '' : 'live raise' })), ui.qbAsset, v => { ui.qbAsset = v; syncQuickUI(); }); }
});

/* ---------------------------------------------------------------- the filters */
const FILTER_KEY = 'seed.filters.v1', COLS = ['new', 'seeding', 'seeded'], COL_NAME = { new: 'Live, under 50%', seeding: 'Near target', seeded: 'Seeded' };
const SOCIAL_OPTS = [['website', 'Website'], ['x', 'X'], ['telegram', 'Telegram'], ['discord', 'Discord'], ['github', 'GitHub']];
const blankFilter = () => ({ q: '', not: '', pairs: [], verified: false, pass: false, noFail: false, maxWarn: '', onPace: false, filled: ['', ''], backers: ['', ''], hours: ['', ''], top10: '', fresh: '', bundled: '', socials: [], deck: false, team: false, ann: false, xOnly: false });
const filters = (() => { let s = null; try { s = JSON.parse(localStorage.getItem(FILTER_KEY) || 'null'); } catch (e) {} return Object.fromEntries(COLS.map(k => [k, Object.assign(blankFilter(), s && s[k], { pairs: [], verified: false })])); })();   // SOL only: a pair rule saved before is dropped
function saveFilters() { try { localStorage.setItem(FILTER_KEY, JSON.stringify(filters)); } catch (e) {} }
const hasRange = r => r[0] !== '' || r[1] !== '';
/* how many rules a filter set carries, in all and per section */
function ruleCounts(f) {
  const c = { pair: (f.pairs.length ? 1 : 0) + (f.verified ? 1 : 0), checks: (f.pass ? 1 : 0) + (f.noFail ? 1 : 0) + (f.maxWarn !== '' ? 1 : 0) + (f.onPace ? 1 : 0),
    metrics: ['filled', 'backers', 'hours'].filter(k => hasRange(f[k])).length + ['top10', 'fresh', 'bundled'].filter(k => f[k] !== '').length,
    socials: (f.socials.length ? 1 : 0) + ['deck', 'team', 'ann', 'xOnly'].filter(k => f[k]).length, words: (f.q.trim() ? 1 : 0) + (f.not.trim() ? 1 : 0) };
  c.all = c.pair + c.checks + c.metrics + c.socials + c.words; return c;
}
const filterTotal = () => COLS.reduce((a, k) => a + ruleCounts(filters[k]).all, 0);
/* does a raise pass its column's filter set */
function boardPass(k, p) {
  const f = filters[k]; if (!ruleCounts(f).all) return true;
  const pr = profileOf(p), words = s => s.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  const text = `${p.name} ${p.ticker} ${pr.description || ''}`.toLowerCase();
  if (f.q.trim() && !words(f.q).some(w => text.includes(w))) return false;
  if (f.not.trim() && words(f.not).some(w => text.includes(w))) return false;
  if (f.pairs.length && !f.pairs.includes(p.q)) return false;
  if (f.verified && !Q(p).verified) return false;
  if (f.xOnly && !(p.xAccount && p.xAccount.handle && p.xAccount.verified)) return false;   // a linked X account, signed in, not typed
  if (f.pass || f.noFail || f.maxWarn !== '') { const s = riskSummary(riskChecks(p)); if (f.pass && s.level !== 'pass') return false; if (f.noFail && s.fails) return false; if (f.maxWarn !== '' && s.warns > +f.maxWarn) return false; }
  if (f.onPace && p.status === 'live' && paceInfo(p).state !== 'on') return false;
  const inRange = (r, v) => (r[0] === '' || v >= +r[0]) && (r[1] === '' || v <= +r[1]);
  if (!inRange(f.filled, pctOf(p)) || !inRange(f.backers, p.backers)) return false;
  if (hasRange(f.hours) && p.status === 'live' && !inRange(f.hours, (p.endsAt - Date.now()) / H)) return false;
  if (f.top10 !== '' || f.fresh !== '' || f.bundled !== '') { const s = backersAdapter.summary(p); if (f.top10 !== '' && s.top10 > +f.top10) return false; if (f.fresh !== '' && s.fresh > +f.fresh) return false; if (f.bundled !== '' && s.bundled > +f.bundled) return false; }
  const l = pr.links || {};
  if (f.socials.some(s => !safeUrl(l[s]))) return false;
  if ((f.deck && !pr.deck) || (f.team && !(pr.team || []).length) || (f.ann && !updatesAdapter.list(p).length)) return false;
  return true;
}
/* the raises a column shows: the toolbar's search and pair filter, the column's own rules, unsorted */
function boardHit(k) {
  const q = ui.bq.trim().toLowerCase();
  return state.presales.filter(p => colOf(p) === k && pairOk(p) && matchQ(p, q) && boardPass(k, p) && (!ui.watchOnly || isWatched(p)));
}
/* the toolbar button's count and each column's badge */
function syncFilterBadges() {
  const n = filterTotal(), ct = $('#filterCt'); if (ct) { ct.textContent = n; ct.hidden = !n; } const fb = $('#filterBtn'); if (fb) fb.classList.toggle('on', !!n);
  COLS.forEach(k => { const b = $(`[data-filt="${k}"]`), c = ruleCounts(filters[k]).all; if (!b) return; b.hidden = !c; b.innerHTML = `${FUNNEL}${c}`; b.title = `${c} filter${c > 1 ? 's' : ''} on ${COL_NAME[k]}`; });
}

/* ---------------------------------------------------------------- the dialog */
const FUNNEL = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3.5h12l-4.6 5.4V13l-2.8 1V8.9z"/></svg>';
const fd = { col: 'new', sec: 'checks' };
const SECS = [['checks', 'Checks'], ['metrics', 'Metrics'], ['socials', 'Socials']];   // no pair section: every raise pairs with SOL
function openFilters(col) {
  if (col) fd.col = col; const d = $('#filterDlg'); drawFilters();
  d.onclick = e => { if (e.target === d || e.target.closest('[data-fx]')) closeFilters(); };
  d.oncancel = closeFilters; if (!d.open) d.showModal();
}
function closeFilters() { const d = $('#filterDlg'); d.onclick = d.oncancel = null; if (d.open) d.close(); }
const fsw = (k, label, hint) => `<div class="fs-row" data-fb="${k}"><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</span><button type="button" class="switch" role="switch" aria-checked="${!!filters[fd.col][k]}" aria-label="${label}"></button></div>`;
const frange = (k, label, unit) => { const r = filters[fd.col][k]; return `<div class="fs-row stack"><span><b>${label}</b>${unit ? `<small>${unit}</small>` : ''}</span><div class="fs-range"><input class="fs-in num" inputmode="decimal" placeholder="Min" value="${esc(r[0])}" data-fr="${k}:0" aria-label="${label}, minimum"><input class="fs-in num" inputmode="decimal" placeholder="Max" value="${esc(r[1])}" data-fr="${k}:1" aria-label="${label}, maximum"></div></div>`; };
const fmax = (k, label, hint) => `<div class="fs-row" data-k="${k}"><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</span><input class="fs-in num short" inputmode="decimal" placeholder="Any" value="${esc(filters[fd.col][k])}" data-fn="${k}" aria-label="${label}"></div>`;
function sectionHTML() {
  const f = filters[fd.col], live = fd.col !== 'seeded';
  if (fd.sec === 'pair') { const keys = [...new Set(state.presales.map(p => p.q))];
    return `<p class="fs-lab">Pair asset. Nothing chosen means any.</p><div class="fs-chips">${keys.map(k => `<button type="button" class="fchip" data-fp="${esc(k)}" aria-pressed="${f.pairs.includes(k)}">${esc(asset(k).sym)}</button>`).join('')}</div>${fsw('verified', 'Verified pairs only', 'The pair asset is on Jupiter’s verified list')}`; }
  if (fd.sec === 'checks') return fsw('pass', 'All checks pass', 'No warning and no fail on the info panel') + fsw('noFail', 'No fails', 'Warnings are fine') + fmax('maxWarn', 'Warnings at most', 'Leave empty for any number') + (live ? fsw('onPace', 'On pace only', 'Filling fast enough to seed before the deadline') : '');
  if (fd.sec === 'metrics') return frange('filled', 'Filled', '% of target') + frange('backers', 'Backers') + (live ? frange('hours', 'Time left', 'hours') : '') + fmax('top10', 'Top 10 share at most', '% of the raise held by the ten largest backers') + fmax('fresh', 'Fresh wallets at most', '% of backers whose wallet is under a week old') + fmax('bundled', 'Bundled at most', '% of the raise from wallets sharing a funder');
  return `<p class="fs-lab">Must link to</p><div class="fs-chips">${SOCIAL_OPTS.map(([k, l]) => `<button type="button" class="fchip" data-fs="${k}" aria-pressed="${f.socials.includes(k)}">${l}</button>`).join('')}</div>` + fsw('xOnly', 'Verified X only', 'The founder linked an X account by signing in') + fsw('deck', 'Deck attached') + fsw('team', 'Team listed') + fsw('ann', 'Has announcements');
}
function drawFilters() {
  const f = filters[fd.col], rc = ruleCounts(f), body = $('#filterBody');
  body.innerHTML = `<div class="fs-head"><span class="fs-title">${FUNNEL}Board filters</span><span class="fs-tools"><button type="button" class="x" data-freset title="Clear this column’s filters" aria-label="Clear this column’s filters"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.5-3.6M13 3v2.5h-2.5"/></svg></button><button type="button" class="x" data-fx aria-label="Close">&times;</button></span></div>
    <div class="fs-cols" role="tablist">${COLS.map(k => `<button type="button" role="tab" data-fcol="${k}" aria-selected="${k === fd.col}">${COL_NAME[k]}<span class="ct num" data-fcount="${k}">${boardHit(k).length}</span></button>`).join('')}</div>
    <section class="fs-box"><div class="fs-grid2"><label class="fs-field"><span>Search keywords</span><input class="fs-in" data-f="q" value="${esc(f.q)}" placeholder="name, ticker, description" autocomplete="off"></label><label class="fs-field"><span>Exclude keywords</span><input class="fs-in" data-f="not" value="${esc(f.not)}" placeholder="keyword1, keyword2…" autocomplete="off"></label></div></section>
    <div class="fs-secs" role="tablist">${SECS.map(([k, l]) => `<button type="button" role="tab" data-fsec="${k}" aria-selected="${k === fd.sec}">${l}${rc[k] ? `<span class="ct num" data-fsc="${k}">${rc[k]}</span>` : `<span class="ct num" data-fsc="${k}" hidden></span>`}</button>`).join('')}</div>
    <section class="fs-box fs-sec">${sectionHTML()}</section>
    <div class="fs-foot"><span class="quiet" data-fsum></span><button type="button" class="btn btn-navy" data-fx>Done</button></div>`;
  updateFilterCounts();
}
/* the numbers around the form follow every change; the form itself is only redrawn when a switch or tab is pressed */
function updateFilterCounts() {
  const rc = ruleCounts(filters[fd.col]), body = $('#filterBody');
  COLS.forEach(k => { const e = $(`[data-fcount="${k}"]`, body); if (e) e.textContent = boardHit(k).length; });
  SECS.forEach(([k]) => { const e = $(`[data-fsc="${k}"]`, body); if (e) { e.textContent = rc[k]; e.hidden = !rc[k]; } });
  const n = boardHit(fd.col).length, sum = $('[data-fsum]', body);
  if (sum) sum.textContent = rc.all ? `${rc.all} rule${rc.all > 1 ? 's' : ''} on ${COL_NAME[fd.col]}: ${n} ${n === 1 ? 'raise matches' : 'raises match'}` : `No rules on ${COL_NAME[fd.col]}. Showing every raise in it.`;
  const rs = $('[data-freset]', body); if (rs) rs.disabled = !rc.all;
}
function filtersChanged(redraw) { saveFilters(); renderTerminal(); if (redraw) drawFilters(); else updateFilterCounts(); }
(function bindFilters() {
  const body = $('#filterBody'); if (!body) return;
  body.addEventListener('input', e => {
    const f = filters[fd.col], t = e.target, v = t.value;
    if (t.dataset.f) f[t.dataset.f] = v;
    else if (t.dataset.fr) { const [k, i] = t.dataset.fr.split(':'); f[k][+i] = v.trim() === '' || isNaN(parseFloat(v)) ? '' : String(parseFloat(v.replace(/,/g, ''))); }
    else if (t.dataset.fn) f[t.dataset.fn] = v.trim() === '' || isNaN(parseFloat(v)) ? '' : String(parseFloat(v));
    else return;
    filtersChanged(false);
  });
  body.addEventListener('click', e => {
    const f = filters[fd.col], col = e.target.closest('[data-fcol]'), sec = e.target.closest('[data-fsec]'), sw = e.target.closest('[data-fb]'), fp = e.target.closest('[data-fp]'), fs = e.target.closest('[data-fs]'), rs = e.target.closest('[data-freset]');
    if (col) { fd.col = col.dataset.fcol; return drawFilters(); }
    if (sec) { fd.sec = sec.dataset.fsec; return drawFilters(); }
    if (sw && !e.target.closest('input')) { f[sw.dataset.fb] = !f[sw.dataset.fb]; return filtersChanged(true); }
    if (fp) { const k = fp.dataset.fp, i = f.pairs.indexOf(k); i < 0 ? f.pairs.push(k) : f.pairs.splice(i, 1); return filtersChanged(true); }
    if (fs) { const k = fs.dataset.fs, i = f.socials.indexOf(k); i < 0 ? f.socials.push(k) : f.socials.splice(i, 1); return filtersChanged(true); }
    if (rs) { filters[fd.col] = blankFilter(); return filtersChanged(true); }
  });
  document.addEventListener('click', e => { const b = e.target.closest('#filterBtn,[data-filt]'); if (b) { e.preventDefault(); openFilters(b.dataset.filt || undefined); } });
})();
