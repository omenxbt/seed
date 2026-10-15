/* ==========================================================================
   LAUNCH FORM. Every field the project page shows: identity and media, the raise terms (pair, target under the cap, deadline,
   the derived price), the team share and its unlock schedule with a live chart, the roadmap, what the token does, links, the
   payout wallet, and a team list a founder can switch on. Founders sign in with X before opening. The side panel shows the
   card backers will see, the numbers the model derives from the draft, and the info panel, all from the same code the
   project page uses, so a founder sees their page before opening.
   Uploads go to Supabase Storage (signed upload URL from the Edge Function) when it is configured; until then they are a
   preview in this browser only. The banner is saved at 1500 x 500 and the token art as a square, cropped where the founder
   dragged the preview. A deck can be a PDF, a slide file (PowerPoint, Keynote, OpenDocument) or an image.
   The pair asset, stock and mint handling (draft, draftAsset, lookupMint, readDraft, validateDraft) stays in index.html.
   ========================================================================== */
const lf = {
  team: [{ name: '', role: 'Founder', x: '', github: '', linkedin: '', wallet: '' }],
  road: [{ title: '', due: '', status: 'planned', proof: '' }],
  tr: [{ day: 90, pct: 50 }, { day: 180, pct: 50 }],   // dated tranches, when that schedule type is chosen
  sched: 'every',                                        // 'every': a cliff then a slice every N days; 'tranches': dated tranches
  files: { banner: null, art: null, deck: null }, urls: { banner: '', art: '', deck: '' }, pos: { banner: [50, 50], art: [50, 50] }, descPv: false,
  on: { team: false },   // the optional section; off until the founder switches it on
  lim: { min: { on: false, unit: 'q' }, max: { on: false, unit: 'q' }, use: { on: false } }   // the buy limits and the token's use, off by default; limits in the pair asset or as a share of the supply
};
/* the team share and its schedule as the model reads them */
const teamBpsNow = () => Math.round((numv($('#fTeam').value) || 0) * 100);
function scheduleNow() {
  if (!teamBpsNow()) return null;
  if (lf.sched === 'tranches') return { tranches: lf.tr.filter(t => t.day !== '' || t.pct !== '').map(t => ({ dayOffset: Math.round(numv(t.day) || 0), bps: Math.round((numv(t.pct) || 0) * 100) })) };
  return { cliffDays: Math.max(0, Math.round(numv($('#fCliff').value) || 0)), intervalDays: Math.max(0, Math.round(numv($('#fEvery').value) || 0)), bpsPerInterval: Math.round((numv($('#fPer').value) || 0) * 100) };
}
/* a limit as an amount of the pair asset: a share of the supply is worth that many tokens at the raise price */
function limitQ(which, d) {
  const l = lf.lim[which], v = numv($(which === 'min' ? '#fMin' : '#fMax').value);
  if (!l.on || !(v > 0)) return 0;
  if (l.unit === 'q') return v;
  return d.target > 0 ? r6(v / 100 * SEED.supply * priceOf({ target: d.target, teamBps: teamBpsNow() })) : 0;
}
function setLimUnit(which, unit) { lf.lim[which].unit = unit; $('#fErr').textContent = ''; syncLim(); renderPreview(); }
function syncLim() {
  for (const k of ['min', 'max', 'use']) { const l = lf.lim[k], box = $(`.lim[data-lim="${k}"]`);
    $('[data-lim-toggle]', box).setAttribute('aria-checked', String(l.on)); $('[data-lim-off]', box).hidden = l.on; $('[data-lim-body]', box).hidden = !l.on;
    if (k === 'use') continue;
    const suf = $('[data-lim-suf]', box); if (l.unit === 'pct') { suf.removeAttribute('data-cur'); suf.textContent = '%'; } else { suf.setAttribute('data-cur', ''); suf.textContent = $('#fCur').textContent; }
    $('input', box).placeholder = l.unit === 'pct' ? (k === 'min' ? '0.1' : '2') : (k === 'min' ? '0.5' : '20');
    if (l.on) seg[k + 'Unit'].place(); }
}
/* what each image is saved as, and what a deck may be: [kind, mime type] by file extension */
const IMG_OUT = { banner: { w: 1500, h: 500 }, art: { w: 1024, h: 1024, square: true } };
const SLIDES = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const DECK_EXT = { pdf: ['pdf', 'application/pdf'], png: ['image', 'image/png'], jpg: ['image', 'image/jpeg'], jpeg: ['image', 'image/jpeg'], webp: ['image', 'image/webp'],
  pptx: ['slides', SLIDES], ppt: ['slides', 'application/vnd.ms-powerpoint'], key: ['slides', 'application/vnd.apple.keynote'], odp: ['slides', 'application/vnd.oasis.opendocument.presentation'] };
const extOf = name => (/\.([a-z0-9]+)$/i.exec(name || '') || [, ''])[1].toLowerCase();
const deckInfo = file => DECK_EXT[extOf(file.name)] || Object.values(DECK_EXT).find(d => d[1] === file.type) || null;
const MAX_UPLOAD = 10 * 1024 * 1024;
const numv = v => { const n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : NaN; };
const isUrl = v => !v || /^https?:\/\/[^\s]+\.[^\s]+/i.test(v);

/* ---------------------------------------------------------------- row editors */
const ROWS = {
  tr: { box: '#trRows', blank: () => ({ day: '', pct: '' }), html: (r, i) => `<div class="row-ed tr-row" data-i="${i}">
      <label><span>Day after seeding<i class="tip" tabindex="0" data-tip="When this slice unlocks, counted in days from the moment the raise seeds.">?</i></span><input data-k="day" class="num" inputmode="numeric" value="${esc(r.day)}" placeholder="90"></label>
      <label><span>Share of the team tokens</span><input data-k="pct" class="num" inputmode="decimal" value="${esc(r.pct)}" placeholder="25"></label>
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
/* the split bar, the schedule's chart and its verdict follow the team share and the schedule fields */
function drawSplit(dp) {
  const bps = teamBpsNow(), sp = splitOf(bps), pc = n => n / SEED.supply * 100, f = n => pc(n).toFixed(pc(n) % 1 ? 1 : 0) + '%';
  $('#splitBar').innerHTML = `<i class="s-b" style="width:${pc(sp.backers)}%"></i><i class="s-p" style="width:${pc(sp.pool)}%"></i><i class="s-t" style="width:${pc(sp.team)}%"></i>`;
  $('#splitLeg').innerHTML = `<span><i class="s-b"></i>Backers ${f(sp.backers)}</span><span><i class="s-p"></i>Pool ${f(sp.pool)}</span><span><i class="s-t"></i>Team ${f(sp.team)}</span>`;
  const wrap = $('#schedWrap'); wrap.classList.toggle('off', !bps);
  $$('[data-sched]', wrap).forEach(e => e.hidden = !bps || e.dataset.sched !== lf.sched);
  const chart = $('#fUnlock'), note = $('#schedNote');
  if (!bps) { chart.innerHTML = ''; note.className = 'sched-note'; note.textContent = 'No team tokens. Backers and the pool get 50% each.'; return; }
  const problem = scheduleProblem(dp.teamSchedule, bps);
  if (lf.sched === 'tranches') { const sum = lf.tr.reduce((a, r) => a + (numv(r.pct) || 0), 0), ok = Math.abs(sum - 100) < 1e-6; $('#trSum').className = 'sum-meter ' + (ok ? 'ok' : 'bad'); $('#trSum').textContent = `${+sum.toFixed(2)}% of 100%`; }
  chart.innerHTML = problem ? '' : unlockSVG(dp, Math.max(320, (Math.floor(wrap.clientWidth) || 664) - 24));   // the wrapper's width: the chart itself is hidden while empty
  note.className = 'sched-note ' + (problem ? 'bad' : 'ok'); note.textContent = problem || `${fmtSchedule(dp.teamSchedule)}. ${fmtTok(sp.team)} tokens to the payout wallet over ${daysTxt(lastUnlockDay(dp.teamSchedule))}.`;
}

/* ---------------------------------------------------------------- uploads with crop previews */
function setFile(kind, file) {
  const box = { banner: '#upBanner', art: '#upArt', deck: '#upDeck' }[kind], el = $(box), crop = $('[data-crop]', el);
  const info = kind === 'deck' ? deckInfo(file) : null;
  if (kind === 'deck' ? !info : !el.dataset.accept.split(',').includes(file.type)) return toast(kind === 'deck' ? 'Use a PDF, a PowerPoint, Keynote or OpenDocument file, or a PNG, JPEG or WebP image.' : 'Use a PNG, JPEG or WebP image.');
  if (file.size > MAX_UPLOAD) return toast('Files can be at most 10 MB.');
  if (info && file.type !== info[1]) file = new File([file], file.name, { type: info[1] });   // some browsers leave the type of a slide file empty
  if (lf.urls[kind] && lf.urls[kind].startsWith('blob:')) URL.revokeObjectURL(lf.urls[kind]);
  lf.files[kind] = file; lf.urls[kind] = URL.createObjectURL(file);
  if (kind === 'deck') crop.innerHTML = `<span class="doc-name">${ICONS.out}<b>${esc(file.name)}</b> ${(file.size / 1048576).toFixed(1)} MB</span><button type="button" class="linkbtn" data-clear>Remove</button>`;
  else {
    const o = IMG_OUT[kind], url = lf.urls[kind];
    lf.pos[kind] = [50, 50]; crop.innerHTML = `<img src="${url}" alt="" draggable="false" style="object-position:50% 50%"><span class="crop-hint">Drag to adjust</span><button type="button" class="linkbtn" data-clear>Remove</button>`;
    /* say so when the picture is too small to fill its size without being stretched */
    $('img', crop).onload = e => { const im = e.target; if (lf.urls[kind] !== url) return;
      if (kind === 'banner' && (im.naturalWidth < o.w || im.naturalHeight < o.h)) toast(`That image is ${im.naturalWidth} × ${im.naturalHeight} px. The banner is ${o.w} × ${o.h} px, so it will be scaled up and may look soft.`);
      else if (kind === 'art' && Math.min(im.naturalWidth, im.naturalHeight) < 256) toast('That image is small for token art. Use one at least 256 px on each side.'); };
  }
  el.classList.add('has'); renderPreview();
}
/* The picture as it is saved: cut to its shape where the preview shows it (the banner at 1500 x 500, the art as a square). */
function croppedImage(kind) {
  const file = lf.files[kind], o = IMG_OUT[kind], pos = lf.pos[kind];
  return new Promise((ok, no) => {
    const im = new Image();
    im.onload = () => {
      const side = o.square ? Math.min(o.w, im.naturalWidth, im.naturalHeight) : 0, W = side || o.w, Hh = side || o.h;
      const k = Math.max(W / im.naturalWidth, Hh / im.naturalHeight), sw = W / k, sh = Hh / k, sx = (im.naturalWidth - sw) * pos[0] / 100, sy = (im.naturalHeight - sh) * pos[1] / 100;
      const c = document.createElement('canvas'); c.width = W; c.height = Hh;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, sx, sy, sw, sh, 0, 0, W, Hh);
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      c.toBlob(b => b ? ok(new File([b], `${kind}.${type === 'image/png' ? 'png' : 'jpg'}`, { type })) : no(new Error('The image could not be prepared.')), type, 0.92);
    };
    im.onerror = () => no(new Error('The image could not be read.'));
    im.src = lf.urls[kind];
  });
}
function clearFile(kind) {
  const el = $({ banner: '#upBanner', art: '#upArt', deck: '#upDeck' }[kind]);
  if (lf.urls[kind] && lf.urls[kind].startsWith('blob:')) URL.revokeObjectURL(lf.urls[kind]);
  lf.files[kind] = null; lf.urls[kind] = ''; $('input[type=file]', el).value = '';
  $('[data-crop]', el).innerHTML = `<span>${kind === 'banner' ? 'Drop an image or choose a file' : kind === 'art' ? 'Drop an image' : 'Drop your deck or choose a file'}</span>`; el.classList.remove('has'); renderPreview();
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

/* ---------------------------------------------------------------- the draft as a raise */
const posTxt = k => `${lf.pos[k][0].toFixed(1)}% ${lf.pos[k][1].toFixed(1)}%`;
function draftProfile(d) {
  const on = lf.on, xl = xAdapter.of();
  const founderWallet = state.wallet ? (state.wallet.pk || walletId()) : null;
  const team = (on.team ? lf.team : []).filter(m => m.name.trim()).map(m => ({ name: m.name.trim(), role: m.role.trim(), x: m.x.trim() || null, github: m.github.trim() || null, linkedin: m.linkedin.trim() || null, wallet: B58.test(m.wallet.trim()) ? m.wallet.trim() : null, verified: { x: false, github: false, domain: false } }));
  if (team[0] && !team[0].wallet && founderWallet) team[0].wallet = founderWallet;
  return {
    description: $('#fDesc').value.trim(),
    links: { website: $('#lWebsite').value.trim() || null, x: $('#lX').value.trim() || null, telegram: $('#lTelegram').value.trim() || null, discord: $('#lDiscord').value.trim() || null, github: $('#lGithub').value.trim() || null },
    minBuy: limitQ('min', d), maxBuy: limitQ('max', d), minBuyPct: lf.lim.min.on && lf.lim.min.unit === 'pct' ? numv($('#fMin').value) || 0 : 0, maxBuyPct: lf.lim.max.on && lf.lim.max.unit === 'pct' ? numv($('#fMax').value) || 0 : 0,
    team, founder: { name: team[0] ? team[0].name : xl ? '@' + xl.handle : 'Founder', x: xl ? xUrl(xl.handle) : null, xAgeDays: null, wallet: founderWallet, pastLaunches: [] },
    deck: lf.urls.deck || null, deckKind: lf.files.deck ? deckInfo(lf.files.deck)[0] : null, deckName: lf.files.deck ? lf.files.deck.name : null, banner: lf.urls.banner || null, art: lf.urls.art || null, bannerPos: posTxt('banner'), artPos: posTxt('art'),
    roadmap: [], updates: [], chat: [], watchers: 0
  };
}
const draftRoadmap = () => lf.road.filter(r => r.title.trim()).map(r => ({ title: r.title.trim(), dueAt: r.due ? Date.parse(r.due) : Date.now(), status: r.status, proofUrl: r.proof.trim() || null }));
/* the X account the founder signed in with, as the raise keeps it; past raises are the ones this account opened on Seed */
function draftX() {
  const l = xAdapter.of(); if (!l) return { handle: '', verified: false, createdAt: null, followers: 0 };
  return { handle: l.handle, verified: !l.demo && !l.typed, typed: !!l.typed, createdAt: l.createdAt || null, followers: l.followers != null ? l.followers : null };
}
const pastRaisesOf = handle => !handle ? [] : state.presales.filter(p => p.xAccount && p.xAccount.handle === handle && p.status !== 'live').map(p => ({ name: p.name, ticker: p.ticker, outcome: p.blacklisted ? 'flagged' : p.status, at: p.resolvedAt || p.openedAt }));
const payoutNow = () => $('#fPayout').value.trim() || (state.wallet && (state.wallet.pk || fakeAddr('wallet/demo'))) || '';   // the demo wallet stands in with a fixed address
/* the model's fields a draft and an opened raise share */
function modelFields(d, da) {
  const x = draftX();
  return { teamBps: teamBpsNow(), teamSchedule: scheduleNow(), roadmap: draftRoadmap(), tokenUseCase: lf.lim.use.on && $('#fUse').value.trim() ? $('#fUse').value.trim() : 'none', xAccount: x, pastRaises: pastRaisesOf(x.handle), reports: [], payoutWallet: payoutNow(),
    targetUsd: d.target > 0 ? r6(usdOf({ q: da.key || 'SOL' }, d.target)) : 0, solUsdAtOpen: SEED.demoSolUsd, feeBps: SEED.feeBps, creatorShareBps: SEED.creatorShareBps };
}
function draftPresale() {
  const d = readDraft(), da = draftAsset(), now = Date.now();
  return Object.assign({ id: 'draft', name: d.name || 'Your project', ticker: d.ticker || 'TICKER', q: da.key || 'SOL', target: isFinite(d.target) && d.target > 0 ? d.target : 0, raised: 0, backers: 0, openedAt: now, endsAt: now + d.hours * H,
    status: 'live', resolvedAt: null, mine: true, creator: walletId(), hist: [[now, 0]], buys: [], profile: draftProfile(d) }, modelFields(d, da));
}

/* ---------------------------------------------------------------- validation */
/* every problem at once, each with the field it belongs to. Required: name, ticker, target, deadline, pair. Nothing has a
   minimum length. The rest is checked only when it is filled in or switched on. */
function validateFields() {
  const d = readDraft(), da = draftAsset(), out = [], err = (sel, msg) => out.push({ sel, msg });
  if (!d.name) err('#fName', 'Give the project a name.');
  if (!/^[A-Z0-9]{1,6}$/.test(d.ticker)) err('#fTicker', 'A ticker is 1 to 6 letters or digits.');
  else if (state.presales.some(p => p.ticker === d.ticker && p.status === 'live')) err('#fTicker', `$${d.ticker} is in use by a live raise. Pick another.`);
  if (da.err) err('#fMint', da.err);
  if (isNaN(d.target) || d.target <= 0) err('#fTarget', `Set a target in ${da.a ? da.a.sym : 'the pair asset'}.`);
  else if (usdOf({ q: da.key }, d.target) > SEED.capUsd + 1e-6) err('#fTarget', `${fmtUsd(usdOf({ q: da.key }, d.target))} at today's SOL price. A raise can ask for at most $${SEED.capUsd.toLocaleString('en-US')}.`);
  const mn = numv($('#fMin').value), mx = numv($('#fMax').value), L = lf.lim;
  if (L.min.on && !(mn > 0)) err('#fMin', 'Set the minimum buy, or switch it off.');
  else if (L.min.on && L.min.unit === 'pct' && mn >= 100) err('#fMin', 'Under 100% of the supply.');
  else if (L.min.on && L.min.unit === 'q' && mn > d.target) err('#fMin', 'Larger than the target.');
  if (L.max.on && !(mx > 0)) err('#fMax', 'Set the maximum per wallet, or switch it off.');
  else if (L.max.on && L.max.unit === 'pct' && mx > 100) err('#fMax', 'No more than the whole supply.');
  else if (L.max.on && L.max.unit === 'q' && mx > d.target) err('#fMax', 'Larger than the target; switch it off to let one wallet fill the raise.');
  const mnQ = limitQ('min', d), mxQ = limitQ('max', d);
  if (mnQ > 0 && mxQ > 0 && mnQ > mxQ) err('#fMax', 'The maximum per wallet is below the minimum buy.');
  const bps = teamBpsNow();
  if ($('#fTeam').value && !(numv($('#fTeam').value) >= 0)) err('#fTeam', 'The team share must be a number.');
  else if (!(bps >= 0 && bps < BPS)) err('#fTeam', 'From 0% to under 100%.');
  else if (bps) { const sp = scheduleProblem(scheduleNow(), bps); if (sp) err('#schedWrap', sp); }
  if (lf.lim.use.on && !$('#fUse').value.trim()) err('#fUse', 'Say what the token does, or switch it off.');
  if ($('#fPayout').value.trim() && !B58.test($('#fPayout').value.trim())) err('#fPayout', 'Not a Solana address.');
  const me = walletId();
  if (me) {
    const bl = state.presales.find(p => p.blacklisted && (p.creator === me || p.founderWallet === me)); if (bl) err('#fName', `This wallet was flagged for fraud on $${bl.ticker} and cannot open another raise.`);
    const live = state.presales.find(p => p.status === 'live' && p.id !== 'draft' && (p.creator === me || p.founderWallet === me)); if (live) err('#fName', `This wallet already has a live raise, ${live.name}. One at a time.`);
  }
  /* a section that is switched off is not on the page, so nothing in it is checked */
  (lf.on.team ? lf.team : []).forEach((m, i) => {
    if (!Object.values(m).some(v => String(v).trim())) return;
    if (!m.name.trim()) return err(`#teamRows .row-ed:nth-child(${i + 1})`, 'Every team member needs a name.');
    if (![m.x, m.github, m.linkedin].every(isUrl)) return err(`#teamRows .row-ed:nth-child(${i + 1})`, `${m.name}: links must start with https://.`);
    if (m.wallet.trim() && !B58.test(m.wallet.trim())) err(`#teamRows .row-ed:nth-child(${i + 1})`, `${m.name}: the wallet is not a Solana address.`);
  });
  lf.road.forEach((r, i) => {
    if (!r.title.trim() && !r.due) return;
    if (!r.title.trim()) return err(`#roadRows .row-ed:nth-child(${i + 1})`, 'Every milestone needs a title.');
    if (!r.due) return err(`#roadRows .row-ed:nth-child(${i + 1})`, `${r.title}: add a due date.`);
    if (r.proof && !isUrl(r.proof)) err(`#roadRows .row-ed:nth-child(${i + 1})`, `${r.title}: the proof link must start with https://.`);
  });
  for (const sel of ['#lWebsite', '#lX', '#lTelegram', '#lDiscord', '#lGithub']) if (!isUrl($(sel).value.trim())) err(sel, 'Links start with https://.');
  return out;
}
const validateFull = () => { const e = validateFields(); return e.length ? e[0].msg : ''; };
/* the problems go next to their fields; the first one is scrolled to */
function showErrors(list) {
  $$('.ferr', $('#form')).forEach(e => e.remove());
  let first = null;
  for (const { sel, msg } of list) {
    const el = $(sel); if (!el) continue;
    const box = el.closest('.f') || el.closest('.row-ed') || el; if ($('.ferr', box) && box.matches('.row-ed')) continue;
    const n = document.createElement('div'); n.className = 'ferr'; n.setAttribute('role', 'alert'); n.textContent = msg; box.appendChild(n);
    if (!first) first = box;
  }
  if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
  return !!first;
}

/* a field's error goes as soon as it is edited */
document.addEventListener('input', e => { const box = e.target.closest && e.target.closest('.f, .row-ed'); if (box) $$('.ferr', box).forEach(x => x.remove()); });
/* a tooltip stays inside the viewport: the bubble is centred on the "?" unless that would clip it */
document.addEventListener('pointerover', e => { const t = e.target.closest && e.target.closest('.tip'); if (t) clampTip(t); });
document.addEventListener('focusin', e => { const t = e.target.closest && e.target.closest('.tip'); if (t) clampTip(t); });
function clampTip(t) {
  const r = t.getBoundingClientRect(), w = Math.min(250, innerWidth - 24), cx = r.left + r.width / 2; let tx = 0;
  if (cx - w / 2 < 12) tx = 12 - (cx - w / 2); else if (cx + w / 2 > innerWidth - 12) tx = innerWidth - 12 - (cx + w / 2);
  t.style.setProperty('--tx', tx + 'px');
}

/* ---------------------------------------------------------------- preview and live risk */
let founderLooked = '';
function renderPreview() {
  const d = readDraft(), da = draftAsset(), C = da.a || { sym: 'TOKEN', dp: 2, verified: false }, ok = !isNaN(d.target) && d.target > 0, sym = esc(C.sym), dp = draftPresale(), pr = dp.profile;
  $('#mintRow').hidden = draft.pair !== 'any'; $('#stockRow').hidden = draft.pair !== 'stock';
  $$('#stockRow [data-stock]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.stock === draft.stock)));
  $('#mintInfo').textContent = draft.pair !== 'any' ? '' : da.wait ? 'Checking on Solana…' : da.bad ? 'Not a token mint.' : da.err ? '' : !da.custom ? `Recognised as ${C.sym}`
    : da.off ? 'Solana could not be reached to check this mint. It will be listed as unverified.' : C.verified ? `${C.name || C.sym} (${C.sym}), verified on Jupiter` : `A real SPL mint${da.a.name ? `, ${da.a.name}` : ''}, but not on Jupiter's verified list. Backers will see a warning.`;
  $('#fCur').textContent = C.sym; $$('[data-cur]').forEach(e => e.textContent = C.sym); $('#fTarget').placeholder = { SOL: '200', USDC: '50000' }[da.key] || (C.stock ? '300' : '100000');
  const usd = ok ? usdOf({ q: da.key }, d.target) : 0, over = usd > SEED.capUsd + 1e-6;
  $('#targetUsd').textContent = ok ? `${fmtUsd(usd)}${da.key === 'SOL' ? ` at $${SEED.demoSolUsd} per SOL` : ''}${over ? `, over the $${SEED.capUsd.toLocaleString('en-US')} cap` : ''}` : `at most $${SEED.capUsd.toLocaleString('en-US')}${da.key === 'SOL' ? ', at the SOL price when it opens' : ''}`;
  $('#targetUsd').classList.toggle('bad', over);
  drawSplit(dp); drawDerived(dp, ok, sym);
  const art = pr.art ? `<img class="pv-art" src="${esc(pr.art)}" alt="" style="object-position:${pr.artPos}">` : `<span class="pv-art glyph-art" style="--h:${hashStr(dp.ticker) % 360}"><svg viewBox="0 0 24 24" aria-hidden="true">${glyph(dp)}</svg></span>`;
  $('#pvCard').innerHTML = `${pr.banner ? `<div class="pv-banner"><img src="${esc(pr.banner)}" alt="" style="object-position:${pr.bannerPos}"></div>` : ''}<div class="pv-id">${art}<span class="nm"><b>${esc(dp.name)}<span class="tk">$${esc(dp.ticker)}</span></b><span class="meta"><span class="chain${C.verified ? '' : ' unv'}">Pairs with ${sym}</span>${C.verified || !da.a ? '' : '<span class="tag warn">Unverified</span>'}</span></span></div><div class="c-prog"><span class="bar"><i style="width:0%"></i></span><span class="pct num">0%</span></div>`;
  const label = { 24: '24 hours', 72: '3 days', 168: '7 days', 336: '14 days' }[d.hours], split = splitOf(dp.teamBps), f = n => Number(n.toFixed(C.dp)).toLocaleString('en-US', { maximumFractionDigits: C.dp });
  const pc = n => (n / SEED.supply * 100).toFixed(n / SEED.supply * 100 % 1 ? 1 : 0) + '%', fees = v => fmtUsd(feeSplit(v).founder);
  $('#pvFacts').innerHTML = [
    ['The split', `<span class="num">${pc(split.backers)}</span> backers, <span class="num">${pc(split.pool)}</span> pool, <span class="num">${pc(split.team)}</span> team`],
    ['Raise price', ok ? `<span class="num">${fmtPrice(priceOf(dp))} ${sym}</span> per token, fixed` : 'Set a target'],
    ['FDV at the raise', ok ? `<span class="num">${f(fdvOf(dp))} ${sym}</span> (${fmtUsd(fdvUsdOf(dp))})` : 'Set a target'],
    ['Pool at seeding', ok ? `<span class="num">${f(d.target)} ${sym}</span> + <span class="num">${fmtTok(split.pool)}</span> $${esc(dp.ticker)}, locked for good` : 'The whole raise, locked for good'],
    ['Your fee income', `<span class="num">${fees(5000)}</span>, <span class="num">${fees(25000)}</span> or <span class="num">${fees(100000)}</span> a day at $5K, $25K or $100K of daily volume`],
    ['Closes', typeof chain !== 'undefined' && chain.cfg && chain.cfg.testMode && isReal() ? `in ${Math.round(d.hours * 60 / 24)} min on devnet (test mode: a day is a minute), or the moment it fills` : `${fmtDate(Date.now() + d.hours * H)}, or the moment it fills`],
    ['If it misses', `Every buy and its fee go back to backers after ${label}. Nothing is minted`]
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const checks = riskChecks(dp, { draft: true }), s = riskSummary(checks);
  $('#pvInfo').innerHTML = `<div class="rail-h"><h3>Info</h3>${riskChip(s)}</div><p class="rail-meta">What backers will see on your page. Checks marked with a clock run once the raise is live; your choices are shown as facts.</p>${infoList(checks)}`;
  drawGate();
  const fw = pr.founder.wallet;
  if (fw && isRealAddr(fw) && founderLooked !== fw) { founderLooked = fw; founderAdapter.refresh(dp).then(learned => { if (learned) renderPreview(); }); }
  $('#upNote').textContent = supa.configured() ? 'Uploads go to Seed’s storage when you open the raise.' : 'Uploads are previewed in this browser only until Supabase storage is configured.';
}
function syncOpenBtn() { const b = $('#openBtn'); if (b && !b.disabled) b.textContent = !state.wallet ? 'Connect wallet to open' : 'Open raise'; }
/* what the raise shows as the price, and the pool it opens: read-only, derived from the target and the team share */
function drawDerived(dp, ok, sym) {
  const sp = splitOf(dp.teamBps), row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  $('#derivedRows').innerHTML = row('Price', ok ? `<span class="num">${fmtPrice(priceOf(dp))} ${sym}</span> per token: the target over the backers' ${fmtTok(sp.backers)} tokens` : `Set a target. The price is the target over the backers' ${fmtTok(sp.backers)} tokens`) +
    row('Fee', `<span class="num">1%</span> on top of each buy, to Seed; refunded with the buy if the raise does not seed`) +
    row('At seeding', ok ? `<span class="num">${fmtC(dp.target, dp.q)} ${sym}</span> and <span class="num">${fmtTok(sp.pool)}</span> $${esc(dp.ticker)} open a Meteora pool at the raise price, locked for good` : 'The whole raise and the pool tokens open a Meteora pool at the raise price, locked for good');
}
/* the X sign-in gate at the top of the form */
/* linking X is optional: it adds a verified badge to the raise, nothing more */
function drawGate() {
  const g = $('#xGate'), l = xAdapter.of();
  g.innerHTML = !state.wallet ? `<div class="gate"><span class="g-ico">${X_GLYPH}</span><div><b>Link your X</b><span>Linking your X adds a verified badge to your raise. Optional. Connect a wallet first.</span></div><button type="button" class="qb" data-gate-connect>Connect wallet</button></div>`
    : l ? `<div class="gate on"><span class="g-ico">${X_GLYPH}</span><div><b>@${esc(l.handle)}</b><span>${l.typed ? 'Typed on devnet, shown as typed on your raise.' : l.demo ? 'Linked on the demo wallet (a stand-in, not checked with X).' : 'Linked. Your raise shows a verified X badge.'}</span></div><button type="button" class="qb" data-gate-x>Change</button></div>`
    : `<div class="gate"><span class="g-ico">${X_GLYPH}</span><div><b>Link your X</b><span>Linking your X adds a verified badge to your raise. Optional.</span></div><button type="button" class="qb" data-gate-x>Link X</button></div>`;
}

/* ---------------------------------------------------------------- open */
async function openPresale() {
  if (busy) return;
  if (!(await ensureWallet())) return;
  $('#fErr').textContent = ''; if (showErrors(validateFields())) return;
  const d = readDraft(), da = draftAsset(), b = $('#openBtn'); busy = true; b.disabled = true;
  const id = d.ticker.toLowerCase() + '-' + Date.now().toString(36), now = Date.now(), profile = draftProfile(d);
  try {
    /* the banner and the art are saved already cut to shape, so every page shows the same picture */
    for (const k of ['banner', 'art']) if (lf.files[k]) { const f = await croppedImage(k); profile[k + 'Pos'] = '50% 50%';
      if (supa.configured()) { b.textContent = `Uploading ${k}…`; profile[k] = await supa.upload(f); } else profile[k] = URL.createObjectURL(f); }
    if (supa.configured() && lf.files.deck) { b.textContent = 'Uploading deck…'; profile.deck = await supa.upload(lf.files.deck); }
    if (da.custom) state.custom[da.key] = da.a;
    const p = Object.assign({ id, name: d.name, ticker: d.ticker, q: da.key, target: d.target, raised: 0, backers: 0, openedAt: now, endsAt: now + d.hours * H, status: 'live', resolvedAt: null, mine: true, creator: walletId(), hist: [[now, 0]], buys: [], profile }, modelFields(d, da));
    /* the token's metadata JSON goes to permanent storage before the raise opens; the program fixes its address at opening and
       the mint step writes it into immutable Token Metadata, so the name, symbol and image can never change afterwards */
    if (isReal()) { b.textContent = 'Uploading token metadata…'; p.metadataUri = await uploadTokenJson(p, profile); }
    else profile.mint = fakeAddr('mint/' + id);
    b.textContent = 'Confirm in wallet…';
    await adapter.openPresale(p);   // a real wallet's raise comes back with its chain address and id
    if (supa.configured()) supa.call('register', { presaleId: p.id }).catch(() => {});
    state.presales.unshift(p); save();
    ['#fName', '#fTicker', '#fTarget', '#fMint', '#fDesc', '#fMin', '#fMax', '#fUse', '#fPayout', '#lWebsite', '#lX', '#lTelegram', '#lDiscord', '#lGithub'].forEach(s => $(s).value = '');
    $('#fTeam').value = '0'; lf.road = [ROWS.road.blank()]; drawRows('road'); lf.lim.use = { on: false };
    if (!supa.configured()) lf.urls.deck = '';   // the page keeps showing the local deck, so its preview URL is not released
    lf.lim.min = { on: false, unit: 'q' }; lf.lim.max = { on: false, unit: 'q' }; syncLim();
    ['banner', 'art', 'deck'].forEach(k => { if (lf.files[k]) clearFile(k); }); renderPreview();   // the cleared form, in the preview too
    ui.fAsset = da.key; seg.assetF.set(da.key); ui.sel = p.id;
    toast(`Opened ${p.name}. It is live until ${fmtDate(p.endsAt)}`);
    location.hash = '#/presale/' + p.id;
  } catch (e) { $('#fErr').textContent = e.message; if (da.custom && !state.presales.some(x => x.q === da.key)) delete state.custom[da.key]; }
  busy = false; b.disabled = false; syncOpenBtn();
}

/* the Metaplex token standard JSON: name, symbol, description, image, links. Devnet keeps it in Supabase storage; mainnet
   puts it on Arweave through Irys (see PROGRESS.md, Needs Josh: an Irys node wallet) */
async function uploadTokenJson(p, profile) {
  const links = profile.links || {}, ext = {};
  if (safeUrl(links.website)) ext.website = safeUrl(links.website);
  if (safeUrl(links.x)) ext.twitter = safeUrl(links.x);
  if (safeUrl(links.telegram)) ext.telegram = safeUrl(links.telegram);
  const j = { name: p.name, symbol: p.ticker, description: (profile.description || '').slice(0, 1000), image: profile.art || undefined, external_url: ext.website,
    seller_fee_basis_points: 0, properties: { category: 'image', files: profile.art ? [{ uri: profile.art, type: /\.jpe?g(\?|$)/i.test(profile.art) ? 'image/jpeg' : /\.webp(\?|$)/i.test(profile.art) ? 'image/webp' : 'image/png' }] : [] }, extensions: Object.keys(ext).length ? ext : undefined };
  const file = new File([JSON.stringify(j)], `${p.ticker.toLowerCase()}.json`, { type: 'application/json' });
  if (!supa.configured()) throw new Error('Token metadata needs Seed storage, which is not configured here.');
  return supa.upload(file);
}
function renderMine() {
  const l = state.presales.filter(p => p.mine);
  $('#mineList').innerHTML = l.length ? l.map(p => `<a class="row ${p.status}" href="#/presale/${p.id}" target="_blank" rel="noopener" data-row="${p.id}"><span class="c-proj">${projCell(p)}</span>${progCell(p)}
      <span class="c-raised num"><span data-raised>${fmtC(p.raised, p.q, true)}</span> <em>/ ${fmtC(p.target, p.q)} ${esc(Q(p).sym)}</em></span><span class="c-time num" data-time>${timeCell(p)}</span><span class="c-act"><span class="pill-sm">View</span></span></a>`).join('')
    : '<div class="empty">You have not opened a raise yet. Fill in the form to open your first.</div>';
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
  seg.sched = initSeg($('#schedSeg'), v => { lf.sched = v; $('#fErr').textContent = ''; renderPreview(); });
  $('#xGate').addEventListener('click', e => { if (e.target.closest('[data-gate-connect]')) connect(); else if (e.target.closest('[data-gate-x]')) openXDialog(); });
  /* the switches for the optional sections: one in the section's heading and one in the list beside the form */
  const syncOpt = () => Object.keys(lf.on).forEach(k => { const on = lf.on[k], fs = $(`fieldset[data-opt="${k}"]`, form);
    $$(`[data-toggle="${k}"]`).forEach(t => t.setAttribute('aria-checked', String(on)));
    fs.classList.toggle('off', !on); $('[data-off]', fs).hidden = on; $('[data-body]', fs).hidden = !on; $('.opt-tag', fs).hidden = on; });
  form.addEventListener('click', e => { const t = e.target.closest('[data-lim-toggle]'); if (!t) return; const k = t.dataset.limToggle; lf.lim[k].on = !lf.lim[k].on; $('#fErr').textContent = ''; syncLim(); renderPreview(); if (lf.lim[k].on) $(k === 'min' ? '#fMin' : '#fMax').focus(); });
  syncLim();
  $('#tab-launch').addEventListener('click', e => { const t = e.target.closest('[data-toggle]'); if (!t) return;
    const k = t.dataset.toggle; lf.on[k] = !lf.on[k]; $('#fErr').textContent = ''; syncOpt(); renderPreview();
    if (lf.on[k] && !t.closest('fieldset')) $(`fieldset[data-opt="${k}"]`, form).scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
  syncOpt();
  $('#openBtn').onclick = openPresale;
  /* the section list beside the form jumps to a section */
  $$('.steps [data-step]').forEach(b => b.onclick = () => { const fs = $$('fieldset', form)[+b.dataset.step - 1]; if (fs) fs.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
})();
