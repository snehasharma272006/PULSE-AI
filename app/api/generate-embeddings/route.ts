import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { env } from 'process';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Types
interface EmbeddingResponse {
  success: boolean;
  reportId?: string;
  chunksEmbedded?: number;
  message?: string;
  error?: string;
}

// Lazy load transformers (only when needed, for performance)
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

export async function POST(request: NextRequest): Promise<NextResponse<EmbeddingResponse>> {
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
    const { reportId } = await request.json();

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'reportId is required' },
        { status: 400 }
      );
    }

    // Fetch chunks that don't have embeddings yet
    const { data: chunks, error: fetchError } = await supabase
      .from('report_chunks')
      .select('id, text, chunk_index')
      .eq('report_id', reportId)
      .eq('user_id', user.id)
      .is('embedding', null);  // Only get chunks without embeddings

    if (fetchError) {
      console.error('Fetch chunks error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch chunks' },
        { status: 500 }
      );
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No chunks found or already embedded' },
        { status: 400 }
      );
    }

    console.log(`Processing ${chunks.length} chunks for embeddings...`);

    // Load embedding model
    const embeddingModel = await getEmbeddingModel();

    // Generate embeddings for all chunks
    const embeddings: Array<{ id: string; embedding: number[] }> = [];

    for (const chunk of chunks) {
      try {
        // Generate embedding
        const result = await embeddingModel(chunk.text, {
          pooling: 'mean',
          normalize: true,
        });

        const embeddingArray = embeddingToArray(result);

        embeddings.push({
          id: chunk.id,
          embedding: embeddingArray,
        });

        console.log(`Embedded chunk ${chunk.chunk_index}: ${embeddingArray.length} dimensions`);
      } catch (error) {
        console.error(`Error embedding chunk ${chunk.id}:`, error);
        // Continue with next chunk
      }
    }

    if (embeddings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate embeddings for any chunks' },
        { status: 500 }
      );
    }

    console.log(`Generated ${embeddings.length} embeddings, now updating database...`);

    // Update database with embeddings (batch updates)
    let successCount = 0;
    for (const { id, embedding } of embeddings) {
      const { error: updateError } = await supabase
        .from('report_chunks')
        .update({ embedding })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error(`Error updating chunk ${id}:`, updateError);
      } else {
        successCount++;
      }
    }

    if (successCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to update any chunks with embeddings' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        reportId,
        chunksEmbedded: successCount,
        message: `Successfully generated embeddings for ${successCount} chunks. Ready for semantic search.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Embedding error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${(error as any).message}` },
      { status: 500 }
    );
  }
}