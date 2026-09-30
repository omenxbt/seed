// Checks a Seed chat session: a plain-text message the wallet signed once per browser session.
// No dependencies, so the same file runs in the Edge Function (Deno) and in the local test (Node).
//
// The message the site asks the wallet to sign:
//   Seed chat sign-in
//   Domain: <host the page was served from>
//   Wallet: <base58 public key>
//   Issued: <ISO time>
//   Nonce: <random hex>
//   <blank line and a sentence saying it is not a transaction>

export type Session = { wallet: string; message: string; signature: string };
export const SESSION_HOURS = 24;

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58Decode(s: string): Uint8Array {
  let n = 0n;
  for (const c of s) { const i = B58.indexOf(c); if (i < 0) throw new Error('not base58'); n = n * 58n + BigInt(i); }
  const out: number[] = [];
  while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; }
  for (const c of s) { if (c === '1') out.unshift(0); else break; }
  return new Uint8Array(out);
}
function base64Decode(s: string): Uint8Array { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }

/** Returns the verified wallet, or throws with a reason a person can read. */
export async function verifySession(sess: Session, allowedDomains: string[], now = Date.now()): Promise<string> {
  if (!sess || typeof sess.message !== 'string' || typeof sess.signature !== 'string' || typeof sess.wallet !== 'string') throw new Error('Sign in to chat first.');
  if (sess.message.length > 600) throw new Error('That sign-in message is not one Seed issued.');
  const lines = sess.message.split('\n');
  if (lines[0] !== 'Seed chat sign-in') throw new Error('That sign-in message is not one Seed issued.');
  const f: Record<string, string> = {};
  for (const l of lines.slice(1, 5)) { const i = l.indexOf(': '); if (i > 0) f[l.slice(0, i)] = l.slice(i + 2); }
  if (f.Wallet !== sess.wallet) throw new Error('The signed message names a different wallet.');
  if (!allowedDomains.includes(f.Domain)) throw new Error('The message was signed for a different site.');
  const issued = Date.parse(f.Issued);
  if (!Number.isFinite(issued) || issued > now + 5 * 60e3 || now - issued > SESSION_HOURS * 3600e3) throw new Error('The sign-in has expired. Sign again.');
  let key: Uint8Array, sig: Uint8Array;
  try { key = base58Decode(sess.wallet); sig = base64Decode(sess.signature); } catch { throw new Error('The signature is malformed.'); }
  if (key.length !== 32 || sig.length !== 64) throw new Error('The signature is malformed.');
  const pub = await crypto.subtle.importKey('raw', key, { name: 'Ed25519' }, false, ['verify']);
  const ok = await crypto.subtle.verify({ name: 'Ed25519' }, pub, sig, new TextEncoder().encode(sess.message));
  if (!ok) throw new Error('The signature does not match the wallet.');
  return sess.wallet;
}
