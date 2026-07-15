import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { question, context } = await req.json();

    if (!question) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const contextBlock =
      context && context.length > 0
        ? `Here is the user's uploaded health report history:\n\n${context.join("\n\n---\n\n")}`
        : "The user has no uploaded health reports yet.";

    const prompt = `You are a warm, patient health assistant inside a personal health app called Pulse AI. The user may ask about their own uploaded reports, or general health questions.

${contextBlock}

Instructions:
- If the question relates to their uploaded reports, answer using that specific information, in plain, reassuring, non-clinical language.
- If the question is general health knowledge unrelated to their reports, answer normally using your general medical knowledge, still in simple language.
- If you don't have enough information from their reports to answer confidently, say so honestly rather than guessing.
- Always remind the user, briefly, that this isn't a replacement for professional medical advice — but don't be repetitive about it in every single reply.

User's question: ${question}`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    return NextResponse.json({ answer });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}