"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Syne } from "next/font/google";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700"],
});

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
      date: new Date(report.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      title: "Report Uploaded",
      subtitle: report.file_name,
      tag: isImage ? "Image" : "PDF",
      tagColor: isImage ? "rgba(139,111,201,0.10)" : "rgba(91,143,196,0.10)",
      tagText: isImage ? "#8B6FC9" : "#3D6FA0",
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
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]).map(([year, items]) => ({ year, items }));
  })();

  return (
    <div style={{ background: "var(--background)", color: "var(--foreground)", minHeight: "100vh", width: "100%" }}>
      <div
        style={{
  maxWidth: "720px",
  paddingLeft: "28px",
  paddingRight: "48px",
  paddingTop: "56px",
  paddingBottom: "56px",
  boxSizing: "border-box",
  fontFamily: "'Inter', sans-serif",
}}
      >
        <div style={{ marginBottom: "48px" }}>
          <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#3D6FA0" }}>
            Health History
          </p>
          <h1 style={{ 
  fontSize: "30px", 
  fontWeight: 400, 
  fontFamily: "'Instrument Serif', serif", 
  fontStyle: "italic",
  letterSpacing: "-0.02em", 
  color: "var(--foreground)", 
  margin: 0 
}}>
  Your Timeline
</h1>
          <p style={{ marginTop: "4px", fontSize: "14px", fontWeight: 300, color: "rgba(27,35,51,0.55)" }}>
            Every event, visit, and result — in order.
          </p>
        </div>

        {loading ? (
          <p style={{ fontSize: "14px", color: "rgba(27,35,51,0.35)" }}>Loading...</p>
        ) : groupedByYear.length === 0 ? (
          <p style={{ fontSize: "14px", color: "rgba(27,35,51,0.35)" }}>No records yet. Upload a report to get started.</p>
        ) : (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: "11px", top: 0, bottom: 0, width: "2px", background: "rgba(91,143,196,0.35)" }} />

            {groupedByYear.map((group) => (
              <div key={group.year} style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, flexShrink: 0, background: "rgba(91,143,196,0.18)", border: "2px solid #5B8FC4", boxShadow: "0 0 10px rgba(91,143,196,0.3)" }} />
                  <span style={{ fontWeight: 700, fontSize: "16px", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.01em", color: "#3D6FA0" }}>{group.year}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginLeft: "48px" }}>
                  {group.items.map((event) => (
                    <div key={event.id} className="group" style={{ position: "relative", cursor: "pointer" }}>
                      <div className="group-hover:scale-125" style={{ position: "absolute", left: "-41px", top: "20px", width: "16px", height: "16px", borderRadius: "50%", zIndex: 10, background: "#fff", border: "2px solid #5B8FC4", boxShadow: "0 0 6px rgba(91,143,196,0.4)", transition: "transform 0.3s" }} />

                      <div
                        style={{ borderRadius: "16px", padding: "16px 20px", background: "rgba(255,255,255,0.65)", border: "1px solid rgba(27,35,51,0.08)", backdropFilter: "blur(12px)", transition: "all 0.3s" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(91,143,196,0.3)";
                          (e.currentTarget as HTMLDivElement).style.background = "rgba(91,143,196,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(27,35,51,0.08)";
                          (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.65)";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                            <span style={{ fontSize: "20px", marginTop: "2px" }}>{event.icon}</span>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: "14px", lineHeight: 1.3, fontFamily: "'Inter', sans-serif", letterSpacing: "-0.01em", color: "var(--foreground)", margin: 0 }}>{event.title}</p>
                              <p style={{ fontSize: "12px", marginTop: "4px", fontWeight: 300, fontFamily: "'Inter', sans-serif", color: "rgba(27,35,51,0.5)", margin: "4px 0 0" }}>{event.subtitle}</p>
                            </div>
                          </div>

                          <span style={{ fontSize: "12px", padding: "4px 12px", borderRadius: "999px", whiteSpace: "nowrap", flexShrink: 0, marginTop: "2px", background: event.tagColor, color: event.tagText, border: `1px solid ${event.tagText}33`, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                            {event.tag}
                          </span>
                        </div>

<p style={{ fontSize: "12px", marginTop: "12px", fontWeight: 300, fontFamily: "'Inter', sans-serif", color: "rgba(27,35,51,0.35)", margin: "12px 0 0 36px" }}>{event.date}</p>
                        {event.summary && (
                          <div style={{ paddingLeft: "36px", marginTop: "8px" }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === event.id ? null : event.id); }}
                              style={{ fontSize: "12px", color: "#3D6FA0", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            >
                              {expandedId === event.id ? "Hide AI Summary" : "View AI Summary"}
                            </button>
                            {expandedId === event.id && (
                              <p style={{ fontSize: "12px", marginTop: "8px", lineHeight: 1.6, whiteSpace: "pre-line", color: "rgba(27,35,51,0.55)", margin: "8px 0 0" }}>{event.summary}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ position: "absolute", left: 0, bottom: 0, width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(27,35,51,0.04)", border: "2px solid rgba(27,35,51,0.1)" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "rgba(27,35,51,0.3)" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}