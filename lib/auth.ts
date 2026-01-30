import { prisma } from '@/lib/prisma';

export interface VerifiedUser {
  walletAddress: string;
}

export async function getOrCreateUserByWallet(walletAddress: string) {
  // Check if user exists by wallet address
  let user = await prisma.user.findUnique({
    where: { wallet_address: walletAddress },
  });

  if (user) {
    return user;
  }

  // Create new user
  user = await prisma.user.create({
    data: {
      wallet_address: walletAddress,
      display_name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
    },
  });

  return user;
}

export async function getUserByWallet(walletAddress: string) {
  return prisma.user.findUnique({
    where: { wallet_address: walletAddress },
    include: {
      user_badges: {
        include: {
          badge: true,
        },
      },
    },
  });
}

export async function updateUserProfile(
  walletAddress: string,
  data: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
  }
) {
  return prisma.user.update({
    where: { wallet_address: walletAddress },
    data,
  });
}
