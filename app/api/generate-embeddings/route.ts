import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingsBatch } from '@/lib/embeddings';

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
  failedChunkIds?: string[];
  message?: string;
  error?: string;
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

    // Generate embeddings with limited concurrency + retries, tracking failures
    const { succeeded, failed } = await getEmbeddingsBatch(
      chunks.map((chunk) => ({ id: chunk.id, text: chunk.text, meta: chunk.chunk_index })),
      { concurrency: 5 }
    );

    const embeddings = succeeded.map((s) => ({ id: s.id, embedding: s.embedding }));

    if (failed.length > 0) {
      console.error(
        `Failed to embed ${failed.length}/${chunks.length} chunks:`,
        failed.map((f) => `id=${f.id} error=${f.error}`).join('; ')
      );
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
        failedChunkIds: failed.length > 0 ? failed.map((f) => f.id) : undefined,
        message:
          failed.length > 0
            ? `Generated embeddings for ${successCount} of ${chunks.length} chunks. ${failed.length} failed and can be retried.`
            : `Successfully generated embeddings for ${successCount} chunks. Ready for semantic search.`,
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