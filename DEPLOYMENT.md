# Pulse AI - Deployment Guide

## Deploy to Vercel (Free Tier)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Pulse AI with RAG, streaming chat, trends"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/PULSE-AI.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repo
4. Click "Import"

### Step 3: Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://wzyowwovzsuenhvdvsih.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eW93d292enN1ZW5odmR2c2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Nzg1ODQsImV4cCI6MjA5NjI1NDU4NH0.fQnpRpswQEhr6ad9JcdZHCgfXge8xzsiYAOj919lj2U
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eW93d292enN1ZW5odmR2c2loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY3ODU4NCwiZXhwIjoyMDk2MjU0NTg0fQ.D-PfrrH0GqRYnJUtnBER4vsx3HUS4DUoYYDu4eHE_gs
GEMINI_API_KEY=GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 4: Deploy

Click "Deploy" - Vercel will:
1. Install dependencies
2. Run build
3. Deploy automatically
4. Give you a live URL

---

## Add to GitHub Profile README

Create/Update `README.md`:

```markdown
# Pulse AI - Health Timeline AI

🏥 **AI-powered medical record management** with semantic search and health trends.

### Features
- **RAG System** - PDF upload → intelligent chunking → semantic search
- **Streaming Chat** - Real-time AI responses with source citations
- **Health Trends** - Visual graphs of health metrics over time
- **Report Comparison** - Compare metrics between reports
- **$0 Tech Stack** - Next.js, Supabase, Gemini, pgvector (all free)

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: Google Gemini (streaming), Sentence-Transformers (embeddings)
- **Testing**: Jest, GitHub Actions CI/CD

### Live Demo
🔗 [Pulse AI Live](https://pulse-ai-demo.vercel.app)

### Getting Started

```bash
# Clone
git clone https://github.com/yourusername/pulse-ai.git
cd pulse-ai

# Install
npm install

# Create `.env.local`:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...

# Run
npm run dev
```

### API Routes

| Route | Function |
|-------|----------|
| `POST /api/upload` | Upload PDF + store |
| `POST /api/process-pdf` | Extract text + chunk |
| `POST /api/generate-embeddings` | Generate vectors |
| `POST /api/search` | Semantic search |
| `POST /api/chat` | Streaming AI chat |

### Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Key Features Explained

**RAG Pipeline**
1. User uploads PDF
2. Extract text → smart chunks
3. Generate 384-dim embeddings (local, free)
4. Store in pgvector (PostgreSQL)
5. On question: search similar chunks → feed to Gemini
6. Return answer + citations

**Streaming Chat**
- Real-time typing effect (like ChatGPT)
- Sends relevant chunks as context
- Citations show source + page

**Health Trends**
- Parses metrics from reports
- Visualizes trends over time
- Shows latest, average, change

**Report Comparison**
- Select 2 reports
- Compare side-by-side
- See improvements ↓/worsening ↑

### Portfolio Highlights

✅ **Engineering Maturity**
- RAG system with pgvector indexing
- Streaming API responses
- Jest tests + GitHub Actions CI/CD
- TypeScript + type safety

✅ **Production-Ready**
- Error handling & validation
- Authentication (Supabase Auth)
- Row-level security (RLS)
- Environment variables

✅ **Zero Cost**
- No paid APIs (Gemini free tier)
- No paid databases (Supabase free tier)
- No paid hosting (Vercel free tier)

### Interview Notes

This project demonstrates:
- **RAG/Vector DB**: Understanding of semantic search, embeddings, similarity
- **Streaming**: Async/streaming APIs, SSE (Server-Sent Events)
- **Full-stack**: Frontend (React/Next), Backend (API routes), Database (PostgreSQL)
- **DevOps**: GitHub Actions, environment management, deployment
- **AI Integration**: Prompt engineering, LLM APIs, real-time generation

---

**Built by Sneha Sharma** | [Portfolio](https://snehasharma.dev) | [Twitter](https://twitter.com)
```

---

## Live URL

After deployment, you'll get:
```
https://your-project-name.vercel.app
```

Share this link! It's your portfolio demo.

---

## Troubleshooting

**Build fails?**
- Check `npm run build` locally first
- Make sure all env vars are set in Vercel

**Streaming not working?**
- Vercel supports SSE by default
- Check browser console for errors

**Embeddings slow?**
- First request loads model (~100MB)
- Subsequent requests are instant

---

