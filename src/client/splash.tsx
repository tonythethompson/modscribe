import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
const Splash = () => {
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/inbox/meta')
      .then((r) => r.json())
      .then((meta: { pendingCount: number }) => {
        setPendingCount(meta.pendingCount);
      })
      .catch(() => setPendingCount(0));
  }, []);

  return (
    <div className="splash">
      <div className="splash-brand">
        <div className="splash-title">ModScribe</div>
        <div className="splash-sub">Living wiki · r/{context.subredditName ?? '…'}</div>
      </div>

      <div className="splash-stat">
        {pendingCount === null ? (
          <div className="spinner" />
        ) : (
          <>
            <div className="splash-count">{pendingCount}</div>
            <div className="splash-label">
              {pendingCount === 1 ? 'item on desk' : 'items on desk'}
            </div>
          </>
        )}
      </div>

      <button
        id="open-dashboard-btn"
        className="btn btn-accent"
        type="button"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Open workspace
      </button>

      <div className="splash-foot">Moderators only</div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
