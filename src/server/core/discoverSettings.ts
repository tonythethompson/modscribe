import type { DiscoverListing, DiscoverTimeframe } from '../../shared/types.js';

const MAX_DISCOVER_LIMIT = 100;
const MIN_DISCOVER_LIMIT = 1;

export function clampDiscoverLimit(limit: number | undefined): number {
  const n = limit ?? 25;
  return Math.min(MAX_DISCOVER_LIMIT, Math.max(MIN_DISCOVER_LIMIT, Math.floor(n)));
}

export function parseDiscoverListing(value: unknown): DiscoverListing {
  const raw = typeof value === 'string' ? value : undefined;
  if (raw === 'hot' || raw === 'best' || raw === 'new' || raw === 'top') {
    return raw;
  }
  return 'top';
}

export function parseDiscoverTimeframe(value: unknown): DiscoverTimeframe {
  const raw = typeof value === 'string' ? value : undefined;
  if (
    raw === 'hour' ||
    raw === 'day' ||
    raw === 'week' ||
    raw === 'month' ||
    raw === 'year' ||
    raw === 'all'
  ) {
    return raw;
  }
  return 'year';
}
