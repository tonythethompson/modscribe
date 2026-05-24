import { redis } from '@devvit/web/server';
import type { RuntimeSettingsOverrides } from '../../shared/types.js';

const RUNTIME_SETTINGS_KEY = 'modscribe:runtime-settings';

export async function getRuntimeSettingsOverrides(): Promise<RuntimeSettingsOverrides> {
  const raw = await redis.get(RUNTIME_SETTINGS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as RuntimeSettingsOverrides;
  } catch {
    return {};
  }
}

export async function saveRuntimeSettingsOverrides(
  patch: RuntimeSettingsOverrides
): Promise<RuntimeSettingsOverrides> {
  const current = await getRuntimeSettingsOverrides();
  const next: RuntimeSettingsOverrides = { ...current };

  for (const key of ['watchEnabled', 'discoverEnabled', 'discoverScheduleEnabled'] as const) {
    if (key in patch) {
      const value = patch[key];
      if (value === undefined) {
        delete next[key];
      } else {
        next[key] = value;
      }
    }
  }

  if (Object.keys(next).length === 0) {
    await redis.del(RUNTIME_SETTINGS_KEY);
    return {};
  }

  await redis.set(RUNTIME_SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function hasActiveOverrides(overrides: RuntimeSettingsOverrides): boolean {
  return (
    overrides.watchEnabled !== undefined ||
    overrides.discoverEnabled !== undefined ||
    overrides.discoverScheduleEnabled !== undefined
  );
}

export async function clearRuntimeSettingsOverrides(): Promise<void> {
  await redis.del(RUNTIME_SETTINGS_KEY);
}
