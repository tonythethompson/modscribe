import { describe, expect, it } from 'vitest';
import { hasActiveOverrides } from './runtimeSettings.js';

describe('hasActiveOverrides', () => {
  it('is false for empty overrides', () => {
    expect(hasActiveOverrides({})).toBe(false);
  });

  it('is true when any toggle is set', () => {
    expect(hasActiveOverrides({ watchEnabled: true })).toBe(true);
    expect(hasActiveOverrides({ discoverEnabled: false })).toBe(true);
  });
});
