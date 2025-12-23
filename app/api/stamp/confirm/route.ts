import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GLITCH_STAMP_ADDRESS, glitchStampABI } from '@/lib/contracts';
import { createPublicClient, decodeEventLog, http, isHex } from 'viem';
import { base } from 'viem/chains';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const glitchIdRaw = body.glitchId ?? body.id;
    const txHashRaw = body.txHash ?? body.hash;

    const glitchId = typeof glitchIdRaw === 'string' ? parseInt(glitchIdRaw, 10) : glitchIdRaw;
    const txHash = txHashRaw as string | undefined;

    if (!Number.isFinite(glitchId) || glitchId <= 0) {
      return NextResponse.json({ error: 'Invalid glitchId' }, { status: 400 });
    }

    if (!txHash || typeof txHash !== 'string' || !isHex(txHash) || txHash.length !== 66) {
      return NextResponse.json({ error: 'Invalid txHash' }, { status: 400 });
    }

    const glitch = await prisma.glitch.findUnique({
      where: { id: glitchId },
      select: { id: true, stamp_hash: true },
    });

    if (!glitch) {
      return NextResponse.json({ error: 'Glitch not found' }, { status: 404 });
    }

    if (!glitch.stamp_hash) {
      await prisma.glitch.update({
        where: { id: glitchId },
        data: { stamp_tx_hash: txHash },
      });
      return NextResponse.json({ ok: true, verified: false, reason: 'stamp_hash missing' });
    }

    let verified = false;
    let verifiedAt: Date | null = null;

    try {
      const rpcUrl = process.env.BASE_MAINNET_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL;
      const publicClient = createPublicClient({
        chain: base,
        transport: rpcUrl ? http(rpcUrl) : http(),
      });

      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      const expectedContract = GLITCH_STAMP_ADDRESS?.toLowerCase();
      const expectedHash = glitch.stamp_hash.toLowerCase();

      for (const log of receipt.logs) {
        if (expectedContract && log.address.toLowerCase() !== expectedContract) continue;

        try {
          const decoded = decodeEventLog({
            abi: glitchStampABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName !== 'Stamped') continue;
          const args = decoded.args as unknown as { hash: `0x${string}`; timestamp: bigint };
          if (args.hash.toLowerCase() !== expectedHash) continue;

          verified = true;
          const timestampMs = Number(args.timestamp) * 1000;
          verifiedAt = Number.isFinite(timestampMs) ? new Date(timestampMs) : new Date();
          break;
        } catch {
          // Not our event.
        }
      }
    } catch (error) {
      console.warn('Stamp confirmation verification skipped:', error);
    }

    await prisma.glitch.update({
      where: { id: glitchId },
      data: {
        stamp_tx_hash: txHash,
        stamped_at: verified ? verifiedAt : null,
      },
    });

    return NextResponse.json({ ok: true, verified });
  } catch (error) {
    console.error('Error confirming stamp:', error);
    return NextResponse.json({ error: 'Failed to confirm stamp' }, { status: 500 });
  }
}
