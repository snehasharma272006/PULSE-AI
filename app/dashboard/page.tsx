"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Instrument_Serif } from "next/font/google";

const playfair = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

type Report = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  summary: string | null;
};

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReports = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-menu]")) setActiveMenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleView = (url: string) => {
    window.open(url, "_blank");
    setActiveMenu(null);
  };

  const handleDownload = async (url: string, fileName: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    setActiveMenu(null);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHrs < 24) return `${diffHrs} hr ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const insightsCount = reports.filter((r) => r.summary).length;

  const metrics = [
    {
      label: "Reports Uploaded",
      value: loading ? "..." : String(reports.length),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C4C73" strokeWidth="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      accent: "rgba(45,79,120,0.14)",
      accentStroke: "rgba(45,79,120,0.28)",
      accentText: "#2C4C73",
    },
    {
      label: "Medical Events",
      value: "—",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3D6FA0" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      accent: "rgba(61,111,160,0.12)",
      accentStroke: "rgba(61,111,160,0.24)",
      accentText: "#3D6FA0",
    },
    {
      label: "Conditions Tracked",
      value: "—",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B8FC4" strokeWidth="1.8">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
      accent: "rgba(91,143,196,0.10)",
      accentStroke: "rgba(91,143,196,0.22)",
      accentText: "#5B8FC4",
    },
    {
      label: "Insights Generated",
      value: loading ? "..." : String(insightsCount),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3D6FA0" strokeWidth="1.8">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      accent: "rgba(61,111,160,0.12)",
      accentStroke: "rgba(61,111,160,0.24)",
      accentText: "#3D6FA0",
    },
  ];

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: "1152px",
          paddingLeft: "28px",
          paddingRight: "48px",
          paddingTop: "56px",
          paddingBottom: "56px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "56px" }}>
          <p style={{ color: "rgba(27,35,51,0.45)", fontSize: "14px", marginBottom: "4px", fontWeight: 300 }}>{today}</p>
          <h1 className={playfair.className} style={{ fontSize: "36px", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            Welcome back
          </h1>
          <p style={{ color: "rgba(27,35,51,0.55)", marginTop: "8px", fontSize: "14px", fontWeight: 300 }}>
            Here's what's happening with your health records.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "24px",
            marginBottom: "64px",
            width: "100%",
          }}
        >
          {metrics.map((m) => (
            <div
              key={m.label}
              style={{
                borderRadius: "16px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "12px",
                minHeight: "130px",
                background: m.accent,
                border: `1px solid ${m.accentStroke}`,
              }}
            >
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.7)" }}>
                {m.icon}
              </div>
              <div>
                <p style={{ fontSize: "28px", fontWeight: 700, color: m.accentText, letterSpacing: "-0.02em", margin: 0 }}>{m.value}</p>
                <p style={{ fontSize: "13px", marginTop: "4px", color: "rgba(27,35,51,0.5)", margin: "4px 0 0" }}>{m.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: "100%" }}>
          <h2 style={{ fontSize: "12px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "20px", color: "rgba(27,35,51,0.45)" }}>
            Recent Activity
          </h2>
          <div style={{ borderRadius: "16px", overflow: "visible", width: "100%", background: "rgba(255,255,255,0.65)", border: "1px solid rgba(27,35,51,0.08)" }}>
            {loading ? (
              <p style={{ fontSize: "14px", padding: "16px 20px", color: "rgba(27,35,51,0.35)" }}>Loading...</p>
            ) : reports.length === 0 ? (
              <p style={{ fontSize: "14px", padding: "16px 20px", color: "rgba(27,35,51,0.35)" }}>No activity yet. Upload a report!</p>
            ) : (
              reports.slice(0, 5).map((report, i) => (
                <div
                  key={report.id}
                  style={{ borderBottom: i < Math.min(reports.length, 5) - 1 ? "1px solid rgba(27,35,51,0.06)" : "none" }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px 24px", position: "relative", transition: "background 0.15s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(61,111,160,0.05)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "rgba(27,35,51,0.05)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3D6FA0" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", margin: 0 }}>Report Uploaded</p>
                      <p style={{ fontSize: "12px", marginTop: "4px", color: "rgba(27,35,51,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "4px 0 0" }}>{report.file_name}</p>
                      {report.summary && (
                        <button
                          onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                          style={{ fontSize: "12px", marginTop: "6px", color: "#3D6FA0", display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          {expandedId === report.id ? "Hide AI Summary" : "View AI Summary"}
                          <svg
                            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                            style={{ transform: expandedId === report.id ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <p style={{ fontSize: "12px", flexShrink: 0, color: "rgba(27,35,51,0.35)", margin: 0 }}>{formatTime(report.created_at)}</p>

                    <button
                      data-menu="true"
                      onClick={() => setActiveMenu(activeMenu === report.id ? null : report.id)}
                      style={{ marginLeft: "8px", width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "transparent", border: "none", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(27,35,51,0.06)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(27,35,51,0.4)">
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>

                    {activeMenu === report.id && (
                      <div
                        data-menu="true"
                        ref={menuRef}
                        style={{ position: "absolute", right: "16px", top: "48px", zIndex: 50, borderRadius: "12px", overflow: "hidden", background: "#ffffff", border: "1px solid rgba(27,35,51,0.08)", boxShadow: "0 8px 30px rgba(27,35,51,0.12)", minWidth: "150px" }}
                      >
                        <button
                          data-menu="true"
                          onClick={() => handleView(report.file_url)}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", fontSize: "14px", color: "var(--foreground)", background: "transparent", border: "none", cursor: "pointer" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(27,35,51,0.04)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3D6FA0" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          View
                        </button>
                        <div style={{ borderTop: "1px solid rgba(27,35,51,0.06)" }} />
                        <button
                          data-menu="true"
                          onClick={() => handleDownload(report.file_url, report.file_name)}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", fontSize: "14px", color: "var(--foreground)", background: "transparent", border: "none", cursor: "pointer" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(27,35,51,0.04)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2FA37C" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download
                        </button>
                      </div>
                    )}
                  </div>

                  {expandedId === report.id && report.summary && (
                    <div style={{ padding: "0 24px 16px", marginTop: "-4px" }}>
                      <div style={{ borderRadius: "12px", padding: "16px", marginTop: "12px", background: "#ffffff", border: "1px solid rgba(27,35,51,0.07)", boxShadow: "0 4px 20px rgba(27,35,51,0.08)" }}>
                        <p style={{ fontSize: "12px", lineHeight: 1.6, whiteSpace: "pre-line", color: "rgba(27,35,51,0.8)", margin: 0 }}>{report.summary}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}