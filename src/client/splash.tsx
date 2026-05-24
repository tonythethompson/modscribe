import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { InboxItem } from '../shared/types.js';

const Splash = () => {
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/inbox')
      .then((r) => r.json())
      .then((items: InboxItem[]) => {
        const pending = items.filter((i) => i.status === 'pending').length;
        setPendingCount(pending);
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
