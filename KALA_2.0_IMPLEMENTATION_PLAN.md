# KALA 2.0 - Implementation Plan

## Project Overview
KALA 2.0 transforms the basic marketplace into a comprehensive artisan platform with authentication, role-based access, QR verification, condition reporting, reselling capabilities, and full e-commerce features—all while maintaining local deployment for development.

---

## Phase Breakdown

### **Phase 1: Backend Foundation (Week 1-2)**

#### 1.1 Technology Stack Decision
**Recommended for your setup: Express.js** (lighter, faster setup than NestJS)
- Express.js + TypeScript
- PostgreSQL (user data, roles, verification status)
- JWT authentication
- MetaMask signature verification

**File Structure:**
```
backend/
├── src/
│   ├── config/
│   │   └── database.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── roles.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── artworks.ts
│   │   └── qr.ts
│   ├── controllers/
│   ├── models/
│   └── services/
│       ├── ipfs.service.ts
│       ├── qr.service.ts
│       └── blockchain.service.ts
├── package.json
└── tsconfig.json
```

#### 1.2 Database Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'admin', 'seller', 'customer'
    name VARCHAR(255),
    bio TEXT,
    govt_id VARCHAR(255), -- For seller verification
    verification_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Artworks (off-chain metadata)
CREATE TABLE artworks (
    id SERIAL PRIMARY KEY,
    blockchain_id INT NOT NULL, -- Matches contract itemId
    seller_address VARCHAR(42) NOT NULL,
    qr_code_url TEXT,
    ipfs_metadata_hash VARCHAR(100),
    category VARCHAR(100),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- QR Scan Logs
CREATE TABLE qr_scans (
    id SERIAL PRIMARY KEY,
    artwork_id INT REFERENCES artworks(id),
    scanned_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Reviews
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    artwork_id INT REFERENCES artworks(id),
    reviewer_address VARCHAR(42) NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Wishlist
CREATE TABLE wishlist (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    artwork_id INT REFERENCES artworks(id),
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_address, artwork_id)
);
```

#### 1.3 Authentication Flow
1. **MetaMask Signature Login:**
   - Frontend requests nonce from backend
   - User signs message with MetaMask
   - Backend verifies signature, returns JWT (access + refresh tokens)
   - JWT includes: `{ wallet_address, role, exp }`

2. **Role Assignment:**
   - Default: `customer`
   - Upgrade to `seller`: Submit govt ID → admin approval
   - Admin: Manually assigned in database

---

### **Phase 2: Enhanced Smart Contract (Week 2-3)**

#### 2.1 Enhanced Marketplace.sol

**New Features:**
1. Ownership timeline with condition reports
2. NFT-based artwork identity (optional, using ERC721)
3. Reselling functionality
4. IPFS hash storage

**Contract Structure:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MarketplaceV2 {
    
    struct Item {
        uint256 id;
        string name;
        uint256 price;
        address payable seller;
        address owner;
        bool isSold;
        bool isResale;
        string ipfsMetadataHash;  // NEW
        uint256 listedAt;         // NEW
    }
    
    struct OwnershipRecord {
        address owner;
        uint256 timestamp;
        string conditionHash;  // IPFS hash of condition report
        uint256 price;         // Price at this transfer
    }
    
    // Mapping: itemId => array of ownership records
    mapping(uint256 => OwnershipRecord[]) public ownershipTimeline;
    
    // Events
    event ItemListed(uint256 indexed itemId, address indexed seller, uint256 price, string ipfsHash);
    event ItemSold(uint256 indexed itemId, address indexed buyer, uint256 price);
    event ItemResold(uint256 indexed itemId, address indexed newSeller, uint256 newPrice);
    event ConditionReported(uint256 indexed itemId, string conditionHash);
    
    uint256 public itemCount;
    mapping(uint256 => Item) public items;
    mapping(address => uint256[]) public ownedItems;
    
    // List new artwork
    function listItem(
        string memory _name, 
        uint256 _price,
        string memory _ipfsMetadataHash
    ) public {
        require(_price > 0, "Price must be greater than zero");
        
        itemCount++;
        items[itemCount] = Item(
            itemCount,
            _name,
            _price,
            payable(msg.sender),
            msg.sender,
            false,
            false,
            _ipfsMetadataHash,
            block.timestamp
        );
        
        ownedItems[msg.sender].push(itemCount);
        
        // Initialize ownership timeline
        ownershipTimeline[itemCount].push(OwnershipRecord({
            owner: msg.sender,
            timestamp: block.timestamp,
            conditionHash: "",  // Initial listing has no condition report
            price: _price
        }));
        
        emit ItemListed(itemCount, msg.sender, _price, _ipfsMetadataHash);
    }
    
    // Purchase item
    function purchaseItem(uint256 _itemId) public payable {
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "Item does not exist");
        require(!item.isSold, "Item already sold");
        require(msg.value == item.price, "Incorrect price");
        require(msg.sender != item.owner, "Cannot buy your own item");
        
        // Transfer funds to seller
        item.seller.transfer(msg.value);
        
        // Update ownership
        address previousOwner = item.owner;
        item.owner = msg.sender;
        item.isSold = true;
        
        // Update owned items
        _removeFromOwnedItems(previousOwner, _itemId);
        ownedItems[msg.sender].push(_itemId);
        
        // Add to ownership timeline
        ownershipTimeline[_itemId].push(OwnershipRecord({
            owner: msg.sender,
            timestamp: block.timestamp,
            conditionHash: "",  // Buyer can add condition report later
            price: item.price
        }));
        
        emit ItemSold(_itemId, msg.sender, item.price);
    }
    
    // Resell item (owner can list again)
    function resellItem(uint256 _itemId, uint256 _newPrice) public {
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "Item does not exist");
        require(item.owner == msg.sender, "You are not the owner");
        require(_newPrice > 0, "Price must be greater than zero");
        
        item.price = _newPrice;
        item.seller = payable(msg.sender);
        item.isSold = false;
        item.isResale = true;
        
        emit ItemResold(_itemId, msg.sender, _newPrice);
    }
    
    // Add condition report
    function addConditionReport(uint256 _itemId, string memory _conditionHash) public {
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "Item does not exist");
        require(item.owner == msg.sender, "Only owner can add condition report");
        
        // Update latest ownership record with condition hash
        uint256 timelineLength = ownershipTimeline[_itemId].length;
        ownershipTimeline[_itemId][timelineLength - 1].conditionHash = _conditionHash;
        
        emit ConditionReported(_itemId, _conditionHash);
    }
    
    // Get ownership timeline
    function getOwnershipTimeline(uint256 _itemId) public view returns (OwnershipRecord[] memory) {
        return ownershipTimeline[_itemId];
    }
    
    // Get items owned by address
    function getItemsByOwner(address _owner) public view returns (uint256[] memory) {
        return ownedItems[_owner];
    }
    
    // Internal: Remove item from previous owner's list
    function _removeFromOwnedItems(address _owner, uint256 _itemId) private {
        uint256[] storage items = ownedItems[_owner];
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i] == _itemId) {
                items[i] = items[items.length - 1];
                items.pop();
                break;
            }
        }
    }
}
```

**Deployment Script Update:**
```solidity
// script/DeployV2.s.sol
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/MarketplaceV2.sol";

contract DeployV2Script is Script {
    function run() external returns (address) {
        vm.startBroadcast();
        MarketplaceV2 marketplace = new MarketplaceV2();
        vm.stopBroadcast();
        return address(marketplace);
    }
}
```

---

### **Phase 3: IPFS Integration (Week 3)**

#### 3.1 IPFS Service (Backend)

**Setup:**
```bash
npm install web3.storage
# OR
npm install @pinata/sdk
```

**IPFS Service (backend/src/services/ipfs.service.ts):**
```typescript
import { Web3Storage } from 'web3.storage';

class IPFSService {
  private client: Web3Storage;

  constructor() {
    this.client = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN! });
  }

  async uploadArtworkMetadata(metadata: {
    name: string;
    description: string;
    image: string;  // Base64 or file path
    artist: string;
    category: string;
    tags: string[];
  }): Promise<string> {
    const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const files = [new File([blob], 'metadata.json')];
    const cid = await this.client.put(files);
    return `ipfs://${cid}/metadata.json`;
  }

  async uploadConditionReport(report: {
    owner: string;
    date: string;
    condition: string;
    comments: string;
    photos: string[];  // Array of IPFS hashes
  }): Promise<string> {
    const blob = new Blob([JSON.stringify(report)], { type: 'application/json' });
    const files = [new File([blob], 'condition-report.json')];
    const cid = await this.client.put(files);
    return `ipfs://${cid}/condition-report.json`;
  }

  async uploadImage(imageBuffer: Buffer, filename: string): Promise<string> {
    const file = new File([imageBuffer], filename);
    const cid = await this.client.put([file]);
    return `ipfs://${cid}/${filename}`;
  }

  // Retrieve from IPFS (for verification page)
  async retrieve(ipfsHash: string): Promise<any> {
    const res = await this.client.get(ipfsHash);
    if (!res || !res.ok) throw new Error('IPFS retrieval failed');
    const files = await res.files();
    const fileContent = await files[0].text();
    return JSON.parse(fileContent);
  }
}

export default new IPFSService();
```

---

### **Phase 4: QR Code Verification System (Week 4)**

#### 4.1 QR Generation (Backend)

```typescript
import QRCode from 'qrcode';

class QRService {
  async generateQR(artworkId: number, ipfsHash: string): Promise<string> {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify/${artworkId}`;
    const qrData = {
      artworkId,
      ipfsHash,
      verifyUrl,
      timestamp: Date.now()
    };
    
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
    return qrCodeDataUrl; // Return base64 image
  }

  // Log scan
  async logScan(artworkId: number, ipAddress: string, userAgent: string) {
    // Insert into qr_scans table
    await db.query(
      'INSERT INTO qr_scans (artwork_id, ip_address, user_agent) VALUES ($1, $2, $3)',
      [artworkId, ipAddress, userAgent]
    );
  }
}

export default new QRService();
```

#### 4.2 Verification API Route

```typescript
// backend/src/routes/verify.ts
router.get('/verify/:artworkId', async (req, res) => {
  const { artworkId } = req.params;
  
  try {
    // 1. Get artwork from database
    const artwork = await db.query('SELECT * FROM artworks WHERE blockchain_id = $1', [artworkId]);
    
    // 2. Fetch blockchain data
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const item = await contract.items(artworkId);
    const timeline = await contract.getOwnershipTimeline(artworkId);
    
    // 3. Fetch IPFS metadata
    const metadata = await ipfsService.retrieve(item.ipfsMetadataHash);
    
    // 4. Log scan
    await qrService.logScan(parseInt(artworkId), req.ip, req.get('user-agent')!);
    
    // 5. Return verification data
    res.json({
      authentic: true,
      artwork: {
        id: item.id.toString(),
        name: item.name,
        metadata,
        currentOwner: item.owner,
        originalSeller: timeline[0].owner,
        listedAt: new Date(item.listedAt.toNumber() * 1000),
      },
      ownershipTimeline: timeline.map((record: any) => ({
        owner: record.owner,
        timestamp: new Date(record.timestamp.toNumber() * 1000),
        price: ethers.utils.formatEther(record.price),
        conditionHash: record.conditionHash
      })),
      scans: await db.query('SELECT COUNT(*) FROM qr_scans WHERE artwork_id = $1', [artworkId])
    });
  } catch (error) {
    res.status(404).json({ authentic: false, error: 'Artwork not found' });
  }
});
```

---

### **Phase 5: Frontend Updates (Week 5-6)**

#### 5.1 Role-Based Dashboard Components

**File Structure:**
```
src/
├── pages/
│   ├── SellerDashboard.js
│   ├── CustomerDashboard.js
│   ├── AdminDashboard.js
│   └── VerifyArtwork.js
├── components/
│   ├── auth/
│   │   ├── Login.js
│   │   └── RoleGuard.js
│   ├── artwork/
│   │   ├── ArtworkCard.js
│   │   ├── ArtworkForm.js
│   │   ├── ConditionReportForm.js
│   │   └── OwnershipTimeline.js
│   ├── dashboard/
│   │   ├── SellerInventory.js
│   │   ├── SalesAnalytics.js
│   │   ├── QRManager.js
│   │   └── AdminUserList.js
│   └── cart/
│       ├── Cart.js
│       └── Wishlist.js
└── utils/
    └── auth.js
```

#### 5.2 Authentication Context

```javascript
// src/context/AuthContext.js
import { createContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const loginWithMetaMask = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    // Get nonce from backend
    const { data: { nonce } } = await axios.get(`${process.env.REACT_APP_API_URL}/auth/nonce/${address}`);

    // Sign message
    const message = `Sign this message to authenticate: ${nonce}`;
    const signature = await signer.signMessage(message);

    // Verify signature and get JWT
    const { data: { token, user } } = await axios.post(`${process.env.REACT_APP_API_URL}/auth/login`, {
      address,
      signature
    });

    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (token) {
      // Fetch user profile with token
      axios.get(`${process.env.REACT_APP_API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(({ data }) => setUser(data)).catch(() => logout());
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, loginWithMetaMask, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### 5.3 Seller Dashboard (Simplified)

```javascript
// src/pages/SellerDashboard.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function SellerDashboard() {
  const { user } = useContext(AuthContext);
  const [inventory, setInventory] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    // Fetch seller's inventory from contract
    const loadInventory = async () => {
      const contract = /* ... get contract instance ... */;
      const itemIds = await contract.getItemsByOwner(user.wallet_address);
      const items = await Promise.all(itemIds.map(id => contract.items(id)));
      setInventory(items);
    };
    if (user) loadInventory();
  }, [user]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Seller Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-600">Total Listings</h3>
          <p className="text-2xl font-bold">{inventory.length}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-600">Total Sales</h3>
          <p className="text-2xl font-bold">0 ETH</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-600">Active Listings</h3>
          <p className="text-2xl font-bold">{inventory.filter(i => !i.isSold).length}</p>
        </div>
      </div>

      <button 
        onClick={() => setShowAddForm(true)}
        className="bg-blue-600 text-white px-6 py-2 rounded mb-4"
      >
        + Add New Artwork
      </button>

      {showAddForm && <ArtworkForm onClose={() => setShowAddForm(false)} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {inventory.map(item => (
          <ArtworkCard key={item.id.toString()} item={item} showManage />
        ))}
      </div>
    </div>
  );
}
```

---

### **Phase 6: E-Commerce Features (Week 7)**

#### 6.1 Cart System (Local State or Redux)

```javascript
// src/context/CartContext.js
import { createContext, useState } from 'react';

export const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    setCart([...cart, item]);
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(i => i.id !== itemId));
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}
```

#### 6.2 Reviews System (Backend)

```typescript
// backend/src/routes/reviews.ts
router.post('/artworks/:artworkId/reviews', authenticateJWT, async (req, res) => {
  const { artworkId } = req.params;
  const { rating, comment } = req.body;
  const reviewerAddress = req.user.wallet_address;

  // Check if user purchased this item (from blockchain)
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  const timeline = await contract.getOwnershipTimeline(artworkId);
  const hasPurchased = timeline.some(r => r.owner === reviewerAddress);

  if (!hasPurchased) {
    return res.status(403).json({ error: 'You must purchase this item to review it' });
  }

  await db.query(
    'INSERT INTO reviews (artwork_id, reviewer_address, rating, comment) VALUES ($1, $2, $3, $4)',
    [artworkId, reviewerAddress, rating, comment]
  );

  res.json({ success: true });
});
```

---

## **Deployment Strategy (Local Focus)**

### Local Development Setup

```bash
# 1. Start PostgreSQL
brew services start postgresql
createdb kala_dev

# 2. Start Anvil (already running in your setup)
anvil --port 8545 --chain-id 31337

# 3. Deploy updated contract
forge script script/DeployV2.s.sol --fork-url http://127.0.0.1:8545 --broadcast

# 4. Start backend
cd backend
npm install
npm run dev  # Port 3001

# 5. Start frontend (already on 3000)
cd ..
npm start
```

### Environment Variables

**.env.local (frontend):**
```env
REACT_APP_CONTRACT_ADDRESS=0x...
REACT_APP_RPC_URL=http://127.0.0.1:8545
REACT_APP_API_URL=http://localhost:3001
REACT_APP_CHAIN_ID=31337
```

**backend/.env:**
```env
DATABASE_URL=postgresql://localhost:5432/kala_dev
JWT_SECRET=your-secret-key
CONTRACT_ADDRESS=0x...
RPC_URL=http://127.0.0.1:8545
WEB3_STORAGE_TOKEN=your-web3-storage-token
FRONTEND_URL=http://localhost:3000
```

---

## **Implementation Priority (Phased Approach)**

### ✅ **Minimal Viable Product (MVP) - 2 Weeks**
1. Enhanced Marketplace.sol with ownership timeline
2. Basic backend auth (MetaMask signature)
3. PostgreSQL user roles
4. Seller + Customer dashboards (basic)
5. Resell functionality

### 🎯 **Core Features - 4 Weeks**
6. IPFS integration for metadata
7. QR code generation & verification
8. Condition reports
9. Admin dashboard
10. Cart & wishlist

### 🚀 **Full Version - 6-8 Weeks**
11. Reviews & ratings
12. Payment gateway (Stripe)
13. Email notifications
14. Search & filters
15. Analytics & charts

---

## **Next Steps - What I Can Do NOW**

I can immediately implement:

1. **✅ Create enhanced `MarketplaceV2.sol` contract** with all Phase 2 features
2. **✅ Update deployment scripts** for the new contract
3. **✅ Create backend boilerplate** (Express + TypeScript + PostgreSQL setup)
4. **✅ Build auth system** (MetaMask signature verification)
5. **✅ Implement IPFS service** for metadata storage
6. **✅ Create QR generation service**
7. **✅ Build dashboard components** (Seller, Customer, Admin)
8. **✅ Update frontend** to use new contract ABI and features

**Would you like me to:**
- A) Start implementing the enhanced smart contract (`MarketplaceV2.sol`) right now?
- B) Set up the backend boilerplate (Express + PostgreSQL + Auth)?
- C) Create the complete project structure first (backend + frontend updates)?
- D) Generate architecture diagrams (contract structure, database ER diagram, user flows)?

Let me know what you'd like to tackle first, and I'll implement it step by step! 🚀
