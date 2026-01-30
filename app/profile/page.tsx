import { Suspense } from 'react';
import ProfileRedirect from './ProfileRedirect';

export default function MyProfilePage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>}>
      <ProfileRedirect />
    </Suspense>
  );
}
