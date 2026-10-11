/* ==========================================================================
   X ACCOUNTS. Linking an X account to a wallet is optional: a wallet on its own does everything on Seed. A link only adds a
   name. The handle is shown beside the wallet in the header, the wallet menu, the Portfolio and the chat.
   Live path (a real wallet, Supabase configured): the person signs in on X through Supabase Auth, then that sign-in and the
   wallet's signed session go to the `seed` Edge Function together. It checks both and writes the pair to `x_links`, so a link
   says one person held the wallet and the X account at the same moment. Several wallets can link to one X account.
   Demo path (the demo wallet): a stand-in. The handle is typed, stays in this browser and is always labelled Demo.
   A real wallet with no backend configured is told so. Nothing is faked for a real wallet.
   ========================================================================== */
const X_PENDING = 'seed.x.pending';
const cleanHandle = v => { const m = /^@?([A-Za-z0-9_]{1,15})$/.exec(String(v || '').trim().replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i, '').replace(/[/?#].*$/, '')); return m ? m[1] : ''; };

const xAdapter = {
  client: null,
  remote: {},   // wallet -> the link read from Supabase, or null when that wallet has none
  /* demo: a stand-in in this browser. live: X sign-in through the backend. off: a real wallet with no backend to check it. */
  mode() { return !state.wallet ? 'none' : !isReal() ? 'demo' : supa.configured() ? 'live' : 'off'; },
  of(w = walletId()) { return !w ? null : (state.x && state.x[w]) || this.remote[w] || null; },
  linkDemo(handle) {
    if (isReal()) throw new Error('A real wallet links by signing in on X.');
    (state.x = state.x || {})[walletId()] = { handle, demo: true, at: Date.now() }; save();
  },
  /* a second Supabase client, only for the X sign-in: it keeps the sign-in across the trip to X and back */
  async auth() {
    if (this.client) return this.client;
    if (!(await supa.init())) throw new Error('X sign-in needs Seed’s backend, which is not switched on yet.');
    return this.client = window.supabase.createClient(SUPABASE.url, SUPABASE.anonKey, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true, storageKey: 'seed.x.auth' } });
  },
  /* step one: off to X. The wallet that asked is remembered, so the link is only made for that wallet on the way back. */
  async start() {
    if (this.mode() !== 'live') throw new Error('X sign-in is not available for this wallet.');
    const c = await this.auth();
    try { sessionStorage.setItem(X_PENDING, JSON.stringify({ wallet: walletId(), hash: location.hash })); } catch (e) {}
    const { error } = await c.auth.signInWithOAuth({ provider: SUPABASE.xProvider || 'twitter', options: { redirectTo: location.origin + location.pathname } });
    if (error) { try { sessionStorage.removeItem(X_PENDING); } catch (e) {} throw new Error(error.message); }
  },
  /* step two, on the way back from X: the wallet signs its session (once per browser session) and the Edge Function ties the two */
  async finish() {
    let pend = null; try { pend = JSON.parse(sessionStorage.getItem(X_PENDING) || 'null'); } catch (e) {}
    const q = new URLSearchParams(location.search);
    if (!pend || !(q.has('code') || q.has('error'))) return;
    try { sessionStorage.removeItem(X_PENDING); } catch (e) {}
    const failed = q.get('error_description') || q.get('error');
    try {
      if (failed) throw new Error(q.get('error') === 'access_denied' ? 'X sign-in was cancelled. Nothing was linked.' : failed);
      const c = await this.auth(), { data } = await c.auth.getSession();   // the client swaps the code in the address for a sign-in as it starts
      if (!data || !data.session) throw new Error('X sign-in did not complete. Nothing was linked.');
      if (walletId() !== pend.wallet) throw new Error('Connect the wallet you started with, then link X again.');
      const r = await supa.call('link-x', { token: data.session.access_token });
      this.remote[pend.wallet] = { handle: r.handle, name: r.name || '', avatar: r.avatar || '' };
      c.auth.signOut().catch(() => {});   // the X sign-in has done its job; the link lives with the wallet
      toast(`@${r.handle} is linked to ${state.wallet.addr}`);
    } catch (e) { toast(e.message || 'The X account was not linked.'); }
    ['code', 'error', 'error_code', 'error_description'].forEach(k => q.delete(k));
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + (pend.hash || location.hash));
    renderAll(); if (detailBox) renderDetail(true);
  },
  async unlink() {
    const w = walletId(), l = this.of(w); if (!l) return;
    if (l.demo) { delete state.x[w]; save(); return; }
    await supa.call('unlink-x', {}); this.remote[w] = null;
  },
  /* the links of the wallets about to be shown. Resolves true when it learned one. */
  async load(wallets) {
    const need = [...new Set(wallets)].filter(w => w && !String(w).startsWith('demo:') && isRealAddr(w) && !(w in this.remote)).slice(0, 200);
    if (!need.length || !supa.configured() || !(await supa.init())) return false;
    need.forEach(w => this.remote[w] = null);
    const { data, error } = await supa.client.from('x_links').select('wallet,handle,name,avatar').in('wallet', need);
    if (error) return false;
    (data || []).forEach(r => this.remote[r.wallet] = { handle: r.handle, name: r.name || '', avatar: r.avatar || '' });
    return !!(data && data.length);
  }
};

/* ---------------------------------------------------------------- how a link looks */
const X_GLYPH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.08 4.126H5.117z"/></svg>';
/* a checked link opens the account; a demo one is plain text with its label, since nobody checked it */
function xChip(l) {
  if (!l) return '';
  return l.demo ? `<span class="x-chip demo" title="Demo link. The handle was typed, not checked with X.">${X_GLYPH}@${esc(l.handle)}<em>Demo</em></span>`
    : `<a class="x-chip" href="https://x.com/${esc(l.handle)}" target="_blank" rel="noopener" title="Linked X account">${X_GLYPH}@${esc(l.handle)}</a>`;
}
/* the wallet menu's X block, and the X row of the Portfolio wallet card */
function xMenu() {
  if (!state.wallet) return '';
  const l = xAdapter.of();
  return l ? `<div class="bal xrow"><span>X account</span>${xChip(l)}</div><button type="button" data-xunlink>Unlink X account</button>`
    : `<button type="button" class="x-link" data-xlink>${X_GLYPH}Link X account</button><p class="x-note">Optional. Seed works the same with just your wallet.</p>`;
}
function xRow() {
  const l = xAdapter.of();
  return `<div class="bal xrow"><span>X account</span>${l ? `<span class="x-set">${xChip(l)}<button type="button" class="linkbtn" data-xunlink>Unlink</button></span>` : '<button type="button" class="linkbtn" data-xlink>Link, optional</button>'}</div>`;
}
/* a real wallet's own link is read once from the backend, then the wallet is drawn again with it */
function xRefresh() {
  const w = walletId();
  if (xAdapter.mode() === 'live' && !(w in xAdapter.remote)) xAdapter.load([w]).then(got => { if (got && walletId() === w) renderAll(); });
}

/* ---------------------------------------------------------------- the dialog */
function openXDialog() {
  const d = $('#xDlg'), body = $('#xDlgBody'), mode = xAdapter.mode(); if (mode === 'none') return connect();
  const head = '<div class="sh-head"><span class="nm"><b>Link an X account</b></span><button class="x" data-xx aria-label="Close">&times;</button></div>';
  const why = '<p class="where x-why">Optional for backers: a link shows your X handle beside your wallet in chat and on your portfolio, and you can unlink at any time. Founders sign in with X to open a raise; the account shows on the raise page.</p>';
  body.innerHTML = head + why + (mode === 'demo' ? `<form data-xform novalidate><div class="f"><label for="xHandle">X handle</label><div class="inp"><span class="suf" style="padding:0 0 0 14px">@</span><input id="xHandle" maxlength="40" placeholder="yourhandle" autocomplete="off" autocapitalize="off" spellcheck="false" style="padding-left:4px"></div></div>
      <div class="err" data-xerr role="alert"></div><button class="btn btn-navy btn-lg btn-block">Link to the demo wallet</button></form>
      <p class="standin-note">Demo wallet: this is a stand-in. The handle is not checked with X, stays in this browser and is labelled Demo wherever it shows. A real wallet links by signing in on X.</p>`
    : mode === 'live' ? `<ol class="x-steps"><li><b>Sign in on X.</b> Seed receives your handle, name and picture. It cannot post for you or read your messages.</li><li><b>Sign one message with ${esc(state.wallet.name || 'your wallet')}.</b> It ties ${esc(state.wallet.addr)} to the X account. It is not a transaction and costs nothing.</li></ol>
      <div class="err" data-xerr role="alert"></div><button type="button" class="btn btn-navy btn-lg btn-block" data-xgo>Continue on X</button>`
    : `<p class="standin-note">X sign-in runs through Seed’s backend, which is not switched on yet, so nothing can be linked to ${esc(state.wallet.name || 'a real wallet')} today. Your wallet works without it. To see how linking looks, switch to the demo wallet.</p>
      <button type="button" class="btn btn-ink btn-lg btn-block" data-xx>Close</button>`);
  const close = () => { d.onclick = d.oncancel = null; if (d.open) d.close(); };
  const err = t => { const e = $('[data-xerr]', body); if (e) e.textContent = t; };
  d.onclick = async e => {
    if (e.target === d || e.target.closest('[data-xx]')) return close();
    const go = e.target.closest('[data-xgo]');
    if (go) { go.disabled = true; go.textContent = 'Opening X…'; try { await xAdapter.start(); } catch (x) { go.disabled = false; go.textContent = 'Continue on X'; err(x.message || 'X sign-in did not start.'); } }
  };
  d.oncancel = close;
  const f = $('[data-xform]', body);
  if (f) f.onsubmit = e => {
    e.preventDefault(); const h = cleanHandle($('#xHandle').value);
    if (!h) return err('An X handle is 1 to 15 letters, numbers or underscores.');
    try { xAdapter.linkDemo(h); } catch (x) { return err(x.message); }
    close(); toast(`@${h} is linked to the demo wallet`); renderAll(); if (detailBox) renderDetail(true);
  };
  d.showModal(); const inp = $('#xHandle'); if (inp) inp.focus();
}
document.addEventListener('click', async e => {
  if (e.target.closest('[data-xlink]')) { $('#walletPop').classList.remove('open'); return openXDialog(); }
  const un = e.target.closest('[data-xunlink]'); if (!un) return;
  const l = xAdapter.of(); un.disabled = true;
  try { await xAdapter.unlink(); toast(l ? `@${l.handle} is unlinked` : 'Unlinked'); } catch (x) { toast(x.message || 'The X account was not unlinked.'); }
  renderAll(); if (detailBox) renderDetail(true);
});
