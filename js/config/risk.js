/* Risk check thresholds. Every number the checks use lives here; js/risk.js only reads them. */
const RISK = {
  xAgeWarnDays: 90,              // founder X account younger than this: warn
  xAgeFailDays: 30,              // younger than this: fail
  fundedNearLaunchHours: 24,     // founder wallet first funded within this many hours before launch: warn
  top10WarnPct: 50,              // top 10 backers' share of the raise: warn above
  top10FailPct: 70,              // fail above
  bundleMinWallets: 3,           // backers sharing one funding wallet form a bundle at this size
  bundledWarnPct: 15,            // bundled share of the raise: warn above
  freshWalletDays: 7,            // a backer is fresh if its first transaction was less than this many days before it backed
  freshWarnPct: 40,              // fresh share of backers: warn above

  /* live lookups on the keyless public RPC: it answers one account per call and throttles bursts, so lookups are capped and cached */
  liveLookupCap: 20,             // fresh-wallet and funding-source lookups per raise, largest backers first
  lookupCacheMs: 6 * 3600e3,     // cached in localStorage for this long
  rpcSpacingMs: 900,             // gap between live lookup calls

  /* funding from these programs counts as bridged. Each address was checked on mainnet as an executable program (2026-09-29).
     No Solana mixer program is widely recognised, so the mixer list starts empty; add addresses as a data source provides them. */
  bridges: {
    'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb': 'Wormhole Token Bridge',
    'worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth': 'Wormhole',
    'src5qyZHqTqecJV4aY6Cb6zDZLMDzrDKKezs22MPHr4': 'deBridge',
    'dst5MGcFPoBeREFAA5E3tU5ij8m5uVYwkzkSAbsLbNo': 'deBridge'
  },
  mixers: {},

  chatAutoHideReports: 3          // a chat message with this many reports is hidden for everyone
};
