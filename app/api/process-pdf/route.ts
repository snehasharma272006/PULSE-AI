import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProcessResponse {
  success: boolean;
  reportId?: string;
  chunksCreated?: number;
  message?: string;
  error?: string;
}

function smartChunk(text: string, chunkSize: number = 500): string[] {
  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    let chunk = text.substring(currentPos, currentPos + chunkSize);

    const lastPeriod = chunk.lastIndexOf('.');
    const lastNewline = chunk.lastIndexOf('\n');
    const breakPoint = Math.max(lastPeriod, lastNewline);

    if (breakPoint > chunkSize * 0.7) {
      chunk = text.substring(currentPos, currentPos + breakPoint + 1);
      currentPos += breakPoint + 1;
    } else {
      currentPos += chunkSize;
    }

    if (chunk.trim().length > 50) {
      chunks.push(chunk.trim());
    }
  }

  return chunks;
}

export async function POST(request: NextRequest): Promise<NextResponse<ProcessResponse>> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Invalid authentication' }, { status: 401 });
    }

    const { reportId, fileUrl } = await request.json();

    if (!reportId || !fileUrl) {
      return NextResponse.json(
        { success: false, error: 'reportId and fileUrl are required' },
        { status: 400 }
      );
    }

    const pdfResponse = await fetch(fileUrl);
    if (!pdfResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch PDF from storage' },
        { status: 500 }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    let extractedText: string;
    try {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: Buffer.from(pdfBuffer) });
      const result = await parser.getText();
      extractedText = result.text;

      if (!extractedText || extractedText.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'No text found in PDF. Try a text-based PDF.' },
          { status: 400 }
        );
      }
    } catch (pdfError) {
      console.error('PDF extraction error:', pdfError);
      return NextResponse.json(
        { success: false, error: 'Failed to extract text from PDF' },
        { status: 500 }
      );
    }

    const chunks = smartChunk(extractedText);

    if (chunks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No meaningful text found in PDF' },
        { status: 400 }
      );
    }

    // Generate embeddings for each chunk
    let chunkRecords;
    try {
      const { pipeline: transformersPipeline } = await import('@xenova/transformers');
      const embedder = await transformersPipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );

      chunkRecords = [];
      for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index];
        const embeddingResult = await embedder(chunk, {
          pooling: 'mean',
          normalize: true,
        });
        const embedding = Array.from(embeddingResult.data as Float32Array) as number[];

        chunkRecords.push({
          user_id: user.id,
          report_id: reportId,
          text: chunk,
          chunk_index: index,
          page_number: 1,
          embedding,
        });
      }
    } catch (embedError) {
      console.error('Embedding generation error:', embedError);
      return NextResponse.json(
        { success: false, error: 'Failed to generate embeddings' },
        { status: 500 }
      );
    }

    const { data: insertedChunks, error: insertError } = await supabase
      .from('report_chunks')
      .insert(chunkRecords)
      .select();

    if (insertError) {
      console.error('Chunk insertion error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to store chunks in database' },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        extracted_text: extractedText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Report update error:', updateError);
    }

    return NextResponse.json(
      {
        success: true,
        reportId,
        chunksCreated: insertedChunks?.length || 0,
        message: `Successfully created ${insertedChunks?.length || 0} chunks with embeddings.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Process PDF error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}