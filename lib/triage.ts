/**
 * Deterministic symptom triage engine.
 *
 * Design: NO LLM, NO randomness. Same input always produces the same
 * output, and every verdict comes back with a `reasons` list so the result
 * is auditable — you (or a reviewing clinician) can always see *why* a
 * given urgency level was assigned, not just trust a black box.
 *
 * Two-layer decision model, loosely mirroring how real-world ER triage
 * scales (e.g. the Emergency Severity Index) work:
 *
 *   1. RED FLAGS — a small set of symptoms that are dangerous on their own,
 *      regardless of anything else reported. If any red flag is present,
 *      the verdict is immediately "critical". No averaging, no discount.
 *
 *   2. WEIGHTED SCORE — everything else is scored on a points system and
 *      compared against thresholds to land on routine / urgent / critical.
 *
 * IMPORTANT: This is a prototype decision-support tool, not a licensed
 * medical device. The weights and thresholds below are reasonable defaults
 * for demo purposes, not clinically validated values — see Day 7's
 * disclaimer requirement.
 */

export type UrgencyLevel = "routine" | "urgent" | "critical";

export type FeverLevel = "none" | "mild" | "high" | "very_high";
export type PainLevel = "none" | "mild" | "moderate" | "severe";
export type ChestPainLevel = "none" | "mild" | "severe" | "crushing_radiating";
export type ConsciousnessLevel = "alert" | "dizzy" | "fainted_briefly" | "unconscious";
export type BleedingLevel = "none" | "minor_controlled" | "moderate" | "severe_uncontrolled";
export type OnsetSpeed = "gradual" | "sudden";

/**
 * Full symptom checklist for the Day 4 intake form. Every field is
 * required — `emptySymptomInput()` below gives you a safe all-clear
 * default to pre-fill the form with, so nothing is ever `undefined`.
 */
export type SymptomInput = {
  // --- Vitals ---
  fever: FeverLevel;
  pulseIrregular: boolean;
  bloodPressureCrisis: boolean; // reading/feeling consistent with >180/120

  // --- Pain & breathing ---
  chestPain: ChestPainLevel;
  abdominalPain: PainLevel;
  breathingDifficulty: PainLevel;

  // --- Neuro / consciousness ---
  consciousness: ConsciousnessLevel;
  confusion: boolean;
  seizure: boolean;

  // --- Bleeding / injury ---
  bleeding: BleedingLevel;
  majorTrauma: boolean;

  // --- Context ---
  onset: OnsetSpeed;
  durationHours: number;
};

export type TriageResult = {
  level: UrgencyLevel;
  /** Raw weighted score. Still computed even when a red flag fires, for display/debugging. */
  score: number;
  /** Human-readable reasons behind the verdict — surface these on the Day 4 result screen. */
  reasons: string[];
  /** True if a red-flag rule fired (level was set directly, bypassing score thresholds). */
  redFlagTriggered: boolean;
};

// ---------------------------------------------------------------------------
// 1. RED FLAGS — presence alone forces "critical", independent of score.
// Keep this list short and genuinely dangerous-on-their-own symptoms only;
// it loses its power as a safety net if it gets diluted with borderline cases.
// ---------------------------------------------------------------------------

type RedFlagRule = {
  test: (s: SymptomInput) => boolean;
  reason: string;
};

const RED_FLAGS: RedFlagRule[] = [
  {
    test: (s) => s.chestPain === "crushing_radiating",
    reason: "Crushing chest pain radiating to arm/jaw/back — possible cardiac event",
  },
  {
    test: (s) => s.consciousness === "unconscious",
    reason: "Loss of consciousness",
  },
  {
    test: (s) => s.seizure,
    reason: "Active or recent seizure",
  },
  {
    test: (s) => s.bleeding === "severe_uncontrolled",
    reason: "Severe, uncontrolled bleeding",
  },
  {
    test: (s) => s.breathingDifficulty === "severe",
    reason: "Severe difficulty breathing",
  },
  {
    test: (s) => s.bloodPressureCrisis,
    reason: "Blood pressure in hypertensive-crisis range",
  },
  {
    test: (s) => s.majorTrauma,
    reason: "Major trauma / suspected serious injury",
  },
];

// ---------------------------------------------------------------------------
// 2. WEIGHTED SCORE — used to set the level whenever no red flag fires.
// All tunable numbers live in this one block on purpose (separation of
// config from logic) — adjust freely without touching scoreSymptoms() below.
// ---------------------------------------------------------------------------

const FEVER_POINTS: Record<FeverLevel, number> = {
  none: 0,
  mild: 1,
  high: 3,
  very_high: 5,
};

const PAIN_POINTS: Record<PainLevel, number> = {
  none: 0,
  mild: 1,
  moderate: 3,
  severe: 6,
};

const CHEST_PAIN_POINTS: Record<ChestPainLevel, number> = {
  none: 0,
  mild: 2,
  severe: 6,
  crushing_radiating: 10, // also a red flag; kept here so `score` stays meaningful
};

const CONSCIOUSNESS_POINTS: Record<ConsciousnessLevel, number> = {
  alert: 0,
  dizzy: 2,
  fainted_briefly: 5,
  unconscious: 10, // also a red flag
};

const BLEEDING_POINTS: Record<BleedingLevel, number> = {
  none: 0,
  minor_controlled: 1,
  moderate: 4,
  severe_uncontrolled: 10, // also a red flag
};

const IRREGULAR_PULSE_POINTS = 3;
const CONFUSION_POINTS = 4;
const SUDDEN_ONSET_POINTS = 2;

/** score >= urgent && < critical => "urgent"; score >= critical => "critical". */
const SCORE_THRESHOLDS = {
  urgent: 6,
  critical: 12,
};

function scoreSymptoms(s: SymptomInput): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const add = (points: number, label: string) => {
    if (points > 0) {
      score += points;
      reasons.push(`${label} (+${points})`);
    }
  };

  add(FEVER_POINTS[s.fever], `Fever: ${s.fever}`);
  add(s.pulseIrregular ? IRREGULAR_PULSE_POINTS : 0, "Irregular pulse");
  add(CHEST_PAIN_POINTS[s.chestPain], `Chest pain: ${s.chestPain}`);
  add(PAIN_POINTS[s.abdominalPain], `Abdominal pain: ${s.abdominalPain}`);
  add(PAIN_POINTS[s.breathingDifficulty], `Breathing difficulty: ${s.breathingDifficulty}`);
  add(CONSCIOUSNESS_POINTS[s.consciousness], `Consciousness: ${s.consciousness}`);
  add(s.confusion ? CONFUSION_POINTS : 0, "Confusion / disorientation");
  add(BLEEDING_POINTS[s.bleeding], `Bleeding: ${s.bleeding}`);

  // Sudden onset nudges urgency up — a slow week-long ache reads differently
  // from the same symptom appearing over minutes. Only counts if something
  // was actually reported (no point flagging "sudden onset of nothing").
  if (s.onset === "sudden" && score > 0) {
    add(SUDDEN_ONSET_POINTS, "Sudden onset");
  }

  return { score, reasons };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function triage(input: SymptomInput): TriageResult {
  const { score, reasons: scoreReasons } = scoreSymptoms(input);
  const firedFlag = RED_FLAGS.find((flag) => flag.test(input));

  if (firedFlag) {
    return {
      level: "critical",
      score,
      reasons: [firedFlag.reason, ...scoreReasons],
      redFlagTriggered: true,
    };
  }

  let level: UrgencyLevel = "routine";
  if (score >= SCORE_THRESHOLDS.critical) level = "critical";
  else if (score >= SCORE_THRESHOLDS.urgent) level = "urgent";

  return {
    level,
    score,
    reasons: scoreReasons.length ? scoreReasons : ["No significant symptoms reported"],
    redFlagTriggered: false,
  };
}

/**
 * Safe "nothing reported" baseline — use this to pre-fill the Day 4 intake
 * form so every field has a valid default, and as a starting point in tests.
 */
export function emptySymptomInput(): SymptomInput {
  return {
    fever: "none",
    pulseIrregular: false,
    bloodPressureCrisis: false,
    chestPain: "none",
    abdominalPain: "none",
    breathingDifficulty: "none",
    consciousness: "alert",
    confusion: false,
    seizure: false,
    bleeding: "none",
    majorTrauma: false,
    onset: "gradual",
    durationHours: 0,
  };
}