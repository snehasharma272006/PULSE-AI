"use client";

import type { UrgencyLevel } from "@/lib/triage";

const LEVEL_STYLES: Record<UrgencyLevel, { label: string; color: string }> = {
  routine: { label: "Routine", color: "#2F7A4D" },
  urgent: { label: "Urgent", color: "#B3792C" },
  critical: { label: "Critical", color: "#B3452C" },
};

export default function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  const s = LEVEL_STYLES[level];
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: s.color,
        background: "#fff",
        border: `1px solid ${s.color}33`,
        borderRadius: "999px",
        padding: "0.25rem 0.7rem",
      }}
    >
      {s.label}
    </span>
  );
}