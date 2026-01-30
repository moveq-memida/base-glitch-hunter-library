'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

interface ProfileEditorProps {
  userId: number;
  currentDisplayName: string | null;
  currentBio: string | null;
  currentAvatarUrl: string | null;
  walletAddress: string | null;
  onClose: () => void;
  onSave: () => void;
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function createSIWEMessage(params: {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  chainId: number;
  nonce: string;
}): string {
  const issuedAt = new Date().toISOString();
  const expirationTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();

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

export default function ProfileEditor({
  userId,
  currentDisplayName,
  currentBio,
  currentAvatarUrl,
  walletAddress,
  onClose,
  onSave,
}: ProfileEditorProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();

  const [displayName, setDisplayName] = useState(currentDisplayName || '');
  const [bio, setBio] = useState(currentBio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = isConnected && address && walletAddress && 
    address.toLowerCase() === walletAddress.toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      setError('Please connect your wallet first.');
      return;
    }

    if (!isOwner) {
      setError('You can only edit your own profile.');
      return;
    }

    setIsSaving(true);

    try {
      // Generate SIWE message
      const domain = window.location.host;
      const uri = window.location.origin;
      const nonce = generateNonce();
      
      const message = createSIWEMessage({
        domain,
        address,
        statement: 'Update my Glitch Hunter Library profile',
        uri,
        chainId: 8453, // Base mainnet
        nonce,
      });

      // Sign the message
      const signature = await signMessageAsync({ message });

      // Send to API
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          displayName: displayName || null,
          bio: bio || null,
          avatarUrl: avatarUrl || null,
          message,
          signature,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Profile update error:', err);
      if (err instanceof Error) {
        if (err.message.includes('User rejected')) {
          setError('Signature request was rejected.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <div className="profile-editor-overlay">
      <div className="profile-editor">
        <div className="profile-editor__header">
          <h3>Edit Profile</h3>
          <button 
            type="button" 
            className="profile-editor__close" 
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="profile-editor__form">
          <div className="glitch-form__field">
            <label htmlFor="displayName">Display Name</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              maxLength={50}
            />
          </div>

          <div className="glitch-form__field">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="glitch-form__field">
            <label htmlFor="avatarUrl">Avatar URL</label>
            <input
              type="url"
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="glitch-form__hint">Direct link to an image (PNG, JPG)</p>
          </div>

          {error && (
            <p className="glitch-form__error">{error}</p>
          )}

          <div className="profile-editor__actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
              disabled={isSaving || isSigning}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button-primary"
              disabled={isSaving || isSigning}
            >
              {isSigning ? 'Sign in wallet...' : isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <p className="profile-editor__notice">
            You will be asked to sign a message to verify ownership.
          </p>
        </form>
      </div>
    </div>
  );
}
