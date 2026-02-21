import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ steps: null });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a friendly crypto educator. Someone new to crypto just ran their portfolio through our analysis. They want to save money and get simple suggestions — they are NOT experts.

Below is the EXACT data our system computed and the decisions it made. Your job: translate this into 4–6 numbered steps that explain WHAT we looked at and WHY we recommend what we did.

Rules:
- Use plain language. No jargon. Say "your biggest holding" not "concentration score". Say "market mood" not "Fear & Greed index".
- Each step should answer: "What did we look at?" or "Why did we decide this?"
- Be warm and reassuring. They're beginners trying to protect their money.
- NO raw numbers like "68/100". Use words: "high", "moderate", "low", "most of", "a lot", "some".
- End with a clear "Here's what we suggest" summary.

Decision data from our system:
${JSON.stringify(decisionContext, null, 2)}

Write 4–6 numbered steps. Format as:
1. [Step one]
2. [Step two]
...`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (text) {
      return NextResponse.json({ steps: text });
    }
  } catch {
    // Fall through
  }
  return NextResponse.json({ steps: null });
}
