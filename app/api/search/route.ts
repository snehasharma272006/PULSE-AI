import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Types
interface SearchResult {
  id: string;
  text: string;
  similarity: number;
  reportId: string;
  pageNumber: number;
}

interface SearchResponse {
  success: boolean;
  results?: SearchResult[];
  query?: string;
  count?: number;
  message?: string;
  error?: string;
}

// Lazy load transformers
let pipeline: any = null;

async function getEmbeddingModel() {
  if (!pipeline) {
    const { pipeline: transformersPipeline } = await import('@xenova/transformers');
    pipeline = await transformersPipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }
  return pipeline;
}

// Convert embedding output to array
function embeddingToArray(embedding: any): number[] {
  if (Array.isArray(embedding)) {
    return embedding as number[];
  }
  if (embedding.data && Array.isArray(embedding.data)) {
    return embedding.data as number[];
  }
  throw new Error('Invalid embedding format');
}

export async function POST(request: NextRequest): Promise<NextResponse<SearchResponse>> {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get request body
    const { query, limit = 5, reportId } = await request.json();

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'query is required' },
        { status: 400 }
      );
    }

    // Load embedding model
    const embeddingModel = await getEmbeddingModel();

    // Generate embedding for query
    const queryResult = await embeddingModel(query, {
      pooling: 'mean',
      normalize: true,
    });

    const queryEmbedding = embeddingToArray(queryResult);

    console.log(`Query: "${query}"`);
    console.log(`Query embedding dimensions: ${queryEmbedding.length}`);

    // Build SQL query for similarity search
    let sql = `
      SELECT 
        id,
        text,
        report_id,
        page_number,
        1 - (embedding <=> $1::vector) as similarity
      FROM report_chunks
      WHERE user_id = $2
    `;

    const params: any[] = [JSON.stringify(queryEmbedding), user.id];

    // Optional: filter by specific report
    if (reportId) {
      sql += ` AND report_id = $3`;
      params.push(reportId);
    }

    sql += `
      ORDER BY similarity DESC
      LIMIT $${params.length + 1}
    `;

    params.push(limit);

    // Execute raw SQL query for vector similarity
    const { data: results, error: searchError } = await supabase.rpc(
      'search_chunks',
      {
        query_embedding: queryEmbedding,
        match_limit: limit,
        match_threshold: 0.1, // Lower threshold = broader search
        user_id: user.id,
        report_filter: reportId || null,
      }
    ).then((r: any) => {
      // Fallback: if RPC doesn't exist, fetch all and filter in JS
      if (r.error?.code === 'PGRST202') {
        return { data: null, error: null };
      }
      return r;
    });

    // If RPC method doesn't exist, do client-side filtering
    let searchResults: SearchResult[] = [];

    if (results && results.length > 0) {
      searchResults = results.map((r: any) => ({
        id: r.id,
        text: r.text,
        similarity: r.similarity,
        reportId: r.report_id,
        pageNumber: r.page_number,
      }));
    } else {
      // Fallback: fetch all chunks and calculate similarity in JavaScript
      console.log('Using JavaScript-based similarity search (RPC not available)');

      const { data: allChunks, error: fetchError } = await supabase
        .from('report_chunks')
        .select('id, text, report_id, page_number, embedding')
        .eq('user_id', user.id)
        .not('embedding', 'is', null);

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch chunks' },
          { status: 500 }
        );
      }

      if (allChunks && allChunks.length > 0) {
        // Calculate cosine similarity
        const cosineSimilarity = (a: number[], b: number[]): number => {
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
        };

        // Calculate similarities
        const similarities = allChunks
          .map((chunk: any) => ({
            id: chunk.id,
            text: chunk.text,
            reportId: chunk.report_id,
            pageNumber: chunk.page_number,
            similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit);

        searchResults = similarities;
      }
    }

    if (searchResults.length === 0) {
      return NextResponse.json(
        {
          success: true,
          results: [],
          query,
          count: 0,
          message: 'No similar chunks found',
        },
        { status: 200 }
      );
    }

    console.log(`Found ${searchResults.length} similar chunks`);

    return NextResponse.json(
      {
        success: true,
        results: searchResults,
        query,
        count: searchResults.length,
        message: `Found ${searchResults.length} relevant chunks`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${(error as any).message}` },
      { status: 500 }
    );
  }
}