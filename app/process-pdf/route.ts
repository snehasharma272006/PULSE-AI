import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
if (typeof window === 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Types
interface ProcessResponse {
  success: boolean;
  reportId?: string;
  chunksCreated?: number;
  message?: string;
  error?: string;
}

// Smart chunking logic
function smartChunk(text: string, chunkSize: number = 500, overlap: number = 100): string[] {
  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    // Extract chunk
    let chunk = text.substring(currentPos, currentPos + chunkSize);

    // Find a good break point (end of sentence)
    const lastPeriod = chunk.lastIndexOf('.');
    const lastNewline = chunk.lastIndexOf('\n');
    const breakPoint = Math.max(lastPeriod, lastNewline);

    if (breakPoint > chunkSize * 0.7) {
      // Good break point found
      chunk = text.substring(currentPos, currentPos + breakPoint + 1);
      currentPos += breakPoint + 1;
    } else {
      // No good break point, use full chunk
      currentPos += chunkSize;
    }

    if (chunk.trim().length > 50) {
      // Only add if chunk has meaningful content
      chunks.push(chunk.trim());
    }
  }

  return chunks;
}

// Extract text from PDF
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += `[Page ${pageNum}]\n${pageText}\n\n`;
  }

  return fullText;
}

export async function POST(request: NextRequest): Promise<NextResponse<ProcessResponse>> {
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
    const { reportId, fileUrl } = await request.json();

    if (!reportId || !fileUrl) {
      return NextResponse.json(
        { success: false, error: 'reportId and fileUrl are required' },
        { status: 400 }
      );
    }

    // Fetch PDF from URL
    const pdfResponse = await fetch(fileUrl);
    if (!pdfResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch PDF from storage' },
        { status: 500 }
      );
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    // Extract text from PDF
    let extractedText: string;
    try {
      extractedText = await extractTextFromPDF(pdfBuffer);
    } catch (pdfError) {
      console.error('PDF extraction error:', pdfError);
      return NextResponse.json(
        { success: false, error: 'Failed to extract text from PDF' },
        { status: 500 }
      );
    }

    // Smart chunk the text
    const chunks = smartChunk(extractedText);

    if (chunks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No meaningful text found in PDF' },
        { status: 400 }
      );
    }

    // Store chunks in database (without embeddings for now)
    const chunkRecords = chunks.map((chunk, index) => ({
      user_id: user.id,
      report_id: reportId,
      text: chunk,
      chunk_index: index,
      page_number: 1, // We'll parse this better later
    }));

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

    // Update report with extracted text
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
        message: `Successfully extracted ${insertedChunks?.length || 0} chunks. Ready for embeddings.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Process PDF error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}