import { settings } from '@devvit/web/server';
import type {
  AiProvider,
  AutonomyLevel,
  AutomationSettings,
  ModScribeSettings,
} from '../../shared/types.js';
import {
  clampDiscoverLimit,
  parseDiscoverListing,
  parseDiscoverTimeframe,
} from './discoverSettings.js';
import { parseAutonomyLevel } from './policy.js';
import {
  getRuntimeSettingsOverrides,
  hasActiveOverrides,
} from './runtimeSettings.js';

/** Devvit returns select fields as `string[]`; plain fields as `string`. */
export function readStringSetting(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim().length > 0) {
        return item.trim();
      }
    }
    return undefined;
  }
  return undefined;
}

export function parseAiProviderFromSetting(value: unknown): AiProvider {
  const raw = readStringSetting(value);
  if (raw === 'openai' || raw === 'gemini' || raw === 'mock') {
    return raw;
  }
  return 'mock';
}

/**
 * Returns the current automation settings from Devvit installation settings.
 */
export async function getAutomationSettings(): Promise<AutomationSettings> {
  const [
    ignoredKeywords,
    targetFlairs,
    minScoreThreshold,
    watchEnabled,
    discoverEnabled,
    discoverListingRaw,
    discoverTimeframeRaw,
    discoverLimit,
    discoverOnInstall,
    discoverScheduleEnabled,
    autonomyRaw,
    overrides,
  ] = await Promise.all([
    settings.get<string>('ignored-keywords'),
    settings.get<string>('target-flairs'),
    settings.get<number>('min-score-threshold'),
    settings.get<boolean>('watch-enabled'),
    settings.get<boolean>('discover-existing-enabled'),
    settings.get('discover-listing'),
    settings.get('discover-timeframe'),
    settings.get<number>('discover-limit'),
    settings.get<boolean>('discover-on-install'),
    settings.get<boolean>('discover-schedule-enabled'),
    settings.get('autonomy-level'),
    getRuntimeSettingsOverrides(),
  ]);

  const autonomyLevel: AutonomyLevel = parseAutonomyLevel(readStringSetting(autonomyRaw));

  const base: AutomationSettings = {
    ignoredKeywords: (ignoredKeywords || '').split(',').map((s) => s.trim()).filter(Boolean),
    targetFlairs: (targetFlairs || '').split(',').map((s) => s.trim()).filter(Boolean),
    minScoreThreshold: minScoreThreshold ?? 5,
    watchEnabled: watchEnabled ?? false,
    discoverEnabled: discoverEnabled ?? false,
    discoverListing: parseDiscoverListing(readStringSetting(discoverListingRaw)),
    discoverTimeframe: parseDiscoverTimeframe(readStringSetting(discoverTimeframeRaw)),
    discoverLimit: clampDiscoverLimit(discoverLimit),
    discoverOnInstall: discoverOnInstall ?? false,
    discoverScheduleEnabled: discoverScheduleEnabled ?? false,
    autonomyLevel,
  };

  return {
    ...base,
    watchEnabled: overrides.watchEnabled ?? base.watchEnabled,
    discoverEnabled: overrides.discoverEnabled ?? base.discoverEnabled,
    discoverScheduleEnabled:
      overrides.discoverScheduleEnabled ?? base.discoverScheduleEnabled,
  };
}

export async function getAiProvider(): Promise<AiProvider> {
  const raw = await settings.get('ai-provider');
  return parseAiProviderFromSetting(raw);
}

export async function getApiKey(): Promise<string | undefined> {
  const key = readStringSetting(await settings.get('api-key'));
  return key;
}

export async function getModScribeSettings(): Promise<ModScribeSettings> {
  const [automation, aiProvider, apiKey, overrides] = await Promise.all([
    getAutomationSettings(),
    getAiProvider(),
    getApiKey(),
    getRuntimeSettingsOverrides(),
  ]);

  return {
    ...automation,
    aiProvider,
    apiKeyConfigured: Boolean(apiKey),
    hasDashboardOverrides: hasActiveOverrides(overrides),
  };
}
