import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingsBatch, formatEmbeddingForDB, validateEmbeddingDimension } from '@/lib/embeddings';

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
    console.log('=== EMBEDDING REQUEST STARTED ===');
    
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('✗ No authorization header');
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
      console.error('✗ Auth failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    console.log(`✓ Authenticated user: ${user.id}`);

    // Get request body
    const { reportId } = await request.json();

    if (!reportId) {
      console.error('✗ Missing reportId');
      return NextResponse.json(
        { success: false, error: 'reportId is required' },
        { status: 400 }
      );
    }

    console.log(`📋 Processing report: ${reportId}`);

    // Fetch chunks that don't have embeddings yet
    const { data: chunks, error: fetchError } = await supabase
      .from('report_chunks')
      .select('id, text, chunk_index')
      .eq('report_id', reportId)
      .eq('user_id', user.id)
      .is('embedding', null);

    if (fetchError) {
      console.error('✗ Fetch chunks error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch chunks' },
        { status: 500 }
      );
    }

    if (!chunks || chunks.length === 0) {
      console.warn('⚠ No chunks found without embeddings');
      return NextResponse.json(
        { success: false, error: 'No chunks found or already embedded' },
        { status: 400 }
      );
    }

    console.log(`🔍 Found ${chunks.length} chunks to embed`);

    // Generate embeddings with limited concurrency + retries, tracking failures
    const { succeeded, failed } = await getEmbeddingsBatch(
      chunks.map((chunk) => ({ id: chunk.id, text: chunk.text, meta: chunk.chunk_index })),
      { concurrency: 5 }
    );

    const embeddings = succeeded.map((s) => {
      // Validate embedding dimension (Gemini produces 768-dim vectors)
      validateEmbeddingDimension(s.embedding, 768);
      return { id: s.id, embedding: s.embedding };
    });

    if (failed.length > 0) {
      console.warn(
        `⚠ Failed to embed ${failed.length}/${chunks.length} chunks:`
      );
      failed.forEach((f) => {
        console.warn(`  - ${f.id}: ${f.error}`);
      });
    }

    if (embeddings.length === 0) {
      console.error('✗ Failed to generate embeddings for any chunks');
      return NextResponse.json(
        { success: false, error: 'Failed to generate embeddings for any chunks' },
        { status: 500 }
      );
    }

    console.log(`✓ Generated ${embeddings.length} embeddings, now updating database...`);

    // Update database with embeddings (batch updates)
    let successCount = 0;
    let updateErrors: string[] = [];

    for (const { id, embedding } of embeddings) {
      try {
        // Format embedding for pgvector
        const formattedEmbedding = formatEmbeddingForDB(embedding);

        const { error: updateError } = await supabase
          .from('report_chunks')
          .update({ embedding: formattedEmbedding })
          .eq('id', id)
          .eq('user_id', user.id);

        if (updateError) {
          console.error(`✗ Error updating chunk ${id}:`, updateError);
          updateErrors.push(`${id}: ${updateError.message}`);
        } else {
          successCount++;
          console.log(`  ✓ Updated ${id}`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`✗ Exception updating chunk ${id}:`, errMsg);
        updateErrors.push(`${id}: ${errMsg}`);
      }
    }

    if (successCount === 0) {
      console.error('✗ Failed to update any chunks with embeddings');
      console.error('Update errors:', updateErrors);
      return NextResponse.json(
        { success: false, error: 'Failed to update any chunks with embeddings', message: updateErrors.join('; ') },
        { status: 500 }
      );
    }

    console.log(`✓ Successfully embedded ${successCount}/${chunks.length} chunks`);
    console.log('=== EMBEDDING REQUEST COMPLETE ===\n');

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
    console.error('✗ Embedding error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${errorMsg}` },
      { status: 500 }
    );
  }
}