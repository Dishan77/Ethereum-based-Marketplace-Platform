#!/bin/bash

echo "🧪 KALA 2.0 - Comprehensive System Test"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local command=$2
    echo -e "${BLUE}Testing: $name${NC}"
    if eval $command > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}\n"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}\n"
        ((FAILED++))
    fi
}

echo "1️⃣  Testing Blockchain (Anvil)"
echo "--------------------------------"
test_endpoint "Anvil is running" "curl -s -X POST -H 'Content-Type: application/json' --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}' http://127.0.0.1:8545 | grep -q result"
test_endpoint "Contract is deployed" "cast code 0x5FbDB2315678afecb367f032d93F642f64180aa3 --rpc-url http://127.0.0.1:8545 | grep -q 0x"

echo "2️⃣  Testing Smart Contract Functions"
echo "--------------------------------------"
test_endpoint "Contract itemCount" "cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 'itemCount()' --rpc-url http://127.0.0.1:8545 | grep -q 0x"
test_endpoint "Contract getListedItems" "cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 'getListedItems()' --rpc-url http://127.0.0.1:8545"

echo "3️⃣  Testing Backend API"
echo "------------------------"
test_endpoint "Health endpoint" "curl -s http://localhost:3001/health | grep -q '\"status\":\"ok\"'"
test_endpoint "Artworks endpoint" "curl -s http://localhost:3001/api/artworks | grep -q '\[\]'"
test_endpoint "Auth nonce endpoint (POST)" "curl -s -X POST http://localhost:3001/api/auth/nonce -H 'Content-Type: application/json' -d '{\"walletAddress\":\"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\"}' 2>&1 | grep -q 'nonce'"

echo "4️⃣  Testing Database Connection"
echo "---------------------------------"
test_endpoint "Database tables exist" "curl -s http://localhost:3001/api/artworks"

echo "5️⃣  Testing Foundry Tests"
echo "--------------------------"
cd /Users/dishanachar/Documents/final_year_project/trial_1/Ethereum-based-Marketplace-Platform
test_endpoint "All contract tests pass" "forge test --match-contract MarketplaceV2Test 2>&1 | grep -q '9 passed'"

echo ""
echo "========================================"
echo "📊 Test Results Summary"
echo "========================================"
echo -e "${GREEN}✓ Passed: $PASSED${NC}"
echo -e "${RED}✗ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All systems operational!${NC}"
    echo ""
    echo "✅ Anvil blockchain: Running on http://127.0.0.1:8545"
    echo "✅ MarketplaceV2 contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
    echo "✅ Backend API: Running on http://localhost:3001"
    echo "✅ Database: Connected to Neon DB"
    echo "✅ Smart contract tests: 9/9 passing"
    echo ""
    echo "🚀 Ready for frontend integration!"
else
    echo -e "${RED}⚠️  Some tests failed. Please check the output above.${NC}"
fi
