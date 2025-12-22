import { Suspense } from 'react';
import SubmitClient from './SubmitClient';

export default function SubmitPage() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <main className="page-main">
            <div className="loading-inline">
              <span className="loading-spinner" aria-hidden="true" />
              Loading...
            </div>
          </main>
        </div>
      }
    >
      <SubmitClient />
    </Suspense>
  );
}
