# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Glitch Hunter Library** is a Web3 dApp for discovering, submitting, and voting on video game glitches (bugs, exploits, and odd behaviors). The project combines:

- **Frontend**: Next.js (App Router) + TypeScript + wagmi + viem
- **Backend**: Next.js Route Handlers + PostgreSQL (Prisma or Drizzle ORM)
- **Blockchain**: Solidity smart contract on Base network (Sepolia testnet → mainnet)
- **Static UI**: Pre-built HTML/CSS templates that need to be converted to React components

## Architecture

### Page Structure

The application has three main pages:
- `/` - Glitch listing page (index.html → app/page.tsx)
- `/submit` - Glitch submission form (submit.html → app/submit/page.tsx)
- `/glitch/[id]` - Individual glitch detail page (detail.html → app/glitch/[id]/page.tsx)

### Component Breakdown

Extract reusable components from the static HTML into `components/`:
- **Header.tsx** - Navigation header with title and action button
- **Footer.tsx** - Footer with copyright and links
- **GlitchCard.tsx** - Card component for displaying glitch previews
- **GlitchForm.tsx** - Form for submitting new glitches

### CSS Integration

The complete stylesheet is in `glitch.css` and should be imported in `app/layout.tsx`. The CSS uses:
- CSS custom properties for theming (dark theme with muted violet accents)
- Mobile-first responsive design with desktop breakpoints
- BEM-style naming conventions (e.g., `glitch-card__title`)

### Database Schema (Glitch)

```typescript
{
  id: string | number,
  title: string,
  game_name: string,
  platform: string,
  video_url: string,
  description: text,
  tags: string, // comma-separated
  author_address: string,
  onchain_glitch_id: number,
  content_hash: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Smart Contract Architecture

**GlitchRegistry.sol** on Base network stores:
- Glitch submissions: `mapping(uint256 => Glitch)` where `Glitch` contains `author`, `contentHash`, `createdAt`
- Voting state: `mapping(uint256 => mapping(address => bool)) hasVoted` and `mapping(uint256 => uint256) voteCount`

Key functions:
- `submitGlitch(bytes32 contentHash)` - Records new glitch on-chain, returns glitchId
- `upvote(uint256 glitchId)` - Allows one vote per address per glitch
- `getVoteCount(uint256 glitchId)` - Returns current vote count

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

### Smart Contract (Hardhat)

The Hardhat project should be in the `contracts/` directory with:
- `contracts/GlitchRegistry.sol` - Main contract
- `scripts/deploy.ts` - Deployment script
- `test/glitchRegistry.test.ts` - Contract tests
- `hardhat.config.ts` - Network configuration (Base Sepolia/mainnet)

**Note**: Commands below assume setup is complete. Configuration requires `.env` with:
- `BASE_SEPOLIA_RPC_URL`
- `BASE_MAINNET_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`

Expected commands (verify actual setup):
```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Base Sepolia
npx hardhat run scripts/deploy.ts --network base-sepolia

# Deploy to Base mainnet
npx hardhat run scripts/deploy.ts --network base-mainnet
```

### Next.js Application

Expected commands (verify after package.json is created):
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type checking
npx tsc --noEmit

# Linting (if configured)
npm run lint
```

## Key Technical Constraints

### Type Safety
- All code must be TypeScript with no `any` types
- wagmi and viem provide full type safety for contract interactions
- Use generated types from Hardhat for contract ABIs

### Error Handling
- Display user-friendly messages for wallet connection failures
- Handle transaction rejections gracefully ("Transaction was cancelled")
- Show clear feedback for network switching requirements

### Web3 Best Practices
- Never commit private keys or sensitive data
- Read `contentHash` from contract to verify data integrity
- Use wagmi hooks for wallet connection state management
- Support both Base Sepolia (testnet) and Base mainnet

## Implementation Notes

The project currently contains only static HTML/CSS files. The implementation should proceed in this order:

1. **Convert static UI to Next.js components** - Break down HTML into reusable React components
2. **Set up Hardhat project** - Create contract, tests, and deployment scripts
3. **Implement API routes** - Create database schema and REST endpoints
4. **Integrate wagmi + viem** - Connect frontend to smart contract
5. **End-to-end testing** - Verify submit and vote flows work on testnet

## Language Note

The project specification document (`first.md`) is in Japanese, but all code, comments, and user-facing text should be in English.
