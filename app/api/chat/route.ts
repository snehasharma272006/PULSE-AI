import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { graph } from "@/lib/graph/graph";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 });
    }

    const { question, reportId } = await req.json();

    if (!question) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 });
    }

    // Agentic RAG: classify intent → route → retrieve/compute
    const result = await graph.invoke({ question, userId: user.id, reportId });
    const relevantChunks = result.chunks || [];

    const contextBlock =
      relevantChunks && relevantChunks.length > 0
        ? `Here are relevant sections from the user's health reports:\n\n${relevantChunks
            .map((chunk, idx) => `[Report ${idx + 1}] ${chunk.text}`)
            .join("\n\n---\n\n")}`
        : "The user has no uploaded health reports yet.";

    const prompt = `You are a warm, patient health assistant inside a personal health app called Pulse AI. The user may ask about their own uploaded reports, or general health questions.

${contextBlock}

Instructions:
- If the question relates to their uploaded reports, answer using that specific information, in plain, reassuring, non-clinical language.
- If the question is general health knowledge unrelated to their reports, answer normally using your general medical knowledge, still in simple language.
- If you don't have enough information from their reports to answer confidently, say so honestly rather than guessing.
- Always remind the user, briefly, that this isn't a replacement for professional medical advice — but don't be repetitive about it in every single reply.

User's question: ${question}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Use streaming
    const stream = await model.generateContentStream(prompt);

    // Create readable stream
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = "";

          // Stream the response chunks
          for await (const chunk of stream.stream) {
            const text = chunk.text();
            fullResponse += text;

            // Send each chunk as SSE
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: "content", text })}\n\n`
              )
            );
          }

          // Send citations at the end
          const citations = relevantChunks.slice(0, 3).map((chunk, idx) => ({
            text: chunk.text.substring(0, 100) + "...",
            page: chunk.pageNumber,
            reportId: chunk.reportId,
          }));

          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: "citations", citations })}\n\n`
            )
          );

          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(customReadable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: `Internal server error: ${(error as any).message}` },
      { status: 500 }
    );
  }
}