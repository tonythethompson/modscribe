import { useCallback, useEffect, useState } from 'react';
import type {
  Draft,
  StructureProposal,
  WikiArticle,
  WikiArticleSummary,
} from '../../../shared/types.js';
import { apiFetch } from '../../lib/api.js';
import { getDeskBootstrapCache } from '../../lib/deskCache.js';
import { hasLiveRedditWikiForArticle, hasLiveRedditWikiForDraft } from '../../lib/wikiLink.js';
import { openSubredditWiki } from '../../lib/wikiNav.js';

type WikiViewProps = {
  subredditName: string;
  showToast: (msg: string) => void;
  onEditDraft: (draft: Draft) => void;
};

export const WikiView = ({ subredditName, showToast, onEditDraft }: WikiViewProps) => {
  const [articles, setArticles] = useState<WikiArticleSummary[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [proposals, setProposals] = useState<StructureProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const cached = getDeskBootstrapCache();
    if (cached?.articles.length) {
      setArticles(cached.articles);
      setLoading(false);
    }
    try {
      const articleFetch = cached?.articles.length
        ? Promise.resolve(cached.articles)
        : apiFetch<WikiArticleSummary[]>('/api/articles?summary=1');
      const [a, d, p] = await Promise.all([
        articleFetch,
        apiFetch<Draft[]>('/api/drafts'),
        apiFetch<StructureProposal[]>('/api/proposals'),
      ]);
      setArticles(a.filter((x) => x.status === 'active'));
      setDrafts(d.filter((x) => x.status !== 'archived'));
      setProposals(p.filter((x) => x.status === 'pending'));
    } catch {
      showToast('Failed to load library');
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

  if (loading) {
    return (
      <div className="panel center-flex">
        <div className="spinner" />
      </div>
    );
  }

  const byTaxonomy = new Map<string, WikiArticleSummary[]>();
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
                <div className="card-meta">
                  /{a.slug} · {a.sourceIds.length} sources
                  {hasLiveRedditWikiForArticle(a) ? ' · On Reddit wiki' : ' · In-app only'}
                </div>
                {hasLiveRedditWikiForArticle(a) && (
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => openSubredditWiki(subredditName, a.slug)}
                    >
                      View on Reddit
                    </button>
                  </div>
                )}
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
          <div key={d.id} className="card">
            <div className="card-title">{d.title}</div>
            <div className="card-meta">
              /{d.slug}
              {hasLiveRedditWikiForDraft(d) ? ' · On Reddit wiki' : ' · Not published yet'}
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-accent btn-sm" onClick={() => onEditDraft(d)}>
                Edit draft
              </button>
              {hasLiveRedditWikiForDraft(d) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => openSubredditWiki(subredditName, d.slug)}
                >
                  View on Reddit
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
