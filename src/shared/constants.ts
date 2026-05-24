/** Default taxonomy paths for categorize UI (extend per subreddit later). */
export const DEFAULT_TAXONOMY: string[] = [
  'Community policy',
  'Community policy › Duplicate content',
  'Community policy › Spam & self-promotion',
  'Guides & resources',
  'Guides & resources › Getting started',
  'Guides & resources › FAQ',
  'Culture & norms',
  'Meta › Subreddit operations',
  'Uncategorized',
];

export const ARCHIVE_REASON_LABELS: Record<string, string> = {
  off_topic: 'Off topic',
  duplicate: 'Duplicate elsewhere',
  spam: 'Spam / promotion',
  not_wiki: 'Not wiki material',
  other: 'Other',
};

export const AUTONOMY_LEVEL_LABELS: Record<string, string> = {
  suggest: 'Suggest only',
  categorize: 'Auto-categorize',
  draft: 'Auto-draft',
  restructure: 'Propose restructure',
};

export const DISCOVER_LISTING_LABELS: Record<string, string> = {
  top: 'Top posts',
  hot: 'Hot posts',
  best: 'Best posts',
  new: 'New posts',
};

export const DISCOVER_SCHEDULE_LABELS: Record<string, string> = {
  off: 'Off',
  '6h': 'Every 6 hours',
  daily: 'Once per day',
};

export const DISCOVER_TIMEFRAME_LABELS: Record<string, string> = {
  hour: 'Past hour',
  day: 'Today',
  week: 'This week',
  month: 'This month',
  year: 'This year',
  all: 'All time',
};
