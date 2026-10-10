/* The raise model's fixed terms. Every number the site, the docs and the demo use lives here; the program's Config account
   carries the same values on chain. */
const SEED = {
  supply: 1e9,                 // tokens minted at seeding; mint and freeze authority revoked right after
  feeBps: 100,                 // Seed's fee on each buy, on top of the amount, refunded with it if the raise does not seed
  poolFeeBps: 100,             // the DAMM v2 pool's flat base fee; dynamic fee and the fee scheduler are off
  creatorShareBps: 7000,       // of pool fees: 70% to the founder's payout wallet, 30% to Seed, snapshotted at seeding
  capUsd: 100000,              // the largest target a raise may set, in USD at the SOL price when it opens
  minDeadlineH: 24, maxDeadlineH: 14 * 24,
  seedTimeoutDays: 3,          // a filled raise that has not seeded by then refunds everyone
  minUnlockDays: 90,           // the last team unlock is at least this long after seeding
  payoutDelayDays: 7,          // a payout wallet change takes effect after this long and shows while pending
  minRoadmap: 1,               // milestones a raise must list; shown, not enforced
  admins: [],                  // Seed admin wallets (a Squads multisig on mainnet); only they can flag fraud or approve a takeover
  demoSolUsd: 148.2            // the SOL price the demo converts targets at; the live site reads the market when a raise opens
};
