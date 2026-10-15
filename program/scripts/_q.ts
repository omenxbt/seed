import * as anchor from '@coral-xyz/anchor';
import { BN, web3 } from '@coral-xyz/anchor';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';
import { SeedClient, WSOL } from '../client/seed';
import idl from '../target/idl/seed.json';
(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider), c = new SeedClient(program, provider);
  const amm = new CpAmm(provider.connection);
  const r = await c.fetchRaise(new web3.PublicKey(process.argv[2]));
  const ps: any = await amm.fetchPoolState(r.pool), bf = ps.poolFees.baseFee.baseFeeInfo;
  console.log('baseFeeInfo', JSON.stringify(bf, (k, v) => v && v.toString && typeof v === 'object' && !Array.isArray(v) && v.constructor && v.constructor.name === 'BN' ? v.toString() : v).slice(0, 400));
  console.log('sqrt', ps.sqrtPrice.toString(), 'liq', ps.liquidity.toString(), 'slot', await provider.connection.getSlot()); console.log('dynamicFee', ps.poolFees.dynamicFee && ps.poolFees.dynamicFee.initialized, 'protocolFeePercent', ps.poolFees.protocolFeePercent, 'partner', ps.poolFees.partnerFeePercent);
  const now = Math.floor(Date.now() / 1000), slot = await provider.connection.getSlot();
  for (const a of process.argv.slice(3)) {
    const [side, amt] = a.split(':'), buy = side === 'buy';
    const inAmount = new BN(Math.round(Number(amt) * (buy ? 1e9 : 1e6)));
    try {
      const q: any = await amm.getQuote({ inAmount, inputTokenMint: buy ? r.pairMint : r.mint, slippage: 200, poolState: ps, currentTime: now, currentSlot: slot, tokenADecimal: 6, tokenBDecimal: 9 });
      console.log(a, 'ok out', q.swapOutAmount.toString(), 'fee', q.totalFee.toString(), 'impact', q.priceImpact.toString());
    } catch (e: any) { console.log(a, 'ERR', e.message); }
  }
})();
