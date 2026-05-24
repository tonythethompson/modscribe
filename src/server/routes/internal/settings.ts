import { Hono } from 'hono';
import { verifyAiCredentials } from '../../core/aiClient.js';
import { getAiProvider, getApiKey, parseAiProviderFromSetting } from '../../core/settingsService.js';
import type { VerifyCredentialsResult } from '../../../shared/types.js';

type SettingsValidateBody = {
  value?: unknown;
  isEditing?: boolean;
};

function toValidationJson(result: VerifyCredentialsResult): { success: boolean; error?: string } {
  if (result.ok) {
    return { success: true };
  }
  return { success: false, error: result.message };
}

export const settingsValidateRouter = new Hono();

/** Called by Reddit when the API key install setting is saved. */
settingsValidateRouter.post('/validate-api-key', async (c) => {
  const body = await c.req.json<SettingsValidateBody>();
  if (body.isEditing) {
    return c.json({ success: true });
  }

  const provider = await getAiProvider();
  const apiKey = typeof body.value === 'string' ? body.value : undefined;
  const result = await verifyAiCredentials(provider, apiKey);
  return c.json(toValidationJson(result));
});

/** Called by Reddit when the AI provider install setting is saved. */
settingsValidateRouter.post('/validate-ai-provider', async (c) => {
  const body = await c.req.json<SettingsValidateBody>();
  if (body.isEditing) {
    return c.json({ success: true });
  }

  const provider = parseAiProviderFromSetting(body.value);
  if (provider === 'mock') {
    return c.json({ success: true });
  }

  const storedKey = await getApiKey();
  if (!storedKey) {
    return c.json({
      success: true,
    });
  }

  const result = await verifyAiCredentials(provider, storedKey);
  return c.json(toValidationJson(result));
});
