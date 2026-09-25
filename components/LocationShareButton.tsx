"use client";

import { useState } from "react";

type LocationShareButtonProps = {
  lat: number;
  lng: number;
  label?: string;
};

export default function LocationShareButton({ lat, lng, label }: LocationShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  const handleShare = async () => {
    const shareText = `My location: ${mapsUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "My location", text: shareText, url: mapsUrl });
        return;
      } catch {
        // User backed out of the native share sheet, or it's unsupported here
        // — fall through to clipboard so the button still does *something*.
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        fontFamily: "'Inter', sans-serif",
        fontSize: "0.78rem",
        fontWeight: 600,
        color: "var(--foreground)",
        background: "var(--primary-dim)",
        border: "1px solid var(--border)",
        borderRadius: "999px",
        padding: "0.4rem 0.8rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      📍 {status === "copied" ? "Link copied!" : status === "error" ? "Couldn't copy" : label ?? "Share location"}
    </button>
  );
}