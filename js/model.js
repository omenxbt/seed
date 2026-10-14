/* ==========================================================================
   THE RAISE MODEL. One place for the arithmetic the Launch preview, the raise page, the Portfolio, the Terminal and the
   docs all show, so they can never disagree:
     supply split   team share set by the founder; backers and the pool each get half of the rest
     price          derived: target / backer tokens, in the pair asset
     fee            1% on top of each buy, refunded with it if the raise does not seed
     unlocks        the team's tokens by schedule: a cliff then a slice every N days, or custom dated tranches
     creator fees   the pool's 1% fee, split 70/30 between the payout wallet and Seed
   Amounts are in the pair asset (q) unless named Usd. Shares are basis points (bps), 10000 = 100%.
   ========================================================================== */
const BPS = 10000;
const solUsd = p => (p && p.solUsdAtOpen) || SEED.demoSolUsd;
const dayOf = p => (p && p.dayMs) || D;                                  // one unlock "day" in ms: a minute for a devnet raise opened in test mode
const usdOf = (p, q) => p.q === 'USDC' ? q : q * solUsd(p);           // a pair-asset amount in USD at the raise's own SOL price
const qOf = (p, usd) => p.q === 'USDC' ? usd : usd / solUsd(p);

/* the supply: team share, then backers and the pool get equal halves of the rest */
function splitOf(teamBps) {
  const team = Math.round(SEED.supply * teamBps / BPS), half = Math.floor((SEED.supply - team) / 2);
  return { team, backers: half, pool: half, supply: SEED.supply };
}
const priceOf = p => p.target / splitOf(p.teamBps).backers;             // q per token, fixed when the raise opens
const fdvOf = p => priceOf(p) * SEED.supply;                             // in q
const fdvUsdOf = p => usdOf(p, fdvOf(p));
const tokensFor = (p, amount) => Math.min(amount, p.target) / p.target * splitOf(p.teamBps).backers;   // for a buy of `amount` q
const feeOf = amount => r6(amount * SEED.feeBps / BPS);                  // on top of the buy
const paidFor = amount => r6(amount + feeOf(amount));                    // what leaves the wallet
const amountFor = paid => r6(paid / (1 + SEED.feeBps / BPS));            // the buy inside a payment
const leftOf = p => r6(Math.max(0, p.target - p.raised));                // room left in the raise
const payLeft = p => paidFor(leftOf(p));                                 // what fills it, fee included
const pctOf = p => Math.min(100, p.raised / p.target * 100);

/* ---------------------------------------------------------------- team unlocks */
/* a schedule is either { cliffDays, intervalDays, bpsPerInterval } or { tranches: [{ dayOffset, bps }] }; both resolve to tranches */
function tranchesOf(s) {
  if (!s) return [];
  if (s.tranches) return s.tranches.slice().sort((a, b) => a.dayOffset - b.dayOffset);
  const out = []; let done = 0, day = s.cliffDays || 0, n = 0;
  while (done < BPS && n++ < 400) { const bps = Math.min(s.bpsPerInterval, BPS - done); day += n === 1 ? 0 : s.intervalDays; out.push({ dayOffset: day, bps }); done += bps; }
  return out;
}
const lastUnlockDay = s => { const t = tranchesOf(s); return t.length ? t[t.length - 1].dayOffset : 0; };
/* what the schedule has released by `now`, given the seeding time; tokens, bps, the next tranche and the one after */
function unlockState(p, now = Date.now()) {
  const team = splitOf(p.teamBps).team, t = tranchesOf(p.teamSchedule), at = p.seededAt;
  if (!team || !t.length) return { team, unlockedBps: 0, unlocked: 0, claimable: 0, next: null, done: !team };
  const days = at ? (now - at) / dayOf(p) : -Infinity, doneT = t.filter(x => x.dayOffset <= days), unlockedBps = doneT.reduce((a, x) => a + x.bps, 0);
  const next = t.find(x => x.dayOffset > days) || null;
  return { team, unlockedBps, unlocked: Math.floor(team * unlockedBps / BPS), next: next && { at: (at || now) + next.dayOffset * dayOf(p), tokens: Math.floor(team * next.bps / BPS), bps: next.bps }, done: !next };
}
/* the rules a schedule must meet before a raise opens */
function scheduleProblem(s, teamBps) {
  if (!teamBps) return '';
  const t = tranchesOf(s);
  if (!t.length) return 'Set when the team tokens unlock.';
  if (t.some(x => !(x.bps > 0) || !(x.dayOffset >= 0))) return 'Every unlock needs a share above zero and a day at or after seeding.';
  const sum = t.reduce((a, x) => a + x.bps, 0); if (Math.abs(sum - BPS) > 0) return `The unlocks add up to ${(sum / 100).toFixed(2)}%. They must add up to exactly 100%.`;
  if (lastUnlockDay(s) < SEED.minUnlockDays) return `The last unlock is ${lastUnlockDay(s)} days after seeding. It must be at least ${SEED.minUnlockDays}.`;
  return '';
}
const fmtSchedule = s => { if (!s) return 'No team tokens'; if (s.tranches) return `${s.tranches.length} dated tranche${s.tranches.length > 1 ? 's' : ''}, last at day ${lastUnlockDay(s)}`; return `${s.cliffDays ? `${s.cliffDays}-day cliff, then ` : ''}${(s.bpsPerInterval / 100).toFixed(s.bpsPerInterval % 100 ? 2 : 0)}% every ${s.intervalDays} days, done at day ${lastUnlockDay(s)}`; };

/* ---------------------------------------------------------------- creator fees */
/* the pool's fee on a volume, and how it splits */
function feeSplit(volume, creatorShareBps = SEED.creatorShareBps) {
  const fee = volume * SEED.poolFeeBps / BPS;
  return { fee, founder: fee * creatorShareBps / BPS, seed: fee * (BPS - creatorShareBps) / BPS };
}
/* what a raise's pool has earned so far: the demo keeps running totals on p.fees; live reads the position */
function feesOf(p) {
  const f = p.fees || { volume: 0, founderClaimed: 0, seedClaimed: 0 }, s = feeSplit(f.volume, p.creatorShareBps);
  return { volume: f.volume, earned: s.fee, founder: s.founder, seed: s.seed, founderClaimed: f.founderClaimed || 0, seedClaimed: f.seedClaimed || 0, founderUnclaimed: Math.max(0, s.founder - (f.founderClaimed || 0)), seedUnclaimed: Math.max(0, s.seed - (f.seedClaimed || 0)) };
}

/* ---------------------------------------------------------------- raise states */
const RAISE_STATE = { live: 'Live', filled: 'Filled, seeding', seeded: 'Seeded', refunded: 'Refunded' };
const refundReason = p => ({ missed: 'missed its target', cancelled: 'was cancelled by the founder', timeout: 'did not seed within three days of filling' })[p.refundReason] || 'did not seed';
const seedDeadline = p => (p.filledAt || 0) + SEED.seedTimeoutDays * dayOf(p);   // when a filled raise refunds if it has not seeded
const SEED_STEPS = ['filled', 'minted', 'pooled', 'seeded'];
/* the pending payout wallet change, if any, and whether it is due */
const payoutChange = p => p.pendingPayoutWallet ? { to: p.pendingPayoutWallet, at: p.payoutEffectiveAt, due: Date.now() >= p.payoutEffectiveAt } : null;
