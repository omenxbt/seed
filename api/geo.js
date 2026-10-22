// The viewer's country, from the edge (ISO code, "" when unknown, as on a local copy). The site checks it against
// SEED.blockedCountries at wallet connect; nothing else is kept or sent anywhere.
export const config = { runtime: 'edge' };
export default function handler(req) {
  const country = req.headers.get('x-vercel-ip-country') || '';
  return new Response(JSON.stringify({ country }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
