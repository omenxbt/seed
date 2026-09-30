/* ==========================================================================
   UPDATES ADAPTER: founder-posted updates, newest first.
   Demo: the profile's updates plus any a founder posts in this browser. Real (Supabase configured): the `updates` table, written
   only by the `seed` Edge Function after it checks that the signer is the presale's founder or team.
   ========================================================================== */
const UPD_KEY = id => 'seed.updates.' + id;
const updatesAdapter = {
  list(p) {
    const pr = profileOf(p), base = (pr.updates || []).map(u => ({ title: u.title, body: u.body, postedAt: u.postedAt || Date.now() - u.daysAgo * D, author: u.author, from: pr.demo ? 'demo' : 'self' }));
    let local = []; try { local = JSON.parse(localStorage.getItem(UPD_KEY(p.id)) || '[]'); } catch (e) {}
    const remote = supa.ready() ? (supa.updates[p.id] || []) : [];
    return base.concat(local, remote).sort((a, b) => b.postedAt - a.postedAt);
  },
  async post(p, title, body) {
    const u = { title, body, postedAt: Date.now(), author: state.wallet ? state.wallet.addr : 'Founder', from: 'self' };
    if (supa.ready()) { await supa.call('update', { presaleId: p.id, title, body }); await supa.loadUpdates(p.id); return; }
    let local = []; try { local = JSON.parse(localStorage.getItem(UPD_KEY(p.id)) || '[]'); } catch (e) {}
    local.push(u); try { localStorage.setItem(UPD_KEY(p.id), JSON.stringify(local)); } catch (e) {}
  },
  async load(p) { if (supa.configured()) await supa.loadUpdates(p.id); }
};
