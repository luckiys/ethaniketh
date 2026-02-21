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
    const prompt = `You are explaining a DeFi portfolio strategy to someone who is NOT technical. They do not understand numbers like "68/100" or "0.6%".

Rewrite the following strategy reasoning into 2-4 short, flowing sentences in plain English. Rules:
- NO numbers, scores, or percentages. Use words instead: "low", "moderate", "high", "concentrated", "diversified", "volatile", "stable", "fearful", "greedy".
- NO technical jargon. Say "your biggest holding" not "concentration score". Say "market mood" not "Fear & Greed index".
- Focus on: what's the main concern, what we recommend, and why in simple terms.
- Be warm and clear. Write as if explaining to a friend.

Input:
${combined}

Output (plain English only, no numbers):`;

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
