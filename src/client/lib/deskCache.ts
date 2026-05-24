import type { DeskBootstrap } from '../../shared/types.js';

let cached: DeskBootstrap | null = null;

export const getDeskBootstrapCache = (): DeskBootstrap | null => cached;

export const setDeskBootstrapCache = (data: DeskBootstrap): void => {
  cached = data;
};

export const patchDeskBootstrapCache = (patch: Partial<DeskBootstrap>): void => {
  if (!cached) return;
  cached = { ...cached, ...patch };
};

export const invalidateDeskBootstrapCache = (): void => {
  cached = null;
};
