// Makes Seed's address lookup table on a cluster (client/alt.ts lists what goes in it) and prints its address, which goes
// into js/config/seed.js as `lookupTable`. With an existing table's address it appends whatever the list has gained.
//   ANCHOR_PROVIDER_URL=<rpc> ANCHOR_WALLET=keys/deployer.json npx ts-node -P tsconfig.json scripts/alt.ts devnet|mainnet [table address]
import * as anchor from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import idl from '../target/idl/seed.json';
import { fixedAddresses } from '../client/alt';

const [cluster = 'devnet', existing] = process.argv.slice(2);
if (cluster !== 'devnet' && cluster !== 'mainnet') throw new Error('cluster: devnet or mainnet');

(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const conn = provider.connection, authority = provider.wallet.publicKey, pid = new web3.PublicKey(process.env.SEED_PROGRAM_ID || (idl as any).address);   // SEED_PROGRAM_ID: a staging deployment's id
  const want = fixedAddresses(pid, cluster);
  const ixs: web3.TransactionInstruction[] = []; let table: web3.PublicKey;
  if (existing) {
    table = new web3.PublicKey(existing);
    const cur = (await conn.getAddressLookupTable(table)).value; if (!cur) throw new Error('no table at ' + existing);
    const have = new Set(cur.state.addresses.map(k => k.toBase58())), add = want.filter(k => !have.has(k.toBase58()));
    console.log(`table ${existing} holds ${have.size}; ${add.length} to add`);
    if (!add.length) return;
    ixs.push(web3.AddressLookupTableProgram.extendLookupTable({ lookupTable: table, authority, payer: authority, addresses: add }));
  } else {
    const slot = await conn.getSlot('finalized');
    const [create, key] = web3.AddressLookupTableProgram.createLookupTable({ authority, payer: authority, recentSlot: slot });
    table = key; ixs.push(create, web3.AddressLookupTableProgram.extendLookupTable({ lookupTable: table, authority, payer: authority, addresses: want }));
  }
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('finalized');   // finalized: the public RPC's simulation node may lag a confirmed one
  const tx = new web3.Transaction({ feePayer: authority, blockhash, lastValidBlockHeight }).add(...ixs);
  const sig = await provider.sendAndConfirm(tx, [], { commitment: 'confirmed', skipPreflight: true });   // no preflight: the public RPC's simulation node reports a fresh blockhash as unknown
  const after = (await conn.getAddressLookupTable(table, { commitment: 'confirmed' })).value!;
  console.log(`table ${table.toBase58()} on ${cluster}: ${after.state.addresses.length} addresses, authority ${after.state.authority?.toBase58()}, tx ${sig}`);
  after.state.addresses.forEach((k, i) => console.log(`  ${String(i).padStart(2)} ${k.toBase58()}`));
})();
