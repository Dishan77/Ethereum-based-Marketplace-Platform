#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Configuration
RPC_URL="http://127.0.0.1:8545"
BROADCAST_DIR="broadcast/DeployV2.s.sol/31337"
DEFAULT_MNEMONIC="test test test test test test test test test test test junk"
DEFAULT_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
PRIVATE_KEY="${PRIVATE_KEY:-$DEFAULT_PRIVATE_KEY}"

echo "Using RPC: $RPC_URL"

# Start anvil if not responding
if ! curl -s --fail "$RPC_URL" >/dev/null 2>&1; then
  echo "Starting anvil with deterministic mnemonic..."
  nohup anvil --mnemonic "$DEFAULT_MNEMONIC" > anvil.log 2>&1 &
  ANVIL_PID=$!
  echo $ANVIL_PID > anvil.pid
  echo "Anvil started (pid=$ANVIL_PID). Waiting for RPC..."
else
  echo "Anvil RPC already responding"
fi

# Wait for the RPC to be ready
for i in {1..40}; do
  if curl -s --fail "$RPC_URL" >/dev/null 2>&1; then
    echo "Anvil RPC ready"
    break
  fi
  sleep 0.5
done

echo "Deploying MarketplaceV2 contract using forge script..."
forge script script/DeployV2.s.sol:DeployScript --rpc-url "$RPC_URL" --broadcast --private-key "$PRIVATE_KEY" -vvvv

# Extract deployed address
DEPLOYED_ADDRESS=""
if [ -f "$BROADCAST_DIR/run-latest.json" ]; then
  DEPLOYED_ADDRESS=$(jq -r '.returns["0"].value' "$BROADCAST_DIR/run-latest.json")
else
  # try to find the latest file
  if ls $BROADCAST_DIR/*.json >/dev/null 2>&1; then
    FILE=$(ls -t $BROADCAST_DIR/*.json | head -n1)
    DEPLOYED_ADDRESS=$(jq -r '.returns["0"].value' "$FILE")
  fi
fi

if [ -z "$DEPLOYED_ADDRESS" ] || [ "$DEPLOYED_ADDRESS" = "null" ]; then
  echo "Failed to determine deployed address. Check forge output and $BROADCAST_DIR"
  exit 1
fi

echo "Deployed contract address: $DEPLOYED_ADDRESS"

# Write .env.local for CRA
cat > .env.local <<EOF
REACT_APP_CONTRACT_ADDRESS=$DEPLOYED_ADDRESS
REACT_APP_RPC_URL=$RPC_URL
EOF

echo ".env.local written with REACT_APP_CONTRACT_ADDRESS=$DEPLOYED_ADDRESS"
echo "You can now run: npm install && npm start"
