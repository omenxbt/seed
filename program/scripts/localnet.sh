#!/bin/sh
# A local validator that can run the whole suite, admin tests included: Meteora's DAMM v2 program, Pyth's SOL/USD
# account and the devnet USDC mint (the test-mode witness) are cloned from devnet, and the devnet build of Seed is
# loaded straight in. Needs a devnet RPC URL as $1 (the public one works for cloning). Then:
#   ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=keys/deployer.json npx ts-mocha -p tsconfig.json -t 300000 tests/seed.ts
# The Pyth account is a snapshot, so restart this before each run (open_raise refuses a price older than 15 minutes).
set -e
cd "$(dirname "$0")/.."
RPC="${1:-https://api.devnet.solana.com}"
LEDGER="${TMPDIR:-/tmp}/seed-ledger"
rm -rf "$LEDGER"
solana-test-validator -r --ledger "$LEDGER" --url "$RPC" \
  --clone-upgradeable-program cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG \
  --clone 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE \
  --clone 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
  --bpf-program 8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn target/deploy/seed.so --quiet &
until solana cluster-version -u http://127.0.0.1:8899 >/dev/null 2>&1; do sleep 2; done
solana airdrop 50 -u http://127.0.0.1:8899 keys/deployer.json >/dev/null
echo "localnet up; the deployer wallet has 50 SOL"
wait
