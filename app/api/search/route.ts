import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cosineSimilarity } from '@/lib/embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

async function getQueryEmbedding(text: string): Promise<number[]> {
  console.log(`🔍 Generating query embedding for: "${text.substring(0, 50)}..."`);
  
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent(text);
  
  const embedding = result.embedding.values;
  console.log(`✓ Query embedding: ${embedding.length} dimensions`);
  
  return embedding;
}

export async function POST(request: NextRequest): Promise<NextResponse<SearchResponse>> {
  try {
    console.log('=== SEARCH REQUEST STARTED ===');
    
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
    const { query, limit = 5, reportId } = await request.json();

    if (!query) {
      console.error('✗ No query provided');
      return NextResponse.json(
        { success: false, error: 'query is required' },
        { status: 400 }
      );
    }

    console.log(`📝 Query: "${query}"`);
    console.log(`📊 Limit: ${limit}${reportId ? `, Report: ${reportId}` : ''}`);

    // Generate embedding for query
    const queryEmbedding = await getQueryEmbedding(query);

    // Fetch all chunks with embeddings for this user (with optional report filter)
    console.log('🔎 Fetching chunks from database...');
    
    let queryBuilder = supabase
      .from('report_chunks')
      .select('id, text, report_id, page_number, embedding')
      .eq('user_id', user.id)
      .not('embedding', 'is', null);

    if (reportId) {
      queryBuilder = queryBuilder.eq('report_id', reportId);
    }

    const { data: allChunks, error: fetchError } = await queryBuilder;

    if (fetchError) {
      console.error('✗ Fetch error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch chunks' },
        { status: 500 }
      );
    }

    if (!allChunks || allChunks.length === 0) {
      console.warn('⚠ No chunks with embeddings found');
      return NextResponse.json(
        {
          success: true,
          results: [],
          query,
          count: 0,
          message: 'No chunks with embeddings found. Please generate embeddings first.',
        },
        { status: 200 }
      );
    }

    console.log(`✓ Found ${allChunks.length} chunks with embeddings`);

    // Parse embeddings and calculate similarities
    console.log('📐 Calculating similarities...');
    
    const similarities = allChunks
      .map((chunk: any) => {
        try {
          // Parse embedding if it's a string
          let embedding = chunk.embedding;
          if (typeof embedding === 'string') {
            embedding = JSON.parse(embedding);
          }

          // Validate embedding
          if (!Array.isArray(embedding) || embedding.length === 0) {
            console.warn(`⚠ Invalid embedding for chunk ${chunk.id}`);
            return null;
          }

          const similarity = cosineSimilarity(queryEmbedding, embedding);
          
          return {
            id: chunk.id,
            text: chunk.text,
            reportId: chunk.report_id,
            pageNumber: chunk.page_number,
            similarity,
          };
        } catch (err) {
          console.error(`✗ Error processing chunk ${chunk.id}:`, err);
          return null;
        }
      })
      .filter((item): item is any => item !== null)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    console.log(`✓ Top ${similarities.length} results:`);
    similarities.forEach((result, idx) => {
      console.log(`  ${idx + 1}. Similarity: ${(result.similarity * 100).toFixed(1)}% - ${result.text.substring(0, 50)}...`);
    });

    console.log('=== SEARCH REQUEST COMPLETE ===\n');

    return NextResponse.json(
      {
        success: true,
        results: similarities,
        query,
        count: similarities.length,
        message: similarities.length > 0 
          ? `Found ${similarities.length} relevant chunks`
          : 'No similar chunks found',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('✗ Search error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${errorMsg}` },
      { status: 500 }
    );
  }
}