# agent.md — Vibe Coding Hackathon / Base Mini App

## 0) Priority
This file (agent.md) is the source of truth.
If any instruction conflicts with this file, follow agent.md.

## 1) Context (Hackathon)
We are participating in "Vibe Coding Hackathon" (Base Japan).
Goal: build something “fun” on Base and ship it as a Base App Mini App.
This is a “ogiri” style hackathon: novelty + fun + shipping matters more than complex engineering.

### Schedule (JST)
- Hackathon: 2025-12-13 (Sat) — 2025-12-20 (Sat)
- Development: 2025-12-13 — 2025-12-19
- Submission deadline: 2025-12-19 (Fri) 21:00 JST
- Demo day: 2025-12-20 (Sat) 14:00–17:00 JST

### Rules / Requirements
- Must be deployed and runnable as a **Base App Mini App**.
- Must submit **code (GitHub repo)** and **demo URL**.
- Must include **SUBMIT.md** in the repo (judging target).
- No harassment, hate, discrimination, or content violating public morals.

### Prize
Total ~$2,000 USDC equivalent.
(1st $500 / 2nd $300 / 3rd $200 / special prizes possible)

### Judging (high-level)
- “Is it fun?” / “Is it interesting?”
- Does it actually use Base in a meaningful way?
- Can judges understand it quickly and run it smoothly?

## 2) Important Links
### Hackathon pages
- Luma: https://luma.com/etrs8qw8?tk=qYv6Mr&utm_source=x
- Notion: https://basejapan.notion.site/hack-Vibe-Coding-Hackathon-2c70ee80018f80079b89ebc797b52143
- Submission form (Google Form): https://forms.gle/WpCrSd6pFUM4Fbc4A
- Discord: https://discord.gg/JgmkD8akdG

### Base Mini App docs
- Create new mini app: https://docs.base.org/mini-apps/quickstart/create-new-miniapp
- Migrate existing apps: https://docs.base.org/mini-apps/quickstart/migrate-existing-apps

## 3) Project
Project name: Glitch Hunter Library (Base Mini App)
One-line: A mini app to post, browse, and upvote legendary game glitches.

Deployment:
- Must run inside Base App (no external redirects).
- Must keep the app client-agnostic (no “Farcaster only” wording).

## 4) Core Feature (Must-have): Onchain Stamp (Base Mainnet)
We implemented/need: “Stamp a post” by writing ONLY a keccak256 hash (bytes32) on Base mainnet.

Definition:
- Stamp = write bytes32 hash onchain (not the full content).
- Show a clear UI badge after success:
  - ✅ Onchain stamped
  - BaseScan tx link
  - Copyable stampHash

Chain:
- Base mainnet only (chainId 8453).
- BaseScan links must use basescan.org.

Hashing (canonical; do not change silently):
- Hash is computed server-side from a canonical payload, UTF-8 encoded -> keccak256 -> bytes32.
- Canonical payload order:
  version=1
  title
  game
  videoUrl
  description
  createdAtISO
  authorIdentifier (wallet or fid; empty string if none)
- If we must change fields/order, update SUBMIT.md and README.

Data storage:
- Persist stampHash, stampTxHash, stampedAt in DB for each post.

Security / UX:
- Prevent double-stamping.
- Handle transaction failure with a short message (no crash).
- Never put secrets in client code.

## 5) Engineering Constraints
- NO Tailwind CSS. Do not introduce Tailwind.
- Keep UI changes minimal. Prefer existing patterns and styles.
- No large refactors. Small diffs only.
- Do not commit secrets (keys, DB passwords, API keys). Use env vars only.

## 6) Deliverables (Submission-ready)
Repo must include:
- SUBMIT.md (filled)
- README.md (basic run instructions + what the app does)
- Demo URL (Vercel)
- GitHub repo public or accessible to judges
- (If contract exists) contract address + BaseScan link + example tx links

SUBMIT.md must clearly say:
- What’s fun (ogiri point)
- How Base is used: “Onchain stamp on Base mainnet (keccak256 hash)”
- How to run / demo steps (1 minute)

## 7) Pre-submission Checklist
- App opens from Base App (via URL post) successfully.
- `/.well-known/farcaster.json` is valid and reachable.
- `fc:miniapp` metadata exists and produces rich embed.
- Onboarding exists (at least 1 screen) + can explore before sign-in when possible.
- At least 3–5 seed posts exist (so it’s not empty).
- Stamp flow works on Base mainnet:
  - tx is on basescan.org
  - UI shows ✅ + link + hash
- npm run lint / build pass.

## 8) Working Style for Codex
- Before coding: list files to touch + plan.
- Implement smallest working change first, then polish.
- When unsure, ask by outputting assumptions + safest default.
- Always keep the hackathon deadline in mind (ship > perfection).
