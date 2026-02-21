import { NextResponse } from 'next/server';
import { geminiGenerate } from '@/lib/gemini';

/**
 * Takes the strategist's decision context (actual logic) and uses Gemini to generate
 * a beginner-friendly, step-by-step explanation. Free tier (Gemini).
 */
export async function POST(req: Request) {
  try {
    const { decisionContext } = (await req.json()) as { decisionContext?: Record<string, unknown> };
    if (!decisionContext || typeof decisionContext !== 'object') {
      return NextResponse.json({ steps: null }, { status: 400 });
    }

    const prompt = `You are a friendly financial advisor explaining a portfolio recommendation to someone who is NOT a crypto expert. Write 2-3 conversational sentences in plain English.

Rules:
- Sound like a knowledgeable friend, not a report. Use "we", "your", "because".
- NO numbers, scores, or percentages. Use words like "heavily concentrated", "quite volatile", "a lot of risk", "the market is nervous".
- NO bullet points, NO numbered lists, NO headers. Just flowing prose.
- Cover: what we noticed about their portfolio, why it's a concern given their goal, and what we're suggesting.
- Be warm and direct. Example tone: "We noticed most of your portfolio is sitting in one asset, and since you want to grow safely, that level of concentration puts you at more risk than necessary. The market is also showing signs of nervousness right now, so we're suggesting a partial rebalance to spread things out a bit."

Decision data:
${JSON.stringify(decisionContext, null, 2)}

Write 2-3 sentences of plain English explanation. No lists, no numbers:`;

    const text = await geminiGenerate(prompt);
    if (text) {
      return NextResponse.json({ steps: text });
    }
  } catch {
    // Fall through
  }
  return NextResponse.json({ steps: null });
}
