# Pulse AI — Health Timeline AI 🏥

AI-powered medical record management with semantic search (RAG), streaming chat, and health trends visualization.


##  Features

###  RAG System (Retrieval-Augmented Generation)
- **PDF Upload & Storage** — Secure file upload to Supabase Storage
- **Smart Text Extraction** — `pdf-parse` extracts text, chunked intelligently (breaks at sentence boundaries, never mid-word)
- **Local Embeddings** — 384-dimensional vectors generated on-device via `@xenova/transformers` (`Xenova/all-MiniLM-L6-v2`) — no external API calls, no latency, no cost
- **Semantic Search** — `pgvector` similarity search inside Supabase, with a JS cosine-similarity fallback
- **Source Citations** — every AI answer links back to the exact chunk + report it came from

### Streaming Chat
- **Real-time typing effect** — responses stream token-by-token, ChatGPT-style
- **RAG-grounded answers** — automatically retrieves the most relevant health record chunks before answering
- **Citation cards** — see exactly which source the AI pulled from
- **Multi-report support** — chat about one specific report or your entire history

### Design System
- Clean, monochromatic blue palette with a soft gradient background
- **Instrument Serif (italic)** for headings — gives the product an editorial, premium feel instead of the generic SaaS look

### Production Ready
- Full **TypeScript** coverage
- **Jest** test suite + **GitHub Actions** CI/CD on every push
- Graceful error handling with clear user feedback
- **Supabase Auth** with Row-Level Security (RLS)

## Zero-Cost Tech Stack

| Component | Tech 
| Frontend | Next.js 15 + React 19 
| Backend | Next.js API Routes 
| Database | Supabase (PostgreSQL + pgvector) 
| Auth | Supabase Auth 
| Storage | Supabase Storage
| Embeddings | `@xenova/transformers` (local, on-device) 
| Document Extraction & Answers | Google Gemini 2.5 Flash
| Hosting | Vercel


### Prerequisites
- Node.js 18+
- Supabase account 
- Google Gemini API key

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/pulse-ai.git
cd pulse-ai
npm install

cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
EOF

npm run dev
```

Visit `http://localhost:3000/login` 


## Database Setup

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  extracted_text TEXT,
  summary TEXT,
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

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_access_own_reports"
  ON reports FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_access_own_chunks"
  ON report_chunks FOR ALL USING (auth.uid() = user_id);

CREATE INDEX ON report_chunks USING ivfflat
  (embedding vector_cosine_ops);
```

**Storage bucket:** Supabase Dashboard → Storage → create `medical-reports` (Private)

## API Routes

| Endpoint | Method | Purpose |

| `/api/upload` | POST | Upload PDF file |
| `/api/analyze-pdf` | POST | Whole-document AI summary (Gemini) |
| `/api/process-pdf` | POST | Extract, chunk, and embed for RAG |
| `/api/search` | POST | Semantic search via `search_chunks` RPC |
| `/api/chat` | POST | Streaming AI chat, grounded in retrieved chunks |

### Example: Upload → Process → Chat

```typescript
// 1. Upload
const uploadRes = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
  headers: { Authorization: `Bearer ${token}` },
});
const { reportId } = await uploadRes.json();

// 2. Process (extract + chunk + embed)
await fetch('/api/process-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ reportId, fileUrl }),
});

// 3. Chat
const chatRes = await fetch('/api/chat', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ question: 'Why did my cholesterol drop?', reportId }),
});

// 4. Stream the response
const reader = chatRes.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // render chunk to UI
}
```


## Testing

```bash
npm test               # run all tests
npm run test:watch     # watch mode
npm run test:coverage  # coverage report
```

GitHub Actions runs the full suite on every push.


## Project Structure

```
pulse-ai/
├── app/
│   ├── api/
│   │   ├── upload/route.ts
│   │   ├── analyze-pdf/route.ts
│   │   ├── process-pdf/route.ts
│   │   ├── search/route.ts
│   │   └── chat/route.ts
│   ├── dashboard/page.tsx
│   ├── timeline/page.tsx
│   └── login/page.tsx
├── components/
│   ├── UploadForm.tsx
│   ├── ChatUI.tsx
│   ├── ReportsList.tsx
│   ├── TrendsChart.tsx
│   └── ReportComparison.tsx
├── hooks/
│   └── useAuth.ts
├── __tests__/
├── .github/workflows/test.yml
├── jest.config.js
└── next.config.ts
```


##  Deployment (Vercel — Free)

1. Push to GitHub
   ```bash
   git add .
   git commit -m "Initial commit: Pulse AI RAG system"
   git push origin main
   ```
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`
4. Deploy → share your live URL with recruiters


## How RAG Works

```
Upload PDF
   ↓
Extract text (pdf-parse)
   ↓
Chunk intelligently (~500 chars, sentence-aware)
   ↓
Generate local embeddings (@xenova/transformers)
   ↓
Store vectors in Supabase (pgvector)
   ↓
User asks a question
   ↓
Embed the question (same model)
   ↓
Search pgvector for top-5 similar chunks
   ↓
Send chunks + question to Gemini 2.5 Flash
   ↓
Stream the answer back with citations
```

## Why This Is Portfolio-Grade

- **RAG / Vector DB** — real semantic search, not keyword matching: embeddings, cosine similarity, pgvector indexing
- **Streaming** — Server-Sent Events, real-time async patterns
- **Full-stack** — React frontend, Next.js backend, PostgreSQL database, all type-safe
- **DevOps** — CI/CD via GitHub Actions, environment management, Vercel deployment
- **AI Integration** — prompt engineering, LLM APIs, retrieval-grounded generation
- **Production discipline** — tests, error handling, RLS-secured auth

**Interview talking points:**
- "I built a RAG pipeline with local embeddings and pgvector for semantic search — no external embedding API, so it's fully free and low-latency."
- "Chat responses are streamed via Server-Sent Events, with citations traced back to the exact source chunk."
- "The whole stack — frontend, backend, DB, auth, embeddings — runs on free tiers, so the cost story is $0."
- "TypeScript end-to-end, with Jest tests running automatically on every push via GitHub Actions."


## Key Technologies, Briefly

- **pgvector** — PostgreSQL extension for storing and searching vector embeddings using cosine distance
- **`@xenova/transformers`** — runs a sentence-embedding model locally in JS, no server round-trip
- **Streaming** — the server sends the response in pieces as they're generated, instead of making the user wait for the whole thing
- **Citations** — every answer is traceable to a specific chunk + page, for verifiability


## Security

- Row-Level Security (RLS) — users can only ever see their own data
- Supabase Auth (email/password)
- No secrets committed to code — all via environment variables
- Service Role Key is backend-only
- PDF-only uploads, with size limits


**Author:** Sneha Sharma
CS Student · AI & Full-Stack Web Engineering · Noida

⭐ If this helped you learn something, star the repo!
