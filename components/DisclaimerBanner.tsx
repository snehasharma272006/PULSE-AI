"use client";

export default function DisclaimerBanner() {
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        width: "100%",
        padding: "10px 16px",
        background: "rgba(27,35,51,0.05)",
        borderTop: "1px solid rgba(27,35,51,0.08)",
        textAlign: "center",
        zIndex: 40,
      }}
    >
      <p
        style={{
          fontSize: "11.5px",
          color: "rgba(27,35,51,0.55)",
          margin: 0,
          lineHeight: 1.4,
        }}
      >
        ⚠️ Pulse AI is a prototype and not a licensed telehealth service. In a
        medical emergency, call your local emergency number directly.
      </p>
    </div>
  );
}