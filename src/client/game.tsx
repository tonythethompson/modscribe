import './index.css';

import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell, type AppOverlay } from './components/AppShell.js';
import { OverlayPanel } from './components/OverlayPanel.js';
import { DeskView } from './components/desk/DeskView.js';
import { WikiView } from './components/wiki/WikiView.js';
import { ArchiveView } from './components/archive/ArchiveView.js';
import { SettingsView } from './components/settings/SettingsView.js';
import { DraftEditor, normalizeDraft } from './components/DraftEditor.js';
import { useToast } from './hooks/useToast.js';
import { apiFetch } from './lib/api.js';
import type { DeskBootstrap, Draft } from '../shared/types.js';
import { setDeskBootstrapCache } from './lib/deskCache.js';

const App = () => {
  const [overlay, setOverlay] = useState<AppOverlay | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draftEdit, setDraftEdit] = useState<Draft | null>(null);
  const [deskPending, setDeskPending] = useState(0);
  const [subredditName, setSubredditName] = useState('modscribe');
  const [bootstrap, setBootstrap] = useState<DeskBootstrap | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    void apiFetch<DeskBootstrap>('/api/bootstrap')
      .then((data) => {
        setDeskBootstrapCache(data);
        setBootstrap(data);
        setSubredditName(data.subredditName);
        setDeskPending(data.pendingCount);
      })
      .catch((err) => {
        if (err instanceof Error && err.message === 'Access Denied') {
          setAccessDenied(true);
        }
      });
  }, []);

  const handleToast = useCallback(
    (msg: string) => {
      if (msg === 'Access Denied') setAccessDenied(true);
      showToast(msg);
    },
    [showToast]
  );

  const openOverlay = useCallback((next: AppOverlay) => {
    setMenuOpen(false);
    setOverlay(next);
  }, []);

  const closeOverlay = useCallback(() => setOverlay(null), []);

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

  const overlayTitle =
    overlay === 'library' ? 'Library' : overlay === 'archive' ? 'Archive' : overlay === 'settings' ? 'Settings' : '';

  return (
    <AppShell
      deskPending={deskPending}
      menuOpen={menuOpen}
      onMenuToggle={() => setMenuOpen((o) => !o)}
      onOpenOverlay={openOverlay}
      toast={toast && <div key={toast.key} className="toast">{toast.message}</div>}
    >
      {draftEdit ? (
        <OverlayPanel title="Draft" onBack={() => setDraftEdit(null)}>
          <DraftEditor
            subredditName={subredditName}
            showToast={handleToast}
            initialDraft={draftEdit}
            onClose={() => setDraftEdit(null)}
          />
        </OverlayPanel>
      ) : overlay ? (
        <OverlayPanel title={overlayTitle} onBack={closeOverlay}>
          {overlay === 'library' && (
            <WikiView
              subredditName={subredditName}
              showToast={handleToast}
              onEditDraft={(d) => {
                closeOverlay();
                setDraftEdit(normalizeDraft(d));
              }}
            />
          )}
          {overlay === 'archive' && <ArchiveView showToast={handleToast} />}
          {overlay === 'settings' && <SettingsView showToast={handleToast} />}
        </OverlayPanel>
      ) : (
        <DeskView
          bootstrap={bootstrap}
          showToast={handleToast}
          onPendingChange={setDeskPending}
          onEditDraft={(d) => setDraftEdit(normalizeDraft(d))}
          onOpenSettings={() => openOverlay('settings')}
        />
      )}
    </AppShell>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
