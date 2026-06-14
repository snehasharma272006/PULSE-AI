
# Pulse AI — Your Personal Health Intelligence Layer

An AI-powered health timeline and chat application that transforms scattered medical reports into a single, chronological, intelligent health record — built with a futuristic glassmorphism aesthetic.

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [UI / UX Highlights](#ui--ux-highlights)
- [System Architecture](#system-architecture)
- [Folder Structure](#folder-structure)
- [How It Works](#how-it-works)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)


## Project Overview

Most people have their health records scattered everywhere — PDFs in email, handwritten prescriptions, lab reports from different hospitals. Pulse AI solves this.

You upload your medical documents. Our AI reads them, extracts the key information, and builds you a clean, chronological health timeline — so you can actually understand your own health history at a glance.

**Who it's for**
- Anyone who wants to understand their own health history
- People managing chronic conditions who need to track changes over time
- Patients who switch doctors frequently and need a consolidated record

**Why it exists**
- Medical reports are written for doctors, not patients — jargon-heavy, hard to parse
- There's no single place to see your entire health journey in order
- AI can bridge that gap — reading the documents *for* you and presenting insights in plain language

**Value proposition**
- Upload any health document → AI extracts the data → your entire health history is organized, searchable, and understandable.

## Key Features

- **AI-Powered Document Parsing**
  - Upload PDFs or images of lab reports, prescriptions, diagnoses
  - OpenAI extracts structured health data automatically — no manual entry
- **Personal Health Dashboard**
  - See at a glance: Reports uploaded, Medical events, Conditions tracked, Insights generated
- **Chronological Health Timeline**
  - Every event — lab report, appointment, prescription change, diagnosis — displayed in order
  - Color-coded tags (Lab Report, Prescription, Diagnosis, Appointment) for fast scanning
- **AI Health Chat** *(coming soon)*
  - Ask questions about your own health history in plain English
  - "When did my HbA1c first go borderline high?" — and get an instant answer
- **Secure by Design**
  - Supabase handles authentication and data storage
  - Health data stays tied to the authenticated user only

---

## Tech Stack

| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| **AI / Intelligence** | OpenAI GPT-4o (document parsing & insights) |
| **Database & Auth** | Supabase (PostgreSQL + Auth) |
| **Styling** | Glassmorphism design system, custom Tailwind config |
| **Deployment** | Vercel *(coming soon)* |

## UI / UX Highlights

- **Glassmorphism Aesthetic:** 
- **Responsive Layout:** Works cleanly across screen sizes
- **Real-time Feedback:** Loading states and activity indicators throughout the dashboard

## System Architecture

  A["User uploads PDF / Image"] --> B["Next.js API Route"]
  B --> C["OpenAI GPT-4o\n(Extract health data)"]
  C --> D["Structured JSON\n(event type, date, details)"]
  D --> E[("Supabase Database")]
  E --> F["Dashboard\n(Stats + Recent Activity)"]
  E --> G["Timeline\n(Chronological events)"]
  E --> H["AI Chat\n(Coming Soon)"]

## Folder Structure
pulse-ai/
├─ app/
│  ├─ (auth)/              # Authentication routes
│  ├─ dashboard/           # Dashboard page
│  ├─ timeline/            # Health timeline page
│  ├─ upload/              # Document upload page
│  ├─ chat/                # AI Chat page (in progress)
│  └─ page.tsx             # Landing page
├─ components/
│  ├─ ui/                  # Reusable UI components
│  ├─ dashboard/           # Dashboard-specific components
│  └─ timeline/            # Timeline-specific components
├─ lib/
│  ├─ supabase/            # Supabase client & helpers
│  └─ openai/              # OpenAI integration
├─ public/                 # Static assets
└─ .env.local              # Environment variables

---

## How It Works

**Standard health apps** ask you to manually enter your data. Pulse AI does the opposite.

Upload a PDF  →  AI reads it  →  Timeline updates  →  You understand your health

**Step 1 — Upload**
The user uploads a PDF or image of any health document — lab report, prescription, hospital discharge summary, anything.

**Step 2 — AI Extraction**
The document is sent to OpenAI GPT-4o with a structured prompt. The AI identifies: event type, date, key findings, doctor/hospital name, and any critical values.

**Step 3 — Storage**
The extracted structured data is saved to Supabase, linked to the authenticated user's account.

**Step 4 — Timeline**
The health timeline automatically updates — chronologically ordered, tagged by category, human-readable.


## Environment Variables

Copy `.env.example` to `.env.local`.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

| Variable | Purpose |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key for Supabase client |
| `OPENAI_API_KEY` | OpenAI API key for document parsing |


## Roadmap
| Feature | Status |
| Landing Page | complete |
| Document Upload + AI Parsing | complete |
| Health Dashboard | complete |
| Chronological Timeline | complete |
| AI Health Chat | In Progress |
| Vercel Deployment | In Progress |
| Mobile Responsive Polish | Planned |
