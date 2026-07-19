ulse AI - Health Timeline AI 🏥

AI-powered medical record management with semantic search, streaming chat, and health trends visualization.
🚀 Features

RAG System (Retrieval-Augmented Generation)


PDF Upload & Storage - Secure file upload to Supabase
Smart Text Extraction - Intelligent chunking (breaks at sentences, not mid-word)
Local Embeddings - 384-dimensional vectors via Sentence-Transformers (no API calls)
Semantic Search - pgvector similarity search with cosine distance
Source Citations - AI responses include exact sources + page numbers


Streaming Chat


Real-time Typing Effect - Watch responses stream in like ChatGPT
RAG Context - Automatically finds relevant health records
Citation Cards - See exactly where the AI got its information
Multi-report Support - Chat about specific or all reports


Health Trends


Interactive Charts - Bar graphs of metrics over time
Auto-Detection - Parses cholesterol, blood pressure, weight, HbA1c from reports
Stats Summary - Latest value, average, and change indicators
Comparison - Side-by-side report comparison with trend arrows


Production Ready


Type Safety - Full TypeScript coverage
Jest Tests - Automated test suite
GitHub Actions - CI/CD on every push
Error Handling - Graceful failures + user feedback
Authentication - Supabase Auth with RLS



💰 Zero Cost Tech Stack

ComponentTechCostFrontendNext.js 15 + React 19FreeBackendNext.js API RoutesFreeDatabaseSupabase (PostgreSQL + pgvector)Free tierAuthSupabase AuthFree tierStorageSupabase StorageFree tierEmbeddingsSentence-Transformers (local)FreeLLMGoogle Gemini 2.5 FlashFree tier (60k req/day)HostingVercelFree tierTOTAL$0


🎯 Quick Start

Prerequisites


Node.js 18+
Supabase account (free)
Google Gemini API key (free)


Installation

bash# Clone repo
git clone https://github.com/YOUR_USERNAME/pulse-ai.git
cd pulse-ai

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
EOF

# Run dev server
npm run dev

Visit http://localhost:3000/dashboard


📋 Database Setup

Create Tables (SQL)

sqlCREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  extracted_text TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE report_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  report_id UUID NOT NULL REFERENCES reports(id),
  text TEXT NOT NULL,
  embedding vector(384),
  page_number INT,
  chunk_index INT,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_chunks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "users_access_own_reports" 
  ON reports FOR ALL USING (auth.uid() = user_id);
  
CREATE POLICY "users_access_own_chunks" 
  ON report_chunks FOR ALL USING (auth.uid() = user_id);

-- Index for fast search
CREATE INDEX ON report_chunks USING ivfflat 
  (embedding vector_cosine_ops);

Storage Bucket


Supabase Dashboard → Storage
Create bucket: medical-reports
Set to Private



🔌 API Routes

EndpointMethodPurpose/api/uploadPOSTUpload PDF file/api/process-pdfPOSTExtract text + chunk/api/generate-embeddingsPOSTGenerate vectors/api/searchPOSTSemantic search/api/chatPOSTStreaming AI chat

Example: Upload & Chat

typescript// 1. Upload
const uploadRes = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
  headers: { Authorization: `Bearer ${token}` },
});
const { reportId } = await uploadRes.json();

// 2. Process
await fetch('/api/process-pdf', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ reportId, fileUrl }),
});

// 3. Chat
const chatRes = await fetch('/api/chat', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ question: 'Why did my cholesterol drop?', reportId }),
});

// 4. Read streaming response
const reader = chatRes.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Stream chunks to UI
}


🧪 Testing

bash# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

GitHub Actions runs tests on every push.


📦 Project Structure

pulse-ai/
├── app/
│   ├── api/
│   │   ├── upload/route.ts
│   │   ├── process-pdf/route.ts
│   │   ├── generate-embeddings/route.ts
│   │   ├── search/route.ts
│   │   └── chat/route.ts
│   └── dashboard/
│       └── page.tsx
├── components/
│   ├── UploadForm.tsx
│   ├── ChatUI.tsx
│   ├── ReportsList.tsx
│   ├── TrendsChart.tsx
│   └── ReportComparison.tsx
├── hooks/
│   └── useAuth.ts
├── __tests__/
│   └── api/upload.test.ts
├── .github/
│   └── workflows/test.yml
├── jest.config.js
├── jest.setup.js
└── DEPLOYMENT.md


🚀 Deployment

Deploy on Vercel (Free)


Push to GitHub


bashgit add .
git commit -m "Initial commit: Pulse AI RAG system"
git push origin main


Connect to Vercel

Go to vercel.com
Click "New Project"
Import your GitHub repo
Click "Import"



Add Environment Variables

Settings → Environment Variables
Add: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
Click "Deploy"



Get Live URL

Vercel assigns: https://pulse-ai-xxx.vercel.app
Share with recruiters!






💡 How RAG Works

User Upload PDF
    ↓
Extract Text (pdf-parse)
    ↓
Smart Chunk (~500 chars per chunk)
    ↓
Generate Embeddings (Sentence-Transformers)
    ↓
Store in pgvector (PostgreSQL)
    ↓
User Asks Question
    ↓
Embed Question (same model)
    ↓
Search pgvector (cosine similarity)
    ↓
Get Top 5 Chunks
    ↓
Send to Gemini (+ context)
    ↓
Stream Response (real-time)
    ↓
Return Answer + Citations


🎯 What Makes This Portfolio Gold

For Recruiters

✅ RAG/Vector DB - Shows understanding of semantic search, embeddings, similarity algorithms
✅ Streaming - Real-time APIs, SSE (Server-Sent Events), async patterns
✅ Full-Stack - React frontend, Next.js backend, PostgreSQL database
✅ DevOps - GitHub Actions CI/CD, environment management, deployment
✅ AI Integration - Prompt engineering, LLM APIs, streaming responses
✅ Production Ready - Type safety, testing, error handling, authentication

Interview Talking Points


"I built RAG using pgvector indexing for semantic search" - Shows vector DB knowledge
"Implemented streaming responses with Server-Sent Events" - Shows real-time API skills
"100% free stack - no paid APIs" - Shows cost optimization thinking
"Type-safe TypeScript across frontend, backend, and database" - Shows discipline
"Automated testing + GitHub Actions for every push" - Shows engineering maturity



📚 Key Technologies Explained

pgvector

PostgreSQL extension for vector similarity search. Stores 384-dimensional embeddings and finds similar chunks using cosine distance.

Sentence-Transformers

Local embedding model (~100MB). Converts text to meaningful vectors. No API calls = no latency, no cost.

Streaming

Real-time response delivery. Server sends chunks as they arrive. User sees typing effect like ChatGPT.

Citations

Track which chunk the AI used. Display source + page number. Builds trust + verifiability.


🔐 Security


Row-Level Security (RLS) - Users see only their own data
Supabase Auth - Secure authentication
Environment Variables - No secrets in code
Service Role Key - Only backend can access DB
File Validation - PDF-only, size limits



🐛 Troubleshooting

Build fails locally?

bashnpm run build

Check for TypeScript errors.

Embeddings slow on first request?


Sentence-Transformers downloads model (~100MB) on first use
Subsequent requests are instant


Tests failing?

bashnpm test -- --no-coverage

Check test output for specific errors.

Streaming not working?


Vercel supports SSE by default
Check browser Network tab for streaming chunks



📖 Documentation


DEPLOYMENT.md - Step-by-step deployment guide
Database Schema - SQL setup instructions
API Routes - Endpoint reference




 Author:

Sneha Sharma
CS Student | AI Web Engineering | Noida



⭐ Show Your Support

If this helps you learn , star the repo! ⭐


Built with ❤️ 