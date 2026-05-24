import { describe, expect, it } from 'vitest';
import {
  clampDiscoverLimit,
  parseDiscoverListing,
  parseDiscoverTimeframe,
} from './discoverSettings.js';

describe('discoverSettings', () => {
  it('clamps discover limit', () => {
    expect(clampDiscoverLimit(undefined)).toBe(25);
    expect(clampDiscoverLimit(0)).toBe(1);
    expect(clampDiscoverLimit(500)).toBe(100);
  });

  it('parses listing and timeframe', () => {
    expect(parseDiscoverListing('hot')).toBe('hot');
    expect(parseDiscoverListing('nope')).toBe('top');
    expect(parseDiscoverTimeframe('week')).toBe('week');
    expect(parseDiscoverTimeframe(undefined)).toBe('year');
  });
});
