// Embeddings via Google's Gemini API (no local model, so it works on Vercel).
// Output size is 3072 numbers per text, which matches the Supabase column vector(3072).

const EMBEDDING_DIM = 3072;
const GEMINI_MODEL = "gemini-embedding-001";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:embedContent`;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error("Missing Gemini API key: set GEMINI_API_KEY in your environment variables");
  }
  return key;
}

/**
 * Embed a single piece of text, retrying on transient failures
 * (e.g. rate limits) with exponential backoff.
 */
export async function getEmbedding(text: string, retries = MAX_RETRIES): Promise<number[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": getApiKey(),
        },
        body: JSON.stringify({
          model: `models/${GEMINI_MODEL}`,
          content: { parts: [{ text }] },
          outputDimensionality: EMBEDDING_DIM,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Gemini embedding API ${res.status}: ${body.slice(0, 300)}`);
      }

      const data = await res.json();
      const embedding = data?.embedding?.values as number[] | undefined;

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("Gemini returned no embedding values");
      }

      if (attempt === 0) {
        console.log(`✓ Embedding generated: ${embedding.length} dimensions`);
      }

      return embedding;
    } catch (error) {
      lastError = error;
      console.error(`✗ Embedding attempt ${attempt + 1}/${retries + 1} failed:`, error);

      if (attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(`  Retrying in ${delay}ms...`);
        await sleep(delay);
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

  console.log(`Starting batch embedding: ${items.length} items, concurrency=${concurrency}`);

  let index = 0;
  async function worker(workerId: number) {
    while (index < items.length) {
      const current = items[index++];
      console.log(`  [Worker ${workerId}] Processing chunk: ${current.id}`);

      try {
        const embedding = await getEmbedding(current.text);

        if (!Array.isArray(embedding) || embedding.length === 0) {
          throw new Error(`Invalid embedding: expected array, got ${typeof embedding}`);
        }

        succeeded.push({ id: current.id, embedding, meta: current.meta });
        console.log(`  [Worker ${workerId}] ✓ ${current.id} (${embedding.length}d)`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        failed.push({
          id: current.id,
          meta: current.meta,
          error: errorMsg,
        });
        console.error(`  [Worker ${workerId}] ✗ ${current.id}: ${errorMsg}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)));

  console.log(`Batch complete: ${succeeded.length} succeeded, ${failed.length} failed`);
  return { succeeded, failed };
}

/**
 * Format embedding vector for Supabase storage.
 * Converts number[] to pgvector-compatible format.
 */
export function formatEmbeddingForDB(embedding: number[]): string {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('Invalid embedding: must be non-empty array');
  }
  return `[${embedding.join(',')}]`;
}

/**
 * Validate embedding dimensions match expected size.
 * 3072 = Gemini embedding size, matching the Supabase column vector(3072).
 */
export function validateEmbeddingDimension(embedding: number[], expectedDim: number = EMBEDDING_DIM): boolean {
  if (!Array.isArray(embedding)) return false;
  if (embedding.length !== expectedDim) {
    console.warn(`Warning: embedding dimension ${embedding.length} != expected ${expectedDim}`);
    return false;
  }
  return true;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    console.error('cosineSimilarity: inputs must be arrays', { aType: typeof a, bType: typeof b });
    return 0;
  }

  if (a.length !== b.length) {
    console.error('cosineSimilarity: dimension mismatch', { aLen: a.length, bLen: b.length });
    return 0;
  }

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

  if (normA === 0 || normB === 0) {
    console.warn('cosineSimilarity: zero norm detected', { normA, normB });
    return 0;
  }

  return dotProduct / (normA * normB);
}