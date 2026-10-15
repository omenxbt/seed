/* ==========================================================================
   THE FOUNDER PROFILE: one wallet's record on Seed. Every raise it opened and how each ended, the X account if one is
   linked, the fees its pools have earned and what was claimed, and its team-token unlocks. Reached from a raise's
   Founder card (#/founder/<wallet>). Live raises come from the chain and the indexer; demo raises from the demo data.
   ========================================================================== */
const fpg = { wallet: null, claims: null, claimsFor: null };
/* the raises a wallet opened: the live ones by their founder wallet, the demo ones by the profile's founder */
function raisesBy(w) {
  return state.presales.filter(p => founderOf(p) === w).sort((a, b) => b.openedAt - a.openedAt);
}
const founderOf = p => { if (p.live) return p.founderWallet || ''; const f = profileOf(p).founder; return (f && f.wallet) || p.creator || ''; };
function renderFounder() {
  const box = $('#founderPage'); if (!box) return;
  if (ui.tab !== 'founder') { if (fpg.wallet) { box.innerHTML = ''; fpg.wallet = null; } return; }
  const w = ui.sel || '', list = raisesBy(w), real = isRealAddr(w), fresh = fpg.wallet !== w; fpg.wallet = w;
  if (!list.length) { box.innerHTML = `<div class="panel empty">No raise on Seed was opened by ${esc(walletLabel(w) || 'that wallet')}.<br><a href="#">Back to all raises</a></div>`; return; }
  const latest = list[0], x = list.find(p => p.xAccount && p.xAccount.handle) && list.find(p => p.xAccount && p.xAccount.handle).xAccount, pf = profileOf(latest).founder || {}, name = pf.name && pf.name !== 'Founder' ? pf.name : x && x.handle ? '@' + x.handle : walletLabel(w);
  const outcome = p => p.blacklisted ? '<span class="btag bad">Flagged</span>' : p.status === 'seeded' ? '<span class="btag ok">Seeded</span>' : p.status === 'refunded' ? `<span class="btag">Refunded${p.refundReason === 'cancelled' ? ', cancelled' : ''}</span>` : p.status === 'filled' ? '<span class="btag ok">Filled, seeding</span>' : '<span class="btag">Live</span>';
  const seeded = list.filter(p => p.status === 'seeded'), refunded = list.filter(p => p.status === 'refunded'), flagged = list.filter(p => p.blacklisted);
  const byAsset = {}; let reading = false;   // totals per pair asset, since SOL and USDC do not add
  seeded.forEach(p => { const f = feesOf(p), t = byAsset[p.q] || (byAsset[p.q] = { p, earned: 0, pending: 0 }); t.earned += f.founder; t.pending += f.founderUnclaimed; reading = reading || !!f.reading; });
  const sumTxt = k => Object.values(byAsset).map(t => q(t[k], t.p)).join(' + ');
  const q = (n, p) => `${n > 0 && n < 100 ? fmtExact(n, p.q) : fmtC(n, p.q, true)} ${esc(Q(p).sym)}`;
  const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  /* the record */
  const raises = `<div class="tscroll"><table class="dtable founder-raises"><thead><tr><th>Raise</th><th>Outcome</th><th class="r">Raised</th><th class="r">Backers</th><th class="r">Opened</th><th></th></tr></thead><tbody>
    ${list.map(p => `<tr><td><b>$${esc(p.ticker)}</b> <span class="quiet">${esc(p.name)}</span>${!p.live && chain.on() ? ' <span class="demo-chip">Demo</span>' : ''}</td><td>${outcome(p)}</td><td class="num">${fmtC(p.raised, p.q, true)}<span class="fr-target"> / ${fmtC(p.target, p.q, true)}</span> ${esc(Q(p).sym)}</td><td class="num">${p.backers}</td><td class="num">${fmtDay(p.openedAt)}</td><td><a href="#/presale/${esc(p.id)}">Open ${ICONS.out}</a></td></tr>`).join('')}</tbody></table></div>`;
  /* the income: per seeded raise, from the position (live) or the demo's accounting */
  const income = seeded.length ? `<div class="tscroll"><table class="dtable"><thead><tr><th>Raise</th><th class="r">Volume</th><th class="r">Founder's share</th><th class="r">Claimed</th><th class="r">Claimable</th></tr></thead><tbody>
    ${seeded.map(p => { const f = feesOf(p); return `<tr><td><b>$${esc(p.ticker)}</b></td><td class="num">${q(f.volume, p)}</td><td class="num">${f.reading ? '…' : q(f.founder, p)}</td><td class="num">${q(f.founderClaimed, p)}</td><td class="num">${f.reading ? '…' : q(f.founderUnclaimed, p)}</td></tr>`; }).join('')}</tbody></table></div>
    <div data-claims>${fpg.claims && fpg.claimsFor === w ? claimsTable(fpg.claims) : real && supa.configured() ? '<p class="quiet">Loading fee claims…</p>' : ''}</div>` : '<p class="quiet">No seeded raise yet, so no pool fees.</p>';
  /* the unlocks: each seeded raise with a team share, where its schedule stands */
  const unlockRows = seeded.filter(p => p.teamBps).map(p => { const u = unlockState(p), sp = splitOf(p.teamBps), t = tranchesOf(p.teamSchedule), at = p.seededAt;
    return `<tr><td><b>$${esc(p.ticker)}</b> <span class="quiet">${(p.teamBps / 100).toFixed(p.teamBps % 100 ? 2 : 0)}% team</span></td><td class="num">${fmtTok(sp.team)}</td><td class="num">${fmtTok(u.unlocked)} <span class="quiet">(${(u.unlockedBps / 100).toFixed(u.unlockedBps % 100 ? 1 : 0)}%)</span></td><td class="num">${fmtTok(p.teamClaimed || 0)}</td><td class="num">${u.next ? `${fmtTok(u.next.tokens)} on ${fmtDay(u.next.at)}` : 'Done'}</td><td class="num">${at ? fmtDay(at + lastUnlockDay(p.teamSchedule) * dayOf(p)) : '—'}</td></tr>`; });
  const unlocks = unlockRows.length ? `<div class="tscroll"><table class="dtable"><thead><tr><th>Raise</th><th class="r">Team tokens</th><th class="r">Unlocked</th><th class="r">Claimed</th><th class="r">Next</th><th class="r">Last</th></tr></thead><tbody>${unlockRows.join('')}</tbody></table></div>`
    : '<p class="quiet">No team tokens on any seeded raise.</p>';
  box.innerHTML = `<div class="fp">
    <section class="panel pp-card fp-head"><a class="back" href="#">&larr; All raises</a>
      <div class="fp-id"><span class="m-av" style="--h:${hashStr(w) % 360}">${initials(name)}</span><div><h1>${esc(name)}</h1>
        <div class="fp-meta"><span class="num">${esc(walletLabel(w))}</span>${real ? copyBtn(w, 'founder wallet') + `<a class="bar-link" href="${esc(explorer(w))}" target="_blank" rel="noopener">${ICONS.out}</a>` : ''}
          ${x && x.handle ? `<a class="x-acct" href="${esc(xUrl(x.handle))}" target="_blank" rel="noopener">${ICONS.x}<span><b>@${esc(x.handle)}</b><span class="num">${x.verified ? 'Verified X' : x.typed ? 'Typed on devnet' : 'Linked'}</span></span></a>` : '<span class="quiet">No X account linked</span>'}
          ${flagged.length ? '<span class="btag bad">Flagged for fraud</span>' : ''}</div></div></div>
      <dl class="pp-stats fp-stats"><div><dt>Raises</dt><dd class="num">${list.length}</dd></div><div><dt>Seeded</dt><dd class="num">${seeded.length}</dd></div><div><dt>Refunded</dt><dd class="num">${refunded.length}</dd></div>
        <div><dt>Fees earned</dt><dd class="num">${!seeded.length ? '—' : reading ? '…' : sumTxt('earned')}</dd></div><div><dt>Claimable</dt><dd class="num">${!seeded.length ? '—' : reading ? '…' : sumTxt('pending')}</dd></div></dl></section>
    <section class="panel pp-card"><div class="tab-h"><h2>Raises on Seed</h2><span class="quiet">${plural(list.length, 'raise')}, newest first</span></div>${raises}</section>
    <section class="panel pp-card"><div class="tab-h"><h2>Fee income</h2><span class="quiet">${SEED.creatorShareBps / 100}% of each pool position's fees, paid to the payout wallet</span></div>${income}</section>
    <section class="panel pp-card"><div class="tab-h"><h2>Team unlocks</h2><span class="quiet">Schedules fixed at opening; unlocked tokens are claimed to the payout wallet</span></div>${unlocks}</section></div>`;
  if (fresh && real && seeded.length && supa.configured()) loadClaims(w, seeded);
  if (fresh) seeded.filter(p => p.live).forEach(p => { if (!(chain.feesLive && chain.feesLive[p.id])) damm.fees(p).then(f => { if (f) { (chain.feesLive = chain.feesLive || {})[p.id] = f; if (fpg.wallet === w) renderFounder(); } }).catch(() => {}); });
}
/* the fee claims the indexer saw on this wallet's raises, newest first */
async function loadClaims(w, seeded) {
  try {
    if (!(await supa.init())) return;
    const ids = seeded.map(p => p.id), { data } = await supa.client.from('fee_claims').select('tx,raise_id,founder,seed,by,at').in('raise_id', ids).order('at', { ascending: false }).limit(50);
    fpg.claims = (data || []).map(c => ({ tx: c.tx, raise: find(c.raise_id), founder: Number(c.founder), seed: Number(c.seed), by: c.by, at: Date.parse(c.at) })); fpg.claimsFor = w;
    const box = $('#founderPage [data-claims]'); if (box && fpg.wallet === w) box.innerHTML = claimsTable(fpg.claims);
  } catch (e) { console.warn('fee claims:', e.message); }
}
function claimsTable(claims) {
  if (!claims.length) return '<p class="quiet">No fee claim has landed yet. Seed claims on a schedule; anyone can claim sooner from the raise page.</p>';
  return `<div class="tab-h sub"><h2>Claims</h2></div><div class="tscroll"><table class="dtable"><thead><tr><th>Raise</th><th class="r">To the founder</th><th class="r">To Seed</th><th>By</th><th class="r">When</th><th></th></tr></thead><tbody>
    ${claims.map(c => `<tr><td><b>$${esc(c.raise ? c.raise.ticker : '?')}</b></td><td class="num">${c.raise ? fmtExact(c.founder, c.raise.q) + ' ' + esc(Q(c.raise).sym) : c.founder}</td><td class="num">${c.raise ? fmtExact(c.seed, c.raise.q) + ' ' + esc(Q(c.raise).sym) : c.seed}</td><td class="mono">${esc(shortMint(c.by))}</td><td class="num">${fmtAgo(Date.now() - c.at)}</td><td><a href="${esc(explorer(c.tx, 'tx'))}" target="_blank" rel="noopener">${ICONS.out}</a></td></tr>`).join('')}</tbody></table></div>`;
}
