import type { ReactNode } from 'react';

export type AppTab = 'desk' | 'wiki' | 'archive' | 'settings';

type AppShellProps = {
  activeTab: AppTab;
  deskPending: number;
  onTabChange: (tab: AppTab) => void;
  children: ReactNode;
  toast: ReactNode;
};

export const AppShell = ({
  activeTab,
  deskPending,
  onTabChange,
  children,
  toast,
}: AppShellProps) => (
  <div className="layout">
    <header className="topbar">
      <span className="topbar-logo">ModScribe</span>
      <span className="topbar-subtitle">Living subreddit wiki</span>
    </header>

    <nav className="tabs">
      <button
        type="button"
        id="tab-desk"
        className={`tab ${activeTab === 'desk' ? 'active' : ''}`}
        onClick={() => onTabChange('desk')}
      >
        Desk
        {deskPending > 0 && <span className="tab-badge">{deskPending}</span>}
      </button>
      <button
        type="button"
        id="tab-wiki"
        className={`tab ${activeTab === 'wiki' ? 'active' : ''}`}
        onClick={() => onTabChange('wiki')}
      >
        Wiki
      </button>
      <button
        type="button"
        id="tab-archive"
        className={`tab ${activeTab === 'archive' ? 'active' : ''}`}
        onClick={() => onTabChange('archive')}
      >
        Archive
      </button>
      <button
        type="button"
        id="tab-settings"
        className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onTabChange('settings')}
      >
        Settings
      </button>
    </nav>

    <main className="main-content">{children}</main>
    {toast}
  </div>
);
