"use client";

import Link from "next/link";

const stats = [
  { num: "98%", label: "ACCURACY RATE" },
  { num: "3s",  label: "AVG ANALYSIS TIME" },
];

export default function Hero() {
  return (
    <section
  className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
  style={{ paddingTop: "4.5rem", paddingBottom: "2.5rem" }}
>

      <div className="hero-badge fade-up">
        <span className="badge-dot" />
        AI-POWERED HEALTH INTELLIGENCE
      </div>

      <h1
        className="leading-tight fade-up-1 mt-6"
        style={{
          fontFamily: "'Instrument Serif', serif",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: "clamp(2.2rem, 5.5vw, 3.4rem)",
          color: "var(--foreground)",
          maxWidth: "780px",
        }}
      >
        Transforming medical records into{" "}
        <span style={{ color: "var(--primary)" }}>
          living health timelines
        </span>
      </h1>

      <p
        className="mt-5 leading-relaxed fade-up-2"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "1.05rem",
          color: "rgba(27,35,51,0.55)",
          maxWidth: "600px",
        }}
      >
        Powered by artificial intelligence, built to understand your health.
      </p>

      <div className="fade-up-3" style={{ marginTop: "2.25rem" }}>
        <Link href="/upload" className="btn-primary cursor-pointer">
          ↑ Upload Report
        </Link>
      </div>

      <div className="hero-stats fade-up-4" style={{ borderTop: "none", marginTop: "3.5rem" }}></div>

      <div className="hero-stats fade-up-4" style={{ borderTop: "none", marginTop: "3rem" }}>
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

    </section>
  );
}