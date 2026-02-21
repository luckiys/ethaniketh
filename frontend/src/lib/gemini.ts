const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'liquid/lfm-2.5-1.2b-instruct:free';
const GAP_MS = 4000;

let queue: Promise<unknown> = Promise.resolve();

export async function geminiGenerate(prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const result = queue.then(async () => {
    await new Promise((r) => setTimeout(r, GAP_MS));
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://mudra.app',
          'X-Title': 'Mudra',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        console.error(`[ai] OpenRouter ${res.status}`);
        return null;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content?.trim() || null;
    } catch (err) {
      console.error('[ai] failed:', err);
      return null;
    }
  });

  queue = result.then(() => {}, () => {});
  return result;
}
