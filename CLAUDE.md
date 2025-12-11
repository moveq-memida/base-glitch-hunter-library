# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Glitch Hunter Library** is a Web3 dApp for discovering, submitting, and voting on video game glitches (bugs, exploits, and odd behaviors). The project combines:

- **Frontend**: Next.js 16 (App Router) + TypeScript + wagmi + viem
- **Backend**: Next.js Route Handlers + PostgreSQL (Prisma ORM v6)
- **Blockchain**: Solidity smart contract on Base network (Sepolia testnet → mainnet)
- **Web3 Integration**: wagmi v3 + viem v2 for type-safe contract interactions

## Architecture

### Page Structure

The application has three main pages:
- `/` - Glitch listing page (`app/page.tsx`)
- `/submit` - Glitch submission form (`app/submit/page.tsx`)
- `/glitch/[id]` - Individual glitch detail page (`app/glitch/[id]/page.tsx`)

### Component Structure

Reusable components in `components/`:
- **Header.tsx** - Navigation header with title and action button
- **Footer.tsx** - Footer with copyright and links
- **GlitchCard.tsx** - Card component for displaying glitch previews
- **Providers.tsx** - Wraps app with wagmi and TanStack Query providers

### Library Structure

Key files in `lib/`:
- **wagmi.ts** - wagmi configuration for Base and Base Sepolia chains with injected connector
- **contracts.ts** - GlitchRegistry ABI and contract address (from `NEXT_PUBLIC_GLITCH_REGISTRY_ADDRESS`)
- **prisma.ts** - Prisma client singleton for database connections
- **generated/** - TypeChain types for contract interactions

### Database Schema

Located in `prisma/schema.prisma`:

```prisma
model Glitch {
  id               Int      @id @default(autoincrement())
  title            String
  game_name        String
  platform         String
  video_url        String?
  description      String   @db.Text
  tags             String   // comma-separated
  author_address   String
  onchain_glitch_id Int     // Links to blockchain glitchId
  content_hash     String   // keccak256 hash for verification
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  @@index([onchain_glitch_id])
  @@index([created_at])
}
```

### Smart Contract Architecture

**GlitchRegistry.sol** (Solidity 0.8.24) on Base network:

State variables:
- `mapping(uint256 => Glitch) public glitches` - Stores glitch data (author, contentHash, createdAt)
- `uint256 public nextGlitchId` - Auto-incrementing glitch ID counter
- `mapping(uint256 => mapping(address => bool)) public hasVoted` - Tracks votes per address
- `mapping(uint256 => uint256) public voteCount` - Vote counts per glitch

Key functions:
- `submitGlitch(bytes32 contentHash) returns (uint256 glitchId)` - Submit new glitch, emits GlitchSubmitted
- `upvote(uint256 glitchId)` - One vote per address per glitch, emits GlitchUpvoted
- `getGlitch(uint256 glitchId) returns (Glitch memory)` - Retrieve glitch data
- `getVoteCount(uint256 glitchId) returns (uint256)` - Get vote count
- `hasUserVoted(uint256 glitchId, address voter) returns (bool)` - Check if user voted

### Web3 Integration Flow

**Submit Flow**:
1. User fills form on `/submit`
2. Connect wallet (MetaMask) via wagmi
3. Create metadata JSON from form data
4. Calculate `contentHash = keccak256(JSON.stringify(metadata))`
5. Call `submitGlitch(contentHash)` via wagmi's `writeContract`
6. After transaction success, POST metadata + onchain_glitch_id to `/api/glitches`
7. Redirect to `/glitch/[id]`

**Vote Flow**:
1. On `/glitch/[id]`, fetch metadata from `/api/glitches/[id]`
2. Read vote count from contract using `readContract` + `getVoteCount`
3. Click upvote → call `upvote(glitchId)` via `writeContract`
4. Re-fetch vote count after transaction confirms

## Development Commands

### Next.js Application (Root Directory)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production (includes Prisma generation)
npm run build

# Run production build
npm start

# Linting
npm run lint

# Type checking
npx tsc --noEmit
```

### Database (Prisma)

```bash
# Generate Prisma Client (runs automatically on postinstall)
npx prisma generate

# Create and apply migrations
npx prisma migrate dev

# Open Prisma Studio (database GUI)
npx prisma studio

# Push schema changes without migration (for prototyping)
npx prisma db push

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Smart Contracts (contracts/ directory)

The `contracts/` directory is a separate npm project. All contract commands must be run from the `contracts/` directory.

```bash
cd contracts

# Install contract dependencies
npm install

# Compile contracts (generates typechain-types/)
npm run compile
# Equivalent to: npx hardhat compile

# Run contract tests
npm test
# Equivalent to: npx hardhat test

# Deploy to Base Sepolia testnet
npm run deploy:sepolia
# Equivalent to: npx hardhat run scripts/deploy.ts --network base-sepolia

# Deploy to Base mainnet
npm run deploy:mainnet
# Equivalent to: npx hardhat run scripts/deploy.ts --network base-mainnet
```

**Environment setup**: Hardhat reads from `../.env` (parent directory) and requires:
- `BASE_SEPOLIA_RPC_URL` - Base Sepolia RPC endpoint
- `BASE_MAINNET_RPC_URL` - Base mainnet RPC endpoint
- `DEPLOYER_PRIVATE_KEY` - Private key for deployment account
- `BASESCAN_API_KEY` - (Optional) For contract verification

## Important Technical Details

### TypeScript Configuration

The root `tsconfig.json` excludes the `contracts/` directory to avoid conflicts between Next.js and Hardhat TypeScript configurations. The contracts directory has its own `tsconfig.json`.

Path alias `@/*` maps to the root directory for cleaner imports:
```typescript
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/wagmi';
```

### Web3 Integration

- **wagmi configuration** (`lib/wagmi.ts`): Uses `injected()` connector for MetaMask/WalletConnect
- **Contract ABI** (`lib/contracts.ts`): Manually defined ABI with `as const` for type safety
- **Contract address**: Set via `NEXT_PUBLIC_GLITCH_REGISTRY_ADDRESS` environment variable
- **Supported chains**: Base (chainId 8453) and Base Sepolia (chainId 84532)

### Database

- **ORM**: Prisma v6 (downgraded from v7 for compatibility)
- **Client singleton** (`lib/prisma.ts`): Prevents multiple Prisma instances in development
- **Auto-generation**: `prisma generate` runs on `npm install` (postinstall hook) and before build

### Build Configuration

- **Next.js config** (`next.config.ts`): Excludes `contracts/` from TypeScript compilation
- **Vercel builds**: Prisma generation runs in both postinstall and build scripts to handle Vercel's build environment

### Network Switching

The app automatically switches to Base Sepolia when needed. Contract address environment variable determines which network is used:
- Deploy contract to desired network
- Set `NEXT_PUBLIC_GLITCH_REGISTRY_ADDRESS` to deployed address
- wagmi will connect to the chain where that contract exists

### API Routes

Located in `app/api/glitches/`:
- `GET /api/glitches` - List recent glitches
- `POST /api/glitches` - Create glitch (called after blockchain submission)
- `GET /api/glitches/[id]` - Get single glitch

### Common Development Issues

1. **Prisma not generating**: Run `npx prisma generate` manually if types are missing
2. **Contract types missing**: Run `npm run compile` in `contracts/` directory to generate TypeChain types
3. **Environment variables**: Next.js requires `NEXT_PUBLIC_` prefix for client-side env vars
4. **Hardhat env vars**: Reads from parent directory `../.env`, not from `contracts/.env`
