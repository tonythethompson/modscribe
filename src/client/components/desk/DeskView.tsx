import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';

import type { ArchiveReason, Draft, InboxItem, WikiArticle } from '../../../shared/types.js';

import { DEFAULT_TAXONOMY, ARCHIVE_REASON_LABELS } from '../../../shared/constants.js';

import { apiFetch } from '../../lib/api.js';

import { useMediaLayout } from '../../hooks/useMediaLayout.js';

import { DraftEditor } from '../DraftEditor.js';



type DeskViewProps = {

  subredditName: string;

  showToast: (msg: string) => void;

  onPendingChange: (n: number) => void;

};



type CategorizeState = {

  taxonomyPath: string;

  articleId: string;

  articleSlug: string;

  title: string;

  includeAuthor: boolean;

};



type MobileScreen = 'list' | 'detail';



function defaultCategorize(

  item: InboxItem | null,

  articles: WikiArticle[]

): CategorizeState {

  const taxonomyPath = item?.suggestedCategory ?? DEFAULT_TAXONOMY[0] ?? 'Uncategorized';

  const linked = item?.suggestedArticleId
    ? articles.find((a) => a.id === item.suggestedArticleId && a.status === 'active')
    : undefined;



  return {

    taxonomyPath,

    articleId: linked?.id ?? '',

    articleSlug: linked?.slug ?? '',

    title: linked?.title ?? item?.snapshot.title ?? '',

    includeAuthor: false,

  };

}



export const DeskView = ({ subredditName, showToast, onPendingChange }: DeskViewProps) => {

  const { isDeskLayout } = useMediaLayout();

  const [items, setItems] = useState<InboxItem[]>([]);

  const [articles, setArticles] = useState<WikiArticle[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [categorize, setCategorize] = useState<CategorizeState>(defaultCategorize(null, []));

  const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);

  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);

  const [archiveReason, setArchiveReason] = useState<ArchiveReason>('not_wiki');

  const [mobileScreen, setMobileScreen] = useState<MobileScreen>('list');

  const [archiveSheetOpen, setArchiveSheetOpen] = useState(false);

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);



  const activeArticles = useMemo(

    () => articles.filter((a) => a.status === 'active'),

    [articles]

  );



  const articlesForTaxonomy = useMemo(

    () =>

      activeArticles.filter((a) => a.taxonomyPath === categorize.taxonomyPath),

    [activeArticles, categorize.taxonomyPath]

  );



  const selected = items.find((i) => i.id === selectedId) ?? null;



  const load = useCallback(async () => {

    try {

      const [data, articleList] = await Promise.all([

        apiFetch<InboxItem[]>('/api/inbox'),

        apiFetch<WikiArticle[]>('/api/articles'),

      ]);

      const pending = data.filter((i) => i.status === 'pending');

      setItems(data);

      setArticles(articleList);

      onPendingChange(pending.length);

      if (!selectedId && pending[0]) {

        setSelectedId(pending[0].id);

        setCategorize(defaultCategorize(pending[0], articleList));

      }

    } catch {

      showToast('Failed to load desk');

    } finally {

      setLoading(false);

    }

  }, [onPendingChange, selectedId, showToast]);



  useEffect(() => {

    void load();

  }, [load]);



  useEffect(() => {

    if (selected) {

      setCategorize(defaultCategorize(selected, activeArticles));

      setPreviewDraft(null);

    }

  }, [selected?.id, activeArticles]);



  const persistCategorize = useCallback(

    (itemId: string, next: CategorizeState) => {

      if (persistTimer.current) clearTimeout(persistTimer.current);

      persistTimer.current = setTimeout(() => {

        void apiFetch<InboxItem>(`/api/inbox/${itemId}`, {

          method: 'PATCH',

          body: JSON.stringify({

            suggestedCategory: next.taxonomyPath,

            suggestedArticleId: next.articleId || null,

          }),

        }).catch(() => {

          /* best-effort */

        });

      }, 400);

    },

    []

  );



  const updateCategorize = useCallback(

    (updater: (prev: CategorizeState) => CategorizeState) => {

      setCategorize((prev) => {

        const next = updater(prev);

        if (selectedId) persistCategorize(selectedId, next);

        return next;

      });

    },

    [persistCategorize, selectedId]

  );



  const selectItem = (item: InboxItem) => {

    setSelectedId(item.id);

    setCategorize(defaultCategorize(item, activeArticles));

    if (!isDeskLayout) {

      setMobileScreen('detail');

    }

  };



  const applyArticlePick = (articleId: string) => {

    if (!articleId) {

      updateCategorize((c) => ({

        ...c,

        articleId: '',

        articleSlug: '',

        title: selected?.snapshot.title ?? c.title,

      }));

      return;

    }

    const article = activeArticles.find((a) => a.id === articleId);

    if (!article) return;

    updateCategorize((c) => ({

      ...c,

      articleId: article.id,

      articleSlug: article.slug,

      title: article.title,

      taxonomyPath: article.taxonomyPath,

    }));

  };



  const handleArchive = async () => {

    if (!selected) return;

    setBusy(true);

    try {

      await apiFetch(`/api/inbox/${selected.id}/archive`, {

        method: 'POST',

        body: JSON.stringify({ reason: archiveReason }),

      });

      showToast('Archived');

      setArchiveSheetOpen(false);

      setSelectedId(null);

      if (!isDeskLayout) setMobileScreen('list');

      await load();

    } catch {

      showToast('Archive failed');

    } finally {

      setBusy(false);

    }

  };



  const handleGenerate = async () => {

    if (!selected) return;

    setBusy(true);

    try {

      const draft = await apiFetch<Draft>(`/api/inbox/${selected.id}/draft`, {

        method: 'POST',

        body: JSON.stringify({

          includeAuthor: categorize.includeAuthor,

          taxonomyPath: categorize.taxonomyPath,

          articleId: categorize.articleId || undefined,

          articleSlug: categorize.articleSlug || undefined,

          title: categorize.title || undefined,

        }),

      });

      setPreviewDraft(draft);

      setEditingDraft(draft);

      showToast('Draft created');

      await load();

    } catch {

      showToast('Failed to generate draft');

    } finally {

      setBusy(false);

    }

  };



  const onTouchStart = (e: TouchEvent) => {

    const t = e.touches[0];

    if (!t) return;

    touchStart.current = { x: t.clientX, y: t.clientY };

  };



  const onTouchEnd = (e: TouchEvent) => {

    if (!touchStart.current || !selected) return;

    const t = e.changedTouches[0];

    if (!t) return;

    const dx = t.clientX - touchStart.current.x;

    const dy = t.clientY - touchStart.current.y;

    touchStart.current = null;

    if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < -80) setArchiveSheetOpen(true);

    if (dx > 80) void handleGenerate();

  };



  if (editingDraft) {

    return (

      <DraftEditor

        subredditName={subredditName}

        showToast={showToast}

        initialDraft={editingDraft}

        onClose={() => setEditingDraft(null)}

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



  const pendingItems = items.filter((i) => i.status === 'pending');



  if (!items.length) {

    return (

      <div className="panel">

        <div className="empty">

          <div className="empty-title">Desk is clear</div>

          <div className="empty-desc">

            Use <strong>Discover posts now</strong> in Settings, enable watch mode, or{' '}

            <strong>Nominate for Wiki</strong> on a post or comment.

          </div>

        </div>

      </div>

    );

  }



  const categorizePane = selected && (

    <div className="desk-pane categorize-pane">

      <div className="section-title">Categorize</div>

      <div className="form-group">

        <label className="form-label" htmlFor="taxonomy">

          Taxonomy

        </label>

        <select

          id="taxonomy"

          className="form-input"

          value={categorize.taxonomyPath}

          onChange={(e) => {

            const taxonomyPath = e.target.value;

            updateCategorize((c) => ({

              ...c,

              taxonomyPath,

              articleId: '',

              articleSlug: '',

            }));

          }}

        >

          {DEFAULT_TAXONOMY.map((path) => (

            <option key={path} value={path}>

              {path}

            </option>

          ))}

        </select>

      </div>

      <div className="form-group">

        <label className="form-label" htmlFor="target-article">

          Target article

        </label>

        <select

          id="target-article"

          className="form-input"

          value={categorize.articleId}

          onChange={(e) => applyArticlePick(e.target.value)}

        >

          <option value="">— New article (enter slug below) —</option>

          {articlesForTaxonomy.map((article) => (

            <option key={article.id} value={article.id}>

              {article.title} ({article.slug}) · {article.sourceIds.length} sources

            </option>

          ))}

        </select>

        {articlesForTaxonomy.length === 0 && (

          <div className="form-hint">No existing articles in this taxonomy yet.</div>

        )}

      </div>

      <div className="form-group">

        <label className="form-label" htmlFor="article-slug">

          Article slug

        </label>

        <input

          id="article-slug"

          className="form-input"

          placeholder="e.g. faq/getting-started"

          value={categorize.articleSlug}

          disabled={!!categorize.articleId}

          onChange={(e) => updateCategorize((c) => ({ ...c, articleSlug: e.target.value }))}

        />

      </div>

      <div className="form-group">

        <label className="form-label" htmlFor="article-title">

          Article title

        </label>

        <input

          id="article-title"

          className="form-input"

          value={categorize.title}

          onChange={(e) => updateCategorize((c) => ({ ...c, title: e.target.value }))}

        />

      </div>

      <div className="toggle-row">

        <input

          type="checkbox"

          className="toggle"

          checked={categorize.includeAuthor}

          onChange={(e) =>

            updateCategorize((c) => ({ ...c, includeAuthor: e.target.checked }))

          }

        />

        <label className="toggle-label">Include author in references</label>

      </div>

      {selected.status === 'pending' && isDeskLayout && (

        <>

          <div className="form-group">

            <label className="form-label" htmlFor="archive-reason">

              Archive reason

            </label>

            <select

              id="archive-reason"

              className="form-input"

              value={archiveReason}

              onChange={(e) => setArchiveReason(e.target.value as ArchiveReason)}

            >

              {(Object.keys(ARCHIVE_REASON_LABELS) as ArchiveReason[]).map((r) => (

                <option key={r} value={r}>

                  {ARCHIVE_REASON_LABELS[r]}

                </option>

              ))}

            </select>

          </div>

          <div className="btn-row">

            <button

              type="button"

              className="btn btn-ghost"

              disabled={busy}

              onClick={() => void handleArchive()}

            >

              Archive

            </button>

            <button

              type="button"

              className="btn btn-accent"

              disabled={busy}

              onClick={() => void handleGenerate()}

            >

              {busy ? 'Working…' : 'Generate draft'}

            </button>

          </div>

        </>

      )}

      {selected.status === 'pending' && !isDeskLayout && (

        <div className="btn-row">

          <button

            type="button"

            className="btn btn-accent"

            disabled={busy}

            onClick={() => void handleGenerate()}

          >

            {busy ? 'Working…' : 'Generate draft'}

          </button>

        </div>

      )}

      {selected.status === 'drafted' && (

        <div className="card-meta">Already drafted — open Wiki tab to edit.</div>

      )}

      <div className="card source-card">

        {selected.snapshot.title && <div className="card-title">{selected.snapshot.title}</div>}

        <div className="card-body-preview">{selected.snapshot.body}</div>

        <div className="card-meta">

          {selected.snapshot.kind} · ↑{selected.snapshot.score}

          {selected.snapshot.flair && ` · ${selected.snapshot.flair}`}

          {selected.ingestedBy && ` · ${selected.ingestedBy}`}

        </div>

      </div>

    </div>

  );



  const previewPane = (

    <div className="desk-pane preview-pane">

      <div className="section-title">Encyclopedia preview</div>

      {previewDraft ? (

        <div className="preview-doc mono">{previewDraft.publicMarkdown}</div>

      ) : (

        <div className="empty">

          <div className="empty-desc">Generate a draft to preview encyclopedia output.</div>

        </div>

      )}

    </div>

  );



  const inboxList = (

    <div className="desk-pane inbox-pane">

      <div className="section-title">Inbox ({pendingItems.length} pending)</div>

      {items.map((item) => (

        <button

          key={item.id}

          type="button"

          className={`card card-btn ${item.id === selectedId ? 'selected' : ''}`}

          onClick={() => selectItem(item)}

        >

          <div className="card-header">

            <span className={`badge badge-${item.snapshot.kind}`}>{item.snapshot.kind}</span>

            <span className={`badge badge-${item.status}`}>{item.status}</span>

          </div>

          {item.snapshot.title && <div className="card-title">{item.snapshot.title}</div>}

          <div className="card-body-preview">{item.snapshot.body}</div>

        </button>

      ))}

    </div>

  );



  const archiveSheet =

    archiveSheetOpen &&

    selected && (

      <div

        className="sheet-backdrop"

        role="presentation"

        onClick={() => setArchiveSheetOpen(false)}

      >

        <div

          className="sheet-panel"

          role="dialog"

          aria-labelledby="archive-sheet-title"

          onClick={(e) => e.stopPropagation()}

        >

          <div id="archive-sheet-title" className="section-title">

            Archive source

          </div>

          <p className="sheet-desc">Remove from desk without publishing to the wiki.</p>

          <div className="form-group">

            <label className="form-label" htmlFor="archive-reason-mobile">

              Reason

            </label>

            <select

              id="archive-reason-mobile"

              className="form-input"

              value={archiveReason}

              onChange={(e) => setArchiveReason(e.target.value as ArchiveReason)}

            >

              {(Object.keys(ARCHIVE_REASON_LABELS) as ArchiveReason[]).map((r) => (

                <option key={r} value={r}>

                  {ARCHIVE_REASON_LABELS[r]}

                </option>

              ))}

            </select>

          </div>

          <div className="btn-row">

            <button

              type="button"

              className="btn btn-ghost"

              disabled={busy}

              onClick={() => setArchiveSheetOpen(false)}

            >

              Cancel

            </button>

            <button

              type="button"

              className="btn btn-accent"

              disabled={busy}

              onClick={() => void handleArchive()}

            >

              {busy ? 'Archiving…' : 'Confirm archive'}

            </button>

          </div>

        </div>

      </div>

    );



  if (!isDeskLayout) {

    return (

      <div

        className="panel desk-mobile"

        onTouchStart={mobileScreen === 'detail' ? onTouchStart : undefined}

        onTouchEnd={mobileScreen === 'detail' ? onTouchEnd : undefined}

      >

        {mobileScreen === 'list' ? (

          inboxList

        ) : (

          <>

            <div className="mobile-desk-bar">

              <button

                type="button"

                className="btn btn-ghost btn-sm"

                onClick={() => {

                  setMobileScreen('list');

                  setArchiveSheetOpen(false);

                }}

              >

                ← Inbox

              </button>

              <span className="mobile-desk-bar-title">

                {pendingItems.length} pending

              </span>

            </div>

            <div className="swipe-hint">Swipe left: Archive · Swipe right: Draft</div>

            {categorizePane}

            {previewPane}

          </>

        )}

        {archiveSheet}

      </div>

    );

  }



  return (

    <div className="panel desk-desktop">

      {inboxList}

      {categorizePane}

      {previewPane}

    </div>

  );

};


