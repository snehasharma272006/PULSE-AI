"use client";

import Link from "next/link";

type HealthActionCardProps = {
  icon: string;
  title: string;
  description: string;
  href: string;
  accentColor: string; // ties into the same urgency-color language used elsewhere in the app
};

export default function HealthActionCard({ icon, title, description, href, accentColor }: HealthActionCardProps) {
  return (
    <Link
      href={href}
      className="card-hover"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        textDecoration: "none",
        background: "var(--card)",
        border: `1px solid ${accentColor}33`,
        borderRadius: "14px",
        padding: "1.5rem 1.2rem",
      }}
    >
      <div style={{ fontSize: "1.8rem", marginBottom: "0.7rem" }}>{icon}</div>
      <h3
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "1rem",
          fontWeight: 700,
          color: accentColor,
          marginBottom: "0.4rem",
        }}
      >
        {title}
      </h3>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", lineHeight: 1.5, color: "var(--foreground)", opacity: 0.65 }}>
        {description}
      </p>
    </Link>
  );
}