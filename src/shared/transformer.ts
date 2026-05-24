/**
 * Shared transformer logic.
 * Note: superjson is removed to stay within Devvit's supported library footprint.
 */
export const transformer = {
  serialize: (data: any) => data,
  deserialize: (data: any) => data,
};
