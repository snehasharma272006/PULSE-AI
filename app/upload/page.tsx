"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Report = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  summary: string | null;
};

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState<Report[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchReports = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) setRecentUploads(data);
    };

    fetchReports();
  }, []);

  const isImageFile = (file: File) => file.type.startsWith("image/");

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    console.log("User:", user);
    if (!user) {
      console.log("No user found! Not logged in.");
      setUploading(false);
      return;
    }

    const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(filePath, file);

    console.log("Upload error:", uploadError);

    if (uploadError) {
      console.error(uploadError);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("reports")
      .getPublicUrl(filePath);

    // ===== Get a quick summary for the dashboard =====
    let summary: string | null = null;

    try {
      const aiFormData = new FormData();
      aiFormData.append("file", file);

      const isImage = isImageFile(file);
      const endpoint = isImage ? "/api/analyze-image" : "/api/analyze-pdf";

      const aiResponse = await fetch(endpoint, {
        method: "POST",
        body: aiFormData,
      });

      const aiData = await aiResponse.json();
      summary = aiData.summary ?? null;

      console.log("AI summary:", summary);
    } catch (aiError) {
      console.error("AI analysis failed:", aiError);
    }
    // ===== END summary step =====

    const { data: insertedReport, error: insertError } = await supabase
      .from("reports")
      .insert({
        user_id: user.id,
        file_url: urlData.publicUrl,
        file_name: file.name,
        summary: summary,
      })
      .select()
      .single();

    console.log("Insert error:", insertError);
    console.log("Inserted report:", insertedReport);

    // ===== NEW STEP: chunk + embed the PDF for chat search =====
    if (!isImageFile(file) && insertedReport && !insertError) {
      try {
        console.log("Calling process-pdf for report:", insertedReport.id);

        const { data: { session } } = await supabase.auth.getSession();

        const chunkResponse: Response = await fetch("/api/process-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
  reportId: insertedReport.id,
  filePath: filePath,
})
        });

        const chunkData = await chunkResponse.json();
        console.log("process-pdf response:", chunkData);
      } catch (chunkError) {
        console.error("Chunking failed:", chunkError);
      }
    } else {
      console.log("Skipping process-pdf:", {
        isImage: isImageFile(file),
        hasInsertedReport: !!insertedReport,
        insertError,
      });
    }
    // ===== END chunking step =====

    setUploading(false);
    router.push("/dashboard");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12 max-w-2xl mx-auto">
      <div className="mb-10">
        <p className="text-sky-400 text-sm font-medium tracking-widest uppercase mb-2">
          Medical Records
        </p>
        <h1
          className="text-4xl font-extrabold"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Upload Documents
        </h1>
        <p className="text-slate-400 mt-2 text-sm">
          Your files are processed locally. Nothing leaves your device.
        </p>
      </div>

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) handleFile(dropped);
        }}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 py-16 px-8 text-center
          ${dragging
            ? "border-sky-400 bg-sky-400/10"
            : "border-white/10 bg-white/[0.03] hover:border-sky-400/40 hover:bg-white/[0.05]"
          }`}
      >
        <div
          className="absolute w-24 h-24 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -60%)",
          }}
        />

        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.2)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <div>
          <p className="text-white font-semibold text-base">
            {uploading ? "Uploading..." : dragging ? "Drop to upload" : "Drag a file here"}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {uploading ? "Please wait" : "or click to browse"}
          </p>
        </div>

        <div className="flex gap-2 mt-2 flex-wrap justify-center">
          {["PDF", "Lab Reports", "Discharge Summaries"].map((tag) => (
            <span
              key={tag}
              className="text-xs px-3 py-1 rounded-full"
              style={{
                background: "rgba(56,189,248,0.08)",
                border: "1px solid rgba(56,189,248,0.18)",
                color: "#7dd3fc",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,image/*"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) handleFile(selected);
          }}
        />
      </div>

      <div className="mt-10">
        <h2
          className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Recent Uploads
        </h2>

        <div className="flex flex-col gap-3">
          {recentUploads.length === 0 ? (
            <p className="text-slate-600 text-sm">No uploads yet.</p>
          ) : (
            recentUploads.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-4 rounded-xl px-4 py-3 group transition-colors duration-200 cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(56,189,248,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(56,189,248,0.08)" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.file_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(file.created_at)}</p>
                </div>

                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.2)" strokeWidth="2"
                  className="group-hover:stroke-sky-400 transition-colors"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}