// Client error reports: a short message, where it happened and the page, written to the function's log (the Vercel
// dashboard's Logs, searchable by "client-error"). No wallet, no IP beyond what the platform logs, nothing stored.
export const config = { runtime: 'edge' };
export default async function handler(req) {
  if (req.method !== 'POST') return new Response('POST', { status: 405 });
  let b; try { b = await req.json(); } catch { return new Response('bad', { status: 400 }); }
  const line = { kind: 'client-error', msg: String(b.msg || '').slice(0, 300), at: String(b.at || '').slice(0, 200), page: String(b.page || '').slice(0, 120), ver: String(b.ver || '').slice(0, 40), t: new Date().toISOString() };
  console.error(JSON.stringify(line));
  return new Response('ok', { headers: { 'cache-control': 'no-store' } });
}
