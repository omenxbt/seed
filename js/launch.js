/* ==========================================================================
   LAUNCH FORM. Every field the project page shows: identity, media, raise terms, tokenomics with vesting, use of funds, team,
   roadmap and links. The side panel shows the card backers will see and the risk checks, computed live from the draft by the
   same code the project page uses, so a founder sees each warning before opening.
   Uploads go to Supabase Storage (signed upload URL from the Edge Function) when it is configured; until then they are a
   preview in this browser only.
   The pair asset, stock and mint handling (draft, draftAsset, lookupMint, readDraft, validateDraft) stays in index.html.
   ========================================================================== */
const lf = {
  alloc: [{ label: 'Team', kind: 'team', pct: 12, wallet: '', cliff: 180, dur: 720 }, { label: 'Treasury', kind: 'treasury', pct: 8, wallet: '', cliff: 90, dur: 540 }],
  uof: [{ label: '', pct: '' }],
  team: [{ name: '', role: 'Founder', x: '', github: '', linkedin: '', wallet: '' }],
  road: [{ title: '', due: '', status: 'planned', proof: '' }],
  files: { banner: null, art: null, deck: null }, urls: { banner: '', art: '', deck: '' }, pos: { banner: [50, 50], art: [50, 50] }, descPv: false
};
const MAX_UPLOAD = 10 * 1024 * 1024;
const numv = v => { const n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : NaN; };
const isUrl = v => !v || /^https?:\/\/[^\s]+\.[^\s]+/i.test(v);

/* ---------------------------------------------------------------- row editors */
const ROWS = {
  alloc: { box: '#allocRows', blank: () => ({ label: '', kind: 'other', pct: '', wallet: '', cliff: '', dur: '' }), html: (r, i) => `<div class="row-ed alloc-row" data-i="${i}">
      <label><span>Allocation</span><input data-k="label" value="${esc(r.label)}" placeholder="Team" maxlength="40"></label>
      <label><span>Kind</span><select data-k="kind">${['team', 'treasury', 'other'].map(k => `<option value="${k}"${r.kind === k ? ' selected' : ''}>${k[0].toUpperCase() + k.slice(1)}</option>`).join('')}</select></label>
      <label><span>Share %</span><input data-k="pct" class="num" inputmode="decimal" value="${esc(r.pct)}" placeholder="10"></label>
      <label><span>Cliff, days</span><input data-k="cliff" class="num" inputmode="numeric" value="${esc(r.cliff)}" placeholder="0"></label>
      <label><span>Vesting, days</span><input data-k="dur" class="num" inputmode="numeric" value="${esc(r.dur)}" placeholder="None"></label>
      <label class="wide"><span>Wallet, optional</span><input data-k="wallet" class="num" value="${esc(r.wallet)}" placeholder="Where these tokens sit" spellcheck="false"></label>
      <button type="button" class="x" data-del aria-label="Remove">&times;</button></div>` },
  uof: { box: '#uofRows', blank: () => ({ label: '', pct: '' }), html: (r, i) => `<div class="row-ed uof-row" data-i="${i}">
      <label class="wide"><span>Line</span><input data-k="label" value="${esc(r.label)}" placeholder="Engineering" maxlength="60"></label>
      <label><span>Share %</span><input data-k="pct" class="num" inputmode="decimal" value="${esc(r.pct)}" placeholder="50"></label>
      <button type="button" class="x" data-del aria-label="Remove">&times;</button></div>` },
  team: { box: '#teamRows', blank: () => ({ name: '', role: '', x: '', github: '', linkedin: '', wallet: '' }), html: (r, i) => `<div class="row-ed team-row" data-i="${i}">
      <label><span>Name</span><input data-k="name" value="${esc(r.name)}" maxlength="50"></label><label><span>Role</span><input data-k="role" value="${esc(r.role)}" maxlength="50"></label>
      <label><span>X</span><input data-k="x" value="${esc(r.x)}" placeholder="https://x.com/"></label><label><span>GitHub</span><input data-k="github" value="${esc(r.github)}" placeholder="https://github.com/"></label>
      <label><span>LinkedIn</span><input data-k="linkedin" value="${esc(r.linkedin)}" placeholder="https://linkedin.com/in/"></label><label><span>Wallet, optional</span><input data-k="wallet" class="num" value="${esc(r.wallet)}" spellcheck="false"></label>
      <button type="button" class="x" data-del aria-label="Remove">&times;</button></div>` },
  road: { box: '#roadRows', blank: () => ({ title: '', due: '', status: 'planned', proof: '' }), html: (r, i) => `<div class="row-ed road-row" data-i="${i}">
      <label class="wide"><span>Milestone</span><input data-k="title" value="${esc(r.title)}" maxlength="80"></label><label><span>Due</span><input data-k="due" type="date" value="${esc(r.due)}"></label>
      <label><span>Status</span><select data-k="status">${['planned', 'shipped'].map(k => `<option value="${k}"${r.status === k ? ' selected' : ''}>${k[0].toUpperCase() + k.slice(1)}</option>`).join('')}</select></label>
      <label class="wide"><span>Proof link, for shipped</span><input data-k="proof" value="${esc(r.proof)}" placeholder="https://"></label>
      <button type="button" class="x" data-del aria-label="Remove">&times;</button></div>` }
};
function drawRows(kind) { const R = ROWS[kind]; $(R.box).innerHTML = lf[kind].map(R.html).join(''); }
function allocSum() { const share = numv($('#fShare').value) || 0; return 2 * share + lf.alloc.reduce((a, r) => a + (numv(r.pct) || 0), 0); }
function drawSums() {
  const share = numv($('#fShare').value); $('#fLp').value = isFinite(share) ? share : '';
  const a = allocSum(), u = lf.uof.reduce((s, r) => s + (numv(r.pct) || 0), 0), ok = x => Math.abs(x - 100) < 1e-6;
  $('#allocSum').className = 'sum-meter ' + (ok(a) ? 'ok' : 'bad'); $('#allocSum').textContent = `${+a.toFixed(2)}% of 100%${ok(a) ? '' : a > 100 ? `, over by ${+(a - 100).toFixed(2)}` : `, ${+(100 - a).toFixed(2)} left to assign`}`;
  $('#uofSum').className = 'sum-meter ' + (ok(u) ? 'ok' : 'bad'); $('#uofSum').textContent = `${+u.toFixed(2)}% of 100%`;
}

/* ---------------------------------------------------------------- uploads with crop previews */
function setFile(kind, file) {
  const box = { banner: '#upBanner', art: '#upArt', deck: '#upDeck' }[kind], el = $(box), crop = $('[data-crop]', el), accept = el.dataset.accept.split(',');
  if (!accept.includes(file.type)) return toast(kind === 'deck' ? 'The deck must be a PDF.' : 'Use a PNG, JPEG or WebP image.');
  if (file.size > MAX_UPLOAD) return toast('Files can be at most 10 MB.');
  if (lf.urls[kind] && lf.urls[kind].startsWith('blob:')) URL.revokeObjectURL(lf.urls[kind]);
  lf.files[kind] = file; lf.urls[kind] = URL.createObjectURL(file);
  if (kind === 'deck') crop.innerHTML = `<span class="doc-name">${ICONS.out}<b>${esc(file.name)}</b> ${(file.size / 1048576).toFixed(1)} MB</span><button type="button" class="linkbtn" data-clear>Remove</button>`;
  else { lf.pos[kind] = [50, 50]; crop.innerHTML = `<img src="${lf.urls[kind]}" alt="" draggable="false" style="object-position:50% 50%"><span class="crop-hint">Drag to adjust</span><button type="button" class="linkbtn" data-clear>Remove</button>`; }
  el.classList.add('has'); renderPreview();
}
function clearFile(kind) {
  const el = $({ banner: '#upBanner', art: '#upArt', deck: '#upDeck' }[kind]);
  if (lf.urls[kind] && lf.urls[kind].startsWith('blob:')) URL.revokeObjectURL(lf.urls[kind]);
  lf.files[kind] = null; lf.urls[kind] = ''; $('input[type=file]', el).value = '';
  $('[data-crop]', el).innerHTML = `<span>${kind === 'banner' ? 'Drop an image or choose a file' : kind === 'art' ? 'Drop an image' : 'Drop a PDF'}</span>`; el.classList.remove('has'); renderPreview();
}
function bindDrop(el) {
  const kind = el.dataset.kind, input = $('input[type=file]', el);
  input.onchange = () => input.files[0] && setFile(kind, input.files[0]);
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('over'); });
  el.addEventListener('dragleave', () => el.classList.remove('over'));
  el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) setFile(kind, f); });
  el.addEventListener('click', e => { if (e.target.closest('[data-clear]')) { e.preventDefault(); clearFile(kind); return; } if (!lf.files[kind]) input.click(); });
  // drag the image to choose which part the crop keeps
  let drag = null;
  el.addEventListener('pointerdown', e => { const img = $('img', el); if (!img || e.target.closest('[data-clear]')) return; drag = { x: e.clientX, y: e.clientY, p: lf.pos[kind].slice() }; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => { if (!drag) return; const r = el.getBoundingClientRect(), img = $('img', el);
    lf.pos[kind] = [Math.max(0, Math.min(100, drag.p[0] - (e.clientX - drag.x) / r.width * 100)), Math.max(0, Math.min(100, drag.p[1] - (e.clientY - drag.y) / r.height * 100))];
    img.style.objectPosition = `${lf.pos[kind][0].toFixed(1)}% ${lf.pos[kind][1].toFixed(1)}%`; });
  el.addEventListener('pointerup', () => { if (drag) { drag = null; renderPreview(); } });
}

/* ---------------------------------------------------------------- the draft as a presale */
const posTxt = k => `${lf.pos[k][0].toFixed(1)}% ${lf.pos[k][1].toFixed(1)}%`;
function draftProfile(d) {
  const share = numv($('#fShare').value) || 0, since = $('#fXSince').value;
  const allocations = [alloc('Presale backers', 'presale', share), alloc('Locked Meteora pool', 'lp', share)]
    .concat(lf.alloc.filter(r => r.label || r.pct).map(r => alloc(r.label || 'Unnamed', r.kind, numv(r.pct) || 0, numv(r.dur) > 0 ? vest(Math.max(0, numv(r.cliff) || 0), numv(r.dur)) : null, B58.test(r.wallet) ? r.wallet : null)));
  const founderWallet = state.wallet ? (state.wallet.pk || walletId()) : null;
  const team = lf.team.filter(m => m.name.trim()).map(m => ({ name: m.name.trim(), role: m.role.trim(), x: m.x.trim() || null, github: m.github.trim() || null, linkedin: m.linkedin.trim() || null, wallet: B58.test(m.wallet.trim()) ? m.wallet.trim() : null, verified: { x: false, github: false, domain: false } }));
  if (team[0] && !team[0].wallet && founderWallet) team[0].wallet = founderWallet;
  return {
    tagline: d.idea, description: $('#fDesc').value.trim(),
    links: { website: $('#lWebsite').value.trim() || null, x: $('#lX').value.trim() || null, telegram: $('#lTelegram').value.trim() || null, discord: $('#lDiscord').value.trim() || null, github: $('#lGithub').value.trim() || null },
    minBuy: numv($('#fMin').value) || 0, maxBuy: numv($('#fMax').value) || 0,
    whitelist: $('#fWl').value.split(/\s+/).map(x => x.trim()).filter(Boolean),
    tokenomics: { allocations, useOfFunds: lf.uof.filter(r => r.label || r.pct).map(r => ({ label: r.label.trim() || 'Unnamed', pct: numv(r.pct) || 0 })) },
    team, founder: { name: team[0] ? team[0].name : 'Founder', x: $('#fFounderX').value.trim() || null, xAgeDays: since ? Math.max(0, (Date.now() - Date.parse(since + '-01')) / D) : null, wallet: founderWallet, pastLaunches: [] },
    deck: lf.urls.deck || null, banner: lf.urls.banner || null, art: lf.urls.art || null, bannerPos: posTxt('banner'), artPos: posTxt('art'),
    roadmap: lf.road.filter(r => r.title.trim()).map(r => ({ title: r.title.trim(), dueAt: r.due ? Date.parse(r.due) : Date.now(), status: r.status, proof: r.proof.trim() || null })),
    updates: [], chat: [], watchers: 0
  };
}
function draftPresale() {
  const d = readDraft(), da = draftAsset(), now = Date.now();
  return { id: 'draft', name: d.name || 'Your project', ticker: d.ticker || 'TICKER', idea: d.idea, q: da.key || 'SOL', target: isFinite(d.target) && d.target > 0 ? d.target : 0, raised: 0, backers: 0, openedAt: now, endsAt: now + d.hours * H,
    status: 'live', resolvedAt: null, mine: true, creator: walletId(), hist: [[now, 0]], buys: [], profile: draftProfile(d) };
}

/* ---------------------------------------------------------------- validation */
function validateFull() {
  const d = readDraft(), da = draftAsset(), base = validateDraft(d, da); if (base) return base;
  if ($('#fDesc').value.trim().length < 40) return 'Describe the project in at least 40 characters so backers know what they are funding.';
  const mn = numv($('#fMin').value), mx = numv($('#fMax').value);
  if ($('#fMin').value && !(mn >= 0)) return 'The minimum buy must be a number.';
  if ($('#fMax').value && !(mx > 0)) return 'The maximum per wallet must be a number above zero.';
  if (mn > 0 && mx > 0 && mn > mx) return 'The minimum buy is larger than the maximum per wallet.';
  const bad = $('#fWl').value.split(/\s+/).filter(Boolean).find(x => !B58.test(x)); if (bad) return `${bad.slice(0, 12)}… in the whitelist is not a Solana address.`;
  const share = numv($('#fShare').value);
  if (!(share >= 5 && share <= 50)) return 'The presale share must be between 5% and 50%. The pool gets the same share.';
  for (const r of lf.alloc) {
    if (!r.label && !r.pct) continue;
    if (!r.label.trim()) return 'Name every allocation.';
    if (!(numv(r.pct) > 0)) return `Give ${r.label} a share above zero.`;
    if ((r.cliff && !(numv(r.cliff) >= 0)) || (r.dur && !(numv(r.dur) >= 0))) return `${r.label}: cliff and vesting are whole days.`;
    if (r.wallet && !B58.test(r.wallet.trim())) return `${r.label}: the wallet is not a Solana address.`;
  }
  if (Math.abs(allocSum() - 100) > 1e-6) return `Allocations add up to ${+allocSum().toFixed(2)}%. They must add up to exactly 100%.`;
  const u = lf.uof.filter(r => r.label || r.pct);
  if (!u.length) return 'Add at least one line to the use of funds.';
  if (u.some(r => !r.label.trim() || !(numv(r.pct) > 0))) return 'Every use-of-funds line needs a name and a share.';
  if (Math.abs(u.reduce((s, r) => s + numv(r.pct), 0) - 100) > 1e-6) return 'The use of funds must add up to exactly 100%.';
  for (const m of lf.team) {
    if (!Object.values(m).some(v => String(v).trim())) continue;
    if (!m.name.trim()) return 'Every team member needs a name.';
    if (![m.x, m.github, m.linkedin].every(isUrl)) return `${m.name}: links must start with https://.`;
    if (m.wallet.trim() && !B58.test(m.wallet.trim())) return `${m.name}: the wallet is not a Solana address.`;
  }
  for (const r of lf.road) { if (!r.title.trim() && !r.due) continue; if (!r.title.trim()) return 'Every milestone needs a title.'; if (!r.due) return `${r.title}: add a due date.`; if (r.proof && !isUrl(r.proof)) return `${r.title}: the proof link must start with https://.`; }
  if (!['#lWebsite', '#lX', '#lTelegram', '#lDiscord', '#lGithub', '#fFounderX'].every(s => isUrl($(s).value.trim()))) return 'Links must start with https://.';
  return '';
}

/* ---------------------------------------------------------------- preview and live risk */
let founderLooked = '';
function renderPreview() {
  const d = readDraft(), da = draftAsset(), C = da.a || { sym: 'TOKEN', dp: 2, verified: false }, ok = !isNaN(d.target) && d.target > 0, sym = esc(C.sym), dp = draftPresale(), pr = dp.profile;
  $('#mintRow').hidden = draft.pair !== 'any'; $('#stockRow').hidden = draft.pair !== 'stock';
  $$('#stockRow [data-stock]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.stock === draft.stock)));
  $('#mintInfo').textContent = draft.pair !== 'any' ? '' : da.wait ? 'Checking on Solana…' : da.bad ? 'Not a token mint.' : da.err ? '' : !da.custom ? `Recognised as ${C.sym}`
    : da.off ? 'Solana could not be reached to check this mint. It will be listed as unverified.' : C.verified ? `${C.name || C.sym} (${C.sym}), verified on Jupiter` : `A real SPL mint${da.a.name ? `, ${da.a.name}` : ''}, but not on Jupiter's verified list. Backers will see a warning.`;
  $('#fCur').textContent = C.sym; $$('[data-cur]').forEach(e => e.textContent = C.sym); $('#ideaCt').textContent = `${$('#fIdea').value.length} / 80`;
  $('#fTarget').placeholder = { SOL: '200', USDC: '50000' }[da.key] || (C.stock ? '300' : '100000');
  drawSums();
  const art = pr.art ? `<img class="pv-art" src="${esc(pr.art)}" alt="" style="object-position:${pr.artPos}">` : `<span class="pv-art glyph-art" style="--h:${hashStr(dp.ticker) % 360}"><svg viewBox="0 0 24 24" aria-hidden="true">${glyph(dp)}</svg></span>`;
  $('#pvCard').innerHTML = `${pr.banner ? `<div class="pv-banner"><img src="${esc(pr.banner)}" alt="" style="object-position:${pr.bannerPos}"></div>` : ''}<div class="pv-id">${art}<span class="nm"><b>${esc(dp.name)}<span class="tk">$${esc(dp.ticker)}</span></b><span class="meta"><span class="chain${C.verified ? '' : ' unv'}">Pairs with ${sym}</span>${C.verified || !da.a ? '' : '<span class="tag warn">Unverified</span>'}</span></span></div>
    ${d.idea ? `<p class="pv-tag">${esc(d.idea)}</p>` : ''}<div class="c-prog"><span class="bar"><i style="width:0%"></i></span><span class="pct num">0%</span></div>`;
  const label = { 24: '24 hours', 72: '3 days', 168: '7 days' }[d.hours], share = presaleShare(dp), f = n => Number(n.toFixed(C.dp)).toLocaleString('en-US', { maximumFractionDigits: C.dp });
  $('#pvFacts').innerHTML = [
    ['Backers pay', ok ? `<span class="num">1 ${sym} = ${fmtTok(SUPPLY * share / d.target)} $${esc(dp.ticker)}</span>` : 'Set a target'],
    ['Closes', `${fmtDate(Date.now() + d.hours * H)}, or the moment it fills`],
    ['If it fills', ok ? `<span class="num">${f(d.target)} ${sym}</span> locked in a Meteora pool` : 'Locked in a Meteora pool'],
    ['Value at open', ok ? `<span class="num">${f(d.target / share)} ${sym}</span> fully diluted` : 'Set a target'],
    ['If it misses', `Buys and fees go back to backers after ${label}. The supply is burned`]
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const checks = riskChecks(dp, { draft: true }), s = riskSummary(checks);
  $('#pvRisk').innerHTML = `<div class="rail-h"><h3>Risk checks</h3>${riskChip(s)}</div><p class="rail-meta">What backers will see on your page. Checks marked with a clock run once the presale is live.</p>
    <ul class="risk-list">${checks.map(c => `<li class="${c.level}">${RISK_ICON[c.level]}<div><b>${esc(c.label)}</b><span>${esc(c.reason)}</span></div></li>`).join('')}</ul>`;
  const fw = pr.founder.wallet;
  if (fw && isRealAddr(fw) && founderLooked !== fw) { founderLooked = fw; founderAdapter.refresh(dp).then(learned => { if (learned) renderPreview(); }); }
  $('#upNote').textContent = supa.configured() ? 'Uploads go to Seed’s storage when you open the presale.' : 'Uploads are previewed in this browser only until Supabase storage is configured.';
}
function syncOpenBtn() { const b = $('#openBtn'); if (b && !b.disabled) b.textContent = state.wallet ? 'Open presale' : 'Connect wallet to open'; }

/* ---------------------------------------------------------------- open */
async function openPresale() {
  if (busy) return;
  if (!(await ensureWallet())) return;
  const err = validateFull(); $('#fErr').textContent = err; if (err) { $('#fErr').scrollIntoView({ block: 'center' }); return; }
  const d = readDraft(), da = draftAsset(), b = $('#openBtn'); busy = true; b.disabled = true;
  const id = d.ticker.toLowerCase() + '-' + Date.now().toString(36), now = Date.now(), profile = draftProfile(d);
  try {
    if (supa.configured()) {
      for (const k of ['banner', 'art', 'deck']) if (lf.files[k]) { b.textContent = `Uploading ${k}…`; profile[k] = await supa.upload(lf.files[k]); }
    }
    b.textContent = 'Confirm in wallet…';
    if (da.custom) state.custom[da.key] = da.a;
    profile.mint = fakeAddr('mint/' + id); profile.vault = { address: fakeAddr('vault/' + id) };
    const p = { id, name: d.name, ticker: d.ticker, idea: d.idea, q: da.key, target: d.target, raised: 0, backers: 0, openedAt: now, endsAt: now + d.hours * H, status: 'live', resolvedAt: null, mine: true, creator: walletId(), hist: [[now, 0]], buys: [], profile };
    await adapter.openPresale(p);
    if (supa.configured()) supa.call('register', { presaleId: id }).catch(() => {});
    state.presales.unshift(p); save();
    ['#fName', '#fTicker', '#fIdea', '#fTarget', '#fMint', '#fDesc', '#fMin', '#fMax', '#fWl', '#fFounderX', '#fXSince', '#lWebsite', '#lX', '#lTelegram', '#lDiscord', '#lGithub'].forEach(s => $(s).value = '');
    ['banner', 'art', 'deck'].forEach(k => { lf.files[k] = null; lf.urls[k] = ''; });
    ui.fAsset = 'all'; seg.assetF.set('all'); ui.sel = id;
    toast(`Opened ${p.name}. It is live until ${fmtDate(p.endsAt)}`);
    location.hash = '#/presale/' + id;
  } catch (e) { $('#fErr').textContent = e.message; if (da.custom && !state.presales.some(x => x.q === da.key)) delete state.custom[da.key]; }
  busy = false; b.disabled = false; syncOpenBtn();
}

function renderMine() {
  const l = state.presales.filter(p => p.mine);
  $('#mineList').innerHTML = l.length ? l.map(p => `<a class="row ${p.status}" href="#/presale/${p.id}" target="_blank" rel="noopener" data-row="${p.id}"><span class="c-proj">${projCell(p)}</span>${progCell(p)}
      <span class="c-raised num"><span data-raised>${fmtC(p.raised, p.q, true)}</span> <em>/ ${fmtC(p.target, p.q)} ${esc(Q(p).sym)}</em></span><span class="c-time num" data-time>${timeCell(p)}</span><span class="c-act"><span class="pill-sm">View</span></span></a>`).join('')
    : '<div class="empty">You have not opened a presale yet. Fill in the form above to open your first.</div>';
}

/* ---------------------------------------------------------------- wiring */
(function initLaunch() {
  Object.keys(ROWS).forEach(drawRows);
  const form = $('#form');
  form.addEventListener('input', e => {
    const row = e.target.closest('.row-ed'); $('#fErr').textContent = '';
    if (row) { const kind = Object.keys(ROWS).find(k => $(ROWS[k].box).contains(row)); lf[kind][+row.dataset.i][e.target.dataset.k] = e.target.value; }
    renderPreview();
  });
  form.addEventListener('change', e => { const row = e.target.closest('.row-ed'); if (row && e.target.tagName === 'SELECT') { const kind = Object.keys(ROWS).find(k => $(ROWS[k].box).contains(row)); lf[kind][+row.dataset.i][e.target.dataset.k] = e.target.value; renderPreview(); } });
  form.addEventListener('click', e => {
    const add = e.target.closest('[data-add]'); if (add) { const k = add.dataset.add; lf[k].push(ROWS[k].blank()); drawRows(k); renderPreview(); const last = $(ROWS[k].box).lastElementChild; last && $('input', last).focus(); return; }
    const del = e.target.closest('[data-del]'); if (del) { const row = del.closest('.row-ed'), kind = Object.keys(ROWS).find(k => $(ROWS[k].box).contains(row)); lf[kind].splice(+row.dataset.i, 1); drawRows(kind); renderPreview(); }
  });
  $('#descToggle').onclick = () => { lf.descPv = !lf.descPv; $('#descPv').hidden = !lf.descPv; $('#fDesc').hidden = lf.descPv; $('#descToggle').textContent = lf.descPv ? 'Edit' : 'Preview'; if (lf.descPv) $('#descPv').innerHTML = md($('#fDesc').value) || '<p class="quiet">Nothing to preview yet.</p>'; };
  $$('.drop').forEach(bindDrop);
  $('#openBtn').onclick = openPresale;
})();
