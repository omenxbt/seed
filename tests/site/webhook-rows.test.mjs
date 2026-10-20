/* The indexer's row mapping, read from the webhook's source: the RaiseOpened upsert names every column the raises table needs,
   and none of them sits behind a // comment on its line (a comment dropped mid-object once swallowed payout_wallet and
   metadata_uri, and no raise reached the site: QA P0-F14). The event layouts are checked the same way. Run: node --test tests/site/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../supabase/functions/helius-webhook/index.ts', import.meta.url), 'utf8');
const events = readFileSync(new URL('../../supabase/functions/_shared/events.ts', import.meta.url), 'utf8');
const stripComments = s => s.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');   // what the compiler sees

test('the RaiseOpened upsert carries every column the raises row needs, none commented out', () => {
  const i = src.indexOf("if (name === 'RaiseOpened')"), j = src.indexOf('ignoreDuplicates: true', i);
  const block = stripComments(src.slice(i, j));
  for (const col of ['id:', 'address:', 'founder:', 'name:', 'ticker:', 'pair_mint:', 'target:', 'target_usd:', 'sol_usd_at_open:', 'team_bps:', 'team_schedule:', 'payout_wallet:', 'metadata_uri:', "status: 'live'", 'opened_at:', 'ends_at:', 'updated_at:'])
    assert.ok(block.includes(col), `${col} is in the upsert and not behind a comment`);
});
test('no object literal in the webhook has a comment swallowing fields', () => {
  for (const [n, line] of src.split('\n').entries()) {
    const c = line.indexOf('//'); if (c < 0 || line.trim().startsWith('//') || line.includes('://')) continue;
    const after = line.slice(c);
    assert.ok(!/\w+: [^,]+,\s*\w+:/.test(after) || !/payout_wallet|metadata_uri|team_schedule|status:/.test(after), `line ${n + 1} has fields after its comment: ${after.slice(0, 80)}`);
  }
});
test('the RaiseOpened event layout ends with the optional fields, in the program\'s order', () => {
  const m = /RaiseOpened: \[([\s\S]*?\])\],/.exec(events); assert.ok(m);   // up to the outer array's end, keeping the last entry's bracket
  const names = [...m[1].matchAll(/\['([a-z0-9_?]+)', '(\w+)'\]/g)].map(x => x[2]);
  assert.deepEqual(names, ['raise', 'founder', 'xHandleHash', 'pairMint', 'target', 'targetUsdCents', 'solUsdCents', 'teamBps', 'payoutWallet', 'openedAt', 'endsAt', 'name', 'ticker', 'schedule', 'uri', 'even']);
});
