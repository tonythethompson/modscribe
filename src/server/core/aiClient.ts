import { z } from 'zod';
import type { AiProvider, VerifyCredentialsResult } from '../../shared/types.js';

const llmDraftSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  contentType: z.string().optional(),
  publicMarkdown: z.string().min(1),
  moderatorNotes: z.string().min(1),
  proposedChangeSummary: z.string().optional(),
  uncertainClaims: z.array(z.string()).optional(),
  needsModReview: z.array(z.string()).optional(),
});

export type LlmDraftPayload = z.infer<typeof llmDraftSchema>;

export type LlmDraftRequest = {
  provider: AiProvider;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
};

function providerLabel(provider: AiProvider): string {
  if (provider === 'openai') return 'OpenAI';
  if (provider === 'gemini') return 'Google Gemini';
  return 'Mock';
}

/**
 * Lightweight check that an API key works for the selected provider (models list).
 */
export async function verifyAiCredentials(
  provider: AiProvider,
  apiKey: string | undefined
): Promise<VerifyCredentialsResult> {
  const trimmed = apiKey?.trim() ?? '';

  if (provider === 'mock') {
    if (trimmed) {
      return {
        ok: true,
        message: 'Mock mode does not use an API key; any saved key is ignored.',
      };
    }
    return { ok: true, message: 'Mock mode is ready (no API key required).' };
  }

  if (!trimmed) {
    return {
      ok: false,
      message: `An API key is required when using ${providerLabel(provider)}.`,
    };
  }

  try {
    if (provider === 'openai') {
      await verifyOpenAiKey(trimmed);
    } else {
      await verifyGeminiKey(trimmed);
    }
    return { ok: true, message: `${providerLabel(provider)} API key verified.` };
  } catch (err) {
    return {
      ok: false,
      message: formatProviderError(err, provider),
    };
  }
}

async function verifyOpenAiKey(apiKey: string): Promise<void> {
  const response = await fetch('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${body.slice(0, 400)}`);
  }
}

async function verifyGeminiKey(apiKey: string): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { method: 'GET' });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini error ${response.status}: ${body.slice(0, 400)}`);
  }
}

function formatProviderError(err: unknown, provider: AiProvider): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('401') || raw.toLowerCase().includes('invalid api key')) {
    return `Invalid ${providerLabel(provider)} API key. Check the key and try again.`;
  }
  if (raw.includes('403')) {
    return `${providerLabel(provider)} rejected this key (forbidden). Check project access and billing.`;
  }
  if (raw.includes('429')) {
    return `${providerLabel(provider)} rate-limited the verification request. Try again in a moment.`;
  }
  return `${providerLabel(provider)} verification failed: ${raw.slice(0, 280)}`;
}

export async function generateStructuredDraft(
  request: LlmDraftRequest
): Promise<LlmDraftPayload> {
  const raw =
    request.provider === 'gemini'
      ? await callGemini(request)
      : await callOpenAi(request);

  const parsed = llmDraftSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`AI response did not match expected schema: ${parsed.error.message}`);
  }
  return parsed.data;
}

async function callOpenAi(request: LlmDraftRequest): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${body.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty response');
  }
  return content;
}

async function callGemini(request: LlmDraftRequest): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(request.apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: request.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini error ${response.status}: ${body.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }
  return text;
}
