import type { ReactNode } from 'react';

type OverlayPanelProps = {
  title: string;
  onBack: () => void;
  children: ReactNode;
};

export const OverlayPanel = ({ title, onBack, children }: OverlayPanelProps) => (
  <div className="overlay-panel">
    <div className="overlay-bar">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
        ← Desk
      </button>
      <span className="overlay-bar-title">{title}</span>
    </div>
    <div className="overlay-body">{children}</div>
  </div>
);
