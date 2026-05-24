import { useCallback, useEffect, useState } from 'react';
import type { Draft, WikiPageContext } from '../../shared/types.js';
import { apiFetch } from '../lib/api.js';
import { navigateTo } from '@devvit/web/client';
import { hasLiveRedditWikiForDraft } from '../lib/wikiLink.js';
import { subredditWikiUrl } from '../lib/wikiNav.js';

export const normalizeDraft = (draft: Draft): Draft => ({
  ...draft,
  wikiContext: draft.wikiContext ?? { slug: draft.slug, exists: false },
  generationProvider: draft.generationProvider ?? 'mock',
});

type DraftEditorProps = {
  subredditName: string;
  showToast: (msg: string) => void;
  initialDraft?: Draft | null;
  onClose?: () => void;
};

export const DraftEditor = ({
  subredditName,
  showToast,
  initialDraft,
  onClose,
}: DraftEditorProps) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editPublic, setEditPublic] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editIncludeAuthor, setEditIncludeAuthor] = useState(false);
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [wikiContext, setWikiContext] = useState<WikiPageContext | null>(null);
  const [publishedWikiUrl, setPublishedWikiUrl] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    try {
      const data = (await apiFetch<Draft[]>('/api/drafts')).map(normalizeDraft);
      const active = data.filter((d) => d.status !== 'archived');
      setDrafts(active);
      return active;
    } catch {
      showToast('Failed to load drafts');
      return [];
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const selectDraft = useCallback((draft: Draft) => {
    const normalized = normalizeDraft(draft);
    setSelected(normalized);
    setEditTitle(normalized.title);
    setEditSlug(normalized.slug);
    setEditPublic(normalized.publicMarkdown);
    setEditNotes(normalized.moderatorNotes);
    setEditIncludeAuthor(normalized.includeAuthor);
    setWikiContext(normalized.wikiContext);
    setPublishConfirmed(false);
    setPublishedWikiUrl(
      hasLiveRedditWikiForDraft(normalized)
        ? subredditWikiUrl(subredditName, normalized.slug)
        : null
    );
  }, [subredditName]);

  useEffect(() => {
    if (initialDraft) {
      selectDraft(normalizeDraft(initialDraft));
      setLoading(false);
      void loadDrafts();
      return;
    }
    void loadDrafts();
  }, [initialDraft, loadDrafts, selectDraft]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = normalizeDraft(
        await apiFetch<Draft>(`/api/drafts/${selected.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: editTitle,
            slug: editSlug,
            publicMarkdown: editPublic,
            moderatorNotes: editNotes,
            includeAuthor: editIncludeAuthor,
          }),
        })
      );
      setSelected(updated);
      setWikiContext(updated.wikiContext);
      setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      showToast('Draft saved');
    } catch {
      showToast('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selected || !publishConfirmed) return;
    setSaving(true);
    try {
      const result = await apiFetch<{ draft: Draft; publish: { wikiUrl: string; action: string } }>(
        `/api/drafts/${selected.id}/publish`,
        { method: 'POST', body: JSON.stringify({ confirmed: true }) }
      );
      const normalized = normalizeDraft(result.draft);
      setSelected(normalized);
      setPublishedWikiUrl(result.publish.wikiUrl);
      showToast(`Wiki ${result.publish.action}`);
      await loadDrafts();
    } catch {
      showToast('Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="panel center-flex">
        <div className="spinner" />
      </div>
    );
  }

  if (!drafts.length && !selected) {
    return (
      <div className="panel">
        <div className="empty">
          <div className="empty-title">No drafts yet</div>
          <div className="empty-desc">Categorize a desk item and generate a draft to edit here.</div>
          {onClose && (
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Back to Desk
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="panel editor-panel">
      <div className="split">
        <div className="split-pane list-pane">
          <div className="section-title">Drafts ({drafts.length})</div>
          {drafts.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`card card-btn ${selected?.id === d.id ? 'selected' : ''}`}
              onClick={() => selectDraft(d)}
            >
              <div className="card-title">{d.title}</div>
              <div className="card-meta">/{d.slug}</div>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="split-pane">
            <div className="section-title">Edit draft</div>
            <div className="form-group">
              <label className="form-label" htmlFor="draft-title">
                Title
              </label>
              <input
                id="draft-title"
                className="form-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="draft-slug">
                Wiki slug
              </label>
              <input
                id="draft-slug"
                className="form-input"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
              />
            </div>
            {selected.taxonomyPath && (
              <div className="card-meta">Category: {selected.taxonomyPath}</div>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="draft-public">
                Public markdown
              </label>
              <textarea
                id="draft-public"
                className="form-textarea mono"
                value={editPublic}
                onChange={(e) => setEditPublic(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="draft-notes">
                Moderator notes
              </label>
              <textarea
                id="draft-notes"
                className="form-textarea"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
            <div className="toggle-row">
              <input
                type="checkbox"
                id="include-author"
                className="toggle"
                checked={editIncludeAuthor}
                onChange={(e) => setEditIncludeAuthor(e.target.checked)}
              />
              <label className="toggle-label" htmlFor="include-author">
                Include author in public output
              </label>
            </div>
            <div className="toggle-row">
              <input
                type="checkbox"
                id="publish-confirm"
                className="toggle"
                checked={publishConfirmed}
                onChange={(e) => setPublishConfirmed(e.target.checked)}
              />
              <label className="toggle-label" htmlFor="publish-confirm">
                I approve publishing to the subreddit wiki
              </label>
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void handleSave()}>
                Save
              </button>
              <button
                type="button"
                className="btn btn-accent"
                disabled={saving || !publishConfirmed}
                onClick={() => void handlePublish()}
              >
                Publish
              </button>
              {(publishedWikiUrl || (selected && hasLiveRedditWikiForDraft(selected))) && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    navigateTo(publishedWikiUrl ?? subredditWikiUrl(subredditName, editSlug));
                  }}
                >
                  View on Reddit
                </button>
              )}
              {onClose && (
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Back
                </button>
              )}
            </div>
            {wikiContext && selected && (
              <div className="card-meta">
                {hasLiveRedditWikiForDraft(selected)
                  ? 'Live on subreddit wiki — use View on Reddit to open it.'
                  : 'Not on subreddit wiki yet — publish when ready (button appears after publish).'}
              </div>
            )}
          </div>
        ) : (
          <div className="empty">
            <div className="empty-desc">Select a draft</div>
          </div>
        )}
      </div>
    </div>
  );
};
