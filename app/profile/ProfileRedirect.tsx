'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/callback');
        if (response.ok) {
          const user = await response.json();
          router.replace(`/profile/${user.id}`);
        }
      } catch {
        // Not logged in, stay on this page
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="page">
      <Header actionText="Submit" actionHref="/submit" />
      <main className="page-main">
        <div className="profile-redirect">
          <div className="loading-inline">
            <div className="loading-spinner" />
            <span>Loading your profile...</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
