"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Instrument_Serif } from "next/font/google";
import { getConsultation, type Consultation } from "@/lib/consultations";
import { getDoctors, matchDoctorToConsultation, type Doctor } from "@/lib/doctors";
import { getRecommendedSpecialty } from "@/lib/specialtyMatch";
import UrgencyBadge from "@/components/UrgencyBadge";
import DoctorCard from "@/components/DoctorCard";

const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: ["400"], style: ["italic"] });

const SPECIALTIES = ["General Physician", "Cardiology", "Pulmonology", "Neurology", "Emergency Medicine"];
const REGIONS = ["Delhi NCR", "Noida", "Ghaziabad"];

const selectStyle: CSSProperties = {
  fontSize: "0.8rem",
  padding: "0.5rem 0.7rem",
  borderRadius: "8px",
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--foreground)",
};

function MatchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consultationId = searchParams.get("id");

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loadingConsultation, setLoadingConsultation] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [specialty, setSpecialty] = useState("");
  const [region, setRegion] = useState("");
  const [availableTodayOnly, setAvailableTodayOnly] = useState(false);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Step 1: load the consultation this match is for.
  useEffect(() => {
    if (!consultationId) {
      setNotFound(true);
      setLoadingConsultation(false);
      return;
    }
    getConsultation(consultationId).then((result) => {
      if (!result) {
        setNotFound(true);
        setLoadingConsultation(false);
        return;
      }
      if (result.urgencyLevel === "critical") {
        // Safety net: critical cases always go to Emergency Help, even if
        // someone lands on this URL directly (bookmark, back button, etc).
        router.replace("/emergency");
        return;
      }
      setConsultation(result);
      setSpecialty(getRecommendedSpecialty(result.symptoms).specialty);
      setLoadingConsultation(false);
    });
  }, [consultationId, router]);

  // Step 2: whenever a filter changes, re-fetch matching doctors.
  useEffect(() => {
    if (!consultation) return;
    setLoadingDoctors(true);
    setDoctorsError(null);
    getDoctors({
      specialty: specialty || undefined,
      region: region || undefined,
      availableToday: availableTodayOnly,
    })
      .then(setDoctors)
      .catch(() => setDoctorsError("Couldn't load doctors right now. Try again in a moment."))
      .finally(() => setLoadingDoctors(false));
  }, [consultation, specialty, region, availableTodayOnly]);

  const recommendation = useMemo(
    () => (consultation ? getRecommendedSpecialty(consultation.symptoms) : null),
    [consultation]
  );

  async function handleSelect(doctor: Doctor) {
    if (!consultationId) return;
    setSelectedDoctorId(doctor.id);
    try {
      await matchDoctorToConsultation(consultationId, doctor.id);
      setConfirmed(true);
    } catch {
      // Selection stays visible locally even if the save silently fails —
      // no retry UI yet, kept simple on purpose for this pass.
    }
  }

  if (loadingConsultation) return null;

  if (notFound) {
    return (
      <main style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <h1 className={instrumentSerif.className} style={{ fontSize: "1.6rem", marginBottom: "0.75rem" }}>
          No consultation found
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--foreground)", opacity: 0.7, marginBottom: "1rem" }}>
          This page needs a valid consultation to match doctors against.
        </p>
        <Link href="/consult" className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
          Start a symptom check
        </Link>
      </main>
    );
  }

  if (!consultation) return null;

  return (
    <main style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      <h1
        className={instrumentSerif.className}
        style={{ fontSize: "1.9rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.5rem" }}
      >
        Find a doctor
      </h1>

      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
        <UrgencyBadge level={consultation.urgencyLevel} />
        <span style={{ fontSize: "0.8rem", color: "var(--foreground)", opacity: 0.6 }}>
          based on your recent check
        </span>
      </div>

      {recommendation && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "0.9rem 1.1rem",
            marginBottom: "1.5rem",
            fontSize: "0.83rem",
            color: "var(--foreground)",
          }}
        >
          Based on your symptoms, we recommend <strong>{recommendation.specialty}</strong>. {recommendation.reason}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} style={selectStyle}>
          <option value="">All specialties</option>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select value={region} onChange={(e) => setRegion(e.target.value)} style={selectStyle}>
          <option value="">All regions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--foreground)" }}>
          <input
            type="checkbox"
            checked={availableTodayOnly}
            onChange={(e) => setAvailableTodayOnly(e.target.checked)}
          />
          Available today only
        </label>
      </div>

      {confirmed && (
        <div
          style={{
            border: "1px solid #2F7A4D33",
            background: "rgba(47, 122, 77, 0.1)",
            borderRadius: "12px",
            padding: "0.9rem 1.1rem",
            marginBottom: "1.25rem",
            fontSize: "0.85rem",
            color: "#2F7A4D",
          }}
        >
          Doctor selected — your consultation has been updated.
        </div>
      )}

      {loadingDoctors ? (
        <p style={{ fontSize: "0.85rem", color: "var(--foreground)", opacity: 0.6 }}>Loading doctors…</p>
      ) : doctorsError ? (
        <p style={{ fontSize: "0.85rem", color: "#B3452C" }}>{doctorsError}</p>
      ) : doctors.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--foreground)", opacity: 0.6 }}>
          No doctors match these filters. Try widening your search.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              selected={selectedDoctorId === doctor.id}
              onSelect={() => handleSelect(doctor)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={null}>
      <MatchPageContent />
    </Suspense>
  );
}