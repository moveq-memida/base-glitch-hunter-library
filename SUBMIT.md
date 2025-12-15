# Glitch Hunter Library (Base Mini App) — SUBMIT

## One-line
Archive legendary game glitches as collectible cards, then **stamp the post identity hash on Base mainnet** as proof it exists onchain.

## What’s fun / ogiri point
- “I found a cursed glitch” becomes a **museum label**: a tiny onchain stamp that says “this happened”.
- You can share a glitch like a trading card, and the stamp makes it feel “official” without putting the content onchain.

## How Base is used (meaningfully)
- Each post has a **server-generated** `stampHash` (`bytes32`) computed from a canonical payload.
- Anyone can press **Stamp on Base** to write that `bytes32` hash (and a URL) to **Base mainnet (chainId 8453)**.
- The app shows `Onchain stamped ✅`, a **basescan.org** tx link, and a copyable `stampHash`.

## Demo URL
- https://base-glitch-hunter-library.vercel.app

## 1-minute demo steps (judge-friendly)
1. Open the app from Base App (Mini App).
2. Create a post on `/submit` (wallet connect → submit).
3. Open the new post detail page.
4. Tap **Stamp on Base** → confirm the transaction.
5. See **Onchain stamped ✅** + Basescan tx link + copyable `stampHash`.

## Onchain stamp hash format (canonical)
Payload is **newline-delimited** in this fixed order:

1. `version=1`
2. `title`
3. `game`
4. `videoUrl`
5. `description`
6. `createdAtISO`
7. `authorIdentifier` (wallet or fid; empty string if none)

Notes:
- Line breaks inside field values are normalized to `\n` and escaped to `\\n` so the payload stays exactly 7 lines.
- Hashing: `keccak256(toBytes(payload))` (server-side only).

## Repo
- https://github.com/moveq-memida/base-glitch-hunter-library

## Contract (Base mainnet)
- GlitchStamp: `0xb7EfCf8ad9367688F8bC57c1Bf364A510ff9B99A`
- Basescan: https://basescan.org/address/0xb7EfCf8ad9367688F8bC57c1Bf364A510ff9B99A

