/* Reads every figure the film shows from the code, never from memory: the program's constants (state.rs), the production
   Config the deploy check expects (scripts/check-deploy.ts), the devnet initConfig (tests/seed.ts), the site's copy of the terms (js/config/seed.js) and LOOP.md's text.
   Writes src/figures.json, which tools/build.mjs turns into the composition variables' defaults. Exits 1 when two sources
   disagree on a figure, so a change in the program cannot slip past the film. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const read = p => fs.readFileSync(path.join(repo, p), 'utf8');
const num = s => Number(String(s).replace(/_/g, ''));

const state = read('program/programs/seed/src/state.rs');
const init = read('program/tests/seed.ts');
const lib = read('program/programs/seed/src/lib.rs');
const site = read('js/config/seed.js');
const loop = read('LOOP.md');
const page = read('js/presale-page.js');

const rs = name => { const m = state.match(new RegExp(`pub const ${name}: \\w+ = ([\\d_]+)`)); if (!m) throw new Error(`state.rs: no ${name}`); return num(m[1]); };
/* the production Config the deploy check holds a mainnet deployment to (program/scripts/check-deploy.ts), when the code
   carries one: the minimum target moved from a state.rs constant into the Config, set once at init_config */
const deployPath = path.join(repo, 'program/scripts/check-deploy.ts');
const prod = fs.existsSync(deployPath) ? (fs.readFileSync(deployPath, 'utf8').match(/production: \{([^}]*)\}/) || [])[1] || '' : '';
const pd = name => { const m = prod.match(new RegExp(`${name}: ([\\d_]+|true|false)`)); return m ? (m[1] === 'true' ? true : m[1] === 'false' ? false : num(m[1])) : null; };
const minLamports = /pub const MIN_TARGET_LAMPORTS/.test(state) ? rs('MIN_TARGET_LAMPORTS') : pd('minTargetLamports');
if (minLamports == null) throw new Error('no minimum target: neither MIN_TARGET_LAMPORTS in state.rs nor a production minTargetLamports in check-deploy.ts');
const both = (name, v) => { const p = pd(name); if (p != null && p !== v) problems.push(`${name}: devnet initConfig ${v}, production profile ${p}`); return p != null ? p : v; };
const problems = [];
const ini = name => { const m = init.match(new RegExp(`${name}: (?:new BN\\()?([\\d_ *]+)`)); if (!m) throw new Error(`tests/seed.ts: no ${name}`); return m[1].split('*').map(num).reduce((a, b) => a * b, 1); };
const js = name => { const m = site.match(new RegExp(`${name}: ([\\d.e* ]+)`)); if (!m) throw new Error(`seed.js: no ${name}`); return m[1].split('*').map(Number).reduce((a, b) => a * b, 1); };

const program = {
  supply: rs('SUPPLY'),
  minTargetSol: minLamports / 1e9,
  feeBps: both('feeBps', ini('feeBps')),
  creatorShareBps: both('creatorShareBps', ini('creatorShareBps')),
  poolFeeBps: both('poolFeeBps', ini('poolFeeBps')),
  capUsd: both('capUsdCents', ini('capUsdCents')) / 100,
  minDeadlineH: ini('minDeadline') / 3600,
  maxDeadlineH: ini('maxDeadline') / 3600,
  seedTimeoutDays: ini('seedTimeout') / 86400,
  /* the Config still carries min_unlock_days (90) for its layout, but since 2026-10-20 nothing reads it: no instruction
     checks a team unlock's length (math::check_schedule checks only the sum and the order), and the production profile
     no longer names it */
  unlockMinChecked: /min_unlock_days/.test(lib.replace(/c\.min_unlock_days = p\.min_unlock_days;/, '').replace(/pub min_unlock_days: u32,/, '')) || pd('minUnlockDays') != null,
  seedSteps: (state.match(/pub enum SeedStep \{([^}]*)\}/)[1].split(',').map(s => s.trim()).filter(Boolean)),
  refundIsAmountPlusFee: /let back = c\.amount \+ c\.fee;/.test(lib)
};
const siteTerms = {
  supply: js('supply'), minTargetSol: js('minTargetSol'), feeBps: js('feeBps'), creatorShareBps: js('creatorShareBps'),
  poolFeeBps: js('poolFeeBps'), capUsd: js('capUsd'), minDeadlineH: js('minDeadlineH'), maxDeadlineH: js('maxDeadlineH'),
  seedTimeoutDays: js('seedTimeoutDays')
};
const stepNames = [...page.match(/names = \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);

/* LOOP.md says it in words; each figure must appear there as the program has it */
const loopSays = {
  fee: /Seed fee: 1% on top of each buy, refunded with the buy/.test(loop),
  cap: /max \$100,000/.test(loop),
  deadline: /deadline \(24h to 14d\)/.test(loop),
  supply: /Mint 1,000,000,000 tokens/.test(loop),
  poolFee: /Pool fee 1\.25%/.test(loop),
  split: /split 70% to the founder payout wallet and 30% to Seed/.test(loop),
  timeout: /3 days after the fill, everyone is refunded/.test(loop),
  unlock: /No minimum length, no maximum/.test(loop),
  refund: /full refund \(buy \+ fee\)/.test(loop),
  lockedForGood: /LP permanently locked/.test(loop)
};

for (const k of Object.keys(siteTerms)) if (siteTerms[k] !== program[k]) problems.push(`${k}: program ${program[k]}, js/config/seed.js ${siteTerms[k]}`);
for (const [k, ok] of Object.entries(loopSays)) if (!ok) problems.push(`LOOP.md no longer states the ${k} the way the film quotes it`);
if (program.seedSteps.length !== stepNames.length) problems.push(`seed steps: program ${program.seedSteps.length}, raise page ${stepNames.length}`);
if (!program.refundIsAmountPlusFee) problems.push('claim_refund no longer pays back amount + fee');
if (program.unlockMinChecked) problems.push('the program or the production profile checks a minimum unlock length again');

const usd = n => '$' + n.toLocaleString('en-US');
const pct = bps => (bps / 100).toString().replace(/\.0+$/, '') + '%';
const days = h => h % 24 ? `${h} hours` : h / 24 === 1 ? '24 hours' : `${h / 24} days`;
const figures = {
  fee: pct(program.feeBps),                                       // 1%
  feeLabel: 'on top',
  minTarget: `${program.minTargetSol} SOL`,                         // 81 SOL
  maxTarget: usd(program.capUsd),                                   // $100,000
  deadlineMin: days(program.minDeadlineH),                          // 24 hours
  deadlineMax: days(program.maxDeadlineH),                          // 14 days
  supply: program.supply.toLocaleString('en-US'),                   // 1,000,000,000
  poolFee: pct(program.poolFeeBps),                                 // 1.25%
  poolSplit: `${program.creatorShareBps / 100}/${100 - program.creatorShareBps / 100}`,   // 70/30
  refund: program.refundIsAmountPlusFee ? '100%' : '?',
  seedingSteps: String(program.seedSteps.length),                   // 4
  seedingTimeout: `${program.seedTimeoutDays} days`,                // 3 days
  unlockMin: program.unlockMinChecked ? '?' : 'none',              // no minimum since 2026-10-20
  solUsd: js('demoSolUsd')                                          // the SOL price the site's demo converts at (the launch hint)
};

fs.writeFileSync(path.join(here, '../src/figures.json'), JSON.stringify({ figures, stepNames, program, sources: ['program/programs/seed/src/state.rs', 'program/scripts/check-deploy.ts (production profile, when present)', 'program/tests/seed.ts (initConfig)', 'program/programs/seed/src/lib.rs (claim_refund)', 'js/config/seed.js', 'js/presale-page.js (seeding step names)', 'LOOP.md'] }, null, 2) + '\n');
console.log(JSON.stringify(figures, null, 2));
if (problems.length) { console.error('Figures disagree:\n- ' + problems.join('\n- ')); process.exit(1); }
console.log('All figures agree across the program, the site config and LOOP.md.');
