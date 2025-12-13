import { Abi } from 'viem';

// GlitchRegistry contract ABI (minimal - add more functions as needed)
export const glitchRegistryABI: Abi = [
  {
    type: 'function',
    name: 'submitGlitch',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'contentHash', type: 'bytes32' }],
    outputs: [{ name: 'glitchId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'upvote',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'glitchId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getGlitch',
    stateMutability: 'view',
    inputs: [{ name: 'glitchId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'author', type: 'address' },
          { name: 'contentHash', type: 'bytes32' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getVoteCount',
    stateMutability: 'view',
    inputs: [{ name: 'glitchId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'hasUserVoted',
    stateMutability: 'view',
    inputs: [
      { name: 'glitchId', type: 'uint256' },
      { name: 'voter', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'nextGlitchId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'GlitchSubmitted',
    inputs: [
      { name: 'glitchId', type: 'uint256', indexed: true },
      { name: 'author', type: 'address', indexed: true },
      { name: 'contentHash', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'GlitchUpvoted',
    inputs: [
      { name: 'glitchId', type: 'uint256', indexed: true },
      { name: 'voter', type: 'address', indexed: true },
    ],
  },
] as const;

export const GLITCH_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_GLITCH_REGISTRY_ADDRESS as `0x${string}` | undefined;

export const glitchStampABI: Abi = [
  {
    type: 'function',
    name: 'stamp',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'hash', type: 'bytes32' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getStamp',
    stateMutability: 'view',
    inputs: [{ name: 'hash', type: 'bytes32' }],
    outputs: [
      { name: 'author', type: 'address' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'uri', type: 'string' },
    ],
  },
  {
    type: 'event',
    name: 'Stamped',
    inputs: [
      { name: 'hash', type: 'bytes32', indexed: true },
      { name: 'author', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
      { name: 'uri', type: 'string', indexed: false },
    ],
  },
] as const;

export const GLITCH_STAMP_ADDRESS = process.env.NEXT_PUBLIC_GLITCH_STAMP_ADDRESS as `0x${string}` | undefined;
