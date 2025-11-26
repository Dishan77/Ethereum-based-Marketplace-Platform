# KALA 2.0 Frontend Testing Guide

## Prerequisites
Ensure all services are running:
1. **Anvil blockchain**: Running on port 8545
2. **Backend API**: Running on port 3001
3. **React frontend**: Running on port 3000

## Test Accounts (Anvil)

### Admin Account
- **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d727e240f20`
- **Role**: admin

### Seller Account
- **Address**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Private Key**: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- **Role**: seller (needs verification by admin)

### Customer Account
- **Address**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- **Private Key**: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`
- **Role**: customer

## Testing Steps

### 1. Initial Setup - Create Seller Account

1. Open http://localhost:3000 in your browser
2. Click "Connect MetaMask"
3. Import the **Seller Account** private key into MetaMask:
   - Open MetaMask → Import Account → Enter private key
   - Use: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
4. Switch to Anvil network in MetaMask (Chain ID: 31337)
5. Click "Sign In" button
6. Sign the authentication message in MetaMask
7. You should be redirected to `/customer` (default for new users)

### 2. Admin Verification - Verify Seller

1. Switch MetaMask to **Admin Account**:
   - Import admin private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d727e240f20`
2. Refresh the page or logout/login
3. Click "Sign In"
4. You should be redirected to `/admin` dashboard
5. Click "Pending Verifications" tab
6. You should see the seller account waiting for verification
7. Click "✓ Approve" button
8. Verify the seller status changes to "verified"

### 3. Seller Dashboard - List Artwork

1. Switch MetaMask back to **Seller Account**
2. Refresh and login
3. You should now see `/seller` dashboard
4. Fill in the "List New Artwork" form:
   - **Name**: "Abstract Art #1"
   - **Price**: `0.1` (ETH)
   - **Description**: "Beautiful handcrafted abstract painting"
   - **Category**: "Painting"
   - **Tags**: "abstract,modern"
5. Click "List Item"
6. Confirm the transaction in MetaMask
7. Wait for transaction confirmation
8. The new artwork should appear in "My Artworks" section

### 4. Customer Purchase - Buy Artwork

1. Switch MetaMask to **Customer Account**
2. Refresh and login
3. Navigate to "Marketplace" (or click "Marketplace" in navigation)
4. You should see the artwork listed by the seller
5. Click "Buy" button
6. Confirm the transaction in MetaMask (make sure to send correct ETH amount)
7. Wait for transaction confirmation
8. Click "My Collection" tab
9. You should now see the purchased artwork

### 5. Ownership History - View Timeline

1. While on "My Collection" tab
2. Click "View History" button on your purchased artwork
3. You should see:
   - Transfer #1: From seller to you
   - Timestamp of purchase
   - Original seller address

### 6. Reselling - List Owned Artwork

1. On "My Collection" tab
2. Click "Resell" button on owned artwork
3. Enter new price (e.g., `0.15`)
4. Confirm transaction in MetaMask
5. Artwork should now appear in Marketplace with "Resale" badge
6. Original seller address should still be visible

## Expected Behavior

### Authentication Flow
- ✅ MetaMask connection prompts wallet selection
- ✅ Sign In creates a signature request
- ✅ Successful login redirects to role-appropriate dashboard
- ✅ Wallet and user info displayed in navigation bar

### Admin Dashboard
- ✅ Shows pending verification requests
- ✅ Approve/Reject buttons work
- ✅ Platform overview shows statistics
- ✅ Only accessible by admin role

### Seller Dashboard
- ✅ List artwork form accepts all required fields
- ✅ Transaction confirmation on blockchain
- ✅ New artwork appears in "My Artworks"
- ✅ Verification status badge displayed
- ✅ Only verified sellers can list items

### Customer Dashboard
- ✅ Marketplace tab shows all available artworks
- ✅ Purchase button triggers MetaMask transaction
- ✅ My Collection shows owned artworks
- ✅ Ownership history displays transfer timeline
- ✅ Resell functionality works for owned items

## Troubleshooting

### MetaMask Connection Issues
- Ensure MetaMask is connected to Anvil network (Chain ID: 31337)
- RPC URL: `http://127.0.0.1:8545`
- If needed, manually add network in MetaMask

### Transaction Failures
- Check account has enough ETH (Anvil provides 10000 ETH per account)
- Verify contract address matches: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Check backend API is running on port 3001
- Check Anvil blockchain is running on port 8545

### Authentication Errors
- Clear localStorage: `localStorage.clear()` in browser console
- Logout and login again
- Check backend logs for JWT verification errors
- Ensure correct nonce signature format

### UI Not Loading
- Check browser console for errors
- Verify all imports are correct
- Check React dev server is running on port 3000
- Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

## API Endpoints for Manual Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### Get All Artworks
```bash
curl http://localhost:3001/api/artworks
```

### Get Nonce for Authentication
```bash
curl -X POST http://localhost:3001/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"}'
```

### Get Pending Verifications (Admin only)
```bash
curl http://localhost:3001/api/users/pending-verifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Smart Contract Testing

### Get Item Count
```bash
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "itemCount()" --rpc-url http://127.0.0.1:8545
```

### Get Listed Items
```bash
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "getListedItems()" --rpc-url http://127.0.0.1:8545
```

### Get Items by Owner
```bash
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "getItemsByOwner(address)(uint256[])" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  --rpc-url http://127.0.0.1:8545
```

## Success Criteria

- ✅ All three dashboards load without errors
- ✅ Role-based access control works correctly
- ✅ Authentication flow completes successfully
- ✅ Seller can list artworks after verification
- ✅ Customer can purchase artworks
- ✅ Ownership transfers recorded on blockchain
- ✅ Ownership history displays correctly
- ✅ Reselling functionality works
- ✅ Admin can verify sellers
- ✅ Navigation between dashboards works

## Next Steps

After successful testing:
1. Implement QR code generation UI
2. Add cart and wishlist functionality
3. Implement reviews and ratings system
4. Add search and filter features
5. Integrate IPFS for artwork metadata
6. Add payment gateway (Stripe/Razorpay)
7. Create condition report UI
8. Implement notifications system
