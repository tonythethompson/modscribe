import './index.css';

import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell, type AppTab } from './components/AppShell.js';
import { DeskView } from './components/desk/DeskView.js';
import { WikiView } from './components/wiki/WikiView.js';
import { ArchiveView } from './components/archive/ArchiveView.js';
import { SettingsView } from './components/settings/SettingsView.js';
import { useToast } from './hooks/useToast.js';
import { apiFetch } from './lib/api.js';

const App = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('desk');
  const [deskPending, setDeskPending] = useState(0);
  const [subredditName, setSubredditName] = useState('modscribe');
  const [accessDenied, setAccessDenied] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    void apiFetch<{ subredditName: string }>('/api/inbox/meta')
      .then((data) => setSubredditName(data.subredditName))
      .catch(() => {});
  }, []);

  const handleToast = useCallback(
    (msg: string) => {
      if (msg === 'Access Denied') setAccessDenied(true);
      showToast(msg);
    },
    [showToast]
  );

  if (accessDenied) {
    return (
      <div className="layout">
        <header className="topbar">
          <span className="topbar-logo">ModScribe</span>
        </header>
        <div className="panel">
          <div className="empty">
            <div className="empty-title">Moderator access only</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      activeTab={activeTab}
      deskPending={deskPending}
      onTabChange={setActiveTab}
      toast={toast && <div key={toast.key} className="toast">{toast.message}</div>}
    >
      {activeTab === 'desk' && (
        <DeskView
          subredditName={subredditName}
          showToast={handleToast}
          onPendingChange={setDeskPending}
        />
      )}
      {activeTab === 'wiki' && (
        <WikiView subredditName={subredditName} showToast={handleToast} />
      )}
      {activeTab === 'archive' && <ArchiveView showToast={handleToast} />}
      {activeTab === 'settings' && <SettingsView showToast={handleToast} />}
    </AppShell>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
