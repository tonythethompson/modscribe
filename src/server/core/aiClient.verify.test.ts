import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyAiCredentials } from './aiClient.js';

describe('verifyAiCredentials', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('accepts mock without a key', async () => {
    const result = await verifyAiCredentials('mock', undefined);
    expect(result.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects openai without a key', async () => {
    const result = await verifyAiCredentials('openai', '  ');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('API key is required');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifies openai with a models request', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => '' });

    const result = await verifyAiCredentials('openai', 'sk-test');

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer sk-test' },
      })
    );
  });

  it('verifies gemini with a models request', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => '' });

    const result = await verifyAiCredentials('gemini', 'gem-key');

    expect(result.ok).toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('generativelanguage.googleapis.com');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('key=gem-key');
  });

  it('maps openai 401 to a friendly message', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'invalid api key',
    });

    const result = await verifyAiCredentials('openai', 'bad');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Invalid OpenAI API key');
  });
});
