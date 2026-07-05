"use client";

const events = [
  {
    year: 2025,
    items: [
      {
        date: "May 12, 2025",
        title: "HbA1c Test",
        subtitle: "Result: 6.8% — borderline high",
        tag: "Lab Report",
        tagColor: "rgba(56,189,248,0.12)",
        tagText: "#7dd3fc",
        icon: "🧪",
      },
      {
        date: "Mar 4, 2025",
        title: "Follow-Up Visit",
        subtitle: "Dr. Sharma — routine diabetes review",
        tag: "Appointment",
        tagColor: "rgba(167,139,250,0.12)",
        tagText: "#c4b5fd",
        icon: "🏥",
      },
      {
        date: "Jan 20, 2025",
        title: "Medication Changed",
        subtitle: "Metformin increased to 1000 mg/day",
        tag: "Prescription",
        tagColor: "rgba(52,211,153,0.12)",
        tagText: "#6ee7b7",
        icon: "💊",
      },
    ],
  },
  {
    year: 2024,
    items: [
      {
        date: "Aug 15, 2024",
        title: "Started Metformin",
        subtitle: "Initial dose: 500 mg/day",
        tag: "Prescription",
        tagColor: "rgba(52,211,153,0.12)",
        tagText: "#6ee7b7",
        icon: "💊",
      },
      {
        date: "Aug 1, 2024",
        title: "Diabetes Diagnosis",
        subtitle: "Type 2 — fasting glucose 132 mg/dL",
        tag: "Diagnosis",
        tagColor: "rgba(251,113,133,0.12)",
        tagText: "#fda4af",
        icon: "📋",
      },
      {
        date: "Jul 22, 2024",
        title: "Annual Blood Panel",
        subtitle: "Comprehensive metabolic workup",
        tag: "Lab Report",
        tagColor: "rgba(56,189,248,0.12)",
        tagText: "#7dd3fc",
        icon: "🧪",
      },
    ],
  },
];

export default function TimelinePage() {
  return (
    <main
      className="min-h-screen bg-black text-white px-6 py-12 max-w-2xl mx-auto"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="mb-12">
        <p
          className="text-sky-400 text-xs font-medium tracking-widest uppercase mb-2"
          style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.1em" }}
        >
          Health History
        </p>
        <h1
          className="text-3xl font-bold text-white"
          style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}
        >
          Your Timeline
        </h1>
        <p
          className="text-slate-400 mt-1 text-sm font-light"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Every event, visit, and result — in order.
        </p>
      </div>

      <div className="relative">
        <div
          className="absolute left-[11px] top-0 bottom-0"
          style={{ width: "2px", background: "rgba(56,189,248,0.4)" }}
        />

        {events.map((group) => (
          <div key={group.year} className="mb-10">
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center z-10 flex-shrink-0"
                style={{
                  background: "rgba(56,189,248,0.2)",
                  border: "2px solid #38bdf8",
                  boxShadow: "0 0 12px rgba(56,189,248,0.5)",
                }}
              />
              <span
                className="text-sky-400 font-bold text-base"
                style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.01em" }}
              >
                {group.year}
              </span>
            </div>

            <div className="flex flex-col gap-4 ml-12">
              {group.items.map((event, i) => (
                <div key={i} className="relative group cursor-pointer transition-all duration-300">
                  <div
                    className="absolute -left-[41px] top-5 w-4 h-4 rounded-full z-10 flex-shrink-0 transition-all duration-300 group-hover:scale-125"
                    style={{
                      background: "#000",
                      border: "2px solid #38bdf8",
                      boxShadow: "0 0 8px rgba(56,189,248,0.6)",
                    }}
                  />

                  <div
                    className="rounded-2xl px-5 py-4 transition-all duration-300"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      backdropFilter: "blur(12px)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(56,189,248,0.3)";
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(56,189,248,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">{event.icon}</span>
                        <div>
                          <p
                            className="text-white font-semibold text-sm leading-tight"
                            style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.01em" }}
                          >
                            {event.title}
                          </p>
                          <p
                            className="text-slate-400 text-xs mt-1 font-light"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                          >
                            {event.subtitle}
                          </p>
                        </div>
                      </div>

                      <span
                        className="text-xs px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 mt-0.5"
                        style={{
                          background: event.tagColor,
                          color: event.tagText,
                          border: `1px solid ${event.tagText}33`,
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        {event.tag}
                      </span>
                    </div>

                    <p
                      className="text-slate-600 text-xs mt-3 pl-9 font-light"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {event.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div
          className="absolute left-0 bottom-0 w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "2px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="w-2 h-2 rounded-full bg-slate-600" />
        </div>
      </div>
    </main>
  );
}