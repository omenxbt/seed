/* The opening market cap presets as the site derives a raise from them (js/model.js), the same arithmetic as the program's
   math::derive_target: target = cap × (1 − team share) ÷ 2, in the pair asset at today's SOL price. Run: node --test tests/site/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sandbox = { SEED: { supply: 1e9, feeBps: 100, poolFeeBps: 125, dammProtocolPct: 20, creatorShareBps: 7000, demoSolUsd: 148.2, presetCapsUsd: [50000, 100000, 150000, 200000], testCapUsd: 30, solUsdLive: 150 }, D: 86400000, r6: x => Math.round(x * 1e6) / 1e6, console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../../js/model.js', import.meta.url), 'utf8'), sandbox, { filename: 'model.js' });
const g = n => vm.runInContext(n, sandbox);
const [targetForCap, targetUsdForCap, capUsdOf, presetIndex, presetCaps, testCapUsd] = ['targetForCap', 'targetUsdForCap', 'capUsdOf', 'presetIndex', 'presetCaps', 'testCapUsd'].map(g);

test('each preset at 0%, 15% and 50% team, at $100, $150 and $250: cap × (1 − team) ÷ 2, in SOL and USDC', () => {
  for (const cap of [50000, 100000, 150000, 200000]) for (const bps of [0, 1500, 5000]) for (const px of [100, 150, 250]) {
    sandbox.SEED.solUsdLive = px;
    const usd = cap * (10000 - bps) / 10000 / 2;
    assert.equal(targetUsdForCap(cap, bps), usd);
    assert.ok(Math.abs(targetForCap(cap, bps, 'SOL') - usd / px) < 1e-9, `${cap} at ${bps} bps, $${px}: ${usd / px} SOL`);
    assert.equal(targetForCap(cap, bps, 'USDC'), usd);
  }
  sandbox.SEED.solUsdLive = 150;
  assert.ok(Math.abs(targetForCap(100000, 1500, 'SOL') - 283.333333333) < 1e-9, "Josh's example: $100K, 15% team, $150 → 283.33 SOL ($42,500)");
});
test('the list is the floor and the ceiling: only a preset on it has a cap and an index', () => {
  assert.deepEqual(presetCaps(), [50000, 100000, 150000, 200000]);
  assert.equal(capUsdOf(100000), 100000); assert.equal(presetIndex(100000), 1);
  assert.equal(capUsdOf(75000), 0); assert.equal(presetIndex(75000), -1);
  assert.equal(capUsdOf(300000), 0); assert.equal(presetIndex(300000), -1);
});
test('the Test preset exists only when the config carries one (devnet test mode); without a config the site offers none', () => {
  assert.equal(testCapUsd(), 0, 'no chain config in the test: no test preset');
  assert.equal(capUsdOf('test'), 0); assert.equal(presetIndex('test'), -1);
  sandbox.chain = { cfg: { presetCapsCents: [5000000, 10000000, 15000000, 20000000].map(n => ({ toString: () => String(n) })), testCapCents: { toString: () => '3000' } } };
  assert.equal(testCapUsd(), 30); assert.equal(capUsdOf('test'), 30); assert.equal(presetIndex('test'), 4);
  sandbox.SEED.solUsdLive = 105; assert.ok(Math.abs(targetForCap(30, 1500, 'SOL') - 0.121428571) < 1e-9, '$30, 15% team, $105: 0.1214 SOL, as the program derives it');
  delete sandbox.chain;
});
