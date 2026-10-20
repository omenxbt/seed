/* The team unlock schedule as the site models it (js/model.js): the even schedule the form's "Over time" sentence makes, custom
   dates, "at seeding", the plain sentence everything shows, the per-unlock slice, and the two rules the program keeps (the
   slices sum to exactly 100% of the team share; the dates increase). Run: node --test tests/site/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sandbox = { SEED: { supply: 1e9, feeBps: 100, poolFeeBps: 125, dammProtocolPct: 20, creatorShareBps: 7000, demoSolUsd: 148.2, minTargetSol: 81, testMinTargetSol: 0.1, capUsd: 100000 }, D: 86400000, r6: x => Math.round(x * 1e6) / 1e6, console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../../js/model.js', import.meta.url), 'utf8'), sandbox, { filename: 'model.js' });
const { tranchesOf, scheduleProblem, fmtSchedule, perUnlockText, unlockState } = sandbox, lastUnlockDay = vm.runInContext('lastUnlockDay', sandbox);   // consts are not sandbox properties
const even = (cliffDays, intervalDays, count) => ({ cliffDays, intervalDays, count });
const sum = t => t.reduce((a, x) => a + x.bps, 0);

test('0% team: no schedule, no problem, no tokens', () => {
  assert.equal(scheduleProblem(null, 0), '');
  assert.equal(fmtSchedule(null), 'No team tokens');
  assert.deepEqual(unlockState({ teamBps: 0, teamSchedule: null, seededAt: Date.now() }).unlocked, 0);
});
test('99% team, all at seeding', () => {
  const s = { tranches: [{ dayOffset: 0, bps: 10000 }] };
  assert.equal(scheduleProblem(s, 9900), '');
  assert.equal(fmtSchedule(s), 'All at seeding');
  assert.equal(perUnlockText(s, 9900), '');
  const u = unlockState({ teamBps: 9900, teamSchedule: s, seededAt: Date.now() - 1000 });
  assert.equal(u.unlocked, 990_000_000); assert.equal(u.next, null);
});
test('100% is not a team share', () => assert.match(scheduleProblem({ tranches: [{ dayOffset: 0, bps: 10000 }] }, 10000), /under 100%/));
test('daily, weekly and monthly, with and without a cliff: the program\'s even schedule, summing to exactly 100%', () => {
  for (const [s, first, last, n] of [[even(0, 1, 90), 1, 90, 90], [even(0, 7, 8), 7, 56, 8], [even(0, 30, 12), 30, 360, 12], [even(90, 1, 30), 91, 120, 30], [even(90, 7, 52), 97, 454, 52], [even(90, 30, 12), 120, 450, 12]]) {
    const t = tranchesOf(s);
    assert.equal(t.length, n); assert.equal(t[0].dayOffset, first); assert.equal(t[n - 1].dayOffset, last); assert.equal(sum(t), 10000);
    assert.equal(t[0].bps, Math.floor(10000 / n), 'each slice is floor(10000 / count)'); assert.equal(scheduleProblem(s, 1500), '');
  }
  assert.equal(fmtSchedule(even(0, 30, 12)), 'Unlocks evenly every month for 12 months');
  assert.equal(fmtSchedule(even(90, 30, 12)), 'Unlocks evenly every month for 12 months, after a 3-month cliff');
  assert.equal(fmtSchedule(even(0, 7, 8)), 'Unlocks evenly every week for 8 weeks');
  assert.equal(fmtSchedule(even(14, 1, 30)), 'Unlocks evenly every day for 30 days, after a 2-week cliff');
  assert.equal(perUnlockText(even(0, 30, 12), 1500), '1.25% of the supply every month');
  assert.equal(perUnlockText(even(0, 7, 8), 1000), '1.25% of the supply every week');   // 10% over 8 weeks
  assert.equal(perUnlockText(even(0, 7, 8), 100), '0.13% of the supply every week');    // 1% over 8 weeks
});
test('the next unlock follows the chain clock and the raise\'s own day', () => {
  const day = 60e3, at = Date.now() - 95 * day;   // a devnet raise in test mode, seeded 95 "days" ago
  const u = unlockState({ teamBps: 1500, teamSchedule: even(90, 30, 12), seededAt: at, dayMs: day });
  assert.equal(u.unlockedBps, 0, 'the first slice is a month after the cliff'); assert.equal(u.next.dayOffset, 120); assert.equal(u.next.at, at + 120 * day);
  const u2 = unlockState({ teamBps: 1500, teamSchedule: even(90, 30, 12), seededAt: Date.now() - 125 * day, dayMs: day });
  assert.equal(u2.unlockedBps, 833); assert.equal(u2.next.dayOffset, 150);
});
test('custom dates: in order and summing to 100%, or refused', () => {
  assert.equal(scheduleProblem({ tranches: [{ dayOffset: 30, bps: 5000 }, { dayOffset: 60, bps: 5000 }] }, 1000), '');
  assert.match(scheduleProblem({ tranches: [{ dayOffset: 30, bps: 6000 }, { dayOffset: 60, bps: 6000 }] }, 1000), /120\.00%.*exactly 100%/);
  assert.match(scheduleProblem({ tranches: [{ dayOffset: 30, bps: 5000 }, { dayOffset: 30, bps: 5000 }] }, 1000), /same day/);
  assert.match(scheduleProblem({ tranches: [{ dayOffset: 30, bps: 0 }, { dayOffset: 60, bps: 10000 }] }, 1000), /share above zero/);
  assert.match(scheduleProblem({ tranches: [] }, 1000), /Set when/);
  assert.equal(fmtSchedule({ tranches: [{ dayOffset: 60, bps: 5000 }, { dayOffset: 30, bps: 5000 }] }), 'Custom dates: day 30 (50%), day 60 (50%)');
  assert.equal(lastUnlockDay({ tranches: [{ dayOffset: 1, bps: 10000 }] }), 1, 'no minimum length');
  assert.equal(scheduleProblem({ tranches: [{ dayOffset: 1, bps: 10000 }] }, 1000), '');
});
