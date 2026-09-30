/* ==========================================================================
   RISK CHECKS. Computed from adapter data, never set by hand. Thresholds are in js/config/risk.js.
   Each check is { id, label, level: pass | warn | fail | pending, reason, from }. `pending` is only used by the Launch form,
   for checks that need data a presale does not have until it is live (backers).
   ========================================================================== */
const pctTxt = v => (v >= 10 || v === 0 ? Math.round(v) : v.toFixed(1)) + '%';
const daysTxt = d => d >= 730 ? `${Math.floor(d / 365)} years` : d >= 60 ? `${Math.round(d / 30)} months` : `${Math.round(d)} days`;
const normName = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/* p: a presale (or a draft shaped like one). opts.draft skips the backer checks. */
function riskChecks(p, opts = {}) {
  const pr = profileOf(p), f = founderAdapter.get(p), out = [], add = (id, label, level, reason, from) => out.push({ id, label, level, reason, from });
  const fromPr = pr.demo ? 'demo' : 'self';

  // 1. founder X account age
  if (!f.x) add('x-age', 'Founder X account', 'warn', 'No founder X account is linked.', fromPr);
  else if (f.xAgeDays == null) add('x-age', 'Founder X account', opts.draft ? 'pending' : 'warn', 'Account age is not known yet.', fromPr);
  else add('x-age', 'Founder X account', f.xAgeDays < RISK.xAgeFailDays ? 'fail' : f.xAgeDays < RISK.xAgeWarnDays ? 'warn' : 'pass',
    `The founder’s X account is ${daysTxt(f.xAgeDays)} old${f.xAgeDays < RISK.xAgeWarnDays ? `, under ${f.xAgeDays < RISK.xAgeFailDays ? RISK.xAgeFailDays : RISK.xAgeWarnDays} days` : ''}.`, f.xFrom);

  // 2. founder wallet funding
  const fu = f.funding;
  if (!fu) add('funding', 'Founder wallet funding', opts.draft ? 'pending' : 'warn', opts.draft ? 'Read from Solana once you connect the deployer wallet.' : 'The founder wallet’s funding is not known.', f.from);
  else {
    const near = fu.hoursBeforeLaunch != null && fu.hoursBeforeLaunch < RISK.fundedNearLaunchHours, odd = fu.kind === 'bridge' || fu.kind === 'mixer';
    const how = fu.kind === 'exchange' ? `from ${fu.label}` : odd ? `through ${fu.label}, a ${fu.kind}` : fu.addr ? `by wallet ${shortMint(fu.addr)}` : 'from an unknown source';
    const when = fu.hoursBeforeLaunch == null ? '' : fu.hoursBeforeLaunch < 48 ? `, ${Math.max(0, Math.round(fu.hoursBeforeLaunch))}h before launch` : `, ${daysTxt(fu.hoursBeforeLaunch / 24)} before launch`;
    add('funding', 'Founder wallet funding', near || odd ? 'warn' : 'pass', `Funded ${how}${when}.`, f.from);
  }

  // 3. past launches by the same founder wallet
  const pl = f.pastLaunches || [], dumped = pl.filter(x => x.outcome === 'dumped');
  add('past', 'Past launches', dumped.length ? 'fail' : 'pass',
    dumped.length ? `${dumped.length} past launch${dumped.length > 1 ? 'es' : ''} from this wallet ended dumped: ${dumped.map(x => `${x.name} on ${x.platform}`).join(', ')}.`
      : pl.length ? `${pl.length} past launch${pl.length > 1 ? 'es' : ''}, none dumped.` : 'No past launches from this wallet.', f.from);

  // 4 to 6. the crowd
  if (opts.draft) {
    ['Top 10 backers', 'Bundled wallets', 'Fresh wallets'].forEach((l, i) => add(['top10', 'bundled', 'fresh'][i], l, 'pending', 'Checked once backers arrive.'));
  } else {
    const s = backersAdapter.summary(p);
    if (!s.n) ['Top 10 backers', 'Bundled wallets', 'Fresh wallets'].forEach((l, i) => add(['top10', 'bundled', 'fresh'][i], l, 'pass', 'No backers yet.', s.from));
    else {
      add('top10', 'Top 10 backers', s.top10 > RISK.top10FailPct ? 'fail' : s.top10 > RISK.top10WarnPct ? 'warn' : 'pass', `The 10 largest backers hold ${pctTxt(s.top10)} of the raise.`, s.from);
      add('bundled', 'Bundled wallets', s.bundled > RISK.bundledWarnPct ? 'warn' : 'pass',
        s.bundles.length ? `${s.bundles.reduce((a, b) => a + b.wallets, 0)} backers share ${s.bundles.length === 1 ? 'one funding wallet' : s.bundles.length + ' funding wallets'} and hold ${pctTxt(s.bundled)} of the raise.` : `No ${RISK.bundleMinWallets} or more backers share a funding wallet.`, s.from);
      add('fresh', 'Fresh wallets', s.fresh > RISK.freshWarnPct ? 'warn' : 'pass', `${pctTxt(s.fresh)} of backers made their first transaction less than ${RISK.freshWalletDays} days before backing.`, s.from);
    }
  }

  // 7. name or ticker clash
  const tk = String(p.ticker || '').toUpperCase(), nm = normName(p.name);
  const seedHit = state.presales.find(x => x.id !== p.id && x.status === 'live' && (x.ticker === tk || (nm && normName(x.name) === nm)));
  const topHit = TOP_TOKENS.find(t => t[0] === tk || (nm && normName(t[1]) === nm));
  add('clash', 'Name and ticker', seedHit || topHit ? 'warn' : 'pass',
    seedHit ? `${seedHit.ticker === tk ? '$' + tk : p.name} is already used by ${seedHit.name}, a live Seed presale.` : topHit ? `${topHit[0] === tk ? '$' + tk : p.name} matches ${topHit[1]} ($${topHit[0]}), one of the 500 largest Solana tokens.` : 'No clash with a live Seed presale or a top-500 Solana token.');

  // 8 to 10. what a backer can check for themselves
  add('website', 'Website', pr.links && pr.links.website ? 'pass' : 'warn', pr.links && pr.links.website ? 'A website is listed.' : 'No website is listed.', fromPr);
  add('deck', 'Deck', pr.deck ? 'pass' : 'warn', pr.deck ? 'A deck is attached.' : 'No deck is attached.', fromPr);
  add('team', 'Team', pr.team && pr.team.length ? 'pass' : 'warn', pr.team && pr.team.length ? `${pr.team.length} team member${pr.team.length > 1 ? 's' : ''} listed.` : 'No team is listed.', fromPr);

  // 11. insider allocation without vesting
  const ins = (pr.tokenomics.allocations || []).filter(a => a.kind === 'team' || a.kind === 'treasury'), insPct = ins.reduce((a, x) => a + x.pct, 0), unvested = ins.filter(a => !a.vesting || !a.vesting.durationDays);
  add('vesting', 'Team and treasury vesting', insPct > RISK.teamTreasuryMaxPct && unvested.length ? 'fail' : 'pass',
    insPct > RISK.teamTreasuryMaxPct && unvested.length ? `Team and treasury hold ${insPct}% of supply and ${unvested.map(a => a.label.toLowerCase()).join(' and ')} ${unvested.length > 1 ? 'have' : 'has'} no vesting.`
      : insPct ? `Team and treasury hold ${insPct}% of supply${unvested.length ? '' : ', all vesting'}.` : 'No team or treasury allocation.', fromPr);
  return out;
}
function riskSummary(checks) {
  const fails = checks.filter(c => c.level === 'fail').length, warns = checks.filter(c => c.level === 'warn').length;
  const parts = []; if (fails) parts.push(`${fails} fail${fails > 1 ? 's' : ''}`); if (warns) parts.push(`${warns} warning${warns > 1 ? 's' : ''}`);
  return { fails, warns, level: fails ? 'fail' : warns ? 'warn' : 'pass', text: parts.length ? parts.join(', ') : 'All checks pass' };
}
const RISK_ICON = {
  pass: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M5.2 8.3l1.9 1.9 3.8-4.1"/></svg>',
  warn: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2l6.2 11H1.8z"/><path d="M8 6.4v3.2M8 11.4v.1"/></svg>',
  fail: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8"/></svg>',
  pending: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.8V8l2.2 1.4"/></svg>'
};
const riskChip = (s, extra = '') => `<span class="risk-chip ${s.level}"${extra}>${RISK_ICON[s.level]}${esc(s.text)}</span>`;
