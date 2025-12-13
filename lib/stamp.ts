import { keccak256, toBytes } from 'viem';

export const STAMP_VERSION = '1';

export interface StampPayloadInput {
  title: string;
  game: string;
  videoUrl: string;
  description: string;
  createdAtIso: string;
  authorIdentifier: string;
}

export function buildStampPayload(input: StampPayloadInput): string {
  return [
    `version=${STAMP_VERSION}`,
    `title=${JSON.stringify(input.title)}`,
    `game=${JSON.stringify(input.game)}`,
    `videoUrl=${JSON.stringify(input.videoUrl)}`,
    `description=${JSON.stringify(input.description)}`,
    `createdAt=${JSON.stringify(input.createdAtIso)}`,
    `authorIdentifier=${JSON.stringify(input.authorIdentifier)}`,
  ].join('\n');
}

export function computeStampHash(payload: string): `0x${string}` {
  return keccak256(toBytes(payload));
}
