/* ==========================================================================
   THE INFO PANEL. What a backer should know about a raise, computed from the raise and the adapters, never typed by hand.
   Two kinds of row:
     checks   facts Seed can check and grade: the founder's X account age, past raises, the crowd (top 10, bundles, fresh
              wallets), a name or ticker clash, a missing roadmap or website. level: pass | warn | fail | pending.
     info     the founder's own choices, shown plainly and never graded: the team share and its unlocks, what the token does.
              level: info.
   Thresholds are in js/config/risk.js. `pending` is only used by the Launch form, for checks that need a live raise.
   ========================================================================== */
const pctTxt = v => (v >= 10 || v === 0 ? Math.round(v) : v.toFixed(1)) + '%';
const daysTxt = d => d >= 730 ? `${Math.floor(d / 365)} years` : d >= 60 ? `${Math.round(d / 30)} months` : `${Math.round(d)} days`;
const normName = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/* p: a raise (or a draft shaped like one). opts.draft skips the backer checks. */
function riskChecks(p, opts = {}) {
  const pr = profileOf(p), f = founderAdapter.get(p), out = [], add = (id, label, level, reason, from) => out.push({ id, label, level, reason, from });
  const fromPr = pr.demo ? 'demo' : 'self', x = p.xAccount || {}, now = Date.now();

  // 1. the founder's X account: the one they signed in with, or the one on the profile
  const xAge = x.createdAt ? (now - x.createdAt) / D : f.xAgeDays;
  if (!x.handle && !f.x) add('x-age', 'Founder X account', opts.draft ? 'pending' : 'warn', opts.draft ? 'Sign in with X to open; the account age shows here.' : 'No X account is linked to this raise.', fromPr);
  else if (xAge == null) add('x-age', 'Founder X account', opts.draft ? 'pending' : 'warn', 'Account age is not known yet.', fromPr);
  else add('x-age', 'Founder X account', xAge < RISK.xAgeFailDays ? 'fail' : xAge < RISK.xAgeWarnDays ? 'warn' : 'pass',
    `${x.handle ? '@' + x.handle : 'The founder’s X account'} is ${daysTxt(xAge)} old${xAge < RISK.xAgeWarnDays ? `, under ${xAge < RISK.xAgeFailDays ? RISK.xAgeFailDays : RISK.xAgeWarnDays} days` : ''}${x.followers != null ? `, ${Number(x.followers).toLocaleString('en-US')} followers` : ''}.`, x.handle ? fromPr : f.xFrom);

  // 2. earlier raises on Seed by this X account, and launches elsewhere by this wallet
  const past = p.pastRaises || [], flagged = past.filter(r => r.outcome === 'flagged'), pl = f.pastLaunches || [], dumped = pl.filter(e => e.outcome === 'dumped');
  add('past', 'Past raises', flagged.length || dumped.length ? 'fail' : 'pass',
    flagged.length ? `${flagged.length} earlier Seed raise${flagged.length > 1 ? 's' : ''} by this account ${flagged.length > 1 ? 'were' : 'was'} flagged for fraud: ${flagged.map(r => '$' + r.ticker).join(', ')}.`
      : dumped.length ? `${dumped.length} past launch${dumped.length > 1 ? 'es' : ''} from this wallet ended dumped: ${dumped.map(e => `${e.name} on ${e.platform}`).join(', ')}.`
      : past.length ? `${past.length} earlier Seed raise${past.length > 1 ? 's' : ''}: ${past.map(r => `$${r.ticker} ${r.outcome}`).join(', ')}.` : 'The first raise by this account on Seed.', fromPr);

  // 3 to 5. the crowd
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

  // 6. name or ticker clash
  const tk = String(p.ticker || '').toUpperCase(), nm = normName(p.name);
  const seedHit = state.presales.find(e => e.id !== p.id && e.status === 'live' && (e.ticker === tk || (nm && normName(e.name) === nm)));
  const topHit = TOP_TOKENS.find(t => t[0] === tk || (nm && normName(t[1]) === nm));
  add('clash', 'Name and ticker', seedHit || topHit ? 'warn' : 'pass',
    seedHit ? `${seedHit.ticker === tk ? '$' + tk : p.name} is already used by ${seedHit.name}, a live Seed raise.` : topHit ? `${topHit[0] === tk ? '$' + tk : p.name} matches ${topHit[1]} ($${topHit[0]}), one of the 500 largest Solana tokens.` : 'No clash with a live Seed raise or a top-500 Solana token.');

  // 7 and 8. what a backer can check for themselves
  const road = (typeof roadmapOf === 'function' ? roadmapOf(p) : p.roadmap || pr.roadmap || []);
  add('roadmap', 'Roadmap', road.length ? 'pass' : 'warn', road.length ? `${road.length} milestone${road.length > 1 ? 's' : ''} listed, ${road.filter(r => r.status === 'shipped').length} shipped.` : 'No roadmap is listed.', fromPr);
  add('website', 'Website', pr.links && pr.links.website ? 'pass' : 'warn', pr.links && pr.links.website ? 'A website is listed.' : 'No website is listed.', fromPr);

  // the founder's choices, as facts
  const sp = splitOf(p.teamBps || 0), teamPct = (p.teamBps || 0) / 100;
  add('team-share', 'Team share', 'info', sp.team ? `${teamPct.toFixed(teamPct % 1 ? 2 : 0)}% of the supply (${fmtTok(sp.team)} tokens) goes to the team: ${p.teamSchedule ? fmtSchedule(p.teamSchedule) : 'schedule to be set'}. Backers and the pool get ${pctTxt(sp.backers / SEED.supply * 100)} each.` : 'No team tokens. The supply splits evenly between backers and the locked pool.', fromPr);
  add('use', 'What the token does', 'info', p.tokenUseCase && p.tokenUseCase !== 'none' ? p.tokenUseCase : 'Nothing stated. This is a bet on the team, not on a token with a use.', fromPr);
  return out;
}
/* the grade only counts the checks; info rows are facts and are not graded */
function riskSummary(checks) {
  const fails = checks.filter(c => c.level === 'fail').length, warns = checks.filter(c => c.level === 'warn').length;
  const parts = []; if (fails) parts.push(`${fails} fail${fails > 1 ? 's' : ''}`); if (warns) parts.push(`${warns} warning${warns > 1 ? 's' : ''}`);
  return { fails, warns, level: fails ? 'fail' : warns ? 'warn' : 'pass', text: parts.length ? parts.join(', ') : 'All checks pass' };
}
const RISK_ICON = {
  pass: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M5.2 8.3l1.9 1.9 3.8-4.1"/></svg>',
  warn: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2l6.2 11H1.8z"/><path d="M8 6.4v3.2M8 11.4v.1"/></svg>',
  fail: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8"/></svg>',
  pending: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.8V8l2.2 1.4"/></svg>',
  info: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.2v4M8 4.9v.1"/></svg>'
};
const riskChip = (s, extra = '') => `<span class="risk-chip ${s.level}"${extra}>${RISK_ICON[s.level]}${esc(s.text)}</span>`;
/* the panel itself: the checks, then the founder's choices under their own heading */
function infoList(checks) {
  const li = c => `<li class="${c.level}">${RISK_ICON[c.level]}<div><b>${esc(c.label)}</b><span>${esc(c.reason)}</span></div></li>`;
  const graded = checks.filter(c => c.level !== 'info'), facts = checks.filter(c => c.level === 'info');
  return `<ul class="risk-list">${graded.map(li).join('')}</ul>${facts.length ? `<p class="info-h">The founder's choices</p><ul class="risk-list">${facts.map(li).join('')}</ul>` : ''}`;
}
