"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Instrument_Serif } from "next/font/google";
import type { SymptomInput, TriageResult, UrgencyLevel } from "@/lib/triage";
import { CONSULT_HANDOFF_KEY } from "@/app/consult/page";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

type Handoff = {
  consultationId: string;
  symptoms: SymptomInput;
  result: TriageResult;
};

const LEVEL_COPY: Record<UrgencyLevel, { title: string; color: string; bg: string; message: string }> = {
  routine: {
    title: "Routine",
    color: "#2F7A4D",
    bg: "rgba(47, 122, 77, 0.1)",
    message: "Nothing here points to an emergency. It's still worth getting checked when convenient.",
  },
  urgent: {
    title: "Urgent",
    color: "#B3792C",
    bg: "rgba(179, 121, 44, 0.12)",
    message: "This shouldn't wait too long — plan to see a doctor soon, ideally today.",
  },
  critical: {
    title: "Critical",
    color: "#B3452C",
    bg: "rgba(179, 69, 44, 0.12)",
    message: "This needs immediate attention. Please seek emergency care right now.",
  },
};

export default function TriageResultPage() {
  const [data, setData] = useState<Handoff | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(CONSULT_HANDOFF_KEY);
    if (!raw) {
      setMissing(true);
      return;
    }
    try {
      setData(JSON.parse(raw) as Handoff);
    } catch {
      setMissing(true);
    }
  }, []);

  if (missing) {
    return (
      <main style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <h1 className={instrumentSerif.className} style={{ fontSize: "1.6rem", marginBottom: "0.75rem" }}>
          No recent check found
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--foreground)", opacity: 0.7, marginBottom: "1rem" }}>
          This page only shows a result right after you submit the symptom form.
        </p>
        <Link href="/consult" className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
          Start a symptom check
        </Link>
      </main>
    );
  }

  if (!data) return null; // brief instant while sessionStorage is read on mount

  const copy = LEVEL_COPY[data.result.level];

  return (
    <main style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      <h1
        className={instrumentSerif.className}
        style={{ fontSize: "1.9rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "1.25rem" }}
      >
        Your result
      </h1>

      <div
        style={{
          border: `1px solid ${copy.color}33`,
          background: copy.bg,
          borderRadius: "14px",
          padding: "1.4rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "inline-block",
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: copy.color,
            background: "#fff",
            borderRadius: "999px",
            padding: "0.25rem 0.7rem",
            marginBottom: "0.6rem",
          }}
        >
          {copy.title}
        </div>
        <p style={{ fontSize: "0.95rem", color: "var(--foreground)" }}>{copy.message}</p>
      </div>

      {data.result.level === "critical" ? (
        
          <a href="/emergency"
          className="btn-primary"
          style={{ display: "block", textAlign: "center", textDecoration: "none", marginBottom: "1.5rem" }}
        >
          Go to Emergency Help now
        </a>
      ) : (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1rem 1.2rem",
            marginBottom: "1.5rem",
            fontSize: "0.85rem",
            color: "var(--foreground)",
            opacity: 0.75,
          }}
        >
          Doctor matching for {copy.title.toLowerCase()} cases is coming in the next step of this build.
        </div>
      )}

      <h2 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.6rem" }}>Why this result</h2>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {data.result.reasons.map((reason, i) => (
          <li
            key={i}
            style={{
              fontSize: "0.82rem",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.6rem 0.8rem",
            }}
          >
            {reason}
          </li>
        ))}
      </ul>

      <p style={{ fontSize: "0.7rem", color: "var(--foreground)", opacity: 0.5, marginTop: "2rem" }}>
        Pulse AI is a prototype and not a substitute for professional medical advice.
      </p>
    </main>
  );
}