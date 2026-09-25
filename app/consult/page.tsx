"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Instrument_Serif } from "next/font/google";
import {
  triage,
  emptySymptomInput,
  type SymptomInput,
  type FeverLevel,
  type PainLevel,
  type ChestPainLevel,
  type ConsciousnessLevel,
  type BleedingLevel,
  type OnsetSpeed,
} from "@/lib/triage";
import { saveConsultation } from "@/lib/consultations";

// Same heading treatment as app/emergency/page.tsx and app/chat/page.tsx,
// for a consistent look across the health-feature pages.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

// sessionStorage key the result screen (app/consult/triage/page.tsx) reads
// from. Session-scoped on purpose: this is a one-time handoff between two
// pages in the same visit, not data that should outlive the tab.
export const CONSULT_HANDOFF_KEY = "pulse:lastConsultation";

const sectionStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--card)",
  borderRadius: "12px",
  padding: "1.1rem 1.2rem",
  marginBottom: "1rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "var(--foreground)",
  marginBottom: "0.4rem",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  fontSize: "0.85rem",
  padding: "0.55rem 0.7rem",
  borderRadius: "8px",
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--foreground)",
  marginBottom: "0.8rem",
};

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  fontSize: "0.85rem",
  color: "var(--foreground)",
  marginBottom: "0.6rem",
};

export default function ConsultPage() {
  const router = useRouter();
  const [form, setForm] = useState<SymptomInput>(emptySymptomInput());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof SymptomInput>(key: K, value: SymptomInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = triage(form);
      const consultation = await saveConsultation(form, result);

      // Handoff to the result page — see CONSULT_HANDOFF_KEY note above.
      sessionStorage.setItem(
        CONSULT_HANDOFF_KEY,
        JSON.stringify({ consultationId: consultation.id, symptoms: form, result })
      );

      router.push("/consult/triage");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your consultation. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: "620px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      <h1
        className={instrumentSerif.className}
        style={{ fontSize: "1.9rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.25rem" }}
      >
        Tell us what's going on
      </h1>
      <p style={{ fontSize: "0.85rem", color: "var(--foreground)", opacity: 0.65, marginBottom: "1.5rem" }}>
        Answer as accurately as you can — this determines how urgently you're routed.
        If this is a life-threatening emergency right now, don't fill this out —{" "}
        <a href="/emergency" style={{ color: "var(--primary)", fontWeight: 600 }}>
          go to Emergency Help
        </a>{" "}
        instead.
      </p>

      <form onSubmit={handleSubmit}>
        {/* --- Vitals --- */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.8rem" }}>Vitals</h2>

          <label style={labelStyle}>Fever</label>
          <select
            style={selectStyle}
            value={form.fever}
            onChange={(e) => update("fever", e.target.value as FeverLevel)}
          >
            <option value="none">No fever</option>
            <option value="mild">Mild (up to ~100.4°F / 38°C)</option>
            <option value="high">High (~100.5–103°F / 38–39.4°C)</option>
            <option value="very_high">Very high (over 103°F / 39.4°C)</option>
          </select>

          <div style={checkboxRowStyle}>
            <input
              type="checkbox"
              id="pulseIrregular"
              checked={form.pulseIrregular}
              onChange={(e) => update("pulseIrregular", e.target.checked)}
            />
            <label htmlFor="pulseIrregular">My pulse feels noticeably irregular or racing</label>
          </div>

          <div style={{ ...checkboxRowStyle, marginBottom: 0 }}>
            <input
              type="checkbox"
              id="bpCrisis"
              checked={form.bloodPressureCrisis}
              onChange={(e) => update("bloodPressureCrisis", e.target.checked)}
            />
            <label htmlFor="bpCrisis">
              I've measured (or been told I have) dangerously high blood pressure (≈180/120 or higher)
            </label>
          </div>
        </div>

        {/* --- Pain & breathing --- */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.8rem" }}>Pain & breathing</h2>

          <label style={labelStyle}>Chest pain</label>
          <select
            style={selectStyle}
            value={form.chestPain}
            onChange={(e) => update("chestPain", e.target.value as ChestPainLevel)}
          >
            <option value="none">None</option>
            <option value="mild">Mild discomfort</option>
            <option value="severe">Severe pain</option>
            <option value="crushing_radiating">
              Severe crushing pain, spreading to arm/jaw/back
            </option>
          </select>

          <label style={labelStyle}>Abdominal pain</label>
          <select
            style={selectStyle}
            value={form.abdominalPain}
            onChange={(e) => update("abdominalPain", e.target.value as PainLevel)}
          >
            <option value="none">None</option>
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe / rigid</option>
          </select>

          <label style={labelStyle}>Difficulty breathing</label>
          <select
            style={{ ...selectStyle, marginBottom: 0 }}
            value={form.breathingDifficulty}
            onChange={(e) => update("breathingDifficulty", e.target.value as PainLevel)}
          >
            <option value="none">None</option>
            <option value="mild">Mild shortness of breath</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe / gasping for air</option>
          </select>
        </div>

        {/* --- Neuro / consciousness --- */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.8rem" }}>
            Neurological / consciousness
          </h2>

          <label style={labelStyle}>Consciousness / dizziness</label>
          <select
            style={selectStyle}
            value={form.consciousness}
            onChange={(e) => update("consciousness", e.target.value as ConsciousnessLevel)}
          >
            <option value="alert">Fully alert</option>
            <option value="dizzy">Dizzy / lightheaded</option>
            <option value="fainted_briefly">Fainted briefly, now conscious</option>
            <option value="unconscious">Unconscious / not responding</option>
          </select>

          <div style={checkboxRowStyle}>
            <input
              type="checkbox"
              id="confusion"
              checked={form.confusion}
              onChange={(e) => update("confusion", e.target.checked)}
            />
            <label htmlFor="confusion">Confusion or disorientation</label>
          </div>

          <div style={{ ...checkboxRowStyle, marginBottom: 0 }}>
            <input
              type="checkbox"
              id="seizure"
              checked={form.seizure}
              onChange={(e) => update("seizure", e.target.checked)}
            />
            <label htmlFor="seizure">Active or recent seizure</label>
          </div>
        </div>

        {/* --- Bleeding / injury --- */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.8rem" }}>Bleeding / injury</h2>

          <label style={labelStyle}>Bleeding</label>
          <select
            style={selectStyle}
            value={form.bleeding}
            onChange={(e) => update("bleeding", e.target.value as BleedingLevel)}
          >
            <option value="none">None</option>
            <option value="minor_controlled">Minor, controlled</option>
            <option value="moderate">Moderate</option>
            <option value="severe_uncontrolled">Severe, won't stop</option>
          </select>

          <div style={{ ...checkboxRowStyle, marginBottom: 0 }}>
            <input
              type="checkbox"
              id="majorTrauma"
              checked={form.majorTrauma}
              onChange={(e) => update("majorTrauma", e.target.checked)}
            />
            <label htmlFor="majorTrauma">Major injury (fall from height, deep wound, suspected fracture)</label>
          </div>
        </div>

        {/* --- Context --- */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.8rem" }}>Context</h2>

          <label style={labelStyle}>How did this come on?</label>
          <select
            style={selectStyle}
            value={form.onset}
            onChange={(e) => update("onset", e.target.value as OnsetSpeed)}
          >
            <option value="gradual">Gradually, over time</option>
            <option value="sudden">Suddenly, within minutes</option>
          </select>

          <label style={labelStyle}>How many hours ago did it start?</label>
          <input
            type="number"
            min={0}
            style={{ ...selectStyle, marginBottom: 0 }}
            value={form.durationHours}
            onChange={(e) => update("durationHours", Number(e.target.value))}
          />
        </div>

        {error && (
          <p style={{ fontSize: "0.85rem", color: "#B3452C", marginBottom: "1rem" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
          style={{ width: "100%", opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? "Checking..." : "Check my symptoms"}
        </button>
      </form>
    </main>
  );
}