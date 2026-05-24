import { useCallback, useEffect, useState } from 'react';

import type {

  DiscoverScanResult,

  ModScribeSettings,

  SettingsPatchRequest,

  VerifyCredentialsResult,

} from '../../../shared/types.js';

import {

  AUTONOMY_LEVEL_LABELS,

  DISCOVER_LISTING_LABELS,

  DISCOVER_TIMEFRAME_LABELS,

} from '../../../shared/constants.js';

import { apiFetch } from '../../lib/api.js';



type SettingsViewProps = {

  showToast: (msg: string) => void;

};



export const SettingsView = ({ showToast }: SettingsViewProps) => {

  const [settings, setSettings] = useState<ModScribeSettings | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [verifying, setVerifying] = useState(false);

  const [verifyResult, setVerifyResult] = useState<VerifyCredentialsResult | null>(null);

  const [discovering, setDiscovering] = useState(false);

  const [lastDiscover, setLastDiscover] = useState<DiscoverScanResult | null>(null);



  useEffect(() => {

    void Promise.all([

      apiFetch<ModScribeSettings>('/api/settings'),

      apiFetch<{ lastScan: DiscoverScanResult | null }>('/api/discover/status').catch(

        () => ({ lastScan: null })

      ),

    ])

      .then(([s, discoverStatus]) => {

        setSettings(s);

        setLastDiscover(discoverStatus.lastScan);

      })

      .catch((err) =>

        showToast(err instanceof Error && err.message === 'Access Denied' ? 'Moderator only' : 'Failed to load settings')

      )

      .finally(() => setLoading(false));

  }, [showToast]);



  const resetOverrides = useCallback(async () => {
    setSaving(true);
    try {
      const next = await apiFetch<ModScribeSettings>('/api/settings/reset-overrides', {
        method: 'POST',
      });
      setSettings(next);
      showToast('Dashboard toggles reset to install settings');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reset settings');
    } finally {
      setSaving(false);
    }
  }, [showToast]);

  const patchSettings = useCallback(

    async (patch: SettingsPatchRequest) => {

      if (!settings) return;

      setSaving(true);

      try {

        const next = await apiFetch<ModScribeSettings>('/api/settings', {

          method: 'PATCH',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify(patch),

        });

        setSettings(next);

        showToast('Settings updated');

      } catch (err) {

        showToast(err instanceof Error ? err.message : 'Failed to update settings');

      } finally {

        setSaving(false);

      }

    },

    [settings, showToast]

  );



  const runDiscover = useCallback(async () => {

    setDiscovering(true);

    try {

      const result = await apiFetch<DiscoverScanResult>('/api/discover/run', { method: 'POST' });

      setLastDiscover(result);

      showToast(`Discover: ${result.added} added, ${result.skipped} skipped (${result.examined} examined)`);

    } catch (err) {

      showToast(err instanceof Error ? err.message : 'Discover scan failed');

    } finally {

      setDiscovering(false);

    }

  }, [showToast]);



  const runVerify = useCallback(async () => {

    setVerifying(true);

    setVerifyResult(null);

    try {

      const result = await apiFetch<VerifyCredentialsResult>('/api/settings/verify', {

        method: 'POST',

      });

      setVerifyResult(result);

      showToast(result.message);

    } catch (err) {

      const message = err instanceof Error ? err.message : 'Verification failed';

      setVerifyResult({ ok: false, message });

      showToast(message);

    } finally {

      setVerifying(false);

    }

  }, [showToast]);



  if (loading) {

    return (

      <div className="panel center-flex">

        <div className="spinner" />

      </div>

    );

  }



  if (!settings) {

    return (

      <div className="panel">

        <div className="empty">

          <div className="empty-title">Access denied</div>

          <div className="empty-desc">Moderators only.</div>

        </div>

      </div>

    );

  }



  return (

    <div className="panel settings-panel">

      <div className="section-title">Watch & discover</div>

      <div className="card">

        <label className="settings-toggle">

          <input

            type="checkbox"

            checked={settings.watchEnabled}

            disabled={saving}

            onChange={(e) => void patchSettings({ watchEnabled: e.target.checked })}

          />

          <span>

            <span className="form-label">Watch mode</span>

            <span className="card-meta">

              Ingest new posts and comments with score ≥ {settings.minScoreThreshold}

            </span>

          </span>

        </label>



        <label className="settings-toggle">

          <input

            type="checkbox"

            checked={settings.discoverEnabled}

            disabled={saving}

            onChange={(e) => void patchSettings({ discoverEnabled: e.target.checked })}

          />

          <span>

            <span className="form-label">Discover existing posts</span>

            <span className="card-meta">

              {DISCOVER_LISTING_LABELS[settings.discoverListing] ?? settings.discoverListing}

              {settings.discoverListing === 'top'

                ? ` · ${DISCOVER_TIMEFRAME_LABELS[settings.discoverTimeframe] ?? settings.discoverTimeframe}`

                : ''}{' '}

              · up to {settings.discoverLimit} per run

            </span>

          </span>

        </label>



        <label className="settings-toggle">

          <input

            type="checkbox"

            checked={settings.discoverScheduleEnabled}

            disabled={saving || !settings.discoverEnabled}

            onChange={(e) =>

              void patchSettings({ discoverScheduleEnabled: e.target.checked })

            }

          />

          <span>

            <span className="form-label">Scheduled discover (every 12h)</span>

            <span className="card-meta">

              Requires discover enabled · cron runs server-side automatically

            </span>

          </span>

        </label>

        {settings.hasDashboardOverrides && (
          <div className="btn-row settings-reset-row">
            <span className="card-meta">
              Dashboard overrides active — install defaults differ for some toggles.
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={saving}
              onClick={() => void resetOverrides()}
            >
              Reset to install settings
            </button>
          </div>
        )}
      </div>

      <div className="section-title">Discover existing posts</div>

      <div className="card">

        <div className="form-group">

          <div className="form-label">Backfill from subreddit</div>

          <div className="card-meta">

            Manual scan uses the same min score, keyword, and flair filters as watch mode.

          </div>

        </div>

        {lastDiscover && (

          <div className="card-meta">

            Last scan: {lastDiscover.added} added · {lastDiscover.skipped} skipped ·{' '}

            {lastDiscover.examined} examined ·{' '}

            {new Date(lastDiscover.ranAt).toLocaleString()}

          </div>

        )}

        <div className="btn-row">

          <button

            type="button"

            className="btn btn-primary"

            disabled={discovering}

            onClick={() => void runDiscover()}

          >

            {discovering ? 'Scanning…' : 'Discover posts now'}

          </button>

        </div>

        {settings.discoverOnInstall && settings.discoverEnabled && (

          <div className="card-meta">Also runs once on app install/upgrade (install setting).</div>

        )}

      </div>



      <div className="section-title">Autonomy</div>

      <div className="card">

        <div className="form-group">

          <div className="form-label">Autonomy dial</div>

          <div className="card-meta">

            {AUTONOMY_LEVEL_LABELS[settings.autonomyLevel] ?? settings.autonomyLevel}

          </div>

        </div>

      </div>



      <div className="section-title">AI generation</div>

      <div className="card">

        <div className="card-meta">Provider: {settings.aiProvider}</div>

        <div className="card-meta">

          API key: {settings.apiKeyConfigured ? 'configured' : 'not set (mock only)'}

        </div>

        <div className="btn-row">

          <button type="button" className="btn btn-secondary" disabled={verifying} onClick={() => void runVerify()}>

            {verifying ? 'Verifying…' : 'Test connection'}

          </button>

          {verifyResult && (

            <span className={`verify-msg ${verifyResult.ok ? 'ok' : 'err'}`}>{verifyResult.message}</span>

          )}

        </div>

      </div>



      <div className="section-title">Automation filters</div>

      <div className="card">

        <div className="card-meta">

          Ignored keywords: {settings.ignoredKeywords.length ? settings.ignoredKeywords.join(', ') : '(none)'}

        </div>

        <div className="card-meta">

          Target flairs: {settings.targetFlairs.length ? settings.targetFlairs.join(', ') : '(all)'}

        </div>

        <div className="card-meta">Min score: {settings.minScoreThreshold}</div>

      </div>



      <div className="section-title">Install settings</div>

      <div className="card card-dashed">

        <div className="card-body-preview">

          Listing, timeframe, autonomy, AI provider, and filters are configured in Mod Tools → Apps →

          ModScribe → Settings. Dashboard toggles above override watch/discover for this subreddit

          until cleared.

        </div>

      </div>

    </div>

  );

};


