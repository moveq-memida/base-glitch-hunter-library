import { verifyMessage } from 'viem';

export interface SIWEMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
}

/**
 * Parse a SIWE message string into structured data
 */
export function parseSIWEMessage(message: string): SIWEMessage | null {
  try {
    const lines = message.split('\n');
    const result: Partial<SIWEMessage> = {};

    // First line: domain wants you to sign in with your Ethereum account:
    const domainMatch = lines[0]?.match(/^(.+) wants you to sign in with your Ethereum account:$/);
    if (domainMatch) {
      result.domain = domainMatch[1];
    }

    // Second line: address
    result.address = lines[1]?.trim();

    // Find statement (between address and URI)
    const uriIndex = lines.findIndex(l => l.startsWith('URI:'));
    if (uriIndex > 2) {
      result.statement = lines.slice(3, uriIndex).join('\n').trim();
    }

    // Parse key-value pairs
    for (const line of lines) {
      if (line.startsWith('URI:')) result.uri = line.slice(4).trim();
      if (line.startsWith('Version:')) result.version = line.slice(8).trim();
      if (line.startsWith('Chain ID:')) result.chainId = parseInt(line.slice(9).trim(), 10);
      if (line.startsWith('Nonce:')) result.nonce = line.slice(6).trim();
      if (line.startsWith('Issued At:')) result.issuedAt = line.slice(10).trim();
      if (line.startsWith('Expiration Time:')) result.expirationTime = line.slice(16).trim();
    }

    if (!result.domain || !result.address || !result.nonce || !result.issuedAt) {
      return null;
    }

    return result as SIWEMessage;
  } catch {
    return null;
  }
}

/**
 * Verify a SIWE signature
 */
export async function verifySIWESignature(
  message: string,
  signature: `0x${string}`,
  expectedAddress: string
): Promise<{ valid: boolean; address?: string; error?: string }> {
  try {
    const parsed = parseSIWEMessage(message);
    if (!parsed) {
      return { valid: false, error: 'Invalid SIWE message format' };
    }

    // Check expiration
    if (parsed.expirationTime) {
      const expiration = new Date(parsed.expirationTime);
      if (expiration < new Date()) {
        return { valid: false, error: 'Signature expired' };
      }
    }

    // Check issued at (not too old - max 5 minutes)
    const issuedAt = new Date(parsed.issuedAt);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (issuedAt < fiveMinutesAgo) {
      return { valid: false, error: 'Signature too old' };
    }

    // Verify signature
    const valid = await verifyMessage({
      address: expectedAddress as `0x${string}`,
      message,
      signature,
    });

    if (!valid) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Check address matches
    if (parsed.address.toLowerCase() !== expectedAddress.toLowerCase()) {
      return { valid: false, error: 'Address mismatch' };
    }

    return { valid: true, address: parsed.address };
  } catch (error) {
    console.error('SIWE verification error:', error);
    return { valid: false, error: 'Verification failed' };
  }
}

/**
 * Create a SIWE message for signing
 */
export function createSIWEMessage(params: {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  chainId: number;
  nonce: string;
}): string {
  const issuedAt = new Date().toISOString();
  const expirationTime = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  return `${params.domain} wants you to sign in with your Ethereum account:
${params.address}

${params.statement}

URI: ${params.uri}
Version: 1
Chain ID: ${params.chainId}
Nonce: ${params.nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`;
}

/**
 * Generate a random nonce
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
