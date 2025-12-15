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

function normalizeField(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\n/g, '\\n');
}

export function buildStampPayload(input: StampPayloadInput): string {
  return [
    `version=${STAMP_VERSION}`,
    normalizeField(input.title),
    normalizeField(input.game),
    normalizeField(input.videoUrl),
    normalizeField(input.description),
    normalizeField(input.createdAtIso),
    normalizeField(input.authorIdentifier),
  ].join('\n');
}

export function computeStampHash(payload: string): `0x${string}` {
  return keccak256(toBytes(payload));
}
