/* The raise model's fixed terms. Every number the site, the docs and the demo use lives here; the program's Config account
   carries the same values on chain. */
const SEED = {
  supply: 1e9,                 // tokens minted at seeding; mint and freeze authority revoked right after
  feeBps: 100,                 // Seed's fee on each buy, on top of the amount, refunded with it if the raise does not seed
  poolFeeBps: 125,             // the DAMM v2 pool's flat base fee; dynamic fee and the fee scheduler are off. Meteora keeps 20%, so 1% reaches the position
  dammProtocolPct: 20,         // Meteora keeps this share of every pool fee (fixed by its program for customizable pools); the 70/30 split is of the rest
  creatorShareBps: 7000,       // of pool fees: 70% to the founder's payout wallet, 30% to Seed, snapshotted at seeding
  presetCapsUsd: [50000, 100000, 150000, 200000],   // the opening market cap presets a founder picks from; the raise is derived (cap × (1 − team) ÷ 2 at the Pyth price). The program's Config carries the same four, set once at init; the site reads those once the config is in
  testCapUsd: 30,              // devnet test mode only: a tiny Test preset so a cycle costs cents; a mainnet build refuses it at init (program/math.rs check_presets)
  minDeadlineH: 24, maxDeadlineH: 14 * 24,
  seedTimeoutDays: 3,          // a filled raise that has not seeded by then refunds everyone
  minUnlockDays: 90,           // unused since 2026-10-20 (no minimum on team unlocks); kept for the Config's layout, which still carries the field
  payoutDelayDays: 7,          // a payout wallet change takes effect after this long and shows while pending
  admins: ['6xFrba28fk6RyiLREzLPHBP4xPXutDs69Ju69hCixAFZ', '6GTuondHNLSJkYemhVw8GYFTK3ANHPFXdVYUM5JP5zyf'],   // Seed admin wallets (a Squads multisig on mainnet); only they can flag fraud or approve a takeover
  hiddenFounders: ['6GTuondHNLSJkYemhVw8GYFTK3ANHPFXdVYUM5JP5zyf', '47GQX1dFMCz2UapFUbVBnkiyDMmfso7c5Za5Um7tQE57', 'F6BmoJCaGNmQsTTGnRxdvr5KFPMn58QfnXBwSoBHXAhN'],   // raises these wallets open never show on the site: the deployer, the test suite's second founder, and one earlier throwaway test founder
  /* the chain the site talks to. The browser RPC key is a public one locked to this site's domains in the Helius
     dashboard (the server-side key never leaves Supabase); a local copy of the site uses the public devnet endpoint. */
  network: 'devnet',
  xTyped: true,                // devnet, until the X app is connected: founders type their handle and it is attested as typed
  rpc: /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ? 'https://api.devnet.solana.com' : 'https://devnet.helius-rpc.com/?api-key=21304aca-337b-4fcc-b4e4-3de9902f661d',
  programId: '8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn',
  lookupTable: '3tcuKWXkcGmKRRDLzkBPB1jf5MpnhvM2Xo7NfX8BhLfy',   // the address lookup table every transaction compiles against (program/client/alt.ts lists it; made by program/scripts/alt.ts). open_raise at its largest is 1376 bytes as a legacy transaction and 1195 over the table, under the 1232 limit
  pairMints: { SOL: 'So11111111111111111111111111111111111111112', USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' },   // USDC here is the devnet test mint
  demoSolUsd: 148.2            // the SOL price the demo converts targets at; the live site reads the market when a raise opens
};
