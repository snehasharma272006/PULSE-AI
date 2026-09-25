/**
 * Supabase wrapper for the `consultations` table. Kept separate from the UI
 * for the same reason lib/places.ts is separate from app/emergency/page.tsx:
 * app/consult/page.tsx shouldn't need to know column names or query syntax,
 * it should just call a function with a clear name.
 */

import { supabase } from "@/lib/supabase";
import type { SymptomInput, TriageResult } from "@/lib/triage";

export type ConsultationStatus = "pending" | "matched" | "resolved";

export type Consultation = {
  id: string;
  userId: string | null;
  symptoms: SymptomInput;
  urgencyLevel: TriageResult["level"];
  score: number;
  reasons: string[];
  redFlagTriggered: boolean;
  matchedDoctorId: string | null;
  status: ConsultationStatus;
  createdAt: string;
};

// Shape of a row exactly as Postgres/Supabase returns it (snake_case).
type ConsultationRow = {
  id: string;
  user_id: string | null;
  symptoms: SymptomInput;
  urgency_level: TriageResult["level"];
  score: number;
  reasons: string[];
  red_flag_triggered: boolean;
  matched_doctor_id: string | null;
  status: ConsultationStatus;
  created_at: string;
};

function fromRow(row: ConsultationRow): Consultation {
  return {
    id: row.id,
    userId: row.user_id,
    symptoms: row.symptoms,
    urgencyLevel: row.urgency_level,
    score: row.score,
    reasons: row.reasons,
    redFlagTriggered: row.red_flag_triggered,
    matchedDoctorId: row.matched_doctor_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

/**
 * Persists a completed triage result as a permanent record. Called right
 * after `triage()` runs on the intake form. This DB row is the source of
 * truth — sessionStorage (see app/consult/page.tsx) is only a short-lived
 * handoff so the very next page render can show the result instantly
 * without waiting on a round trip back to the database.
 */
export async function saveConsultation(
  symptoms: SymptomInput,
  result: TriageResult
): Promise<Consultation> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      user_id: session?.user?.id ?? null,
      symptoms,
      urgency_level: result.level,
      score: result.score,
      reasons: result.reasons,
      red_flag_triggered: result.redFlagTriggered,
      status: "pending",
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save consultation");
  }

  return fromRow(data as ConsultationRow);
}

/** Fetches one consultation by id — e.g. for Day 5's matching page. */
export async function getConsultation(id: string): Promise<Consultation | null> {
  const { data, error } = await supabase
    .from("consultations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return fromRow(data as ConsultationRow);
}