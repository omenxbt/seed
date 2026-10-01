/* ==========================================================================
   CHAT ADAPTER and the chat card.
   Posting needs a connected wallet and one signed message per browser session. The wallet only signs a plain text message;
   no transaction is ever built.
   Demo path (no Supabase configured): messages live in this browser and sync between its windows over BroadcastChannel.
   Supabase path: messages are read from the `messages` table and arrive over Realtime; every write goes through the `seed`
   Edge Function, which checks the signature (ed25519) before it inserts anything.
   ========================================================================== */
const SESS_KEY = 'seed.chat.session', HIDE_KEY = 'seed.chat.hidden', CHAT_KEY = id => 'seed.chat.' + id;
const chatBus = 'BroadcastChannel' in window ? new BroadcastChannel('seed-chat') : null;

/* ---------------------------------------------------------------- the signed session */
function forgetSession() { try { sessionStorage.removeItem(SESS_KEY); } catch (e) {} }
function currentSession() { try { const s = JSON.parse(sessionStorage.getItem(SESS_KEY) || 'null'); if (s && s.wallet === walletId() && Date.now() - s.at < 20 * H) return s; } catch (e) {} return null; }
const toB64 = u8 => btoa(String.fromCharCode(...u8));
/* resolves the session, asking the wallet to sign once if there is none. The message is plain text, not a transaction. */
async function chatSession() {
  const have = currentSession(); if (have) return have;
  if (!state.wallet) throw new Error('Connect a wallet to chat.');
  const wallet = walletId(), nonce = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
  const message = ['Seed chat sign-in', `Domain: ${location.host}`, `Wallet: ${wallet}`, `Issued: ${new Date().toISOString()}`, `Nonce: ${nonce}`, '', 'Signing this proves you hold the wallet. It is not a transaction and costs nothing.'].join('\n');
  let signature;
  if (isReal()) {
    const prov = providerOf(state.wallet.kind);
    if (!prov || typeof prov.signMessage !== 'function') throw new Error(`${state.wallet.name} cannot sign messages.`);
    const r = await prov.signMessage(new TextEncoder().encode(message), 'utf8'), sig = r && r.signature ? r.signature : r;
    signature = toB64(sig instanceof Uint8Array ? sig : new Uint8Array(sig));
  } else {
    if (supa.configured()) throw new Error('The demo wallet cannot sign. Connect Phantom, Solflare or Backpack to chat.');
    signature = 'demo-' + hashStr(message).toString(16);           // the demo wallet has no key; the demo path accepts this
  }
  const s = { wallet, message, signature, at: Date.now() };
  try { sessionStorage.setItem(SESS_KEY, JSON.stringify(s)); } catch (e) {}
  return s;
}

/* ---------------------------------------------------------------- adapter */
const chatAdapter = {
  live: () => supa.ready(),
  /* the seeded conversation for a demo raise, resolved against its crowd so authors carry their real backed amounts */
  seeds(p) {
    const pr = profileOf(p); if (!pr.chat || !pr.chat.length) return [];
    const rows = backersAdapter.rows(p), end = p.resolvedAt || Date.now(), out = [];
    pr.chat.forEach((m, i) => {
      const [kind, k] = m.by.split(':'), wallet = kind === 'founder' ? pr.founder.wallet : kind === 'team' ? (pr.team[+k] || {}).wallet : kind === 'backer' ? (rows[+k - 1] || rows[0] || {}).wallet : fakeAddr(`visitor/${p.id}/${k}`);
      out.push({ id: `seed-${p.id}-${i}`, wallet, body: m.body, at: end - m.mins * 60e3, pinned: !!m.pinned, replyTo: m.reply ? out[out.length + m.reply].id : null, from: 'demo' });
    });
    return out;
  },
  local(p) { try { return JSON.parse(localStorage.getItem(CHAT_KEY(p.id)) || '[]'); } catch (e) { return []; } },
  saveLocal(p, list) { try { localStorage.setItem(CHAT_KEY(p.id), JSON.stringify(list.slice(-300))); } catch (e) {} },
  remote: {},
  async list(p) {
    if (await supa.init()) {
      const { data, error } = await supa.client.from('messages').select('id,wallet,body,role,reply_to,pinned,created_at').eq('presale_id', p.id).order('created_at', { ascending: true }).limit(300);
      if (error) throw new Error(error.message);
      return (data || []).map(m => ({ id: m.id, wallet: m.wallet, body: m.body, role: m.role, replyTo: m.reply_to, pinned: m.pinned, at: Date.parse(m.created_at), from: 'api' }));
    }
    const pins = this.local(p).filter(m => m.pinOf);   // pin toggles on seeded messages are stored as small records
    const msgs = this.seeds(p).concat(this.local(p).filter(m => !m.pinOf));
    pins.forEach(x => { const m = msgs.find(y => y.id === x.pinOf); if (m) m.pinned = x.pinned; });
    return msgs.sort((a, b) => a.at - b.at);
  },
  async post(p, body, replyTo) {
    const s = await chatSession();
    if (supa.ready()) return supa.call('post', { presaleId: p.id, body, replyTo });
    const m = { id: 'm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), wallet: s.wallet, body, at: Date.now(), pinned: false, replyTo: replyTo || null, from: 'demo' };
    const l = this.local(p); l.push(m); this.saveLocal(p, l);
    chatBus && chatBus.postMessage({ presaleId: p.id });
  },
  async pin(p, id, pinned) {
    if (supa.ready()) return supa.call('pin', { messageId: id, pinned });
    await chatSession();
    const l = this.local(p), own = l.find(m => m.id === id);
    if (own) own.pinned = pinned; else { const x = l.find(m => m.pinOf === id); if (x) x.pinned = pinned; else l.push({ pinOf: id, pinned }); }
    this.saveLocal(p, l); chatBus && chatBus.postMessage({ presaleId: p.id });
  },
  async report(p, id) {
    if (supa.ready()) return supa.call('report', { messageId: id });
    await chatSession(); hideLocally(id);
  },
  subscribe(p, onChange) {
    if (supa.ready()) {
      const ch = supa.client.channel('chat-' + p.id).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `presale_id=eq.${p.id}` }, onChange).subscribe();
      const t = setInterval(onChange, 30e3);            // a message hidden by reports stops matching the read policy, so it cannot be announced; poll for it
      return () => { supa.client.removeChannel(ch); clearInterval(t); };
    }
    const h = e => { if (e.data && e.data.presaleId === p.id) onChange(); };
    chatBus && chatBus.addEventListener('message', h);
    return () => chatBus && chatBus.removeEventListener('message', h);
  }
};
function hiddenSet() { try { return new Set(JSON.parse(localStorage.getItem(HIDE_KEY) || '[]')); } catch (e) { return new Set(); } }
function hideLocally(id) { const s = hiddenSet(); s.add(id); try { localStorage.setItem(HIDE_KEY, JSON.stringify([...s].slice(-500))); } catch (e) {} }

/* ---------------------------------------------------------------- the chat card, in the project page's side column */
const backedBy = (p, w) => (p.buys || []).filter(b => b.wallet === w).reduce((a, b) => a + (b.paid || b.amount), 0);
let chatOff = null, chatReply = null;
function chatCard(p) {
  const frozen = p.status === 'refunded';
  return `<section class="panel rail-card chat-card" data-chat id="chat"><div class="rail-h"><h3>Chat</h3>${chatAdapter.live() || supa.configured() ? LIVE_PILL : DEMO_PILL}</div>
    <div class="chat${frozen ? ' frozen' : ''}"><div class="chat-pins" data-pins></div><div class="chat-list" data-chatlist aria-live="polite"><div class="pp-loading">Loading messages…</div></div>
    <div class="chat-compose" data-compose></div></div>
    ${supa.configured() ? '' : '<p class="rail-cap">Syncs between windows of this browser until Supabase is configured.</p>'}</section>`;
}
let chatFor = null;
function chatMount(p, body) {
  if (chatOff) { chatOff(); chatOff = null; }
  if (chatFor !== p.id) { chatReply = null; chatFor = p.id; }
  const list = $('[data-chatlist]', body), pins = $('[data-pins]', body), comp = $('[data-compose]', body);
  const me = walletId(), myRole = roleOf(p, me), frozen = p.status === 'refunded';
  const draw = async () => {
    if (!body.isConnected) { if (chatOff) { chatOff(); chatOff = null; } return; }
    let msgs; try { msgs = await chatAdapter.list(p); } catch (e) { list.innerHTML = `<p class="quiet">Chat could not be loaded: ${esc(e.message)}</p>`; return; }
    const hidden = hiddenSet(), byId = new Map(msgs.map(m => [m.id, m])), shown = msgs.filter(m => !hidden.has(m.id));
    const row = (m, pinnedView) => {
      const role = m.role || roleOf(p, m.wallet), amt = backedBy(p, m.wallet), q = m.replyTo && byId.get(m.replyTo), mine = m.wallet === me;
      return `<article class="msg${role ? ' r-' + role : ''}${mine ? ' is-me' : ''}" data-mid="${esc(m.id)}">
        <span class="msg-av" style="--h:${hashStr(m.wallet || '') % 360}"></span>
        <div class="msg-main"><div class="msg-h"><b class="num">${mine ? 'You' : esc(walletLabel(m.wallet))}</b>${role ? `<span class="role-badge r-${role}">${role === 'founder' ? 'Founder' : 'Team'}</span>` : ''}
          <span class="backed-badge${amt ? '' : ' none'}">${amt ? `backed ${fmtC(amt, p.q)} ${esc(Q(p).sym)}` : 'not a backer'}</span><span class="msg-t">${fmtAgo(Date.now() - m.at)}</span></div>
          ${q ? `<blockquote><b class="num">${esc(walletLabel(q.wallet))}</b> ${esc(q.body)}</blockquote>` : ''}<p>${esc(m.body)}</p>
          <div class="msg-acts">${!frozen && state.wallet ? `<button data-reply="${esc(m.id)}">Reply</button>` : ''}${(myRole === 'founder' || myRole === 'team') && !frozen ? `<button data-pin="${esc(m.id)}" data-on="${m.pinned ? 0 : 1}">${m.pinned ? 'Unpin' : 'Pin'}</button>` : ''}
            ${!mine ? `<button data-report="${esc(m.id)}">Report</button><button data-hide="${esc(m.id)}">Hide</button>` : ''}</div></div></article>`;
    };
    const pinned = shown.filter(m => m.pinned);
    pins.innerHTML = pinned.length ? `<div class="pins-h">Pinned by the team</div>${pinned.map(m => row(m, true)).join('')}` : '';
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    list.innerHTML = shown.length ? shown.map(m => row(m)).join('') : '<p class="quiet chat-empty">No messages yet.</p>';
    if (atBottom || !list.dataset.drawn) list.scrollTop = list.scrollHeight; list.dataset.drawn = 1;
  };
  const compose = () => {
    if (frozen) { comp.innerHTML = '<p class="chat-note">This raise refunded, so its chat is closed. Earlier messages stay readable.</p>'; return; }
    if (!state.wallet) { comp.innerHTML = '<p class="chat-note">Connect a wallet to post. Reading is open to everyone.</p><button class="btn btn-navy btn-sm" data-cconnect>Connect wallet</button>'; return; }
    if (!currentSession()) { comp.innerHTML = `<p class="chat-note">To post, sign one message with ${esc(state.wallet.name || 'your wallet')}. It proves you hold the wallet and is not a transaction. You sign once per session.</p><button class="btn btn-navy btn-sm" data-csign>Sign to chat</button>`; return; }
    const q = chatReply;
    comp.innerHTML = `${q ? `<div class="replying">Replying to ${esc(walletLabel(q.wallet))}: ${esc(q.body.slice(0, 80))} <button data-noreply aria-label="Cancel reply">&times;</button></div>` : ''}
      <form data-cform><textarea name="b" rows="2" maxlength="1000" placeholder="Message ${esc(p.name)} backers and team" aria-label="Message" required></textarea><button class="btn btn-navy btn-sm">Send</button></form>`;
    const f = $('[data-cform]', comp), ta = f.b;
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } };
    f.onsubmit = async e => {
      e.preventDefault(); const text = ta.value.trim(); if (!text) return;
      const btn = $('button', f); btn.disabled = true;
      try { await chatAdapter.post(p, text, chatReply && chatReply.id); ta.value = ''; chatReply = null; compose(); await draw(); list.scrollTop = list.scrollHeight; $('textarea', comp) && $('textarea', comp).focus(); }
      catch (x) { toast(x.message || 'The message was not sent.'); btn.disabled = false; }
    };
  };
  body.onclick = async e => {
    const t = e.target.closest('button'); if (!t || !body.contains(t)) return;
    try {
      if (t.hasAttribute('data-cconnect')) { await connect(); compose(); }
      else if (t.hasAttribute('data-csign')) { t.disabled = true; await chatSession(); compose(); }
      else if (t.dataset.reply) { const ms = await chatAdapter.list(p); chatReply = ms.find(m => m.id === t.dataset.reply) || null; compose(); const ta = $('textarea', comp); if (ta) ta.focus(); }
      else if (t.hasAttribute('data-noreply')) { chatReply = null; compose(); }
      else if (t.dataset.pin) { await chatAdapter.pin(p, t.dataset.pin, t.dataset.on === '1'); await draw(); }
      else if (t.dataset.report) { await chatAdapter.report(p, t.dataset.report); toast('Reported. The team can see it, and it is hidden for you.'); hideLocally(t.dataset.report); await draw(); }
      else if (t.dataset.hide) { hideLocally(t.dataset.hide); await draw(); }
    } catch (x) { t.disabled = false; toast(x.message || 'That did not work.'); }
  };
  compose(); draw();
  chatOff = chatAdapter.subscribe(p, draw);
}
