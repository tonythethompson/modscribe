import { describe, expect, it } from 'vitest';
import { readStringSetting, parseAiProviderFromSetting } from './settingsService.js';

describe('settingsService', () => {
  describe('readStringSetting', () => {
    it('reads plain strings', () => {
      expect(readStringSetting('gemini')).toBe('gemini');
    });

    it('reads Devvit select values as string arrays', () => {
      expect(readStringSetting(['gemini'])).toBe('gemini');
      expect(readStringSetting(['openai'])).toBe('openai');
    });

    it('returns undefined for empty values', () => {
      expect(readStringSetting('')).toBeUndefined();
      expect(readStringSetting([])).toBeUndefined();
    });
  });

  describe('parseAiProviderFromSetting', () => {
    it('parses select array values', () => {
      expect(parseAiProviderFromSetting(['gemini'])).toBe('gemini');
    });

    it('defaults unknown values to mock', () => {
      expect(parseAiProviderFromSetting(['unknown'])).toBe('mock');
    });
  });
});
