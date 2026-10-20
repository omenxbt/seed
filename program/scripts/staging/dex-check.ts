// Stage 2: what the public DEX indexes say about a mint. Read-only, no keys, no SOL.
//   npx ts-node -P tsconfig.json scripts/staging/dex-check.ts <mint>
const mint = process.argv[2]; if (!mint) throw new Error('mint');
const get = async (u: string) => { const r = await fetch(u, { headers: { accept: 'application/json' } }); return { status: r.status, body: r.ok ? await r.json() : await r.text() }; };
(async () => {
  const ds = await get(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
  const pairs: any[] = ds.status === 200 ? (ds.body.pairs || []) : [];
  console.log(`DEXScreener: ${ds.status}, ${pairs.length} pair(s)` + pairs.map(p => ` · ${p.dexId} ${p.pairAddress} liq $${p.liquidity?.usd} vol24h $${p.volume?.h24} txns24h ${JSON.stringify(p.txns?.h24)}`).join(''));
  const jt = await get(`https://lite-api.jup.ag/tokens/v2/search?query=${mint}`);
  const found = jt.status === 200 && Array.isArray(jt.body) && jt.body.some((t: any) => t.id === mint || t.address === mint);
  console.log(`Jupiter token search: ${jt.status}, ${found ? 'listed' : 'not listed'}`);
  const jq = await get(`https://lite-api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${mint}&amount=10000000&slippageBps=300`);
  console.log(`Jupiter quote for 0.01 SOL: ${jq.status}${jq.status === 200 ? `, out ${jq.body.outAmount}, route ${(jq.body.routePlan || []).map((s: any) => s.swapInfo?.label).join(' > ')}` : `, ${String(jq.body).slice(0, 120)}`}`);
  const be = await get(`https://public-api.birdeye.so/defi/token_overview?address=${mint}`);
  console.log(`Birdeye (public, may need a key): ${be.status}${be.status === 200 ? `, liquidity $${be.body?.data?.liquidity}` : ''}`);
  console.log('Axiom and GMGN have no public API: open axiom.trade/t/<mint> and gmgn.ai/sol/token/<mint> in a browser.');
})();
