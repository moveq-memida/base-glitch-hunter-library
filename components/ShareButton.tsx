'use client';

import { useState } from 'react';

interface ShareButtonProps {
  title: string;
  url: string;
  text?: string;
}

export default function ShareButton({ title, url, text }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = text || title;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url,
        });
      } catch (error) {
        console.log('Share cancelled', error);
      }
    } else {
      setShowMenu(!showMenu);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="share-button-wrapper">
      <button type="button" className="share-button" onClick={handleNativeShare}>
        <span aria-hidden="true">↗</span>
        Share
      </button>

      {showMenu && (
        <div className="share-menu">
          <button
            type="button"
            onClick={handleCopyLink}
            className={`share-menu__item ${copied ? 'share-menu__item--success' : ''}`}
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="share-menu__item"
          >
            Twitter
          </a>
        </div>
      )}

      {showMenu && (
        <div className="share-menu__backdrop" onClick={() => setShowMenu(false)} />
      )}
    </div>
  );
}
