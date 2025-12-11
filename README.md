# Glitch Hunter Library

A Web3 dApp for discovering, submitting, and voting on video game glitches (bugs, exploits, and odd behaviors). Built on Base blockchain.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + TailwindCSS
- **Web3**: wagmi + viem for blockchain interactions
- **Database**: PostgreSQL + Prisma ORM
- **Smart Contract**: Solidity + Hardhat (Base Sepolia → Base Mainnet)

## Project Structure

```
base-glitch-hunter-library/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes for database operations
│   ├── glitch/[id]/       # Individual glitch detail page
│   ├── submit/            # Glitch submission form
│   └── page.tsx           # Home page (glitch listing)
├── components/            # Reusable React components
├── contracts/             # Hardhat project for smart contracts
│   ├── contracts/         # Solidity contracts
│   ├── scripts/           # Deployment scripts
│   └── test/              # Contract tests
├── lib/                   # Utility libraries
│   ├── prisma.ts          # Prisma client wrapper
│   ├── wagmi.ts           # wagmi configuration
│   └── contracts.ts       # Contract ABIs and addresses
└── prisma/                # Database schema and migrations
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or use Prisma's local dev database)
- MetaMask or compatible Web3 wallet
- Base Sepolia testnet ETH (for testing)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/moveq-memida/base-glitch-hunter-library.git
cd base-glitch-hunter-library
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database (use Prisma's local dev DB or your own PostgreSQL)
DATABASE_URL="your_postgres_connection_string"

# Base Network RPC URLs (defaults provided)
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
BASE_MAINNET_RPC_URL="https://mainnet.base.org"

# Deployer wallet private key (for contract deployment)
DEPLOYER_PRIVATE_KEY="your_private_key_here"

# Optional: Basescan API key (for contract verification)
BASESCAN_API_KEY="your_basescan_api_key"

# Contract address (fill after deployment)
NEXT_PUBLIC_GLITCH_REGISTRY_ADDRESS="deployed_contract_address"
```

### 3. Database Setup

If using Prisma's local development database:

```bash
npx prisma dev
```

Or configure your own PostgreSQL database and run:

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Smart Contract Deployment

Navigate to the contracts directory and deploy:

```bash
cd contracts

# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Deploy to Base Sepolia (testnet)
npm run deploy:sepolia

# Deploy to Base Mainnet (production)
npm run deploy:mainnet
```

After deployment, copy the contract address to your `.env` file:

```env
NEXT_PUBLIC_GLITCH_REGISTRY_ADDRESS="0x..."
```

### 5. Run Development Server

```bash
cd ..  # Return to root directory
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Commands

### Next.js Application

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Run production build
npm run lint      # Run ESLint
```

### Smart Contracts

```bash
cd contracts
npm run compile         # Compile Solidity contracts
npm test               # Run contract tests
npm run deploy:sepolia # Deploy to Base Sepolia testnet
npm run deploy:mainnet # Deploy to Base mainnet
```

### Database

```bash
npx prisma generate    # Generate Prisma Client
npx prisma migrate dev # Create and apply migrations
npx prisma studio      # Open Prisma Studio (database GUI)
```

## How It Works

### Submitting a Glitch

1. User connects wallet (MetaMask) on the `/submit` page
2. Fills out glitch details (title, game, platform, description, tags)
3. Frontend calculates `contentHash = keccak256(JSON.stringify(metadata))`
4. Calls `submitGlitch(contentHash)` on the smart contract
5. After transaction confirms, saves metadata to PostgreSQL via API
6. Redirects to the glitch detail page

### Voting on a Glitch

1. User visits `/glitch/[id]` detail page
2. Connects wallet
3. Clicks "Upvote" button
4. Calls `upvote(glitchId)` on the smart contract
5. Vote count updates automatically after transaction confirms
6. One vote per address per glitch (enforced by contract)

## Smart Contract

The `GlitchRegistry` contract on Base handles:

- **submitGlitch(bytes32 contentHash)**: Records a new glitch on-chain
- **upvote(uint256 glitchId)**: Allows users to vote (once per glitch)
- **getVoteCount(uint256 glitchId)**: Returns the current vote count
- **hasUserVoted(uint256 glitchId, address voter)**: Checks if user has voted

Contract events:
- `GlitchSubmitted(uint256 indexed glitchId, address indexed author, bytes32 contentHash)`
- `GlitchUpvoted(uint256 indexed glitchId, address indexed voter)`

## API Endpoints

- `GET /api/glitches` - List recent glitches (max 20)
- `POST /api/glitches` - Create new glitch record
- `GET /api/glitches/[id]` - Get single glitch details

## Database Schema

```prisma
model Glitch {
  id               Int      @id @default(autoincrement())
  title            String
  game_name        String
  platform         String
  video_url        String?
  description      String   @db.Text
  tags             String
  author_address   String
  onchain_glitch_id Int
  content_hash     String
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt
}
```

## Testing

Get testnet ETH from the [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet).

## Production Deployment

1. Deploy smart contract to Base mainnet
2. Update `NEXT_PUBLIC_GLITCH_REGISTRY_ADDRESS` in `.env`
3. Set up production PostgreSQL database
4. Deploy Next.js app to Vercel/Netlify/similar
5. Ensure environment variables are configured in hosting platform

## Security Notes

- **Never commit `.env` with real private keys**
- Use environment variables for sensitive data
- Verify contract on Basescan for transparency
- Audit smart contracts before mainnet deployment

## Mini App Support

This app works as a Base / Farcaster Mini App.

### Required Environment Variables

```env
# App URL (your deployed domain)
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"

# CDP Client API Key (from Coinbase Developer Portal)
NEXT_PUBLIC_CDP_CLIENT_API_KEY="your_cdp_api_key"

# Farcaster Account Association (from Base Build tool)
FARCASTER_HEADER=""
FARCASTER_PAYLOAD=""
FARCASTER_SIGNATURE=""
```

### Manifest Verification

Check your manifest at: `https://<your-domain>/.well-known/farcaster.json`

### Account Association Setup

1. Go to [Base Build](https://build.base.org/) and find the Account Association tool
2. Enter your production URL
3. Copy the `header`, `payload`, and `signature` values
4. Set them as environment variables (`FARCASTER_HEADER`, `FARCASTER_PAYLOAD`, `FARCASTER_SIGNATURE`)
5. Redeploy or restart your app

### Required Assets

Place these images in your `public/` folder:
- `icon.png` - App icon (recommended: 512x512)
- `splash.png` - Splash screen image
- `og.png` - Open Graph / hero image

## License

ISC

## Contributing

Contributions welcome! Please open an issue or PR.
