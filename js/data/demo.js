/* ==========================================================================
   DEMO DATA. Eight raises, one per state the model can be in: live, filled and seeding, refunded, seeded above its raise
   price, seeded below it, flagged for fraud, under a community takeover, and one whose token has no use case.
   A raise in `state` holds what changes and what the founder set (terms, team share and schedule, roadmap, payout wallet,
   buys, history, fees, reports). Its profile (story, links, team, deck, announcements, the shape of its crowd) lives here
   and is merged in by profileOf(p), so profile edits reach every browser without resetting anyone's saved demo. A raise
   opened from the Launch form carries its own profile. Everything here is demo data; nothing is read from mainnet.
   ========================================================================== */

const B58ABC = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
/* a demo address: the right length and alphabet, never a real account. Real lookups skip anything in demoAddrs. */
const demoAddrs = new Set();
function fakeAddr(seed, len = 44) { const r = rng('addr/' + seed); let s = ''; for (let i = 0; i < len; i++) s += B58ABC[Math.floor(r() * 58)]; demoAddrs.add(s); return s; }
const EXCHANGES = ['Binance', 'Coinbase', 'OKX', 'Kraken', 'Bybit', 'Backpack Exchange'];

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
    team: [
      { name: 'Ines Carvalho', role: 'Founder, engineering', x: 'https://x.com/ines_seeddemo', github: 'https://github.com/ines-seeddemo', linkedin: null, verified: { x: true, github: true, domain: false } },
      { name: 'Tomasz Wrona', role: 'Risk maths', x: 'https://x.com/twrona_seeddemo', github: null, linkedin: 'https://www.linkedin.com/in/twrona-seeddemo', verified: { x: true, github: false, domain: false } }
    ],
    founder: { name: 'Ines Carvalho', x: 'https://x.com/ines_seeddemo', xAgeDays: 1460, funding: { kind: 'exchange', label: 'Coinbase', hoursBeforeLaunch: 24 * 210 }, pastLaunches: [] },
    deck: 'assets/demo/decks/osprey.pdf',
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
    team: [
      { name: 'Aiko Tanaka', role: 'Founder, product', x: 'https://x.com/aiko_seeddemo', github: 'https://github.com/aiko-seeddemo', linkedin: 'https://www.linkedin.com/in/aiko-seeddemo', verified: { x: true, github: true, domain: true } },
      { name: 'Ruben Osei', role: 'Vault program', x: null, github: 'https://github.com/rosei-seeddemo', linkedin: null, verified: { x: false, github: true, domain: false } },
      { name: 'Lena Brandt', role: 'Markets', x: 'https://x.com/lbrandt_seeddemo', github: null, linkedin: 'https://www.linkedin.com/in/lbrandt-seeddemo', verified: { x: false, github: false, domain: false } }
    ],
    founder: { name: 'Aiko Tanaka', x: 'https://x.com/aiko_seeddemo', xAgeDays: 2200, funding: { kind: 'exchange', label: 'Kraken', hoursBeforeLaunch: 24 * 400 }, pastLaunches: [{ name: 'Basket', platform: 'Seed', outcome: 'seeded', daysAgo: 160 }] },
    deck: 'assets/demo/decks/tidewater.pdf',
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
    team: [
      { name: 'Priya Raman', role: 'Founder, engineering', x: 'https://x.com/priya_seeddemo', github: 'https://github.com/priya-seeddemo', linkedin: 'https://www.linkedin.com/in/priya-seeddemo', verified: { x: true, github: true, domain: true } },
      { name: 'Jonas Lund', role: 'Netting program', x: 'https://x.com/jlund_seeddemo', github: 'https://github.com/jlund-seeddemo', linkedin: null, verified: { x: true, github: true, domain: true } },
      { name: 'Mei Chen', role: 'Growth', x: 'https://x.com/meichen_seeddemo', github: null, linkedin: 'https://www.linkedin.com/in/meichen-seeddemo', verified: { x: true, github: false, domain: true } }
    ],
    founder: { name: 'Priya Raman', x: 'https://x.com/priya_seeddemo', xAgeDays: 2400, funding: { kind: 'exchange', label: 'Coinbase', hoursBeforeLaunch: 24 * 420 }, pastLaunches: [{ name: 'Gridline', platform: 'Seed', outcome: 'seeded', daysAgo: 220 }] },
    deck: 'assets/demo/decks/lattice.pdf',
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


  halfmoon: {
    tagline: 'Split a wallet’s staking yield with a friend.',
    description: `**Halfmoon splits staking yield between two wallets.**

Stake SOL once and choose who gets the rewards: all to you, half to a friend, or a fixed amount to a cause each epoch. The principal never moves. Only the rewards are routed.

### Who it is for
People who want to support someone every month without sending the same transfer by hand, and teams that want to share a validator's rewards with contributors.

### What the raise pays for
A review of the stake-routing program and a year of hosting.`,
    links: { website: 'https://halfmoon.example', x: 'https://x.com/halfmoon_seeddemo', telegram: null, discord: null, github: 'https://github.com/halfmoon-seeddemo' },
    team: [
      { name: 'Sam Okafor', role: 'Founder', x: 'https://x.com/samok_seeddemo', github: 'https://github.com/samok-seeddemo', linkedin: null, verified: { x: true, github: true, domain: false } },
      { name: 'Noor Haddad', role: 'Design', x: null, github: null, linkedin: 'https://www.linkedin.com/in/noor-seeddemo', verified: { x: false, github: false, domain: false } }
    ],
    founder: { name: 'Sam Okafor', x: 'https://x.com/samok_seeddemo', xAgeDays: 210, funding: { kind: 'exchange', label: 'OKX', hoursBeforeLaunch: 24 * 30 }, pastLaunches: [] },
    deck: 'assets/demo/decks/halfmoon.pdf',
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
    team: [
      { name: 'Hana Kim', role: 'Founder', x: 'https://x.com/hanakim_seeddemo', github: 'https://github.com/hanakim-seeddemo', linkedin: 'https://www.linkedin.com/in/hanakim-seeddemo', verified: { x: true, github: true, domain: true } },
      { name: 'Diego Ferraz', role: 'Engineering', x: 'https://x.com/dferraz_seeddemo', github: 'https://github.com/dferraz-seeddemo', linkedin: null, verified: { x: true, github: true, domain: false } },
      { name: 'Olu Adeyemi', role: 'Writer relations', x: 'https://x.com/olu_seeddemo', github: null, linkedin: 'https://www.linkedin.com/in/olu-seeddemo', verified: { x: false, github: false, domain: false } }
    ],
    founder: { name: 'Hana Kim', x: 'https://x.com/hanakim_seeddemo', xAgeDays: 1800, funding: { kind: 'exchange', label: 'Coinbase', hoursBeforeLaunch: 24 * 300 }, pastLaunches: [] },
    deck: 'assets/demo/decks/quill.pdf',
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
    team: [
      { name: 'Kai Mercer', role: 'Founder', x: 'https://x.com/kaimercer_seeddemo', github: null, linkedin: null, verified: { x: true, github: false, domain: false } },
      { name: 'Ada Novak', role: 'Engineering', x: null, github: 'https://github.com/adanovak-seeddemo', linkedin: null, verified: { x: false, github: true, domain: false } }
    ],
    founder: { name: 'Kai Mercer', x: 'https://x.com/kaimercer_seeddemo', xAgeDays: 400, funding: { kind: 'exchange', label: 'Bybit', hoursBeforeLaunch: 24 * 90 }, pastLaunches: [] },
    deck: 'assets/demo/decks/ember.pdf',
    updates: [{ title: 'Refunds are open', body: 'We did not reach the target. Every backer can claim a full refund on this page, fee included. Thank you for trying Ember with us.', daysAgo: 1, author: 'Kai Mercer' }],
    crowd: { top10: 0.46, fresh: 0.34, bundle: null, kols: 1, tracked: 0, repeat: 0.04 },
    chat: [
      { by: 'backer:2', body: 'How do refunds work?', mins: 1500 },
      { by: 'founder', body: 'Claim from Your position on this page. You get back everything you paid, the 1% fee included.', mins: 1440, reply: -1, pinned: true }
    ],
    watchers: 180
  }
};

/* the wider board: a lighter profile for each of these, built from a few lines into the same shape as the full ones */
function lite(o) {
  const links = Object.assign({ website: null, x: null, telegram: null, discord: null, github: null }, o.links || {});
  const team = (o.members || []).map(m => ({ name: m[0], role: m[1], x: m[2] || null, github: null, linkedin: null, verified: { x: !!m[2], github: false, domain: false } }));
  return {
    tagline: o.tagline, description: o.description || `**${o.tagline}**\n\n${o.about || ''}`, links,
    team, founder: { name: team[0] ? team[0].name : 'Founder', x: links.x, xAgeDays: o.xAge == null ? 420 : o.xAge, funding: o.funding || { kind: 'exchange', label: 'Coinbase', hoursBeforeLaunch: 24 * 60 }, pastLaunches: [] },
    deck: null, updates: o.updates || [],
    crowd: Object.assign({ top10: 0.33, fresh: 0.15, bundle: null, kols: 1, tracked: 2, repeat: 0.1 }, o.crowd || {}), chat: o.chat || [], watchers: o.watchers || 0
  };
}
const LITE = {
  cobalt: { tagline: 'Battery passports for second-life packs.', about: 'Cobalt records a pack\'s cycles and health on chain, so a used pack sells on its record, not a guess.', links: { website: 'https://cobalt.example', x: 'https://x.com/cobalt_seeddemo', discord: 'https://discord.gg/cobalt-seeddemo', github: 'https://github.com/cobalt-seeddemo' }, members: [['Ruth Adler', 'Founder', 'https://x.com/cobalt_seeddemo'], ['Kenji Mori', 'Hardware'], ['Ola Berg', 'Growth']], updates: [{ title: '400 packs logged', body: 'The Rotterdam yard has 400 packs on passports. Buyers are paying a premium for a full record.', daysAgo: 0.5, author: 'Ruth Adler' }, { title: 'Reader firmware shipped', body: 'The handheld reader writes a pack\'s health straight to its passport.', daysAgo: 6, author: 'Kenji Mori' }], chat: [{ by: 'backer:1', body: 'Who pays for the reader?', mins: 420 }, { by: 'team:1', body: 'The yard. It pays for itself in a week of sales.', mins: 400, reply: -1, pinned: true }], crowd: { top10: 0.27, fresh: 0.09, kols: 3, tracked: 5, repeat: 0.28 }, watchers: 480 },
  gully: { tagline: 'Storm-drain sensors that text the council.', about: 'Gully clips a level sensor into a drain and texts the council before it floods.', links: { website: 'https://gully.example' }, members: [['Pat Doyle', 'Founder']], xAge: 25, funding: { kind: 'wallet', label: 'Fresh wallet', hoursBeforeLaunch: 12 }, crowd: { top10: 0.6, fresh: 0.4, kols: 0, tracked: 0, repeat: 0.02 }, watchers: 18 }
};
Object.keys(LITE).forEach(id => { DEMO_PROFILES[id] = Object.assign(lite(LITE[id]), { demo: true }); });
/* every demo profile gets a mint (demo), deployer and team wallets (demo) */
Object.entries(DEMO_PROFILES).forEach(([id, pr]) => {
  pr.mint = pr.mint || fakeAddr('mint/' + id);
  pr.founder.wallet = fakeAddr('founder/' + id);
  pr.team.forEach((m, i) => { m.wallet = i === 0 ? pr.founder.wallet : fakeAddr('team/' + id + i); });
  pr.banner = `assets/demo/${id}-banner.svg`; pr.art = `assets/demo/${id}-art.svg`;
  pr.demo = true;
});

/* the profile for a presale: a demo profile, or the one a creator entered in the Launch form */
const profileOf = p => (p && (p.profile || DEMO_PROFILES[p.id])) || { links: {}, team: [], founder: { pastLaunches: [] }, updates: [], chat: [] };

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

/* the demo wallet backed four raises, so every claim flow can be tried: tokens (Quill), a refund (Ember), a live
   position (Osprey) and one waiting to seed (Cobalt) */
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
const DEMO_WALLET_BUYS = { quill: 500, ember: 400, osprey: 2, cobalt: 5 };
/* a roadmap milestone: `due` is days from now (negative: in the past); the states are planned, shipped and missed */
const road = (title, due, status, proofUrl) => ({ title, due, status, proofUrl: proofUrl || null });
function seedData() {
  const n = Date.now(), sol = SEED.demoSolUsd;
  /* o: id, name, ticker, q, target (in q), pct filled, backers, openedAgo, dur, and the model's own fields:
     status (live | filled | seeded | refunded), teamBps, teamSchedule, roadmap, tokenUseCase, xAccount, pastRaises,
     payoutWallet, resolvedAgo, seededAgo, filledAgo, seedStep, refundReason, poolX (pool price as a multiple of the raise
     price), volume (pool volume so far, in q), reports, blacklisted, takeover, pendingPayout */
  const mk = o => {
    const { id, name, ticker, q, target, pct, backers, openedAgo, dur, status = 'live' } = o, pr = DEMO_PROFILES[id];
    const openedAt = n - openedAgo, endsAt = openedAt + dur;
    const resolvedAt = status === 'live' ? null : n - (o.resolvedAgo != null ? o.resolvedAgo : o.seededAgo != null ? o.seededAgo : o.filledAgo || 0);
    const p = { id, name, ticker, idea: pr.tagline, q, target, targetUsd: r6(q === 'USDC' ? target : target * sol), solUsdAtOpen: sol, raised: r6(target * pct), backers, openedAt, endsAt, status, resolvedAt,
      feeBps: SEED.feeBps, creatorShareBps: SEED.creatorShareBps, teamBps: o.teamBps || 0, teamSchedule: o.teamBps ? o.teamSchedule : null,
      roadmap: (o.roadmap || []).map(r => Object.assign({}, r, { dueAt: n + r.due * D })), tokenUseCase: o.tokenUseCase || 'none',
      xAccount: Object.assign({ verified: true }, o.xAccount, { createdAt: n - (o.xAccount.ageDays || 400) * D }), pastRaises: o.pastRaises || [],
      payoutWallet: o.payoutWallet || fakeAddr('payout/' + id), pendingPayoutWallet: null, payoutEffectiveAt: null,
      reports: (o.reports || []).map((r, i) => Object.assign({ id: `${id}-r${i + 1}`, wallet: fakeAddr(`reporter/${id}/${i}`) }, r, { at: n - r.agoDays * D })),
      blacklisted: !!o.blacklisted, flag: o.flag ? Object.assign({}, o.flag, { at: n - o.flag.agoDays * D }) : null, takeover: o.takeover ? Object.assign({ from: fakeAddr('payout/' + id), to: fakeAddr('takeover/' + id) }, o.takeover, { at: n - o.takeover.agoDays * D }) : null,
      mine: false, hist: [], buys: [] };
    if (p.takeover) p.payoutWallet = p.takeover.to;
    if (o.pendingPayout) { p.pendingPayoutWallet = fakeAddr('pending/' + id); p.payoutEffectiveAt = n + o.pendingPayout * D; }
    if (status === 'filled') { p.filledAt = n - (o.filledAgo || 0); p.seedStep = o.seedStep || 'filled'; }
    if (status === 'seeded') { p.filledAt = n - (o.seededAgo || 0) - 40 * 60e3; p.seededAt = n - (o.seededAgo || 0); p.seedStep = 'seeded'; p.poolX = o.poolX || 1; p.fees = { volume: o.volume || 0, founderClaimed: o.founderClaimed || 0, seedClaimed: o.seedClaimed || 0 }; }
    if (status === 'refunded') p.refundReason = o.refundReason || 'missed';
    const end = p.seededAt || p.filledAt || resolvedAt || n;
    p.buys = genCrowd(p, pr.crowd, end);
    const mine = DEMO_WALLET_BUYS[id];
    if (mine) {   // the demo wallet backed this one: its buy is one of the backers, taken out of the last buy so the raise is unchanged
      const last = p.buys[p.buys.length - 1]; last.amount = r6(last.amount - mine);
      p.buys.push({ wallet: DEMO_WALLET_ID, amount: mine, paid: paidFor(mine), at: p.openedAt + (end - p.openedAt) * 0.4, fundedBy: { kind: 'exchange', label: 'Coinbase' }, isFresh: false, firstTxAt: p.openedAt - 400 * D, tags: [], you: true, refundClaimed: false });
      p.buys.sort((a, b) => a.at - b.at); p.backers++;
    }
    p.hist = histFromBuys(p, p.buys, end);
    return p;
  };
  const every = (cliffDays, intervalDays, bpsPerInterval) => ({ cliffDays, intervalDays, bpsPerInterval });
  return [
    /* live: a SOL raise past halfway, 15% team on a 30-day cliff then 10% a month */
    mk({ id: 'osprey', name: 'Osprey', ticker: 'OSPR', q: 'SOL', target: 85, pct: .62, backers: 212, openedAgo: 1.75 * D, dur: 3 * D, teamBps: 1500, teamSchedule: every(30, 30, 1000),
      roadmap: [road('Drift position reader', -30, 'shipped', 'https://github.com/osprey-seeddemo/reader/releases'), road('SMS alerts, closed beta', -6, 'shipped', 'https://osprey.example/beta'), road('Jupiter Perps and Zeta', 21, 'planned'), road('Voice call escalation', 45, 'planned')],
      tokenUseCase: 'Alerts are paid for in $OSPR. Holders get the first 50 alerts a month free.', xAccount: { handle: 'ines_seeddemo', followers: 4120, ageDays: 1460 } }),
    /* filled, seeding: the target landed 40 minutes ago; the crank has minted and is opening the pool */
    mk({ id: 'cobalt', name: 'Cobalt', ticker: 'CBLT', q: 'SOL', target: 220, pct: 1, backers: 301, openedAgo: 2.5 * D, dur: 3 * D, status: 'filled', filledAgo: 40 * 60e3, seedStep: 'minted', teamBps: 2000, teamSchedule: { tranches: [{ dayOffset: 90, bps: 2500 }, { dayOffset: 180, bps: 2500 }, { dayOffset: 365, bps: 5000 }] },
      roadmap: [road('Reader firmware', -12, 'shipped', 'https://cobalt.example/firmware'), road('First 1,000 packs', 20, 'planned'), road('Second yard', 75, 'planned')],
      tokenUseCase: 'A passport read costs 1 $CBLT, burned.', xAccount: { handle: 'cobalt_seeddemo', followers: 2630, ageDays: 900 } }),
    /* refunded: missed the target at the deadline; 5% team, one unlock at the 90-day minimum */
    mk({ id: 'ember', name: 'Ember', ticker: 'EMBR', q: 'USDC', target: 30000, pct: .41, backers: 58, openedAgo: 4 * D, dur: 3 * D, status: 'refunded', resolvedAgo: D, refundReason: 'missed', teamBps: 500, teamSchedule: every(90, 0, 10000),
      roadmap: [road('Bid rooms prototype', -10, 'shipped', 'https://ember.example/prototype'), road('Shared bidding program', -1, 'missed')],
      tokenUseCase: 'Bid rooms are opened with $EMBR.', xAccount: { handle: 'ember_seeddemo', followers: 880, ageDays: 400 } }),
    /* seeded above its raise price: 10% team on quarterly unlocks over three years; a payout wallet change is pending */
    mk({ id: 'quill', name: 'Quill', ticker: 'QUILL', q: 'USDC', target: 25000, pct: 1, backers: 264, openedAgo: 3.6 * D, dur: 3 * D, status: 'seeded', seededAgo: 2 * D, poolX: 1.9, volume: 212000, founderClaimed: 900, seedClaimed: 380, teamBps: 1000, teamSchedule: every(90, 90, 834), pendingPayout: 4,
      roadmap: [road('Tip links for Substack and Beehiiv', -20, 'shipped', 'https://quill.example/changelog#links'), road('Pool opens at the raise price', -2, 'shipped', 'https://app.meteora.ag'), road('100 writers tipping', -1, 'shipped', 'https://quill.example/writers'), road('Weekly buy-back from fees', 10, 'planned'), road('Ghost integration', 30, 'planned')],
      tokenUseCase: 'Tips are paid in $QUILL. Writers who hold 10,000 $QUILL skip the 2% tip fee.', xAccount: { handle: 'hanakim_seeddemo', followers: 18400, ageDays: 1800 }, pastRaises: [{ name: 'Inkwell', ticker: 'INK', outcome: 'seeded', at: n - 140 * D, note: 'Seeded in 2 days, pool still open' }] }),
    /* seeded below its raise price: 40% team, the largest share here, unlocked in four steps over 180 days */
    mk({ id: 'tidewater', name: 'Tidewater', ticker: 'TIDE', q: 'USDC', target: 60000, pct: 1, backers: 388, openedAgo: 12 * D, dur: 7 * D, status: 'seeded', seededAgo: 5 * D, poolX: .55, volume: 140000, founderClaimed: 0, seedClaimed: 0, teamBps: 4000, teamSchedule: every(30, 50, 2500),
      roadmap: [road('Vault program on devnet', -40, 'shipped', 'https://github.com/tidewater-seeddemo/vaults'), road('First audit', -5, 'missed'), road('First audit, rescheduled', 12, 'planned'), road('Nasdaq top ten vault on mainnet', 35, 'planned')],
      tokenUseCase: 'Index fees are rebated to $TIDE holders each month.', xAccount: { handle: 'aiko_seeddemo', followers: 7300, ageDays: 2200 } }),
    /* flagged: seeded, then the founder sold the team unlock and vanished; an admin marked the report as fraud */
    mk({ id: 'gully', name: 'Gully', ticker: 'GULY', q: 'SOL', target: 400, pct: 1, backers: 164, openedAgo: 20 * D, dur: 7 * D, status: 'seeded', seededAgo: 12 * D, poolX: .2, volume: 310, founderClaimed: 1.6, seedClaimed: .7, teamBps: 2500, teamSchedule: every(0, 7, 500),
      roadmap: [road('Sensor prototype', -30, 'shipped', 'https://gully.example/proto'), road('First council contract', -4, 'missed')],
      tokenUseCase: 'none', xAccount: { handle: 'gully_seeddemo', followers: 210, ageDays: 25 },
      reports: [{ reason: 'The founder sold the whole first unlock the day it opened and the site is down.', agoDays: 4, status: 'fraud' }, { reason: 'Roadmap milestone missed with no update, X account deleted.', agoDays: 3.5, status: 'open' }, { reason: 'Telegram group closed.', agoDays: 3, status: 'open' }],
      blacklisted: true, flag: { reportId: 'gully-r1', agoDays: 3, by: 'admin' } }),
    /* community takeover: seeded, the founder went quiet, backers reported it, an admin moved the payout wallet to a backer multisig */
    mk({ id: 'lattice', name: 'Lattice', ticker: 'LATT', q: 'USDC', target: 48000, pct: 1, backers: 176, openedAgo: 40 * D, dur: 7 * D, status: 'seeded', seededAgo: 32 * D, poolX: 1.1, volume: 96000, founderClaimed: 210, seedClaimed: 288, teamBps: 1200, teamSchedule: every(60, 60, 2000),
      roadmap: [road('Netting program on devnet', -60, 'shipped', 'https://github.com/lattice-seeddemo/netting'), road('Audit', -12, 'shipped', 'https://lattice.example/audit.pdf'), road('Mainnet vaults', -14, 'missed'), road('Integration grants open', 40, 'planned')],
      tokenUseCase: 'Netting fees are paid in $LATT.', xAccount: { handle: 'priya_seeddemo', followers: 5100, ageDays: 2400 },
      reports: [{ reason: 'No update in 25 days and the mainnet milestone passed. Asking for a takeover to the backer multisig.', agoDays: 10, status: 'takeover' }, { reason: 'Founder has not replied in chat since the audit.', agoDays: 9, status: 'open' }],
      takeover: { agoDays: 6, reportId: 'lattice-r1', by: 'admin', label: 'Backer multisig (3 of 5)' } }),
    /* live, no team tokens and no token use case: a plain bet on the team */
    mk({ id: 'halfmoon', name: 'Halfmoon', ticker: 'HALF', q: 'SOL', target: 300, pct: .20, backers: 141, openedAgo: 1.6 * D, dur: 7 * D, teamBps: 0, teamSchedule: null,
      roadmap: [road('Stake routing on devnet', -8, 'shipped', 'https://github.com/halfmoon-seeddemo/routing'), road('Mainnet', 30, 'planned')],
      tokenUseCase: 'none', xAccount: { handle: 'samok_seeddemo', followers: 1350, ageDays: 210 } })
  ];
}
