import type { ReactNode } from 'react';

export type AppOverlay = 'library' | 'archive' | 'settings';

type AppShellProps = {
  deskPending: number;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onOpenOverlay: (overlay: AppOverlay) => void;
  children: ReactNode;
  toast: ReactNode;
};

export const AppShell = ({
  deskPending,
  menuOpen,
  onMenuToggle,
  onOpenOverlay,
  children,
  toast,
}: AppShellProps) => (
  <div className="layout">
    <header className="topbar">
      <span className="topbar-logo">ModScribe</span>
      {deskPending > 0 && (
        <span className="topbar-pending" title="Pending on desk">
          {deskPending} pending
        </span>
      )}
      <div className="topbar-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm menu-trigger"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={onMenuToggle}
        >
          More
        </button>
        {menuOpen && (
          <>
            <div className="menu-backdrop" role="presentation" onClick={onMenuToggle} />
            <div className="menu-dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => onOpenOverlay('library')}
              >
                Library
                <span className="menu-item-hint">Drafts & articles</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => onOpenOverlay('archive')}
              >
                Archive
                <span className="menu-item-hint">Cleared sources</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => onOpenOverlay('settings')}
              >
                Settings
                <span className="menu-item-hint">Watch, discover, AI</span>
              </button>
            </div>
          </>
        )}
      </div>
    </header>

    <main className="main-content">{children}</main>
    {toast}
  </div>
);
