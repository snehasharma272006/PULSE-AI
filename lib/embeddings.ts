import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const EMBEDDING_MODEL = "gemini-embedding-001";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Embed a single piece of text, retrying on transient failures
 * (rate limits, network blips) with exponential backoff.
 */
export async function getEmbedding(text: string, retries = MAX_RETRIES): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt)); // 500ms, 1s, 2s
      }
    }
  }

  throw lastError;
}

export interface BatchEmbedItem<T = unknown> {
  id: string;
  text: string;
  meta?: T;
}

export interface BatchEmbedResult<T = unknown> {
  id: string;
  embedding: number[];
  meta?: T;
}

export interface BatchEmbedFailure<T = unknown> {
  id: string;
  meta?: T;
  error: string;
}

export interface BatchEmbedOutcome<T = unknown> {
  succeeded: BatchEmbedResult<T>[];
  failed: BatchEmbedFailure<T>[];
}

/**
 * Embed many texts with limited concurrency instead of one-by-one sequentially.
 * Never throws on individual failures — collects them in `failed` so callers
 * can see exactly which chunks didn't make it, instead of silently losing them.
 */
export async function getEmbeddingsBatch<T = unknown>(
  items: BatchEmbedItem<T>[],
  options?: { concurrency?: number }
): Promise<BatchEmbedOutcome<T>> {
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 5, items.length || 1));
  const succeeded: BatchEmbedResult<T>[] = [];
  const failed: BatchEmbedFailure<T>[] = [];

  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      try {
        const embedding = await getEmbedding(current.text);
        succeeded.push({ id: current.id, embedding, meta: current.meta });
      } catch (error) {
        failed.push({
          id: current.id,
          meta: current.meta,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return { succeeded, failed };
}

export function cosineSimilarity(a: number[], b: number[]): number {
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

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}