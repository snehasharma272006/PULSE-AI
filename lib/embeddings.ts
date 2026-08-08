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
      const embedding = result.embedding.values;
      
      // Log embedding dimension on first success
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
        
        // Validate embedding
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
  // pgvector expects: '[0.1, 0.2, 0.3]'::vector
  return `[${embedding.join(',')}]`;
}

/**
 * Validate embedding dimensions match expected size
 */
export function validateEmbeddingDimension(embedding: number[], expectedDim: number = 768): boolean {
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