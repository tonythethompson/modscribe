import { useCallback, useEffect, useState } from 'react';

import type { ArchiveReason, ArchiveRecord } from '../../../shared/types.js';

import { ARCHIVE_REASON_LABELS } from '../../../shared/constants.js';

import { apiFetch } from '../../lib/api.js';



type ArchiveViewProps = {

  showToast: (msg: string) => void;

};



const REASON_OPTIONS: { value: '' | ArchiveReason; label: string }[] = [

  { value: '', label: 'All reasons' },

  ...(

    Object.entries(ARCHIVE_REASON_LABELS) as [ArchiveReason, string][]

  ).map(([value, label]) => ({ value, label })),

];



function buildArchiveUrl(q: string, reason: '' | ArchiveReason): string {

  const params = new URLSearchParams();

  const trimmed = q.trim();

  if (trimmed) params.set('q', trimmed);

  if (reason) params.set('reason', reason);

  const query = params.toString();

  return query ? `/api/archive?${query}` : '/api/archive';

}



export const ArchiveView = ({ showToast }: ArchiveViewProps) => {

  const [records, setRecords] = useState<ArchiveRecord[]>([]);

  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');

  const [reason, setReason] = useState<'' | ArchiveReason>('');

  const [debouncedQuery, setDebouncedQuery] = useState('');



  useEffect(() => {

    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);

    return () => window.clearTimeout(timer);

  }, [query]);



  const load = useCallback(async () => {

    setLoading(true);

    try {

      const data = await apiFetch<ArchiveRecord[]>(buildArchiveUrl(debouncedQuery, reason));

      setRecords(data);

    } catch {

      showToast('Failed to load archive');

    } finally {

      setLoading(false);

    }

  }, [debouncedQuery, reason, showToast]);



  useEffect(() => {

    void load();

  }, [load]);



  return (

    <div className="panel archive-panel">

      <div className="archive-toolbar">

        <input

          type="search"

          className="archive-search"

          placeholder="Search title, body, author, note…"

          value={query}

          onChange={(e) => setQuery(e.target.value)}

          aria-label="Search archive"

        />

        <select

          className="archive-filter"

          value={reason}

          onChange={(e) => setReason(e.target.value as '' | ArchiveReason)}

          aria-label="Filter by archive reason"

        >

          {REASON_OPTIONS.map((opt) => (

            <option key={opt.value || 'all'} value={opt.value}>

              {opt.label}

            </option>

          ))}

        </select>

      </div>



      {loading ? (

        <div className="center-flex archive-loading">

          <div className="spinner" />

        </div>

      ) : records.length === 0 ? (

        <div className="empty">

          <div className="empty-title">No matches</div>

          <div className="empty-desc">

            {debouncedQuery || reason

              ? 'Try a different search or clear filters.'

              : 'Sources you archive from the Desk appear here.'}

          </div>

        </div>

      ) : (

        <>

          <div className="section-title">Archived sources ({records.length})</div>

          {records.map((r) => (

            <div key={r.id} className="card">

              <div className="card-header">

                <span className={`badge badge-${r.snapshot.kind}`}>{r.snapshot.kind}</span>

                <span className="badge badge-archived">

                  {ARCHIVE_REASON_LABELS[r.reason] ?? r.reason}

                </span>

              </div>

              {r.snapshot.title && <div className="card-title">{r.snapshot.title}</div>}

              <div className="card-body-preview">{r.snapshot.body}</div>

              <div className="card-meta">

                u/{r.snapshot.authorName} · {new Date(r.archivedAt).toLocaleString()}

                {r.note ? ` · ${r.note}` : ''}

              </div>

            </div>

          ))}

        </>

      )}

    </div>

  );

};


