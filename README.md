# Pulse AI — Health Timeline AI 

AI-powered medical record management with **agentic RAG** (retrieval-augmented generation orchestrated by LangGraph), streaming chat, and health trends visualization.


##  Features

###  Agentic RAG System (LangGraph-Orchestrated)
- **PDF Upload & Storage** — Secure file upload to Supabase Storage
- **Smart Text Extraction** — `pdf-parse` extracts text, chunked intelligently (breaks at sentence boundaries, never mid-word)
- **Local Embeddings** — 384-dimensional vectors generated on-device via `@xenova/transformers` (`Xenova/all-MiniLM-L6-v2`) — no external API calls, no latency, no cost
- **Semantic Search** — `pgvector` similarity search inside Supabase, with a JS cosine-similarity fallback
- **Intent-Routed Chat** — a LangGraph agent classifies each user query and routes it to the right node: plain RAG retrieval, trend lookup, report comparison, or a multi-step chain for compound questions
- **Source Citations** — every AI answer links back to the exact chunk + report it came from

### Streaming Chat
- **Real-time typing effect** — responses stream token-by-token, ChatGPT-style
- **Agentic, RAG-grounded answers** — the graph retrieves, computes, or compares before composing a final answer
- **Citation cards** — see exactly which source the AI pulled from
- **Multi-report support** — chat about one specific report or your entire history

### Symptom Triage & Doctor Consultation
- **Deterministic urgency triage** (`lib/triage.ts`) — plain weighted scoring against a symptom checklist, no LLM in this path, so the same input always produces the same output. A small red-flag rule set (crushing chest pain, unconsciousness, severe uncontrolled bleeding, and similar) forces a critical verdict on its own, independent of the score
- **Auditable results** — every verdict comes with a `reasons` list showing exactly why that urgency level was assigned
- **Doctor matching** — routine and urgent cases route to `app/consult/match`, which filters doctors by specialty, region, and today's availability, and recommends a specialty automatically based on reported symptoms
- **Critical short-circuit** — a critical result skips doctor matching and routes straight to the Emergency Locator, with a safety net that redirects even if the matching page is opened directly

### Emergency Locator
- **Geolocation-based lookup** of nearby hospitals, pharmacies, and clinics via OpenStreetMap's Overpass API — a public endpoint, no API key or billing required
- **One-tap calling** (`tel:` link) and **location sharing** (native share sheet, with a copy-link fallback)
- **Offline/rate-limit resilience** — results are cached in Supabase (`emergency_contacts_cache`), so the locator still shows something if the live Overpass call fails

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
| Agent Orchestration | LangGraph (routing, looping, multi-step chat logic) 
| Retrieval/Prompt Plumbing | LangChain (used inside individual graph nodes) 
| Database | Supabase (PostgreSQL + pgvector) 
| Auth | Supabase Auth 
| Storage | Supabase Storage
| Embeddings | `@xenova/transformers` (local, on-device) 
| Document Extraction & Answers | Google Gemini 2.5 Flash
| Location Data | OpenStreetMap Overpass API
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

### Triage / Emergency Locator tables

```sql
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  symptoms JSONB NOT NULL,
  urgency_level TEXT NOT NULL,
  score INT NOT NULL,
  reasons JSONB NOT NULL,
  red_flag_triggered BOOLEAN NOT NULL DEFAULT false,
  matched_doctor_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  region TEXT NOT NULL,
  years_experience INT NOT NULL,
  rating NUMERIC NOT NULL,
  phone TEXT,
  email TEXT,
  availability JSONB NOT NULL DEFAULT '[]',
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE emergency_contacts_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  radius_meters INT NOT NULL,
  places JSONB NOT NULL,
  fetched_at TIMESTAMP DEFAULT now()
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_access_own_consultations"
  ON consultations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "anyone_reads_doctors"
  ON doctors FOR SELECT USING (true);

CREATE POLICY "anyone_reads_cache"
  ON emergency_contacts_cache FOR SELECT USING (true);
```

## API Routes

| Endpoint | Method | Purpose |

| `/api/upload` | POST | Upload PDF file |
| `/api/analyze-pdf` | POST | Whole-document AI summary (Gemini), returns structured JSON |
| `/api/process-pdf` | POST | Extract, chunk, and embed for RAG |
| `/api/search` | POST | Semantic search via `search_chunks` RPC |
| `/api/chat` | POST | Streaming AI chat — internally runs the LangGraph agent (intent classification → retrieval/computation → composition) |

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

// 3. Chat (agentic — the graph decides how to answer)
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
│   │   ├── analyze-image/route.ts
│   │   ├── process-pdf/route.ts
│   │   ├── search/route.ts
│   │   ├── chat/route.ts
│   │   └── generate-embeddings/route.ts
│   ├── auth/callback/route.ts
│   ├── chat/page.tsx
│   ├── consult/
│   │   ├── layout.tsx              # disclaimer banner for this section
│   │   ├── page.tsx                # symptom intake form
│   │   ├── triage/page.tsx         # urgency result screen
│   │   └── match/page.tsx          # doctor matching
│   ├── dashboard/page.tsx
│   ├── emergency/
│   │   ├── layout.tsx              # disclaimer banner for this section
│   │   └── page.tsx                # nearby help locator
│   ├── login/page.tsx
│   ├── timeline/page.tsx
│   └── upload/page.tsx
├── components/
│   ├── DisclaimerBanner.tsx
│   ├── DoctorCard.tsx
│   ├── EmergencyCallButton.tsx
│   ├── HealthActionCard.tsx
│   ├── LocationShareButton.tsx
│   ├── ReportsList.tsx
│   ├── ReportComparision.tsx
│   ├── TrendsChart.tsx
│   └── UrgencyBadge.tsx
├── lib/
│   ├── consultations.ts    # Supabase wrapper for the consultations table
│   ├── doctors.ts           # Supabase wrapper for the doctors table + filtering
│   ├── geolocation.ts       # browser geolocation hook
│   ├── places.ts            # Overpass API wrapper + cache fallback
│   ├── specialtyMatch.ts    # symptom-type → recommended specialty
│   ├── triage.ts            # deterministic urgency scoring engine
│   └── graph/
│       ├── state.ts        # LangGraph shared state definition
│       └── graph.ts        # Graph wiring: nodes, edges, routing logic
├── hooks/
│   └── useAuth.ts
├── supabase/
│   └── emergency_contacts_cache.sql
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


## System Architecture

Pulse AI splits its intelligence into two deliberately different halves: a **deterministic pipeline** for uploads (predictable, one-path, no decisions to make) and an **agentic graph** for chat (open-ended, needs to decide *how* to answer before it answers).

### 1. Upload → Summary Pipeline (deterministic, no agent)

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
Gemini generates a STRUCTURED JSON summary (not loose prose)
```

The summary call is constrained to a strict schema so the dashboard can render real charts and flagged values instead of parsing prose:

```json
{
  "summary": "string",
  "key_metrics": [
    { "name": "Cholesterol", "value": 210, "unit": "mg/dL", "flagged": true }
  ],
  "concerns": ["string"],
  "recommended_followup": "string"
}
```

`key_metrics` becomes a shared data source that the chatbot's trend/comparison nodes query directly — no need to re-parse raw PDF text on every chat turn.

### 2. Chatbot — Agentic RAG (LangGraph)

Unlike the upload pipeline, chat has open-ended user intent, so this is where the actual "agent" behavior lives: an LLM node classifies the query, then routes it down one of several paths.

```
User Query
    │
    ▼
[Classify Intent]  ← LLM decides the path
    │
    ├─→ [RAG Chat]        → retrieve chunks → generate + cite → stream
    │
    ├─→ [Trend Query]     → get_metric_trend → summarize
    │
    ├─→ [Comparison]      → compare_reports → check_reference_range → summarize
    │
    └─→ [Multi-part]      → loop: retrieve → check if enough → call more nodes → combine
                                        │
                                        ▼
                              [Compose Final Answer] → stream to user
```

**Design decisions worth knowing:**
- **LangGraph** owns routing and looping — the actual "agentic" part of the system.
- **LangChain** (used internally, optional by design) handles retrieval/prompt plumbing inside individual nodes.
- Reference-range checks and report comparisons are **deterministic code** (lookup tables, existing parser) rather than LLM-generated medical interpretation — safer output, easier to debug.
- Loop depth is capped at ~2–3 hops for multi-part queries, to keep latency and cost predictable.

### 3. Symptom Triage & Emergency Locator (deterministic, no agent)

Same philosophy as the upload pipeline: no LLM decides urgency or medical routing. `lib/triage.ts` scores a fixed symptom checklist against a small red-flag rule set and a weighted-points system, always producing the same output for the same input.

```
Symptom intake form
   ↓
triage() — red flags checked first, then weighted score
   ↓
routine / urgent  ──────────────→  critical
   ↓                                  ↓
Doctor matching                 Emergency Locator
(specialty + region + availability)  (Overpass lookup, call, share location)
```

### Node Layer — Callable Tools (mini API reference)

| Node / Tool | Signature | Purpose |

| `retrieve_chunks` | `(query, reportId?)` | Existing pgvector semantic search over report chunks |
| `get_metric_trend` | `(metric, dateRange)` | Pulls a metric's values over time for trend answers |
| `compare_reports` | `(reportIdA, reportIdB)` | Diffs key metrics between two reports |
| `check_reference_range` | `(metric, value)` | Flags whether a value is outside the normal clinical range (deterministic, not LLM-judged) |
| `triage` | `(symptoms)` | Scores a symptom checklist into routine/urgent/critical, deterministic |
| `getRecommendedSpecialty` | `(symptoms)` | Maps a symptom snapshot to the best-fit medical specialty |
| `findNearbyPlacesWithCache` | `(lat, lng)` | Overpass lookup for nearby hospitals/pharmacies/clinics, with Supabase cache fallback |

### What Changed vs. the Original RAG Version

| Component | After |

| Upload → Summary | Structured JSON output (still a deterministic pipeline, no agent) |
| Chatbot | Agentic RAG via LangGraph (route → retrieve/compute → compose) |
| Trend/Comparison logic | Dedicated LangGraph nodes, deterministic computation underneath |
| Retrieval (pgvector, local embeddings)| reused as a tool inside LangGraph nodes |
| Symptom Triage & Emergency Locator | New deterministic feature set — urgency scoring, doctor matching, Overpass-based locator |


**CHANGES**
- migrated the chatbot from simple retrieve-then-answer RAG to an agentic system with LangGraph — the model first classifies intent, then routes to retrieval, trend analysis, comparison, or a multi-hop chain before composing the final answer.
- deliberately kept the upload/summary pipeline deterministic and separate from the agentic layer — no need for an LLM to make routing decisions on a single-document, single-output task
- reference-range checks and report comparisons are computed in code, not inferred by the LLM, which keeps medical output safer and easier to debug.
- added a symptom triage and emergency locator flow, also deterministic on purpose, with the same reasoning as the upload pipeline: urgency scoring and medical routing shouldn't depend on an LLM's judgment call.
- TypeScript end-to-end, with Jest tests running automatically on every push via GitHub Actions.


## Key Technologies, Briefly

- **LangGraph** — a library for building the "brain" of an agent as a graph: each node is a step (classify, retrieve, compute), and edges decide what happens next based on the LLM's decision. Think of it as a flowchart the AI can dynamically walk through, instead of one straight-line prompt.
- **LangChain** — a toolkit for the plumbing around LLM calls (prompt templates, output parsers). Used inside individual LangGraph nodes, not for orchestration itself.
- **pgvector** — PostgreSQL extension for storing and searching vector embeddings using cosine distance
- **`@xenova/transformers`** — runs a sentence-embedding model locally in JS, no server round-trip
- **Streaming** — the server sends the response in pieces as they're generated, instead of making the user wait for the whole thing
- **Citations** — every answer is traceable to a specific chunk + page, for verifiability
- **Overpass API** — OpenStreetMap's public query endpoint for geodata (hospitals, pharmacies, clinics), used for the Emergency Locator with no API key or billing required


## Security

- Row-Level Security (RLS) — users can only ever see their own data
- Supabase Auth (email/password)
- No secrets committed to code — all via environment variables
- Service Role Key is backend-only
- PDF-only uploads, with size limits

## Future Scope

- **Telehealth Video Consults** — the current consultation flow matches patients to doctors by specialty, region, and availability; live video calling would need telehealth licensing compliance research before going past prototype.
- **Full Ambulance Dispatch** — the Emergency Locator surfaces nearby help with one-tap calling and location sharing today; automated dispatch would depend on provider-specific APIs not yet integrated.


**Author:** Sneha Sharma
CS Student · AI & Full-Stack Web Engineering 

⭐ © 2026 Pulse AI. All rights reserved.