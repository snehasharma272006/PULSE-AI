import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

let pipeline: any = null;

async function getEmbeddingModel() {
  if (!pipeline) {
    const { pipeline: transformersPipeline } = await import("@xenova/transformers");
    pipeline = await transformersPipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return pipeline;
}

function embeddingToArray(embedding: any): number[] {
  if (Array.isArray(embedding)) {
    return embedding as number[];
  }
  if (embedding.data && (Array.isArray(embedding.data) || embedding.data instanceof Float32Array)) {
    return Array.from(embedding.data) as number[];
  }
  throw new Error("Invalid embedding format");
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  return dotProduct / (normA * normB);
}

async function searchRelevantChunks(
  query: string,
  userId: string,
  reportId?: string,
  limit: number = 5
): Promise<Array<{ text: string; reportId: string; pageNumber: number }>> {
  const embeddingModel = await getEmbeddingModel();

  const queryResult = await embeddingModel(query, {
    pooling: "mean",
    normalize: true,
  });

  const queryEmbedding = embeddingToArray(queryResult);

  let query_db = supabase
    .from("report_chunks")
    .select("text, report_id, page_number, embedding")
    .eq("user_id", userId)
    .not("embedding", "is", null);

  if (reportId) {
    query_db = query_db.eq("report_id", reportId);
  }

  const { data: chunks } = await query_db;

  if (!chunks || chunks.length === 0) {
    return [];
  }

  const similarities = chunks
    .map((chunk: any) => ({
      text: chunk.text,
      reportId: chunk.report_id,
      pageNumber: chunk.page_number,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return similarities.map((s) => ({
    text: s.text,
    reportId: s.reportId,
    pageNumber: s.pageNumber,
  }));
}

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

    // RAG: Search for relevant chunks
    const relevantChunks = await searchRelevantChunks(question, user.id, reportId, 5);

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