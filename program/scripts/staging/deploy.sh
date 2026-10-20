#!/bin/sh
# Stage 2 of the mainnet preparation: the same source built under a second program id and deployed to mainnet as a staging
# program. Anchor compiles the program id in (declare_id!), so "the same binary" is the same source and the same build
# flags (the mainnet build: no `devnet` feature) with the staging id in place of the production one; the source is put back
# as it was. Nothing is sent without GO=1: by default this builds, prints the id and the cost, and stops.
#   sh scripts/staging/deploy.sh <mainnet rpc url>            # build only, print what a deploy would cost
#   GO=1 sh scripts/staging/deploy.sh <mainnet rpc url>       # build and deploy with keys/deployer.json (funded on mainnet first)
# The staging program keypair is keys/staging-program.json (git-ignored); make one with
#   solana-keygen new -o keys/staging-program.json --no-bip39-passphrase
set -e
cd "$(dirname "$0")/../.."
RPC="${1:?mainnet rpc url}"
PROD_ID=8Kr2agQDXeQmr1JXZnYQF3G8LgMRVTbcr3C1mVR7eZzn
STAGING_ID=$(solana address -k keys/staging-program.json)
echo "staging program id $STAGING_ID"
cp programs/seed/src/lib.rs /tmp/seed-lib.rs.bak; cp Anchor.toml /tmp/seed-Anchor.toml.bak
trap 'cp /tmp/seed-lib.rs.bak programs/seed/src/lib.rs; cp /tmp/seed-Anchor.toml.bak Anchor.toml' EXIT
sed -i '' "s/declare_id!(\"$PROD_ID\")/declare_id!(\"$STAGING_ID\")/" programs/seed/src/lib.rs
sed -i '' "s/^seed = \"$PROD_ID\"/seed = \"$STAGING_ID\"/" Anchor.toml
anchor build                                   # the mainnet build: no test mode, no reset_config, no migrate_config, Arweave URIs only
mkdir -p scripts/staging/out
cp target/deploy/seed.so scripts/staging/out/seed-staging.so && cp target/idl/seed.json scripts/staging/out/seed-staging.idl.json
SIZE=$(wc -c < scripts/staging/out/seed-staging.so | tr -d ' ')
RENT=$(solana rent "$((SIZE + 45))" -u "$RPC" --lamports 2>/dev/null | awk '/Rent-exempt minimum/{print $NF}')
echo "binary $SIZE bytes; the program data account's rent is about $(echo "scale=3; ${RENT:-0}/1000000000" | bc) SOL, paid once by keys/deployer.json ($(solana address -k keys/deployer.json))"
grep -c "migrate_config\|reset_config" scripts/staging/out/seed-staging.idl.json | sed 's/^/devnet-only instructions in the IDL (must be 0): /'
if [ "$GO" != "1" ]; then echo "build only; set GO=1 to deploy"; exit 0; fi
echo "deployer balance on mainnet: $(solana balance -u "$RPC" keys/deployer.json)"
solana program deploy scripts/staging/out/seed-staging.so --program-id keys/staging-program.json -u "$RPC" -k keys/deployer.json
echo "deployed; next: SEED_PROGRAM_ID=$STAGING_ID scripts/staging/init.ts, then scripts/alt.ts mainnet, then scripts/check-deploy.ts staging"
