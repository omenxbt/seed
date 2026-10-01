/* ==========================================================================
   DEMO DATA. Eight raises with full project profiles.
   A raise in `state` holds what changes (the raise, its buys, its history). Its profile (story, team, tokenomics, founder,
   roadmap, updates, the shape of its crowd) lives here and is merged in by profileOf(p), so profile edits reach every
   browser without resetting anyone's saved demo. A raise opened from the Launch form carries its own profile.
   Everything here is demo data except the two STANDINS, which are real mainnet accounts read live.
   ========================================================================== */

/* Real accounts that stand in for Quill's, so its vault balance and its pool chart are read live. Neither belongs to Quill. */
const STANDINS = {
  vault: {
    address: 'GLA4YsAG5eFDWnCy8rfq47PAQi3XHfxkNXULQ81xUinR', presale: 'FVADnfbrBkoB16zhx16Gi8STM5HvqvDSK3fAaeLvxk7c', asset: 'USDC',
    note: 'Stand-in vault: the USDC vault of a real Meteora Presale Vault on mainnet, not Quill’s. Its balance is read live from Solana.'
  },
  pool: {
    address: '8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie', pair: 'SOL/USDC', dex: 'Meteora DAMM v2',
    note: 'Stand-in pool: a real Meteora DAMM v2 SOL/USDC pool, not Quill’s. Prices and liquidity are live from GeckoTerminal.'
  }
};

const B58ABC = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
/* a demo address: the right length and alphabet, never a real account. Real lookups skip anything in demoAddrs. */
const demoAddrs = new Set();
function fakeAddr(seed, len = 44) { const r = rng('addr/' + seed); let s = ''; for (let i = 0; i < len; i++) s += B58ABC[Math.floor(r() * 58)]; demoAddrs.add(s); return s; }
const EXCHANGES = ['Binance', 'Coinbase', 'OKX', 'Kraken', 'Bybit', 'Backpack Exchange'];

/* allocation kinds: raise (backers), lp (paired into the locked pool), team, treasury, other.
   Seed keeps the raise share and the LP share equal, which is what makes the pool open at the raise price. */
const alloc = (label, kind, pct, vesting, wallet) => ({ label, kind, pct, vesting: vesting || null, wallet: wallet || null });
const vest = (cliffDays, durationDays) => ({ cliffDays, durationDays });

const DEMO_PROFILES = {
  osprey: {
    tagline: 'Text alerts before your perp position gets liquidated.',
    description: `**Osprey watches your perp positions and texts you before they are liquidated.**

Connect a wallet read-only. Osprey reads your open positions on Drift, Jupiter Perps and Zeta every block and works out how far price can move before each one is liquidated. When that distance drops under the buffer you set, you get an SMS. If you don't open it within two minutes, Osprey calls.

### Why now
Perp volume on Solana passed spot this year, and most liquidations happen while the trader is asleep or away from a screen. Exchanges send push notifications, but those are easy to miss and arrive late.

### What the raise pays for
- Twelve months of SMS and voice carrier costs for the first 5,000 users
- A second engineer for the position reader
- An external review of the liquidation maths per venue

The app is free while the raise is open. After seeding, alerts cost 20 $OSPR a month, and holders of 5,000 $OSPR or more get them free.`,
    links: { website: 'https://osprey.example', x: 'https://x.com/osprey_seeddemo', telegram: 'https://t.me/osprey_seeddemo', discord: null, github: 'https://github.com/osprey-seeddemo' },
    minBuy: 0.1, maxBuy: 10,
    tokenomics: { allocations: [alloc('Raise backers', 'presale', 45), alloc('Locked Meteora pool', 'lp', 45), alloc('Team', 'team', 10, vest(90, 365))],
      useOfFunds: [{ label: 'Carrier costs, 12 months', pct: 40 }, { label: 'Engineering', pct: 45 }, { label: 'Maths review', pct: 15 }] },
    team: [
      { name: 'Ines Carvalho', role: 'Founder, engineering', x: 'https://x.com/ines_seeddemo', github: 'https://github.com/ines-seeddemo', linkedin: null, verified: { x: true, github: true, domain: false } },
      { name: 'Tomasz Wrona', role: 'Risk maths', x: 'https://x.com/twrona_seeddemo', github: null, linkedin: 'https://www.linkedin.com/in/twrona-seeddemo', verified: { x: true, github: false, domain: false } }
    ],
    founder: { name: 'Ines Carvalho', x: 'https://x.com/ines_seeddemo', xAgeDays: 1460, funding: { kind: 'exchange', label: 'Coinbase', hoursBeforeLaunch: 24 * 210 }, pastLaunches: [] },
    deck: 'assets/demo/decks/osprey.pdf',
    roadmap: [
      { title: 'Drift position reader', due: -30, status: 'shipped', proof: 'https://github.com/osprey-seeddemo/reader/releases' },
      { title: 'SMS alerts, closed beta', due: -6, status: 'shipped', proof: 'https://osprey.example/beta' },
      { title: 'Jupiter Perps and Zeta', due: 21, status: 'planned' },
      { title: 'Voice call escalation', due: 45, status: 'planned' }
    ],
    updates: [
      { title: 'Beta numbers', body: '412 wallets connected in the first week. 38 alerts sent, 31 of them before the position was saved.', daysAgo: 1, author: 'Ines Carvalho' }
    ],
    crowd: { top10: 0.38, fresh: 0.16, bundle: null, kols: 2, tracked: 3, repeat: 0.12 },
    chat: [
      { by: 'backer:4', body: 'Does it need my wallet to sign anything?', mins: 300 },
      { by: 'founder', body: 'No. It only reads positions from the address you paste. There is nothing to sign.', mins: 290, reply: -1, pinned: true },
      { by: 'visitor:1', body: 'Any plan for Hyperliquid?', mins: 120 },
      { by: 'founder', body: 'After Zeta. Hyperliquid is not on Solana, so it needs a separate reader.', mins: 110, reply: -1 }
    ],
    watchers: 640
  },

  moss: {
    tagline: 'One art drop a day, minted slowly.',
    description: `**Moss mints one piece of generative art a day, for a year.**

Each piece grows from the one before it: the same seed, one more day of growth. Backers of the raise get a share of every sale for the full year.

### How a drop works
The piece for the day is revealed at noon UTC and minted over 24 hours, one edition an hour. That slow pace is the point: nobody can sweep a drop in one block.

### What the raise pays for
Rendering and storage for 365 pieces, and the minting program.`,
    links: { website: 'https://moss.example', x: 'https://x.com/moss_seeddemo', telegram: null, discord: 'https://discord.gg/moss-seeddemo', github: null },
    minBuy: 0.1, maxBuy: 15,
    tokenomics: { allocations: [alloc('Raise backers', 'presale', 50), alloc('Locked Meteora pool', 'lp', 50)],
      useOfFunds: [{ label: 'Rendering and storage', pct: 55 }, { label: 'Minting program', pct: 45 }] },
    team: [{ name: 'Moss', role: 'Artist', x: 'https://x.com/moss_seeddemo', github: null, linkedin: null, verified: { x: true, github: false, domain: false } }],
    founder: { name: 'Moss', x: 'https://x.com/moss_seeddemo', xAgeDays: 70, funding: { kind: 'wallet', label: 'Older personal wallet', hoursBeforeLaunch: 24 * 40 }, pastLaunches: [] },
    deck: null,
    roadmap: [{ title: 'First 30 pieces rendered', due: -3, status: 'shipped', proof: 'https://moss.example/preview' }, { title: 'Day one drop', due: 2, status: 'planned' }],
    updates: [],
    crowd: { top10: 0.44, fresh: 0.3, bundle: null, kols: 1, tracked: 1, repeat: 0.05 },
    chat: [{ by: 'visitor:2', body: 'Is there a preview of the first piece?', mins: 90 }, { by: 'founder', body: 'Pieces 1 to 30 are on the site.', mins: 80, reply: -1 }],
    watchers: 210
  },

  tidewater: {
    tagline: 'Index vaults built from tokenized stocks.',
    description: `**Tidewater builds index vaults out of xStocks.**

Deposit USDC and get one token that tracks a basket: the Nasdaq 100 top ten, a dividend basket, or an equal-weight chip basket. Each vault rebalances weekly against Jupiter quotes and holds the xStocks directly, so a holder can always redeem for the underlying tokens.

### Why a vault and not a fund
Anyone can check what a vault holds at any block. There is no manager discretion: the weights are set by the vault's rules, and the rules are on chain.

### What the raise pays for
- Two audits of the vault program
- Six months of keeper costs for rebalancing
- Legal review of the basket definitions`,
    links: { website: 'https://tidewater.example', x: 'https://x.com/tidewater_seeddemo', telegram: 'https://t.me/tidewater_seeddemo', discord: 'https://discord.gg/tidewater-seeddemo', github: 'https://github.com/tidewater-seeddemo' },
    minBuy: 50, maxBuy: 5000,
    tokenomics: { allocations: [alloc('Raise backers', 'presale', 40), alloc('Locked Meteora pool', 'lp', 40), alloc('Team', 'team', 12, vest(180, 720)), alloc('Treasury', 'treasury', 8, vest(90, 540))],
      useOfFunds: [{ label: 'Audits', pct: 45 }, { label: 'Keeper costs', pct: 20 }, { label: 'Legal review', pct: 15 }, { label: 'Engineering', pct: 20 }] },
    team: [
      { name: 'Aiko Tanaka', role: 'Founder, product', x: 'https://x.com/aiko_seeddemo', github: 'https://github.com/aiko-seeddemo', linkedin: 'https://www.linkedin.com/in/aiko-seeddemo', verified: { x: true, github: true, domain: true } },
      { name: 'Ruben Osei', role: 'Vault program', x: null, github: 'https://github.com/rosei-seeddemo', linkedin: null, verified: { x: false, github: true, domain: false } },
      { name: 'Lena Brandt', role: 'Markets', x: 'https://x.com/lbrandt_seeddemo', github: null, linkedin: 'https://www.linkedin.com/in/lbrandt-seeddemo', verified: { x: false, github: false, domain: false } }
    ],
    founder: { name: 'Aiko Tanaka', x: 'https://x.com/aiko_seeddemo', xAgeDays: 2200, funding: { kind: 'exchange', label: 'Kraken', hoursBeforeLaunch: 24 * 400 }, pastLaunches: [{ name: 'Basket', platform: 'Seed', outcome: 'seeded', daysAgo: 160 }] },
    deck: 'assets/demo/decks/tidewater.pdf',
    roadmap: [
      { title: 'Vault program on devnet', due: -40, status: 'shipped', proof: 'https://github.com/tidewater-seeddemo/vaults' },
      { title: 'First audit', due: -5, status: 'missed' },
      { title: 'First audit, rescheduled', due: 12, status: 'planned' },
      { title: 'Nasdaq top ten vault on mainnet', due: 35, status: 'planned' }
    ],
    updates: [
      { title: 'Audit moved', body: 'The auditor pushed our slot by two weeks. The mainnet date moves with it. Nothing else changes.', daysAgo: 2, author: 'Aiko Tanaka' },
      { title: 'Devnet vaults open', body: 'All three baskets are live on devnet. Rebalancing has run 14 times without a failed keeper call.', daysAgo: 12, author: 'Ruben Osei' }
    ],
    crowd: { top10: 0.41, fresh: 0.12, bundle: null, kols: 3, tracked: 4, repeat: 0.22 },
    chat: [
      { by: 'backer:2', body: 'What happens to a vault if one xStock gets paused by its issuer?', mins: 600 },
      { by: 'founder', body: 'The vault stops rebalancing that leg and keeps the rest running. Redemptions still pay out the paused token as it is.', mins: 560, reply: -1, pinned: true },
      { by: 'backer:9', body: 'Congrats on the devnet launch.', mins: 200 }
    ],
    watchers: 1380
  },

  lattice: {
    tagline: 'Shared DCA vaults for JUP stakers.',
    description: `**Lattice pools JUP stakers into shared DCA vaults.**

A staker picks a target token and a weekly amount. Lattice nets every order in a vault against each other before touching the market, so a thousand small orders become one fill. Stakers keep their voting power the whole time.

### Why pool orders
Small DCA orders pay the same fixed costs as large ones. Netting them first cuts those costs, and one larger order gets a better route.

### What the raise pays for
- An audit of the netting program
- A year of keeper costs
- A grants fund for integrations`,
    links: { website: 'https://lattice.example', x: 'https://x.com/lattice_seeddemo', telegram: 'https://t.me/lattice_seeddemo', discord: 'https://discord.gg/lattice-seeddemo', github: 'https://github.com/lattice-seeddemo' },
    minBuy: 100, maxBuy: 12000,
    tokenomics: { allocations: [alloc('Raise backers', 'presale', 40), alloc('Locked Meteora pool', 'lp', 40), alloc('Team', 'team', 12, vest(180, 720)), alloc('Treasury', 'treasury', 8, vest(90, 540))],
      useOfFunds: [{ label: 'Audit', pct: 40 }, { label: 'Keeper costs', pct: 25 }, { label: 'Integration grants', pct: 35 }] },
    team: [
      { name: 'Priya Raman', role: 'Founder, engineering', x: 'https://x.com/priya_seeddemo', github: 'https://github.com/priya-seeddemo', linkedin: 'https://www.linkedin.com/in/priya-seeddemo', verified: { x: true, github: true, domain: true } },
      { name: 'Jonas Lund', role: 'Netting program', x: 'https://x.com/jlund_seeddemo', github: 'https://github.com/jlund-seeddemo', linkedin: null, verified: { x: true, github: true, domain: true } },
      { name: 'Mei Chen', role: 'Growth', x: 'https://x.com/meichen_seeddemo', github: null, linkedin: 'https://www.linkedin.com/in/meichen-seeddemo', verified: { x: true, github: false, domain: true } }
    ],
    founder: { name: 'Priya Raman', x: 'https://x.com/priya_seeddemo', xAgeDays: 2400, funding: { kind: 'exchange', label: 'Coinbase', hoursBeforeLaunch: 24 * 420 }, pastLaunches: [{ name: 'Gridline', platform: 'Seed', outcome: 'seeded', daysAgo: 220 }] },
    deck: 'assets/demo/decks/lattice.pdf',
    roadmap: [
      { title: 'Netting program on devnet', due: -60, status: 'shipped', proof: 'https://github.com/lattice-seeddemo/netting' },
      { title: 'Audit', due: -12, status: 'shipped', proof: 'https://lattice.example/audit.pdf' },
      { title: 'Mainnet vaults', due: 14, status: 'planned' },
      { title: 'Integration grants open', due: 40, status: 'planned' }
    ],
    updates: [
      { title: 'Audit published', body: 'The netting program audit is out with no high or medium findings. Two low findings are fixed in the release linked on the roadmap.', daysAgo: 3, author: 'Priya Raman' },
      { title: 'Why JUP stakers first', body: 'Stakers already hold for the long term and DCA the most. Starting with them keeps the first vaults deep.', daysAgo: 9, author: 'Mei Chen' }
    ],
    crowd: { top10: 0.24, fresh: 0.08, bundle: null, kols: 2, tracked: 6, repeat: 0.31 },
    chat: [
      { by: 'backer:6', body: 'Can I leave a vault mid-week?', mins: 700 },
      { by: 'founder', body: 'Yes. Your unfilled balance comes back at the next netting round, at most one day later.', mins: 680, reply: -1, pinned: true },
      { by: 'team:1', body: 'The audit report is linked on the roadmap.', mins: 400 },
      { by: 'backer:12', body: 'Backed. Clean setup.', mins: 60 }
    ],
    watchers: 1720
  },

  overclock: {
    tagline: 'GPU rental credits you can trade.',
    description: `**Overclock turns GPU rental hours into a token.**

Buy credits now, burn them for GPU time later, or sell them to someone who needs compute.

Huge partnerships coming. Stay tuned.`,
    links: { website: null, x: 'https://x.com/overclock_seeddemo', telegram: 'https://t.me/overclock_seeddemo', discord: null, github: null },
    minBuy: 0.05, maxBuy: 200,
    tokenomics: { allocations: [alloc('Raise backers', 'presale', 30), alloc('Locked Meteora pool', 'lp', 30), alloc('Team', 'team', 25), alloc('Treasury', 'treasury', 15)],
      useOfFunds: [{ label: 'Marketing', pct: 70 }, { label: 'Development', pct: 30 }] },
    team: [],
    founder: { name: 'overclock_dev', x: 'https://x.com/overclock_seeddemo', xAgeDays: 12, funding: { kind: 'bridge', label: 'deBridge', addr: 'src5qyZHqTqecJV4aY6Cb6zDZLMDzrDKKezs22MPHr4', hoursBeforeLaunch: 5 },
      pastLaunches: [{ name: 'GPUFI', platform: 'pump.fun', outcome: 'dumped', daysAgo: 48 }, { name: 'RENTX', platform: 'pump.fun', outcome: 'dumped', daysAgo: 21 }] },
    deck: null,
    roadmap: [{ title: 'Partnerships', due: 7, status: 'planned' }],
    updates: [],
    crowd: { top10: 0.74, fresh: 0.58, bundle: { n: 6, from: 4 }, kols: 0, tracked: 0, repeat: 0 },
    chat: [
      { by: 'visitor:3', body: 'Is this the Render team?', mins: 50 },
      { by: 'founder', body: 'Big announcement soon.', mins: 45, reply: -1 }
    ],
    watchers: 2950
  },

  halfmoon: {
    tagline: 'Split a wallet’s staking yield with a friend.',
    description: `**Halfmoon splits staking yield between two wallets.**

Stake SOL once and choose who gets the rewards: all to you, half to a friend, or a fixed amount to a cause each epoch. The principal never moves. Only the rewards are routed.

### Who it is for
People who want to support someone every month without sending the same transfer by hand, and teams that want to share a validator's rewards with contributors.

### What the raise pays for
A review of the stake-routing program and a year of hosting.`,
    links: { website: 'https://halfmoon.example', x: 'https://x.com/halfmoon_seeddemo', telegram: null, discord: null, github: 'https://github.com/halfmoon-seeddemo' },
    minBuy: 0.2, maxBuy: 20,
    tokenomics: { allocations: [alloc('Raise backers', 'presale', 45), alloc('Locked Meteora pool', 'lp', 45), alloc('Team', 'team', 6, vest(90, 365)), alloc('Treasury', 'treasury', 4, vest(0, 365))],
      useOfFunds: [{ label: 'Program review', pct: 60 }, { label: 'Hosting', pct: 20 }, { label: 'Design', pct: 20 }] },
    team: [
      { name: 'Sam Okafor', role: 'Founder', x: 'https://x.com/samok_seeddemo', github: 'https://github.com/samok-seeddemo', linkedin: null, verified: { x: true, github: true, domain: false } },
      { name: 'Noor Haddad', role: 'Design', x: null, github: null, linkedin: 'https://www.linkedin.com/in/noor-seeddemo', verified: { x: false, github: false, domain: false } }
    ],
    founder: { name: 'Sam Okafor', x: 'https://x.com/samok_seeddemo', xAgeDays: 210, funding: { kind: 'exchange', label: 'OKX', hoursBeforeLaunch: 24 * 30 }, pastLaunches: [] },
    deck: 'assets/demo/decks/halfmoon.pdf',
    roadmap: [{ title: 'Stake routing on devnet', due: -8, status: 'shipped', proof: 'https://github.com/halfmoon-seeddemo/routing' }, { title: 'Mainnet', due: 30, status: 'planned' }],
    updates: [{ title: 'Devnet is live', body: 'Try a split on devnet from the site. Rewards route at each epoch boundary.', daysAgo: 1, author: 'Sam Okafor' }],
    crowd: { top10: 0.52, fresh: 0.2, bundle: null, kols: 0, tracked: 1, repeat: 0.08 },
    chat: [{ by: 'backer:1', body: 'Which validators does it support?', mins: 240 }, { by: 'founder', body: 'Any validator. You keep your own stake account.', mins: 230, reply: -1, pinned: true }],
    watchers: 390
  },

  quill: {
    tagline: 'Pay-per-article tips for newsletter writers.',
    description: `**Quill lets readers tip a newsletter writer per article, in USDC, in one tap.**

Writers add one line to their newsletter template. Readers tap the tip link at the end of an issue and pay from any Solana wallet. No account, no card, no minimum.

### What happened since seeding
The pool opened at the raise price on the day the raise filled. Tipping is live for 140 writers, and the roadmap below links each shipped milestone.

### Token use
Writers who hold $QUILL pay no tipping fee. The fee on everyone else buys $QUILL from the pool each week.`,
    links: { website: 'https://quill.example', x: 'https://x.com/quill_seeddemo', telegram: 'https://t.me/quill_seeddemo', discord: 'https://discord.gg/quill-seeddemo', github: 'https://github.com/quill-seeddemo' },
    minBuy: 25, maxBuy: 2500,
    vault: STANDINS.vault, pool: STANDINS.pool,
    tokenomics: { allocations: [alloc('Raise backers', 'presale', 42), alloc('Locked Meteora pool', 'lp', 42), alloc('Team', 'team', 10, vest(180, 720)), alloc('Treasury', 'treasury', 6, vest(30, 365))],
      useOfFunds: [{ label: 'Engineering', pct: 50 }, { label: 'Writer onboarding', pct: 30 }, { label: 'Security review', pct: 20 }] },
    team: [
      { name: 'Hana Kim', role: 'Founder', x: 'https://x.com/hanakim_seeddemo', github: 'https://github.com/hanakim-seeddemo', linkedin: 'https://www.linkedin.com/in/hanakim-seeddemo', verified: { x: true, github: true, domain: true } },
      { name: 'Diego Ferraz', role: 'Engineering', x: 'https://x.com/dferraz_seeddemo', github: 'https://github.com/dferraz-seeddemo', linkedin: null, verified: { x: true, github: true, domain: false } },
      { name: 'Olu Adeyemi', role: 'Writer relations', x: 'https://x.com/olu_seeddemo', github: null, linkedin: 'https://www.linkedin.com/in/olu-seeddemo', verified: { x: false, github: false, domain: false } }
    ],
    founder: { name: 'Hana Kim', x: 'https://x.com/hanakim_seeddemo', xAgeDays: 1800, funding: { kind: 'exchange', label: 'Coinbase', hoursBeforeLaunch: 24 * 300 }, pastLaunches: [] },
    deck: 'assets/demo/decks/quill.pdf',
    roadmap: [
      { title: 'Tip links for Substack and Beehiiv', due: -20, status: 'shipped', proof: 'https://quill.example/changelog#links' },
      { title: 'Pool opens at the raise price', due: -2, status: 'shipped', proof: 'https://app.meteora.ag' },
      { title: '100 writers tipping', due: -1, status: 'shipped', proof: 'https://quill.example/writers' },
      { title: 'Weekly buy-back from fees', due: 10, status: 'planned' },
      { title: 'Ghost integration', due: 30, status: 'planned' }
    ],
    updates: [
      { title: '140 writers live', body: 'We passed 100 writers a day early. Tips so far average 2.40 USDC.', daysAgo: 0.5, author: 'Hana Kim' },
      { title: 'Seeded, pool open', body: 'The raise filled and the pool opened at the raise price. The LP position is locked. Claim your $QUILL from this page.', daysAgo: 2, author: 'Hana Kim' },
      { title: 'Two days left', body: 'We are at 80%. Thank you to every backer so far.', daysAgo: 3, author: 'Olu Adeyemi' }
    ],
    crowd: { top10: 0.36, fresh: 0.14, bundle: null, kols: 3, tracked: 5, repeat: 0.26 },
    chat: [
      { by: 'backer:3', body: 'When is the first buy-back?', mins: 900 },
      { by: 'founder', body: 'The first weekly buy-back runs on the date on the roadmap. Every one will be posted here with the transaction.', mins: 860, reply: -1, pinned: true },
      { by: 'backer:15', body: 'Claimed, thanks.', mins: 300 },
      { by: 'team:1', body: 'Ghost integration is in progress.', mins: 120 }
    ],
    watchers: 2100
  },

  ember: {
    tagline: 'Group bids on NFT auctions.',
    description: `**Ember lets a group pool funds to bid on one NFT auction together.**

Friends join a bid room, each puts in what they want, and Ember bids as one wallet. If the room wins, the NFT sits in a shared vault and each member owns a share. If it loses, everyone is refunded.

### What the raise would have paid for
The shared vault program and a review of its withdrawal rules.`,
    links: { website: 'https://ember.example', x: 'https://x.com/ember_seeddemo', telegram: null, discord: 'https://discord.gg/ember-seeddemo', github: null },
    minBuy: 1e6, maxBuy: 1.5e8,
    tokenomics: { allocations: [alloc('Raise backers', 'presale', 45), alloc('Locked Meteora pool', 'lp', 45), alloc('Team', 'team', 10, vest(90, 365))],
      useOfFunds: [{ label: 'Vault program', pct: 70 }, { label: 'Review', pct: 30 }] },
    team: [
      { name: 'Kai Mercer', role: 'Founder', x: 'https://x.com/kaimercer_seeddemo', github: null, linkedin: null, verified: { x: true, github: false, domain: false } },
      { name: 'Ada Novak', role: 'Engineering', x: null, github: 'https://github.com/adanovak-seeddemo', linkedin: null, verified: { x: false, github: true, domain: false } }
    ],
    founder: { name: 'Kai Mercer', x: 'https://x.com/kaimercer_seeddemo', xAgeDays: 400, funding: { kind: 'exchange', label: 'Bybit', hoursBeforeLaunch: 24 * 90 }, pastLaunches: [] },
    deck: 'assets/demo/decks/ember.pdf',
    roadmap: [{ title: 'Bid rooms prototype', due: -10, status: 'shipped', proof: 'https://ember.example/prototype' }, { title: 'Shared vault program', due: -1, status: 'missed' }],
    updates: [{ title: 'Refunds are open', body: 'We did not reach the target. Every backer can claim a full refund on this page, fee included. Thank you for trying Ember with us.', daysAgo: 1, author: 'Kai Mercer' }],
    crowd: { top10: 0.46, fresh: 0.34, bundle: null, kols: 1, tracked: 0, repeat: 0.04 },
    chat: [
      { by: 'backer:2', body: 'How do refunds work?', mins: 1500 },
      { by: 'founder', body: 'Claim from Your position on this page. You get back everything you paid, the 1% fee included.', mins: 1440, reply: -1, pinned: true }
    ],
    watchers: 180
  }
};

/* every demo profile gets a mint and a vault address (demo), deployer and team wallets (demo) */
Object.entries(DEMO_PROFILES).forEach(([id, pr]) => {
  pr.mint = pr.mint || fakeAddr('mint/' + id);
  pr.vault = pr.vault || { address: fakeAddr('vault/' + id) };
  pr.founder.wallet = fakeAddr('founder/' + id);
  pr.team.forEach((m, i) => { m.wallet = i === 0 ? pr.founder.wallet : fakeAddr('team/' + id + i); });
  pr.banner = `assets/demo/${id}-banner.svg`; pr.art = `assets/demo/${id}-art.svg`;
  pr.demo = true;
});

/* the profile for a presale: a demo profile, or the one a creator entered in the Launch form */
const profileOf = p => (p && (p.profile || DEMO_PROFILES[p.id])) || { links: {}, team: [], tokenomics: { allocations: [], useOfFunds: [] }, founder: { pastLaunches: [] }, roadmap: [], updates: [], chat: [] };
const presaleShare = p => { const a = profileOf(p).tokenomics.allocations.find(x => x.kind === 'presale'); return a ? a.pct / 100 : A; };

/* ------------------------------------------------------------ the crowd
   Builds the backer set for a demo raise so that the numbers the risk checks read (top 10 share, bundles, fresh wallets)
   come out of real sums over real rows, the same way they would from chain data. */
function genCrowd(p, c, end) {
  const r = rng('crowd/' + p.id), N = Math.max(1, p.backers), R = p.raised, top = Math.min(10, N);
  let tw = []; for (let i = 0; i < top; i++) tw.push(Math.pow(0.82, i) * (0.85 + r() * 0.3));
  tw.sort((a, b) => b - a); const ts = tw.reduce((a, b) => a + b, 0);
  const amounts = tw.map(w => w / ts * c.top10 * R);
  const floor = amounts[top - 1] * 0.95;
  let rest = []; for (let i = top; i < N; i++) rest.push(Math.pow(r(), 2.4) + 0.04);
  const rs = rest.reduce((a, b) => a + b, 0) || 1;
  rest = rest.map(w => Math.min(floor, w / rs * (1 - c.top10) * R));
  const restSum = rest.reduce((a, b) => a + b, 0), want = (1 - c.top10) * R;
  if (restSum > 0) rest = rest.map(v => v * want / restSum);          // may nudge a few past the floor; the checks read the real sums
  const all = amounts.concat(rest);
  const wallets = all.map((amt, i) => ({ wallet: fakeAddr(p.id + '/b' + i), amount: amt, fundedBy: null, isFresh: false, firstTxAt: 0, tags: [] }));
  // funding: exchanges for most, older personal wallets for some; a bundle shares one funding wallet
  wallets.forEach(w => { w.fundedBy = r() < 0.7 ? { kind: 'exchange', label: EXCHANGES[Math.floor(r() * EXCHANGES.length)] } : { kind: 'wallet', addr: fakeAddr(p.id + '/f' + Math.floor(r() * 1e9)) }; });
  if (c.bundle) { const shared = fakeAddr(p.id + '/bundle'); for (let i = 0; i < c.bundle.n; i++) { const w = wallets[c.bundle.from - 1 + i]; if (w) { w.fundedBy = { kind: 'wallet', addr: shared }; w.isFresh = true; } } }
  wallets.forEach(w => { if (!w.isFresh && r() < c.fresh) w.isFresh = true; });
  // tags
  const pick = (n, tag, pool) => { let k = 0, guard = 0; while (k < n && guard++ < 500) { const w = wallets[Math.floor(r() * Math.min(pool, wallets.length))]; if (!w.tags.includes(tag)) { w.tags.push(tag); k++; } } };
  pick(c.kols, 'kol', 40); pick(c.tracked, 'tracked', 60); pick(Math.round(c.repeat * N), 'repeat-backer', N);
  // buy times follow a lumpy curve between open and the end of the raise; a quarter of backers buy twice
  const k = 26, seg = []; let sum = 0; for (let i = 0; i < k; i++) { const v = 0.25 + r() * r() * 3; seg.push(v); sum += v; }
  const when = () => { let x = r() * sum, i = 0; while (i < k - 1 && x > seg[i]) { x -= seg[i]; i++; } return Math.round(p.openedAt + (end - p.openedAt) * (i + r()) / k); };
  const buys = [];
  wallets.forEach(w => {
    const parts = r() < 0.25 ? [0.6, 0.4] : [1];
    parts.forEach(f => buys.push({ wallet: w.wallet, amount: r6(w.amount * f), at: Math.min(end - 1000, when()), fundedBy: w.fundedBy, isFresh: w.isFresh, tags: w.tags }));
    w.firstTxAt = Math.min(...buys.filter(b => b.wallet === w.wallet).map(b => b.at)) - (w.isFresh ? (0.5 + r() * 5.5) : (40 + r() * 900)) * 864e5;
  });
  buys.forEach(b => { b.firstTxAt = wallets.find(w => w.wallet === b.wallet).firstTxAt; });
  buys.sort((a, b) => a.at - b.at);
  const drift = r6(R - buys.reduce((a, b) => a + b.amount, 0)); if (buys.length) buys[buys.length - 1].amount = r6(buys[buys.length - 1].amount + drift);
  if (p.status === 'refunded') buys.forEach(b => { b.refundClaimed = r() < 0.6; });
  return buys;
}
/* the fill history is the running sum of the buys, sampled at 40 points */
function histFromBuys(p, buys, end) {
  const h = [[p.openedAt, 0]]; let acc = 0, j = 0;
  for (let i = 1; i <= 40; i++) { const t = Math.round(p.openedAt + (end - p.openedAt) * i / 40); while (j < buys.length && buys[j].at <= t) acc += buys[j++].amount; h.push([t, r6(acc)]); }
  return h;
}

/* the demo wallet starts with a position in the seeded and the refunded raise, so both claim flows can be tried */
const DEMO_WALLET_ID = 'demo:7xKp\u20269fQa';
/* Daily realised PnL of the demo wallet in USD for the last 120 days: pool trades on about half the days, the Quill seed
   landing above cost two days ago, the Ember refund (money back, nothing gained) yesterday. Seeded, so it is the same in
   every browser. A real wallet has no history here yet. */
function demoPnlDays(now) {
  const r = rng('pnl/v1'), out = [], day = 864e5, t0 = new Date(now); t0.setHours(0, 0, 0, 0);
  for (let i = 119; i >= 0; i--) {
    let v = 0;
    if (r() < 0.52) { const win = r() < 0.5, mag = Math.pow(r(), 2.2) * (win ? 5600 : 4100) + 8; v = win ? mag : -mag; }
    if (i === 2) v += 4230;   /* Quill seeded: the claim is worth more than the 500 USDC paid */
    out.push({ t: t0.getTime() - i * day, v: Math.round(v * 100) / 100 });
  }
  return out;
}
const DEMO_WALLET_BUYS = { quill: 500, ember: 25000000 };
function seedData() {
  const n = Date.now();
  const mk = (id, name, ticker, q, target, pct, backers, openedAgo, dur, status = 'live', resolvedAgo = 0) => {
    const openedAt = n - openedAgo, endsAt = openedAt + dur, resolvedAt = status === 'live' ? null : n - resolvedAgo, pr = DEMO_PROFILES[id];
    const p = { id, name, ticker, idea: pr.tagline, q, target, raised: r6(target * pct), backers, openedAt, endsAt, status, resolvedAt, mine: false, hist: [], buys: [] };
    const end = resolvedAt || n;
    p.buys = genCrowd(p, pr.crowd, end);
    const mine = DEMO_WALLET_BUYS[id];
    if (mine) {   // the demo wallet backed this one: its buy is one of the backers, taken out of the last buy so the raise is unchanged
      const net = r6(mine * NET), last = p.buys[p.buys.length - 1]; last.amount = r6(last.amount - net);
      p.buys.push({ wallet: DEMO_WALLET_ID, amount: net, paid: mine, at: p.openedAt + (end - p.openedAt) * 0.4, fundedBy: { kind: 'exchange', label: 'Coinbase' }, isFresh: false, firstTxAt: p.openedAt - 400 * D, tags: [], you: true, refundClaimed: false });
      p.buys.sort((a, b) => a.at - b.at); p.backers++;
    }
    p.hist = histFromBuys(p, p.buys, end);
    return p;
  };
  return [
    mk('osprey', 'Osprey', 'OSPR', 'SOL', 85, .96, 212, 1.75 * D, 3 * D),
    mk('moss', 'Moss', 'MOSS', 'SOL', 150, .61, 97, D - 200e3, D),
    mk('tidewater', 'Tidewater', 'TIDE', 'USDC', 60000, .85, 388, 3.9 * D, 7 * D),
    mk('lattice', 'Lattice', 'LATT', 'JUP', 120000, .48, 176, 2.2 * D, 7 * D),
    mk('overclock', 'Overclock', 'RENDER', 'NVDAx', 400, .57, 203, 2.9 * D, 7 * D),
    mk('halfmoon', 'Halfmoon', 'HALF', 'SOL', 300, .20, 141, 1.6 * D, 7 * D),
    mk('quill', 'Quill', 'QUILL', 'USDC', 25000, 1, 264, 3.6 * D, 3 * D, 'seeded', 2 * D),
    mk('ember', 'Ember', 'EMBR', 'BONK', 2e9, .41, 58, 4 * D, 3 * D, 'refunded', D)
  ];
}
