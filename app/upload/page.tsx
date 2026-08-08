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
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // NEW: so failures are visible on screen, not just console
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
    setErrorMsg(null);

    console.log("🚀 handleFile started for:", file.name); // NEW: confirms the function even fired

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("❌ No logged-in user found, aborting upload.");
      setErrorMsg("You're not logged in. Please log in and try again.");
      setUploading(false);
      return;
    }

    const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(filePath, file);

    if (uploadError) {
      console.error("❌ Storage upload failed:", uploadError);
      setErrorMsg("File upload to storage failed. Check console.");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("reports")
      .getPublicUrl(filePath);

    const isImage = isImageFile(file);
    let summary: string | null = null;

    try {
      const aiFormData = new FormData();
      aiFormData.append("file", file);

      const endpoint = isImage ? "/api/analyze-image" : "/api/analyze-pdf";
      const aiResponse = await fetch(endpoint, { method: "POST", body: aiFormData });

      if (!aiResponse.ok) {
        // NEW: previously we trusted .json() even on a failed response
        const errText = await aiResponse.text();
        console.error(`❌ ${endpoint} returned ${aiResponse.status}:`, errText);
      } else {
        const aiData = await aiResponse.json();
        summary = aiData.summary ?? null;
      }
    } catch (aiError) {
      console.error("❌ AI analysis request threw an error:", aiError);
    }

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

    // NEW: this is the fix for your "plain nothing" bug — the failure branch now actually speaks up
    if (insertError || !insertedReport) {
      console.error("❌ Insert into 'reports' table failed:", insertError);
      setErrorMsg("Saving the report record failed. Check console for details.");
      setUploading(false);
      return; // stop here — don't redirect like nothing happened
    }

    console.log("✅ Report row inserted:", insertedReport.id);

    // NEW: RAG chunking + embeddings only make sense for PDFs, not images
    if (!isImage) {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          console.error("❌ No active session/access_token — process-pdf call would fail auth.");
          setErrorMsg("Session expired. Please log in again.");
          setUploading(false);
          return;
        }

        console.log(`📄 Processing PDF for report: ${insertedReport.id}`);

        const processPdfResponse = await fetch("/api/process-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            reportId: insertedReport.id,
            filePath: filePath,
          }),
        });

        const processPdfData = await processPdfResponse.json();

        if (!processPdfResponse.ok) {
          console.error("❌ PDF processing failed:", processPdfData.error);
          setErrorMsg(`PDF processing failed: ${processPdfData.error ?? "unknown error"}`);
          setUploading(false);
          return;
        }

        console.log(`✅ PDF processed: ${processPdfData.chunksCreated} chunks created`);

        console.log(`🔄 Generating embeddings for report: ${insertedReport.id}`);

        const embedResponse = await fetch("/api/generate-embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ reportId: insertedReport.id }),
        });

        const embedData = await embedResponse.json();

        if (!embedResponse.ok) {
          console.error("❌ Embedding generation failed:", embedData.error);
          setErrorMsg(`Embedding generation failed: ${embedData.error ?? "unknown error"}`);
          setUploading(false);
          return;
        }

        console.log(`✅ Embeddings generated: ${embedData.chunksEmbedded} chunks embedded`);
        console.log("🎉 Report ready for semantic search!");
      } catch (error) {
        console.error("❌ Processing or embedding threw an error:", error);
        setErrorMsg("Something broke during PDF processing. Check console.");
        setUploading(false);
        return;
      }
    } else {
      console.log("ℹ️ Skipped process-pdf/generate-embeddings — file is an image, not a PDF.");
    }

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
    <main className="min-h-screen px-4 py-12 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E8F0F7 0%, #D4E4F0 100%)" }}>
      <div className="w-full max-w-2xl rounded-3xl p-16 m-4" style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(91,143,196,0.1)", border: "2px solid rgba(91,143,196,0.15)" }}>

        {/* Header inside box */}
        <div className="text-center mb-10">
          <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: "#5B8FC4" }}>
            Medical Records
          </p>
          <h1
            className="text-3xl"
            style={{ fontFamily: "Georgia, serif", color: "var(--foreground)", fontStyle: "italic", fontWeight: "400", letterSpacing: "-0.01em" }}
          >
            Upload Documents
          </h1>
          <p className="text-xs mt-2" style={{ color: "rgba(27,35,51,0.6)" }}>
            Your files are processed locally.
          </p>
        </div>

        {/* NEW: visible error banner so failures aren't invisible */}
        {errorMsg && (
          <div
            className="rounded-lg px-4 py-3 mb-6 text-sm"
            style={{ background: "rgba(220,38,38,0.08)", color: "#B91C1C", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            {errorMsg}
          </div>
        )}

        {/* Upload Drop Zone */}
        <div
          className="rounded-2xl p-10 mb-6 cursor-pointer transition-all duration-300 flex flex-col items-center gap-5"
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) handleFile(dropped);
          }}
          style={{
            background: dragging ? "rgba(91,143,196,0.12)" : "rgba(91,143,196,0.06)",
            border: `2px dashed ${dragging ? "#5B8FC4" : "rgba(91,143,196,0.2)"}`,
          }}
        >
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(91,143,196,0.15)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5B8FC4" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          {/* Text */}
          <div className="text-center">
            <p className="font-semibold text-sm mb-0.5" style={{ color: "var(--foreground)" }}>
              {uploading ? "Processing..." : dragging ? "Drop to upload" : "Drag a file here"}
            </p>
            <p className="text-xs" style={{ color: "rgba(27,35,51,0.5)" }}>
              {uploading ? "Extracting text, generating embeddings..." : "or click to browse"}
            </p>
          </div>

          {/* Tags */}
          <div className="flex gap-2 flex-wrap justify-center">
            {["PDF", "Lab Reports", "Discharge Summaries"].map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  background: "rgba(91,143,196,0.12)",
                  color: "#5B8FC4",
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
            disabled={uploading}
          />
        </div>

        {/* Recent Uploads */}
        {recentUploads.length > 0 && (
          <div>
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "rgba(27,35,51,0.45)" }}
            >
              Recent
            </h2>

            <div className="space-y-2">
              {recentUploads.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 cursor-pointer"
                  style={{
                    background: "rgba(91,143,196,0.06)",
                    border: "1px solid rgba(91,143,196,0.1)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(91,143,196,0.25)";
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(91,143,196,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(91,143,196,0.1)";
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(91,143,196,0.06)";
                  }}
                >
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(91,143,196,0.15)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B8FC4" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--foreground)" }}>
                      {file.file_name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(27,35,51,0.45)" }}>
                      {formatDate(file.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}