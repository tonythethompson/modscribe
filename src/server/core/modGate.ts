import { context, reddit, redis } from '@devvit/web/server';

const MOD_CACHE_TTL_MS = 10 * 60 * 1000;

const modCacheKey = (subredditName: string, userId: string) =>
  `modscribe:modcache:${subredditName}:${userId}`;

/** Cached moderator check — avoids reddit.getModerators on every API call. */
export async function isCurrentUserModerator(): Promise<boolean> {
  const { userId, subredditName } = context;
  if (!userId || !subredditName) return false;

  const cached = await redis.get(modCacheKey(subredditName, userId));
  if (cached === '1') return true;
  if (cached === '0') return false;

  const mods = await reddit.getModerators({ subredditName }).all();
  const isMod = mods.some((mod) => mod.id === userId);

  await redis.set(modCacheKey(subredditName, userId), isMod ? '1' : '0', {
    expiration: new Date(Date.now() + MOD_CACHE_TTL_MS),
  });

  return isMod;
}
