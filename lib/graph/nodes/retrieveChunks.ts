import { createClient } from "@supabase/supabase-js";
import { getEmbedding, cosineSimilarity } from "../../embeddings";
import { GraphState } from "../state";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function retrieveChunks(state: typeof GraphState.State) {
  const queryEmbedding = await getEmbedding(state.question);

  let q = supabase
    .from("report_chunks")
    .select("text, report_id, page_number, embedding")
    .eq("user_id", state.userId)
    .not("embedding", "is", null);

  if (state.reportId) {
    q = q.eq("report_id", state.reportId);
  }

  const { data } = await q;
  if (!data || data.length === 0) return { chunks: [] };

  const ranked = data
    .map((c: any) => ({
      text: c.text,
      reportId: c.report_id,
      pageNumber: c.page_number,
      similarity: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return { chunks: ranked };
}