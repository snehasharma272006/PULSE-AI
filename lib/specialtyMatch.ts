/**
 * Maps a symptom snapshot to the medical specialty best suited to look at
 * it. Kept separate from lib/triage.ts on purpose: triage.ts answers
 * "how urgent is this?", this file answers "who should see it?" — two
 * different questions that shouldn't live in one function.
 *
 * Checked in rough order of "how dangerous/specific this usually is" —
 * same spirit as the RED_FLAGS list in triage.ts, just aimed at routing
 * instead of urgency.
 *
 * KNOWN LIMITATION (documented on purpose, not hidden): this only looks at
 * symptom TYPE, not urgency LEVEL. So a routine case with minor bleeding
 * still gets routed to "Emergency Medicine". Fine for a demo; a real
 * version would probably weight this against the triage score too.
 */

import type { SymptomInput } from "@/lib/triage";

export type SpecialtyRecommendation = {
  specialty: string;
  reason: string;
};

export function getRecommendedSpecialty(s: SymptomInput): SpecialtyRecommendation {
  if (s.chestPain !== "none") {
    return {
      specialty: "Cardiology",
      reason: `Chest pain (${s.chestPain}) can point to a heart issue — a cardiologist is best placed to check.`,
    };
  }

  if (s.bleeding !== "none" || s.majorTrauma) {
    return {
      specialty: "Emergency Medicine",
      reason: "Bleeding or physical trauma needs a doctor equipped for immediate injury care.",
    };
  }

  if (s.consciousness !== "alert" || s.confusion || s.seizure) {
    return {
      specialty: "Neurology",
      reason: "Symptoms affecting alertness or consciousness point to the nervous system.",
    };
  }

  if (s.breathingDifficulty !== "none") {
    return {
      specialty: "Pulmonology",
      reason: `Breathing difficulty (${s.breathingDifficulty}) is a lung/airway concern.`,
    };
  }

  // Default: nothing points to one organ system specifically.
  return {
    specialty: "General Physician",
    reason: "Nothing here points to a specific specialist yet — a general physician is the right first stop.",
  };
}