/* ==========================================================================
   ALERTS: in-app notifications for the raises a wallet watches (the star) or has a stake in (backed, holds, opened).
   Every render compares each such raise with what was last seen and records a change: filled, seeded, refunds open
   (missed, cancelled or timed out), a team unlock reached, a payout wallet moved. Alerts live in the browser with the
   watchlist; the bell in the header counts the unread ones and lists the latest.
   ========================================================================== */
const ALERT_KEEP = 60;
function alertScope(p) {   // the raises worth telling this browser about
  return isWatched(p) || !!state.positions[p.id] || (state.tokens && state.tokens[p.id] > 0) || p.mine || (state.wallet && p.founderWallet && p.founderWallet === state.wallet.pk);
}
function pushAlert(p, kind, text) {
  state.alerts = state.alerts || []; const key = `${p.id}/${kind}`;
  if (state.alerts.some(a => a.key === key)) return;
  state.alerts.unshift({ key, id: p.id, kind, text, at: Date.now(), read: false });
  if (state.alerts.length > ALERT_KEEP) state.alerts.length = ALERT_KEEP;
  if (!(ui.tab === 'presale' && ui.sel === p.id)) toast(text);   // the open page already shows the change (and its own toast)
}
/* called after every render: what changed since last time on the raises in scope */
function checkAlerts() {
  state.seen = state.seen || {}; let changed = false;
  for (const p of state.presales) {
    const prev = state.seen[p.id], cur = { status: p.status, step: p.seedStep || '', unlocked: p.status === 'seeded' ? unlockState(p).unlockedBps : 0, payout: p.payoutWallet || '' };
    state.seen[p.id] = cur;
    if (!prev || !alertScope(p)) continue;   // the first sight of a raise sets the baseline, no alert
    const sym = Q(p).sym;
    if (prev.status !== cur.status) {
      if (cur.status === 'filled') pushAlert(p, 'filled', `${p.name} filled. Seeding has started.`);
      else if (cur.status === 'seeded') pushAlert(p, 'seeded', `${p.name} seeded. $${p.ticker} is trading${state.positions[p.id] ? ' and your tokens are ready to claim' : ''}.`);
      else if (cur.status === 'refunded') pushAlert(p, 'refunded', `${p.name} ${refundReason(p)}. ${state.positions[p.id] ? `Your ${fmtExact(paidFor(state.positions[p.id]), p.q)} ${sym} refund is ready to claim.` : 'Refunds are open.'}`);
      changed = true;
    }
    if (cur.status === 'seeded' && cur.unlocked > (prev.unlocked || 0)) { pushAlert(p, 'unlock-' + cur.unlocked, `${p.name}: a team unlock passed, ${(cur.unlocked / 100).toFixed(cur.unlocked % 100 ? 1 : 0)}% of the team tokens are unlocked.`); changed = true; }
    if (prev.payout && cur.payout && prev.payout !== cur.payout) { pushAlert(p, 'payout-' + cur.payout.slice(0, 8), `${p.name}: the payout wallet moved to ${shortMint(cur.payout)}.`); changed = true; }
  }
  if (changed) save();
  renderBell();
}
function renderBell() {
  const b = $('#bellBtn'), ct = $('#bellCt'); if (!b) return;
  const n = (state.alerts || []).filter(a => !a.read).length; ct.textContent = n ? String(n) : ''; ct.hidden = !n; b.classList.toggle('on', !!n);
  const pop = $('#bellPop'); if (!pop || pop.hidden) return;
  const list = state.alerts || [];
  pop.innerHTML = `<div class="bell-h"><b>Alerts</b>${list.length ? `<span class="quiet">${list.length > 30 ? `Latest 30 of ${list.length}` : ''}</span><button type="button" class="qb" data-bell-clear>Clear</button>` : ''}</div>` + (list.length ? `<ul class="bell-list">${list.slice(0, 30).map(a => { const p = find(a.id); return `<li class="${a.read ? '' : 'new'}"><a href="#/presale/${esc(a.id)}">${p ? avatar(p) : ''}<span><span>${esc(a.text)}</span><small class="num">${fmtAgo(Date.now() - a.at)}</small></span></a></li>`; }).join('')}</ul>`
    : `<p class="quiet">Nothing yet. Star a raise, back one or open one and its changes show here: filled, seeded, refunds open, team unlocks.</p>`);
}
function toggleBell(open) {
  const pop = $('#bellPop'), b = $('#bellBtn'); if (!pop) return;
  const show = open != null ? open : pop.hidden; pop.hidden = !show; pop.classList.toggle('open', show); b.setAttribute('aria-expanded', String(show));   // .pop shows on .open
  if (show) { renderBell(); (state.alerts || []).forEach(a => a.read = true); save(); const ct = $('#bellCt'); ct.hidden = true; b.classList.remove('on'); }
}
document.addEventListener('click', e => {
  if (e.target.closest('#bellBtn')) { toggleBell(); return; }
  if (e.target.closest('[data-bell-clear]')) { state.alerts = []; save(); renderBell(); return; }
  if (!e.target.closest('#bellPop')) { const pop = $('#bellPop'); if (pop && !pop.hidden) toggleBell(false); }
});
document.addEventListener('keydown', e => {   // Escape closes the popover and puts the focus back on the bell
  if (e.key !== 'Escape') return; const pop = $('#bellPop'); if (!pop || pop.hidden) return;
  e.preventDefault(); toggleBell(false); const b = $('#bellBtn'); if (b) b.focus();
});
