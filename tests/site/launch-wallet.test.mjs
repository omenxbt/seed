/* The adapter's live path, as the Launch form meets it: a draft being opened goes to the chain for a real wallet and to the
   demo adapter for the demo wallet, whichever wallet the draft was written under; an existing demo raise is still refused
   to a real wallet. js/adapters/program.js is loaded as the page loads it (a classic script with globals), with the page's
   adapter, state and SEED stood in for. Run: node --test tests/site/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const DEMO_MSG = 'This is a demo raise. A real wallet acts on live raises; switch to the demo wallet to try this one.';

function page() {
  const calls = [];
  const sim = name => (...a) => { calls.push([name, 'demo', a[0]]); return Promise.resolve('demo'); };
  const state = { wallet: null, presales: [] };
  const sandbox = {
    SEED: { programId: 'Seed111111111111111111111111111111111111111', rpc: 'https://devnet.example' },
    adapter: { openPresale: sim('openPresale'), contribute: sim('contribute'), claimRefund: sim('claimRefund'), claimTokens: sim('claimTokens'), cancelRaise: sim('cancelRaise'), seedStep: sim('seedStep'), claimFees: sim('claimFees'), claimVested: sim('claimVested'), requestPayoutChange: sim('requestPayoutChange'), linkX: sim('linkX'), report: sim('report'), swap: sim('swap'), deposit: sim('deposit'), withdraw: sim('withdraw') },
    state, isReal: () => !!(state.wallet && state.wallet.pk), supa: { call: () => Promise.resolve() },
    console, TextEncoder, TextDecoder, fetch: () => Promise.reject(new Error('no network in the test')), document: { getElementById: () => null, querySelector: () => null }, window: {}
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../../js/adapters/program.js', import.meta.url), 'utf8'), sandbox, { filename: 'program.js' });
  /* the chain's own methods are stood in for: the test is about which path a call takes, not the transaction */
  for (const k of ['openRaise', 'contribute', 'claimRefund', 'claimTokens', 'cancelRaise', 'seedStep', 'claimFees', 'claimVested', 'requestPayoutChange', 'linkX', 'adminFlag', 'adminTakeover']) sandbox.chain[k] = (...a) => { calls.push([k, 'chain', a[0]]); return Promise.resolve('chain'); };
  return { calls, state, adapter: sandbox.adapter, connectDemo: () => { state.wallet = { kind: 'demo', name: 'Demo wallet' }; }, connectReal: () => { state.wallet = { kind: 'phantom', name: 'Phantom', pk: '5ccXmJ3b7jHaa5aYnu6bX4WuX6W7j2Q4XfFsmp9ZM9jz' }; } };
}

/* what the Launch form hands the adapter at submit (js/launch.js openPresale): an id, status 'live', no chain address yet */
const draft = live => ({ id: 'seed-' + Date.now().toString(36), name: 'Seed', ticker: 'SEED', q: 'SOL', target: 1, status: 'live', live, creator: 'x' });
/* a raise from the demo book: never on chain */
const demoRaise = () => ({ id: 'moon-abc', name: 'Moon', status: 'live', live: false, raised: 2, target: 10 });

test('the demo wallet opens its draft in the demo adapter', async () => {
  const w = page(); w.connectDemo();
  assert.equal(await w.adapter.openPresale(draft(false)), 'demo');
  assert.deepEqual(w.calls.map(c => c.slice(0, 2)), [['openPresale', 'demo']]);
});

test('a real wallet opens its draft on the chain, not as a demo raise', async () => {
  const w = page(); w.connectReal();
  assert.equal(await w.adapter.openPresale(draft(true)), 'chain');
  assert.deepEqual(w.calls.map(c => c.slice(0, 2)), [['openRaise', 'chain']]);
});

test('a draft written under the demo wallet opens on the chain once a real wallet is connected (the bug)', async () => {
  const w = page(); w.connectDemo();
  const d = draft(false);   // the form's preview draft while the demo wallet was connected: live false, as a demo raise
  w.connectReal();          // the founder switches to Phantom before Open raise
  assert.equal(await w.adapter.openPresale(d), 'chain');   // before the fix this threw DEMO_MSG and the form blocked Open raise
  assert.deepEqual(w.calls.map(c => c.slice(0, 2)), [['openRaise', 'chain']], 'the wallet decides, not the draft');
});

test('a real wallet switching back to the demo wallet opens the draft in the demo adapter', async () => {
  const w = page(); w.connectReal(); const d = draft(true); w.connectDemo();
  assert.equal(await w.adapter.openPresale(d), 'demo');
});

test('a real wallet is still refused on an existing demo raise, and a demo raise still seeds itself', async () => {
  const w = page(); w.connectReal();
  assert.throws(() => w.adapter.contribute(demoRaise(), 1), { message: DEMO_MSG });   // the refusal is thrown before any promise, as the page's try/catch expects
  assert.throws(() => w.adapter.claimTokens(demoRaise()), { message: DEMO_MSG });
  assert.equal(await w.adapter.seedStep(demoRaise(), 'mint'), 'demo');
  assert.equal(await w.adapter.contribute({ id: 'live-1', address: 'R41se', status: 'live', live: true }, 1), 'chain');
});
