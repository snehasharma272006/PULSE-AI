"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Report = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  summary: string | null;
};

type TimelineEvent = {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  tagText: string;
  icon: string;
  summary: string | null;
};

type YearGroup = {
  year: number;
  items: TimelineEvent[];
};

export default function TimelinePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setReports(data);
      setLoading(false);
    };

    fetchReports();
  }, []);

  const toTimelineEvent = (report: Report): TimelineEvent => {
    const isImage = /\.(png|jpe?g|gif|webp)$/i.test(report.file_name);

    return {
      id: report.id,
      date: new Date(report.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      title: "Report Uploaded",
      subtitle: report.file_name,
      tag: isImage ? "Image" : "PDF",
      tagColor: isImage ? "rgba(167,139,250,0.12)" : "rgba(56,189,248,0.12)",
      tagText: isImage ? "#c4b5fd" : "#7dd3fc",
      icon: isImage ? "🖼️" : "📄",
      summary: report.summary,
    };
  };

  const groupedByYear: YearGroup[] = (() => {
    const map = new Map<number, TimelineEvent[]>();

    reports.forEach((report) => {
      const year = new Date(report.created_at).getFullYear();
      const event = toTimelineEvent(report);
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(event);
    });

    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, items]) => ({ year, items }));
  })();

  return (
    <main
      className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 sm:py-12 max-w-2xl mx-auto"
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

      <div style={{ height: "32px" }} />

      {loading ? (
        <p className="text-slate-600 text-sm">Loading...</p>
      ) : groupedByYear.length === 0 ? (
        <p className="text-slate-600 text-sm">No records yet. Upload a report to get started.</p>
      ) : (
        <div className="relative">
          <div
            className="absolute left-[11px] top-0 bottom-0"
            style={{ width: "2px", background: "rgba(56,189,248,0.4)" }}
          />

          {groupedByYear.map((group) => (
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
                {group.items.map((event) => (
                  <div key={event.id} className="relative group cursor-pointer transition-all duration-300">
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

                      {event.summary && (
                        <div className="pl-9 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(expandedId === event.id ? null : event.id);
                            }}
                            className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                          >
                            {expandedId === event.id ? "Hide AI Summary" : "View AI Summary"}
                          </button>

                          {expandedId === event.id && (
                            <p className="text-slate-400 text-xs mt-2 leading-relaxed whitespace-pre-line">
                              {event.summary}
                            </p>
                          )}
                        </div>
                      )}
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
      )}
    </main>
  );
}