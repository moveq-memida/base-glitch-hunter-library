'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import ProfileEditor from '@/components/ProfileEditor';

interface ProfileClientProps {
  userId: number;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  walletAddress: string | null;
}

export default function ProfileClient({
  userId,
  displayName,
  bio,
  avatarUrl,
  walletAddress,
}: ProfileClientProps) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const isOwner = isConnected && address && walletAddress &&
    address.toLowerCase() === walletAddress.toLowerCase();

  if (!isOwner) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="button-secondary profile-edit-button"
        onClick={() => setIsEditing(true)}
      >
        Edit Profile
      </button>

      {isEditing && (
        <ProfileEditor
          userId={userId}
          currentDisplayName={displayName}
          currentBio={bio}
          currentAvatarUrl={avatarUrl}
          walletAddress={walletAddress}
          onClose={() => setIsEditing(false)}
          onSave={() => {
            router.refresh();
          }}
        />
      )}
    </>
  );
}
