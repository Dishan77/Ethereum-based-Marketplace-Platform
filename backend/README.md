# KALA Backend API

Backend service for KALA 2.0 Marketplace with authentication, database management, QR verification, and blockchain integration.

## Features

- 🔐 **JWT Authentication** with MetaMask signature verification
- 👥 **Multi-role System** (Admin, Seller, Customer)
- 🗄️ **Neon DB Integration** (Serverless PostgreSQL)
- 🔗 **Blockchain Integration** with ethers.js
- 📱 **QR Code Generation & Verification**
- 🎨 **Artwork Management** with IPFS metadata
- ⏳ **Ownership Timeline** tracking from smart contract

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Neon DB Account** - Sign up at [neon.tech](https://neon.tech)
3. **Running Anvil** - Local Ethereum blockchain
4. **Deployed MarketplaceV2 Contract**

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# Neon DB connection string (get from neon.tech dashboard)
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/kala?sslmode=require

# Generate JWT secret: openssl rand -base64 32
JWT_SECRET=your_generated_jwt_secret_here

# Contract address (from deployment)
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# Local Anvil RPC
RPC_URL=http://127.0.0.1:8545

# Optional: Web3.Storage for IPFS
WEB3_STORAGE_TOKEN=your_token_here

PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

### 3. Initialize Database

Run the SQL schema to create tables in your Neon DB:

```bash
# Using psql (if you have it installed)
psql $DATABASE_URL < schema.sql

# OR manually run schema.sql in Neon DB SQL Editor
```

Alternatively, you can copy the contents of `schema.sql` and paste it into the Neon DB SQL Editor in your browser.

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/nonce` - Request nonce for wallet
- `POST /api/auth/login` - Login with signed message
- `GET /api/auth/me` - Get current user (protected)

### Users

- `GET /api/users/profile/:walletAddress` - Get user profile
- `PUT /api/users/profile` - Update own profile (protected)
- `POST /api/users/verify-seller` - Request seller verification (protected)
- `POST /api/users/verify-seller/:walletAddress` - Approve/reject verification (admin)
- `GET /api/users/pending-verifications` - Get pending verifications (admin)

### Artworks

- `GET /api/artworks` - Get all listed artworks
- `GET /api/artworks/:id` - Get artwork by ID
- `POST /api/artworks` - Create artwork entry (protected)
- `GET /api/artworks/seller/:address` - Get artworks by seller
- `GET /api/artworks/search/:query` - Search artworks

### QR Verification

- `POST /api/qr/generate` - Generate QR code (seller/admin)
- `GET /api/qr/verify/:artworkId` - Verify artwork authenticity
- `GET /api/qr/scans/:artworkId` - Get scan statistics (seller/admin)

### Health Check

- `GET /health` - API health status

## Authentication Flow

1. **Request Nonce**: Frontend calls `/api/auth/nonce` with wallet address
2. **Sign Message**: User signs the nonce message with MetaMask
3. **Login**: Frontend sends signature to `/api/auth/login`
4. **Get Token**: Backend verifies signature and returns JWT token
5. **Protected Requests**: Include token in Authorization header: `Bearer <token>`

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts       # Neon DB connection
│   │   └── blockchain.ts     # Ethers.js provider & contract
│   ├── middleware/
│   │   └── auth.ts           # JWT & role verification middleware
│   ├── routes/
│   │   ├── auth.ts           # Authentication endpoints
│   │   ├── users.ts          # User management endpoints
│   │   ├── artworks.ts       # Artwork endpoints
│   │   └── qr.ts             # QR code endpoints
│   ├── utils/
│   │   └── auth.ts           # Auth helper functions
│   └── index.ts              # Main server file
├── schema.sql                # Database schema
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Database Schema

### Tables

- **users**: User accounts with roles and verification status
- **artworks**: Artwork metadata linked to blockchain items
- **qr_scans**: QR code scan history
- **reviews**: Artwork reviews and ratings
- **wishlist**: User wishlists
- **cart**: User shopping carts
- **notifications**: User notifications

See `schema.sql` for full schema details.

## Testing

```bash
npm test
```

## Common Issues

### Database Connection Failed

- Verify your `DATABASE_URL` is correct
- Check that your IP is allowed in Neon DB settings
- Ensure SSL mode is enabled

### Contract Call Failed

- Make sure Anvil is running
- Verify `CONTRACT_ADDRESS` matches deployed contract
- Check `RPC_URL` is accessible

### Invalid Signature

- Ensure nonce is not expired (5-minute window)
- Verify wallet address matches signature
- Check MetaMask is connected

## Next Steps

- Implement IPFS service for metadata upload
- Add payment gateway integration (Stripe/Razorpay)
- Implement cart and wishlist endpoints
- Add review system endpoints
- Set up Redis for nonce storage
- Add rate limiting and security headers
- Write comprehensive tests

## Development

```bash
# Watch mode
npm run dev

# Build TypeScript
npm run build

# Run compiled code
npm start
```

## License

MIT
