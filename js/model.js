/* ==========================================================================
   THE RAISE MODEL. One place for the arithmetic the Launch preview, the raise page, the Portfolio, the Terminal and the
   docs all show, so they can never disagree:
     supply split   team share set by the founder; backers and the pool each get half of the rest
     price          derived: target / backer tokens, in the pair asset
     fee            1% on top of each buy, refunded with it if the raise does not seed
     unlocks        the team's tokens all at seeding, evenly every N days for a count of unlocks after an optional cliff, or on custom dates
     creator fees   the pool's 1.25% fee (1% after Meteora's share), split 70/30 between the payout wallet and Seed
   Amounts are in the pair asset (q) unless named Usd. Shares are basis points (bps), 10000 = 100%.
   ========================================================================== */
const BPS = 10000;
const solUsd = p => (p && p.solUsdAtOpen) || SEED.demoSolUsd;
const dayOf = p => (p && p.dayMs) || D;                                  // one unlock "day" in ms: a minute for a devnet raise opened in test mode
const usdOf = (p, q) => p.q === 'USDC' ? q : q * solUsd(p);           // a pair-asset amount in USD at the raise's own SOL price
const qOf = (p, usd) => p.q === 'USDC' ? usd : usd / solUsd(p);
const solUsdNow = p => SEED.solUsdLive || solUsd(p);                    // the SOL price today: the Pyth feed (chain.refreshSolUsd), else the raise's at open
const usdNow = (p, q) => p.q === 'USDC' ? q : p.q === 'SOL' ? q * solUsdNow(p) : q * solUsd(p);   // a pair-asset amount in USD today: SOL at the live price; another pair at its price when the raise opened (no live feed on the page yet)
/* the opening market cap presets, in dollars: the founder picks one and the raise is derived from it. The program's Config
   carries the same four (preset_caps_cents) and, on devnet in test mode, a tiny Test preset; the site reads those once the
   config is in, so the list here only stands in until then */
const PRESET_CAPS = SEED.presetCapsUsd || [50000, 100000, 150000, 200000];
const presetCaps = () => { const c = typeof chain !== 'undefined' && chain.cfg; return c && c.presetCapsCents ? c.presetCapsCents.map(x => Number(x.toString()) / 100) : PRESET_CAPS; };
const testCapUsd = () => { const c = typeof chain !== 'undefined' && chain.cfg; return c && c.testCapCents && Number(c.testCapCents.toString()) ? Number(c.testCapCents.toString()) / 100 : 0; };   // 0 off devnet
const capUsdOf = cap => cap === 'test' ? testCapUsd() : presetCaps().includes(cap) ? cap : 0;                                   // a draft's cap choice as dollars; 0 when not on the list
const presetIndex = cap => cap === 'test' ? (testCapUsd() ? 4 : -1) : presetCaps().indexOf(cap);                               // what open_raise takes
/* the raise, derived from the opening market cap: cap × (1 − team share) ÷ 2, in the pair asset at today's SOL price (the
   program does the same at the Pyth price the moment the raise opens, so a draft's figure can drift a little by then) */
const targetUsdForCap = (capUsd, teamBps) => capUsd * (BPS - teamBps) / BPS / 2;
/* the SOL price today, live only: the Pyth read, or nothing. On a chain-connected site the demo figure never stands in for it
   (QA P1-F17); the demo site, with no chain, keeps its fixed price */
const liveSolUsd = () => SEED.solUsdLive || (typeof chain !== 'undefined' && chain.on() ? 0 : SEED.demoSolUsd);
/* a pair asset's dollar price on the page: SOL live from Pyth, USDC and a stable pair a dollar, a pair priced by its own feed
   unknown here (0): the program prices it at the Pyth read the moment the raise opens */
const pairPriceUsd = q => q === 'SOL' ? liveSolUsd() : q === 'USDC' ? 1 : (typeof chain !== 'undefined' && chain.registry && chain.registry[q] && chain.registry[q].stable) ? 1 : 0;
const pairDecimals = q => q === 'SOL' ? 9 : q === 'USDC' ? 6 : (typeof chain !== 'undefined' && chain.registry && chain.registry[q] && chain.registry[q].decimals) || 6;
const targetForCap = (capUsd, teamBps, q) => { const usd = targetUsdForCap(capUsd, teamBps), px = pairPriceUsd(q), dp = Math.min(pairDecimals(q), 9); return px > 0 ? Math.floor(usd / px * 10 ** dp) / 10 ** dp : NaN; };
const capOf = p => p.capUsd || fdvUsdOf(p);   // the market cap a raise opened at: the preset for a live raise; the FDV at the raise price otherwise (demo data)

/* the supply: team share, then backers and the pool get equal halves of the rest */
function splitOf(teamBps) {
  const team = Math.round(SEED.supply * teamBps / BPS), half = Math.floor((SEED.supply - team) / 2);
  return { team, backers: half, pool: half, supply: SEED.supply };
}
const priceOf = p => p.target / splitOf(p.teamBps).backers;             // q per token, fixed when the raise opens
const fdvOf = p => priceOf(p) * SEED.supply;                             // in q
const fdvUsdOf = p => usdOf(p, fdvOf(p));
/* the tokens a buy of `amount` of the pair asset earns, rounded as the program rounds them: floor(units in × the backers' units ÷
   the target's units), in whole tokens — so the panel's "Tokens owed" is the claim's figure to the unit (QA P2-103) */
const tokensFor = (p, amount) => {
  const dp = typeof pairDecimals === 'function' ? pairDecimals(p.q) : 9, u = x => BigInt(Math.round(x * 10 ** dp)), t = u(p.target); if (!(t > 0n)) return 0;
  return Number(u(Math.min(amount, p.target)) * BigInt(Math.round(splitOf(p.teamBps).backers * 1e6)) / t) / 1e6;
};
const feeOf = amount => r6(amount * SEED.feeBps / BPS);                  // on top of the buy
const paidFor = amount => r6(amount + feeOf(amount));                    // what leaves the wallet
const amountFor = paid => r6(paid / (1 + SEED.feeBps / BPS));            // the buy inside a payment
const leftOf = p => r6(Math.max(0, p.target - p.raised));                // room left in the raise
const payLeft = p => paidFor(leftOf(p));                                 // what fills it, fee included
const pctOf = p => Math.min(100, p.raised / p.target * 100);

/* ---------------------------------------------------------------- team unlocks */
/* a schedule is { cliffDays, intervalDays, count } (even: unlock k at cliff + k × interval, floor(10000 / count) bps each and the
   remainder with the last, as the program computes it) or { tranches: [{ dayOffset, bps }] } (custom dates; "at seeding" is the
   one tranche [{ 0, 10000 }]). Both resolve to tranches for display. */
const isEven = s => !!(s && s.count);
const MAX_EVEN = 1000;   // the form's cap on unlocks in an even schedule (daily for nearly three years); the program takes up to 65535
function tranchesOf(s) {
  if (!s) return [];
  if (s.tranches) return s.tranches.slice().sort((a, b) => a.dayOffset - b.dayOffset);
  if (!isEven(s)) return [];
  const n = Math.min(Math.max(1, Math.round(s.count)), MAX_EVEN), out = [];   // unlock k releases floor(k × 10000 / n) − floor((k − 1) × 10000 / n): even to the basis point, 100% at the last
  for (let k = 1; k <= n; k++) out.push({ dayOffset: (s.cliffDays || 0) + k * Math.max(1, s.intervalDays || 1), bps: Math.floor(k * BPS / n) - Math.floor((k - 1) * BPS / n) });
  return out;
}
const lastUnlockDay = s => { const t = tranchesOf(s); return t.length ? t[t.length - 1].dayOffset : 0; };
const atSeeding = s => !!(s && s.tranches && s.tranches.length === 1 && s.tranches[0].dayOffset === 0 && s.tranches[0].bps === BPS);
/* what the schedule has released by `now`, given the seeding time; tokens, bps, the next tranche and the one after */
function unlockState(p, now = Date.now()) {
  const team = splitOf(p.teamBps).team, t = tranchesOf(p.teamSchedule), at = p.seededAt;
  if (!team || !t.length) return { team, unlockedBps: 0, unlocked: 0, claimable: 0, next: null, done: !team };
  const days = at ? (now - at) / dayOf(p) : -Infinity, doneT = t.filter(x => x.dayOffset <= days), unlockedBps = doneT.reduce((a, x) => a + x.bps, 0);
  const next = t.find(x => x.dayOffset > days) || null;
  return { team, unlockedBps, unlocked: Math.floor(team * unlockedBps / BPS), next: next && { at: (at || now) + next.dayOffset * dayOf(p), tokens: Math.floor(team * next.bps / BPS), bps: next.bps, dayOffset: next.dayOffset }, done: !next };
}
/* the rules a schedule must meet before a raise opens: the program's (math.rs check_schedule), said plainly */
function scheduleProblem(s, teamBps) {
  if (!teamBps) return '';
  if (!(teamBps < BPS)) return 'The team share must be under 100%.';
  if (isEven(s)) return !(s.count >= 1 && s.intervalDays >= 1) ? 'Set how many unlocks, at least one.' : s.count > MAX_EVEN ? `At most ${MAX_EVEN.toLocaleString('en-US')} unlocks.` : '';
  const t = s && s.tranches ? s.tranches : [];
  if (!t.length) return 'Set when the team tokens unlock.';
  if (t.length > 24) return 'At most 24 custom dates. For more unlocks, use an even schedule.';
  if (t.some(x => !(x.bps > 0) || !(x.dayOffset >= 0))) return 'Every unlock needs a share above zero and a day at or after seeding.';
  const sorted = t.slice().sort((a, b) => a.dayOffset - b.dayOffset); if (sorted.some((x, i) => i && x.dayOffset === sorted[i - 1].dayOffset)) return 'Two unlocks fall on the same day. Give each its own day.';
  const sum = t.reduce((a, x) => a + x.bps, 0); if (Math.abs(sum - BPS) > 0) return `The unlocks add up to ${(sum / 100).toFixed(2)}% of the team share. They must add up to exactly 100%.`;
  return '';
}
/* the schedule as one plain sentence, the same on the Launch form, the preview and the raise page */
const unitName = d => d === 1 ? 'day' : d === 7 ? 'week' : d === 30 ? 'month' : `${d} days`;
const cliffText = d => !d ? '' : d % 30 === 0 ? `${d / 30}-month` : d % 7 === 0 ? `${d / 7}-week` : `${d}-day`;
function fmtSchedule(s) {
  if (!s) return 'No team tokens';
  if (atSeeding(s)) return 'All at seeding';
  if (isEven(s)) { const u = unitName(s.intervalDays), many = s.intervalDays === 1 || s.intervalDays === 7 || s.intervalDays === 30 ? `${s.count} ${u}${s.count === 1 ? '' : 's'}` : `${s.count} unlocks ${s.intervalDays} days apart`; return `Unlocks evenly every ${u} for ${many}${s.cliffDays ? `, after a ${cliffText(s.cliffDays)} cliff` : ''}`; }
  const t = tranchesOf(s), shown = t.slice(0, 4).map(x => `day ${x.dayOffset} (${(x.bps / 100).toFixed(x.bps % 100 ? 2 : 0)}%)`).join(', ');
  return `Custom dates: ${shown}${t.length > 4 ? ` and ${t.length - 4} more, last at day ${lastUnlockDay(s)}` : ''}`;
}
/* the slice each unlock releases, as a share of the supply: "1.25% every month" */
function perUnlockText(s, teamBps) {
  if (!s || !teamBps || atSeeding(s)) return '';
  const t = tranchesOf(s); if (!t.length) return '';
  const pct = n => { const v = teamBps / 100 * n / BPS; return `${v >= 1 ? +v.toFixed(2) : +v.toPrecision(2)}%`; };
  if (isEven(s)) return `${pct(BPS / s.count)} of the supply every ${unitName(s.intervalDays)}`;   // the average slice; each is within a basis point of it
  return `${pct(t[0].bps)} of the supply at the first unlock`;
}

/* ---------------------------------------------------------------- creator fees */
/* the pool's fee on a volume, and how it splits */
function feeSplit(volume, creatorShareBps = SEED.creatorShareBps) {
  const fee = volume * SEED.poolFeeBps / BPS * (1 - (SEED.dammProtocolPct || 0) / 100);   // what the locked position earns: the pool fee less Meteora's protocol share
  return { fee, founder: fee * creatorShareBps / BPS, seed: fee * (BPS - creatorShareBps) / BPS };
}
/* what a raise's pool has earned so far: the demo keeps running totals on p.fees; live reads the position */
function feesOf(p) {
  const f = p.fees || { volume: 0, founderClaimed: 0, seedClaimed: 0 };
  const live = p.live && typeof chain !== 'undefined' && chain.feesLive && chain.feesLive[p.id];
  if (live) {   // a pool on chain: the position's own figures, pending and claimed, in the pair asset
    const share = (p.creatorShareBps || SEED.creatorShareBps) / BPS, earned = live.pending + live.claimed, fo = live.pending * share;
    return { volume: f.volume, earned, founder: earned * share, seed: earned * (1 - share), founderClaimed: f.founderClaimed || 0, seedClaimed: f.seedClaimed || 0, founderUnclaimed: fo, seedUnclaimed: live.pending - fo, live: true };
  }
  if (p.live) return { volume: f.volume, earned: 0, founder: 0, seed: 0, founderClaimed: f.founderClaimed || 0, seedClaimed: f.seedClaimed || 0, founderUnclaimed: 0, seedUnclaimed: 0, reading: p.status === 'seeded' && !!p.position };   // until the position is read, nothing is claimable; a raise with no pool has nothing to read
  const s = feeSplit(f.volume, p.creatorShareBps);
  return { volume: f.volume, earned: s.fee, founder: s.founder, seed: s.seed, founderClaimed: f.founderClaimed || 0, seedClaimed: f.seedClaimed || 0, founderUnclaimed: Math.max(0, s.founder - (f.founderClaimed || 0)), seedUnclaimed: Math.max(0, s.seed - (f.seedClaimed || 0)) };
}

/* ---------------------------------------------------------------- raise states */
const RAISE_STATE = { live: 'Live', filled: 'Filled, seeding', seeded: 'Seeded', refunded: 'Refunded' };
const refundReason = p => ({ missed: 'missed its target', cancelled: 'was cancelled by the founder', timeout: 'stalled in seeding for three days' })[p.refundReason] || 'did not seed';
/* when a filled raise refunds if seeding stalls: the timeout counts from the last step, the fill and then the mint, as the program
   counts it (QA P0-F19), so a raise the pool holds only ever seeds (Infinity). A live raise minted before the chain was read waits for
   that read; a progress time outside [fill, now] is an older layout's leftover, and the fill counts */
const seedDeadline = p => {
  if (p.seedStep === 'pooled' || p.seedStep === 'seeded') return Infinity;
  const f = p.filledAt || 0, pr = p.progressAt;
  if (p.live && p.seedStep === 'minted' && pr == null) return Infinity;
  return (pr >= f && pr <= Date.now() ? pr : f) + SEED.seedTimeoutDays * dayOf(p);
};
/* a live raise past its seeding window is still filled on chain until someone settles it: a backer's refund claim does (it carries
   timeout_refund), and until then a late crank can still seed it, so the page offers the refund without calling it refunded (QA P2-114) */
const seedStalled = p => !!p.live && p.status === 'filled' && Date.now() >= seedDeadline(p);
const SEED_STEPS = ['filled', 'minted', 'pooled', 'seeded'];
/* the pending payout wallet change, if any, and whether it is due */
const payoutChange = p => p.pendingPayoutWallet ? { to: p.pendingPayoutWallet, at: p.payoutEffectiveAt, due: Date.now() >= p.payoutEffectiveAt } : null;
