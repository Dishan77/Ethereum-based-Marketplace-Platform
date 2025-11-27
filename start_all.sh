#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  KALA 2.0 Complete System Startup${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Kill existing processes
echo -e "${YELLOW}Stopping existing services...${NC}"
pkill -f "anvil" 2>/dev/null
pkill -f "nodemon src/index.ts" 2>/dev/null
pkill -f "ts-node src/index.ts" 2>/dev/null
lsof -ti:8545 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 2
echo -e "${GREEN}✓ Existing services stopped${NC}\n"

# Start Anvil in background
echo -e "${YELLOW}Starting Anvil blockchain...${NC}"
anvil > anvil.log 2>&1 &
ANVIL_PID=$!
sleep 3

# Check if Anvil started
if lsof -ti:8545 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Anvil running on port 8545 (PID: $ANVIL_PID)${NC}"
else
    echo -e "${RED}✗ Failed to start Anvil${NC}"
    exit 1
fi

# Deploy contract
echo -e "\n${YELLOW}Deploying MarketplaceV2 contract...${NC}"
DEPLOY_OUTPUT=$(forge create --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  src/MarketplaceV2.sol:MarketplaceV2 \
  --legacy \
  --broadcast 2>&1)

# Extract contract address
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "Deployed to:" | awk '{print $3}')

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}✗ Contract deployment failed${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✓ Contract deployed at: $CONTRACT_ADDRESS${NC}"

# Update backend .env
echo -e "\n${YELLOW}Updating backend configuration...${NC}"
sed -i.bak "s/^CONTRACT_ADDRESS=.*/CONTRACT_ADDRESS=$CONTRACT_ADDRESS/" backend/.env
echo -e "${GREEN}✓ Backend .env updated${NC}"

# Update frontend contract
echo -e "${YELLOW}Updating frontend configuration...${NC}"
chmod +x update_frontend_contract.sh
./update_frontend_contract.sh "$CONTRACT_ADDRESS"
echo -e "${GREEN}✓ Frontend contract updated${NC}"

# Start backend
echo -e "\n${YELLOW}Starting backend server...${NC}"
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 5

# Check if backend started
if lsof -ti:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend running on port 3001 (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}✗ Failed to start backend${NC}"
    cat backend.log
    exit 1
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  System Ready!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Anvil:${NC}     http://127.0.0.1:8545 (PID: $ANVIL_PID)"
echo -e "${GREEN}Backend:${NC}   http://localhost:3001 (PID: $BACKEND_PID)"
echo -e "${GREEN}Contract:${NC}  $CONTRACT_ADDRESS"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Start React frontend: ${BLUE}npm start${NC}"
echo -e "2. Open browser: ${BLUE}http://localhost:3000${NC}"
echo -e "3. Connect MetaMask to: ${BLUE}http://127.0.0.1:8545${NC} (Chain ID: 31337)"
echo -e "\n${YELLOW}To monitor Anvil transactions:${NC}"
echo -e "  tail -f anvil.log"
echo -e "\n${YELLOW}To stop services:${NC}"
echo -e "  kill $ANVIL_PID $BACKEND_PID"
echo -e "${BLUE}========================================${NC}\n"

# Keep script running to maintain background processes
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
wait
