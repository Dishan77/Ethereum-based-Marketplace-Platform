# KALA 2.0 - Quick Start Guide

## ✅ Current System Status

All components are successfully deployed and tested:

- **Blockchain**: Anvil running on `http://127.0.0.1:8545`
- **Smart Contract**: MarketplaceV2 at `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Backend API**: Running on `http://localhost:3001`
- **Database**: Neon DB (PostgreSQL) connected and initialized
- **Tests**: 9/9 smart contract tests passing

---

## 🚀 Starting the System

### 1. Start Anvil (Blockchain)
```bash
# In terminal 1
anvil
```

### 2. Start Backend API
```bash
# In terminal 2
cd backend
npm run dev
```

### 3. Run System Tests
```bash
# In terminal 3
./test_system.sh
```

---

## 📡 API Endpoints

### Health Check
```bash
curl http://localhost:3001/health
```

### Authentication
```bash
# Request nonce for wallet signing
curl -X POST http://localhost:3001/api/auth/nonce \
  -H 'Content-Type: application/json' \
  -d '{"walletAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}'

# Login with signature (after signing the nonce message)
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"walletAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","signature":"0x..."}'
```

### Artworks
```bash
# Get all artworks
curl http://localhost:3001/api/artworks

# Get specific artwork
curl http://localhost:3001/api/artworks/1

# Get artworks by seller
curl http://localhost:3001/api/artworks/seller/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### Users
```bash
# Get user profile
curl http://localhost:3001/api/users/profile/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

---

## 🔑 Available Test Accounts (Anvil)

### Account 0 (Admin - Pre-configured)
- **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **Role**: Admin
- **Balance**: 10,000 ETH

### Account 1 (Test Seller)
- **Address**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Private Key**: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- **Balance**: 10,000 ETH

### Account 2 (Test Buyer)
- **Address**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- **Private Key**: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`
- **Balance**: 10,000 ETH

---

## 🔧 Smart Contract Interaction

### Using Cast (Foundry)
```bash
# Get item count
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "itemCount()" --rpc-url http://127.0.0.1:8545

# Get listed items
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "getListedItems()" --rpc-url http://127.0.0.1:8545

# List an item (send transaction)
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "listItem(string,uint256,string)" \
  "Handmade Pottery" \
  "1000000000000000000" \
  "QmTest123..." \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://127.0.0.1:8545
```

---

## 📊 Database Access

### Connection String
```
postgresql://neondb_owner:npg_HoTD3l8erECV@ep-falling-recipe-a14ciemv-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

### Available Tables
- `users` - User accounts with roles
- `artworks` - Artwork metadata
- `qr_scans` - QR verification history
- `reviews` - Artwork reviews
- `wishlist` - User wishlists
- `cart` - Shopping carts
- `notifications` - User notifications

---

## 🧪 Running Tests

### Smart Contract Tests
```bash
forge test --match-contract MarketplaceV2Test -vv
```

### Full System Test
```bash
./test_system.sh
```

---

## 📁 Key Files

### Smart Contract
- `src/MarketplaceV2.sol` - Enhanced marketplace contract
- `test/MarketplaceV2.t.sol` - Contract tests
- `script/DeployV2.s.sol` - Deployment script

### Backend
- `backend/src/index.ts` - Main server
- `backend/src/routes/` - API routes
- `backend/src/config/` - Database & blockchain config
- `backend/.env` - Environment variables

### Documentation
- `README.md` - Project overview
- `backend/README.md` - Backend API documentation
- `KALA_2.0_IMPLEMENTATION_PLAN.md` - Full implementation roadmap
- `IMPLEMENTATION_STATUS.md` - Current progress status

---

## 🎯 What's Next?

### Ready to Implement
1. **Frontend Updates** - Integrate MarketplaceV2 ABI and backend API
2. **Role-based Dashboards** - Build Seller, Customer, and Admin dashboards
3. **QR Code UI** - Add QR generation and scanning interface
4. **E-commerce Features** - Cart, wishlist, reviews

### Architecture Overview
```
Frontend (React + MetaMask)
           ↓
Backend API (Express + JWT)
     ↓              ↓
Neon DB      Anvil/Ethereum
(PostgreSQL)  (MarketplaceV2)
```

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Kill processes on port 3001
lsof -ti:3001 | xargs kill -9
cd backend && npm run dev
```

### Anvil connection refused
```bash
# Check if Anvil is running
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545

# Restart Anvil if needed
anvil
```

### Database connection failed
- Check your `.env` file has the correct `DATABASE_URL`
- Verify Neon DB is accessible from your network

---

## 📝 Environment Variables

### Backend `.env`
```env
DATABASE_URL=postgresql://neondb_owner:npg_HoTD3l8erECV@ep-falling-recipe-a14ciemv-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=KALAv2_SecureJWTSecret_ChangeInProduction_2024
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
RPC_URL=http://127.0.0.1:8545
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

---

**🎉 System is fully operational and ready for Phase 3 (Frontend Integration)!**
