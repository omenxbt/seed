// The Seed program's events, decoded from transaction logs. One layout per event, in the field order the program
// declares them (program/programs/seed/src/events.rs). An Anchor event in a log is "Program data: <base64>", whose
// first 8 bytes are sha256("event:<Name>")[0..8] and the rest the borsh-encoded fields.
// No dependencies: runs in the Edge Functions (Deno) and in the local test (Node).

export type Field = ['u8' | 'u16' | 'u32' | 'u64' | 'i64' | 'pubkey' | 'string' | 'string?' | 'hash32' | 'opt_hash32' | 'bool' | 'tranches', string];
export const EVENTS: Record<string, Field[]> = {
  RaiseOpened: [['pubkey', 'raise'], ['pubkey', 'founder'], ['opt_hash32', 'xHandleHash'], ['pubkey', 'pairMint'], ['u64', 'target'], ['u64', 'targetUsdCents'], ['u64', 'solUsdCents'],
    ['u16', 'teamBps'], ['pubkey', 'payoutWallet'], ['i64', 'openedAt'], ['i64', 'endsAt'], ['string', 'name'], ['string', 'ticker'], ['tranches', 'schedule'], ['string?', 'uri']],   // string?: absent in events from before the metadata step
  Contributed: [['pubkey', 'raise'], ['pubkey', 'wallet'], ['u64', 'amount'], ['u64', 'fee'], ['u64', 'raised'], ['u32', 'backers'], ['i64', 'at']],
  RaiseFilled: [['pubkey', 'raise'], ['i64', 'at']],
  RaiseMinted: [['pubkey', 'raise'], ['pubkey', 'mint'], ['i64', 'at']],
  RaisePooled: [['pubkey', 'raise'], ['pubkey', 'pool'], ['pubkey', 'position'], ['i64', 'at']],
  RaiseSeeded: [['pubkey', 'raise'], ['i64', 'at']],
  RaiseRefunded: [['pubkey', 'raise'], ['u8', 'reason'], ['i64', 'at']],
  RefundClaimed: [['pubkey', 'raise'], ['pubkey', 'wallet'], ['u64', 'amount'], ['i64', 'at']],
  TokensClaimed: [['pubkey', 'raise'], ['pubkey', 'wallet'], ['u64', 'tokens'], ['i64', 'at']],
  FeesClaimed: [['pubkey', 'raise'], ['pubkey', 'by'], ['u64', 'founder'], ['u64', 'seed'], ['i64', 'at']],
  VestedClaimed: [['pubkey', 'raise'], ['u64', 'tokens'], ['i64', 'at']],
  PayoutChangeRequested: [['pubkey', 'raise'], ['pubkey', 'from'], ['pubkey', 'to'], ['i64', 'effectiveAt'], ['i64', 'at']],
  PayoutChanged: [['pubkey', 'raise'], ['pubkey', 'to'], ['i64', 'at']],
  FraudFlagged: [['pubkey', 'raise'], ['pubkey', 'founder'], ['opt_hash32', 'xHandleHash'], ['pubkey', 'by'], ['i64', 'at']],
  XLinked: [['pubkey', 'raise'], ['pubkey', 'founder'], ['hash32', 'xHandleHash'], ['i64', 'at']],
  TakeoverApproved: [['pubkey', 'raise'], ['pubkey', 'from'], ['pubkey', 'to'], ['pubkey', 'by'], ['i64', 'at']]
};
export const REFUND_REASON = ['missed', 'cancelled', 'timeout'];

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58(bytes: Uint8Array): string {
  let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b);
  let out = ''; while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; out = '1' + out; }
  return out;
}
const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');

class Reader {
  o = 0; dv: DataView;
  constructor(public b: Uint8Array) { this.dv = new DataView(b.buffer, b.byteOffset, b.byteLength); }
  u8() { return this.dv.getUint8(this.o++); }
  u16() { const v = this.dv.getUint16(this.o, true); this.o += 2; return v; }
  u32() { const v = this.dv.getUint32(this.o, true); this.o += 4; return v; }
  u64() { const v = this.dv.getBigUint64(this.o, true); this.o += 8; return v; }
  i64() { const v = this.dv.getBigInt64(this.o, true); this.o += 8; return v; }
  bytes(n: number) { const v = this.b.subarray(this.o, this.o + n); this.o += n; return v; }
  string() { const n = this.u32(); return new TextDecoder().decode(this.bytes(n)); }
}
export function decodeFields(fields: Field[], data: Uint8Array): Record<string, unknown> {
  const r = new Reader(data), out: Record<string, unknown> = {};
  for (const [t, k] of fields) {
    out[k] = t === 'u8' ? r.u8() : t === 'u16' ? r.u16() : t === 'u32' ? r.u32() : t === 'u64' ? r.u64() : t === 'i64' ? r.i64() : t === 'bool' ? r.u8() === 1
      : t === 'pubkey' ? base58(r.bytes(32)) : t === 'hash32' ? hex(r.bytes(32)) : t === 'opt_hash32' ? (r.u8() ? hex(r.bytes(32)) : null) : t === 'string' ? r.string() : t === 'string?' ? (r.o < r.b.length ? r.string() : '')
      : (() => { const n = r.u32(), t2 = []; for (let i = 0; i < n; i++) t2.push({ dayOffset: r.u32(), bps: r.u16() }); return t2; })();
  }
  return out;
}

/* the 8-byte discriminators, computed once */
let discs: Map<string, string> | null = null;
async function discriminators() {
  if (discs) return discs;
  discs = new Map();
  for (const name of Object.keys(EVENTS)) {
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('event:' + name)));
    discs.set(hex(h.subarray(0, 8)), name);
  }
  return discs;
}
/* every Seed event in a transaction's log lines, in order */
export async function eventsInLogs(logs: string[]): Promise<{ name: string; data: Record<string, unknown> }[]> {
  const d = await discriminators(), out = [];
  for (const line of logs) {
    if (!line.startsWith('Program data: ')) continue;
    let bytes: Uint8Array; try { bytes = Uint8Array.from(atob(line.slice(14)), (c) => c.charCodeAt(0)); } catch { continue; }
    const name = d.get(hex(bytes.subarray(0, 8))); if (!name) continue;
    try { out.push({ name, data: decodeFields(EVENTS[name], bytes.subarray(8)) }); } catch { /* not ours, or a layout from another version */ }
  }
  return out;
}
