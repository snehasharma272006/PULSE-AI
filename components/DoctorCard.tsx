"use client";

import { isAvailableToday, type Doctor } from "@/lib/doctors";
import EmergencyCallButton from "@/components/EmergencyCallButton";

type DoctorCardProps = {
  doctor: Doctor;
  onSelect: () => void;
  selected?: boolean;
};

export default function DoctorCard({ doctor, onSelect, selected }: DoctorCardProps) {
  const availableToday = isAvailableToday(doctor);

  return (
    <div
      style={{
        border: `1px solid ${selected ? "#2F7A4D" : "var(--border)"}`,
        borderRadius: "14px",
        padding: "1.1rem 1.2rem",
        background: "var(--card)",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--foreground)" }}>
            {doctor.name} {doctor.verified ? "✅" : ""}
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--foreground)", opacity: 0.7 }}>
            {doctor.specialty} · {doctor.region}
          </p>
        </div>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)" }}>
          ⭐ {doctor.rating.toFixed(1)}
        </span>
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--foreground)", opacity: 0.6 }}>
        {doctor.yearsExperience} yrs experience · {availableToday ? "Available today" : "Not available today"}
      </p>

      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginTop: "0.4rem" }}>
        <EmergencyCallButton phone={doctor.phone} label="Call" />
        <button onClick={onSelect} className="btn-primary" style={{ fontSize: "0.78rem", padding: "0.45rem 0.9rem" }}>
          {selected ? "Selected ✓" : "Choose this doctor"}
        </button>
      </div>
    </div>
  );
}