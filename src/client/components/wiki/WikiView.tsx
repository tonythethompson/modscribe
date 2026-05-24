import { useCallback, useEffect, useState } from 'react';
import type { Draft, StructureProposal, WikiArticle } from '../../../shared/types.js';
import { apiFetch } from '../../lib/api.js';
import { DraftEditor } from '../DraftEditor.js';

type WikiViewProps = {
  subredditName: string;
  showToast: (msg: string) => void;
};

export const WikiView = ({ subredditName, showToast }: WikiViewProps) => {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [proposals, setProposals] = useState<StructureProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDraft, setEditDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, d, p] = await Promise.all([
        apiFetch<WikiArticle[]>('/api/articles'),
        apiFetch<Draft[]>('/api/drafts'),
        apiFetch<StructureProposal[]>('/api/proposals'),
      ]);
      setArticles(a.filter((x) => x.status === 'active'));
      setDrafts(d.filter((x) => x.status !== 'archived'));
      setProposals(p.filter((x) => x.status === 'pending'));
    } catch {
      showToast('Failed to load wiki');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleProposal = async (id: string, action: 'approve' | 'reject') => {
    try {
      const result = await apiFetch<{
        proposal: StructureProposal;
        mergedArticle?: WikiArticle;
        mergedCount?: number;
        splitArticles?: WikiArticle[];
      }>(`/api/proposals/${id}/${action}`, { method: 'POST' });
      if (action === 'approve' && result.mergedArticle) {
        showToast(
          `Merged ${result.mergedCount ?? 0} article(s) into "${result.mergedArticle.title}"`
        );
      } else if (action === 'approve' && result.splitArticles?.length) {
        showToast(`Split into ${result.splitArticles.length} articles`);
      } else {
        showToast(action === 'approve' ? 'Proposal approved' : 'Proposal rejected');
      }
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update proposal');
    }
  };

  if (editDraft) {
    return (
      <DraftEditor
        subredditName={subredditName}
        showToast={showToast}
        initialDraft={editDraft}
        onClose={() => setEditDraft(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="panel center-flex">
        <div className="spinner" />
      </div>
    );
  }

  const byTaxonomy = new Map<string, WikiArticle[]>();
  for (const article of articles) {
    const list = byTaxonomy.get(article.taxonomyPath) ?? [];
    list.push(article);
    byTaxonomy.set(article.taxonomyPath, list);
  }

  return (
    <div className="panel wiki-panel">
      {proposals.length > 0 && (
        <>
          <div className="section-title">Structure proposals</div>
          {proposals.map((p) => (
            <div key={p.id} className="card">
              <div className="card-title">
                {p.kind}: {p.articleIds.length} articles
              </div>
              <div className="card-body-preview">{p.rationale}</div>
              <div className="btn-row">
                {p.kind === 'merge' && (
                  <button
                    type="button"
                    className="btn btn-accent btn-sm"
                    onClick={() => void handleProposal(p.id, 'approve')}
                  >
                    Approve merge
                  </button>
                )}
                {p.kind === 'split' && (
                  <button
                    type="button"
                    className="btn btn-accent btn-sm"
                    onClick={() => void handleProposal(p.id, 'approve')}
                  >
                    Approve split
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void handleProposal(p.id, 'reject')}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="section-title">Articles by taxonomy</div>
      {articles.length === 0 ? (
        <div className="empty">
          <div className="empty-desc">No articles yet. Generate drafts from the Desk.</div>
        </div>
      ) : (
        [...byTaxonomy.entries()].map(([path, group]) => (
          <div key={path} className="taxonomy-group">
            <div className="taxonomy-label">{path}</div>
            {group.map((a) => (
              <div key={a.id} className="card">
                <div className="card-title">{a.title}</div>
                <div className="card-meta">/{a.slug} · {a.sourceIds.length} sources</div>
              </div>
            ))}
          </div>
        ))
      )}

      <div className="section-title">Draft revisions</div>
      {drafts.length === 0 ? (
        <div className="card-meta">No active drafts</div>
      ) : (
        drafts.map((d) => (
          <button
            key={d.id}
            type="button"
            className="card card-btn"
            onClick={() => setEditDraft(d)}
          >
            <div className="card-title">{d.title}</div>
            <div className="card-meta">/{d.slug}</div>
          </button>
        ))
      )}
    </div>
  );
};
