import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { reasoning, worstCaseAnalysis } = (await req.json()) as { reasoning?: string; worstCaseAnalysis?: string };
    const combined = [worstCaseAnalysis, reasoning].filter(Boolean).join(' ').trim();
    if (!combined) {
      return NextResponse.json({ humanized: null }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ humanized: null });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `You are a friendly financial advisor explaining a portfolio recommendation to a complete beginner. Write 2-3 conversational sentences.

Rules:
- Sound like a knowledgeable friend. Use "we", "your", "because".
- NO numbers, scores, or percentages. Use descriptive words: "heavily concentrated", "quite volatile", "the market is nervous", "a lot of risk".
- NO bullet points, NO lists. Just natural flowing sentences.
- Cover: what we noticed, why it matters for their goal, and what we suggest.

Input analysis:
${combined}

Write 2-3 plain English sentences. No lists, no numbers:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (text) {
      return NextResponse.json({ humanized: text });
    }
  } catch {
    // Fall through
  }
  return NextResponse.json({ humanized: null });
}
