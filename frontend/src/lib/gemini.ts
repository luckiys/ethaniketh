import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-2.5-flash';
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 4000;
const MIN_INTERVAL_MS = 6000;

let pending: Promise<void> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const task = pending.then(() => delay(MIN_INTERVAL_MS)).then(fn);
  pending = task.then(() => {}, () => {});
  return task;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimitError(err: unknown): boolean {
  const msg = String(err);
  return /429|too many requests|resource.*exhausted|quota/i.test(msg);
}

let cachedClient: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

/**
 * Serialized Gemini calls — each request waits for the previous one to finish
 * plus a cooldown gap, so we never burst past free-tier rate limits.
 */
export async function geminiGenerate(prompt: string): Promise<string | null> {
  const ai = getClient();
  if (!ai) return null;

  return enqueue(async () => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: MODEL,
          contents: prompt,
        });
        return response.text?.trim() || null;
      } catch (err) {
        if (isRateLimitError(err) && attempt < MAX_RETRIES) {
          const wait = BASE_DELAY_MS * Math.pow(2, attempt);
          console.warn(`Gemini rate-limited, retrying in ${wait}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await delay(wait);
          continue;
        }
        console.error(`Gemini call failed (attempt ${attempt + 1}):`, err);
        return null;
      }
    }
    return null;
  });
}
