import { Hono } from 'hono';
import { verifyAiCredentials } from '../../core/aiClient.js';
import { getAiProvider, getApiKey, getModScribeSettings } from '../../core/settingsService.js';
import {
  clearRuntimeSettingsOverrides,
  saveRuntimeSettingsOverrides,
} from '../../core/runtimeSettings.js';
import type {
  ModScribeSettings,
  SettingsPatchRequest,
  VerifyCredentialsResult,
} from '../../../shared/types.js';

export const settingsRouter = new Hono();

/** GET /api/settings — returns public-safe settings (never exposes API key) */
settingsRouter.get('/', async (c) => {
  const settings = await getModScribeSettings();
  return c.json<ModScribeSettings>(settings);
});

/** PATCH /api/settings — dashboard toggles for watch / discover / schedule */
settingsRouter.patch('/', async (c) => {
  const body = await c.req.json<SettingsPatchRequest>();
  const patch: SettingsPatchRequest = {};

  if (typeof body.watchEnabled === 'boolean') {
    patch.watchEnabled = body.watchEnabled;
  }
  if (typeof body.discoverEnabled === 'boolean') {
    patch.discoverEnabled = body.discoverEnabled;
  }
  if (typeof body.discoverScheduleEnabled === 'boolean') {
    patch.discoverScheduleEnabled = body.discoverScheduleEnabled;
  }

  if (Object.keys(patch).length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400);
  }

  await saveRuntimeSettingsOverrides(patch);
  const settings = await getModScribeSettings();
  return c.json<ModScribeSettings>(settings);
});

/** POST /api/settings/reset-overrides — revert watch/discover toggles to install settings */
settingsRouter.post('/reset-overrides', async (c) => {
  await clearRuntimeSettingsOverrides();
  const settings = await getModScribeSettings();
  return c.json<ModScribeSettings>(settings);
});

/** POST /api/settings/verify — live check against the configured provider */
settingsRouter.post('/verify', async (c) => {
  const [provider, apiKey] = await Promise.all([getAiProvider(), getApiKey()]);
  const result = await verifyAiCredentials(provider, apiKey);
  return c.json<VerifyCredentialsResult>(result);
});
