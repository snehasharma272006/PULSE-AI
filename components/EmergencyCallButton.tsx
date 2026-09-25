"use client";

type EmergencyCallButtonProps = {
  /** Phone number for this specific place, if OSM has one. */
  phone: string | null;
  /** Generic number to fall back to (e.g. a national emergency line) — omit to hide the button instead when there's no number. */
  fallbackNumber?: string;
  label?: string;
};

export default function EmergencyCallButton({ phone, fallbackNumber, label }: EmergencyCallButtonProps) {
  const number = phone ?? fallbackNumber ?? null;

  if (!number) {
    return (
      <span style={{ fontSize: "0.75rem", color: "var(--foreground)", opacity: 0.45 }}>
        No number listed
      </span>
    );
  }

  return (
    <a
      href={`tel:${number}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        fontFamily: "'Inter', sans-serif",
        fontSize: "0.78rem",
        fontWeight: 600,
        color: "#1B2333",
        background: "var(--accent)",
        borderRadius: "999px",
        padding: "0.4rem 0.8rem",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      📞 {label ?? `Call ${number}`}
    </a>
  );
}