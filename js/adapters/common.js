/* ==========================================================================
   ADAPTERS, shared parts. Every read the project page makes goes through one adapter per domain (presale, backers, founder,
   chat, updates). Each read returns { value, from } where `from` says where the value came from:
     demo     demo data, shown with the "Demo data" pill
     chain    read live from Solana
     standin  read live from a real account that stands in for this presale's (labelled as a stand-in)
     api      read live from a public API (GeckoTerminal)
   ========================================================================== */
const withSrc = (value, from, extra) => Object.assign({ value, from }, extra || {});
const DEMO_PILL = '<span class="tag demo-pill" title="This comes from the demo data set, not from Solana">Demo data</span>';
const STANDIN_PILL = '<span class="tag standin-pill" title="Read live from a real account that stands in for this presale’s">Stand-in, live</span>';
const LIVE_PILL = '<span class="tag live-pill" title="Read live">Live</span>';
const srcPill = from => from === 'demo' ? DEMO_PILL : from === 'standin' ? STANDIN_PILL : from ? LIVE_PILL : '';

/* a small cache in localStorage, shared by every tab of the site */
function cacheGet(key, ttl) { try { const j = JSON.parse(localStorage.getItem('seed.cache.' + key)); if (j && Date.now() - j.t < ttl) return j.v; } catch (e) {} return undefined; }
function cacheSet(key, v) { try { localStorage.setItem('seed.cache.' + key, JSON.stringify({ t: Date.now(), v })); } catch (e) {} }

/* The keyless public RPC answers one account per call, refuses batches of more than about three accounts and throttles bursts.
   So live lookups queue here and run one at a time with a gap between them. */
let rpcChain = Promise.resolve();
function rpcPaced(method, params) {
  const run = rpcChain.then(() => rpc(method, params));
  rpcChain = run.catch(() => {}).then(() => wait(RISK.rpcSpacingMs));
  return run;
}
/* a real address: valid base58 and not one the demo data made up */
const isRealAddr = a => typeof a === 'string' && B58.test(a) && !demoAddrs.has(a);
const solscan = (a, kind = 'account') => `https://solscan.io/${kind}/${a}`;

/* When did a wallet first transact, and who funded it? Reads at most two pages of signatures (2,000). A wallet with more history
   than that is old and busy, which is all the fresh-wallet check needs to know; its funder is left unknown. Cached for hours. */
async function walletOrigin(addr) {
  const key = 'origin/' + addr, hit = cacheGet(key, RISK.lookupCacheMs); if (hit) return hit;
  let before, oldest = null, complete = false;
  for (let page = 0; page < 2; page++) {
    const s = await rpcPaced('getSignaturesForAddress', [addr, before ? { limit: 1000, before } : { limit: 1000 }]);
    if (!s.length) { complete = true; break; }
    oldest = s[s.length - 1]; before = oldest.signature;
    if (s.length < 1000) { complete = true; break; }
  }
  const out = { firstTxAt: oldest && oldest.blockTime ? oldest.blockTime * 1000 : null, complete, fundedBy: null };
  if (complete && oldest) {
    try { out.fundedBy = funderOf(await rpcPaced('getTransaction', [oldest.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]), addr); } catch (e) {}
  }
  cacheSet(key, out);
  return out;
}
/* the funder of a wallet's first transaction: a bridge or mixer program it went through, else the SOL sender, else the fee payer */
function funderOf(tx, addr) {
  if (!tx || !tx.transaction) return null;
  const msg = tx.transaction.message, keys = (msg.accountKeys || []).map(k => k.pubkey || k);
  const ixs = (msg.instructions || []).concat(...((tx.meta && tx.meta.innerInstructions) || []).map(x => x.instructions));
  for (const ix of ixs) {
    const pid = ix.programId || keys[ix.programIdIndex];
    if (RISK.bridges[pid]) return { kind: 'bridge', label: RISK.bridges[pid], addr: pid };
    if (RISK.mixers[pid]) return { kind: 'mixer', label: RISK.mixers[pid], addr: pid };
  }
  for (const ix of ixs) { const i = ix.parsed && ix.parsed.info; if (ix.parsed && ix.parsed.type === 'transfer' && i && i.destination === addr && i.source) return { kind: 'wallet', addr: i.source }; }
  return keys[0] && keys[0] !== addr ? { kind: 'wallet', addr: keys[0] } : null;
}
const funderLabel = f => !f ? 'Unknown' : f.label ? f.label : shortMint(f.addr);
