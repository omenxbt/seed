#!/bin/sh
# Stage 1 of the mainnet preparation: a local validator that is mainnet as far as Seed can tell. Meteora's DAMM v2, Metaplex
# Token Metadata, Pyth's SOL/USD price account and the mainnet USDC mint are cloned from mainnet (read-only; nothing is sent
# there), and the devnet build of Seed is loaded under its program id. The devnet USDC mint is loaded from a saved snapshot
# (devnet-usdc-mint.json) only so the config can be made in test mode, where a day is a minute: that is the "warped time"
# the lifecycle rehearsal (lifecycle.ts) runs under, with every other term as production has it (81 SOL, 125 bps, 1%).
#   sh scripts/rehearsal/mainnet-local.sh [mainnet rpc url]      # the public endpoint works for cloning
#   ANCHOR_PROVIDER_URL=http://127.0.0.1:8999 ANCHOR_WALLET=keys/deployer.json npx ts-node -P tsconfig.json scripts/rehearsal/lifecycle.ts
# The Pyth account is a snapshot: open_raise refuses a price older than fifteen minutes, so start the lifecycle right after.
set -e
cd "$(dirname "$0")/../.."
RPC="${1:-https://api.mainnet-beta.solana.com}"
PORT="${PORT:-8999}"   # its own ports, so a validator another session runs on 8899 is left alone
LEDGER="${TMPDIR:-/tmp}/seed-mainnet-rehearsal"
rm -rf "$LEDGER"
solana-test-validator -r --ledger "$LEDGER" --url "$RPC" --rpc-port "$PORT" --faucet-port "$((PORT + 1))" --gossip-port "$((PORT + 2))" --dynamic-port-range "$((PORT + 100))-$((PORT + 200))" \
  --clone-upgradeable-program cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG \
  --clone-upgradeable-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s \
  --clone 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE \
  --clone EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU scripts/rehearsal/devnet-usdc-mint.json \
  --bpf-program 8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn target/deploy/seed.so --quiet &
until solana cluster-version -u "http://127.0.0.1:$PORT" >/dev/null 2>&1; do sleep 2; done
solana airdrop 500 -u "http://127.0.0.1:$PORT" keys/deployer.json >/dev/null
echo "mainnet rehearsal validator up at http://127.0.0.1:$PORT; the deployer wallet has 500 SOL"
wait
