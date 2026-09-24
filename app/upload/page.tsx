"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Instrument_Serif } from "next/font/google";

const serif = Instrument_Serif({
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

// Stages of the pipeline a file goes through, each with a progress percentage
// it should land on once that stage completes. Drives the real-time bar below.
const STAGES: { key: string; label: string; percent: number }[] = [
  { key: "uploading", label: "Uploading file...", percent: 40 },
  { key: "analyzing", label: "Running AI analysis...", percent: 65 },
  { key: "saving", label: "Saving report...", percent: 80 },
  { key: "processing", label: "Extracting text & generating embeddings...", percent: 95 },
  { key: "done", label: "Done!", percent: 100 },
];

// Blurry-image detection: downsamples the image onto a canvas, converts to
// grayscale, and measures edge variance (a Laplacian-style sharpness check).
// Low variance = few sharp edges = likely blurry/out of focus.
async function isImageBlurry(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const size = 200; // downsample for speed
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(false);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const gray = new Float32Array(size * size);
        for (let i = 0; i < size * size; i++) {
          const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
          gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        }

        let sum = 0;
        let sumSq = 0;
        let count = 0;
        for (let y = 1; y < size - 1; y++) {
          for (let x = 1; x < size - 1; x++) {
            const idx = y * size + x;
            // simple Laplacian kernel
            const lap =
              4 * gray[idx] -
              gray[idx - 1] -
              gray[idx + 1] -
              gray[idx - size] -
              gray[idx + size];
            sum += lap;
            sumSq += lap * lap;
            count++;
          }
        }
        const mean = sum / count;
        const variance = sumSq / count - mean * mean;

        URL.revokeObjectURL(url);
        resolve(variance < 90); // low variance ⇒ flag as blurry
      } catch {
        URL.revokeObjectURL(url);
        resolve(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState("");
  const [blurWarning, setBlurWarning] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // NEW: so failures are visible on screen, not just console
  const [recentUploads, setRecentUploads] = useState<Report[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const goToStage = (key: string) => {
    const stage = STAGES.find((s) => s.key === key);
    if (stage) {
      setStageLabel(stage.label);
      setProgress(stage.percent);
    }
  };

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
    setBlurWarning(null);
    setProgress(5);
    setStageLabel("Checking file...");

    console.log("🚀 handleFile started for:", file.name); // NEW: confirms the function even fired

    // Immediately flag blurry photos so the user can retake before we spend
    // time uploading and analyzing a file that won't extract cleanly.
    if (isImageFile(file)) {
      const blurry = await isImageBlurry(file);
      if (blurry) {
        setBlurWarning(
          "This photo looks blurry — text may not be readable. Continuing anyway, but a sharper photo will give better results."
        );
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("❌ No logged-in user found, aborting upload.");
      setErrorMsg("You're not logged in. Please log in and try again.");
      setUploading(false);
      setProgress(0);
      return;
    }

    const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

    goToStage("uploading");
    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(filePath, file);

    if (uploadError) {
      console.error("❌ Storage upload failed:", uploadError);
      setErrorMsg("File upload to storage failed. Check console.");
      setUploading(false);
      setProgress(0);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("reports")
      .getPublicUrl(filePath);

    const isImage = isImageFile(file);
    let summary: string | null = null;

    goToStage("analyzing");
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

    goToStage("saving");
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
      setProgress(0);
      return; // stop here — don't redirect like nothing happened
    }

    console.log("✅ Report row inserted:", insertedReport.id);

    // NEW: RAG chunking + embeddings only make sense for PDFs, not images
    if (!isImage) {
      goToStage("processing");
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          console.error("❌ No active session/access_token — process-pdf call would fail auth.");
          setErrorMsg("Session expired. Please log in again.");
          setUploading(false);
          setProgress(0);
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
          setProgress(0);
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
          setProgress(0);
          return;
        }

        console.log(`✅ Embeddings generated: ${embedData.chunksEmbedded} chunks embedded`);
        console.log("🎉 Report ready for semantic search!");
      } catch (error) {
        console.error("❌ Processing or embedding threw an error:", error);
        setErrorMsg("Something broke during PDF processing. Check console.");
        setUploading(false);
        setProgress(0);
        return;
      }
    } else {
      console.log("ℹ️ Skipped process-pdf/generate-embeddings — file is an image, not a PDF.");
    }

    goToStage("done");
    setUploading(false);
    setTimeout(() => router.push("/dashboard"), 400); // brief pause so the 100% bar is visible
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
          <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "#5B8FC4" }}>
            Medical Records
          </p>
          <h1 className={serif.className} style={{ fontSize: "36px", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            Upload your documents
          </h1>
          <p className="text-sm mt-4" style={{ color: "rgba(27,35,51,0.6)" }}>
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

        {/* Blurry-photo warning */}
        {blurWarning && (
          <div
            className="rounded-lg px-4 py-3 mb-6 text-sm flex items-start gap-2"
            style={{ background: "rgba(245,158,11,0.1)", color: "#92600A", border: "1px solid rgba(245,158,11,0.25)" }}
          >
            <span>📷</span>
            <span>{blurWarning}</span>
          </div>
        )}

        {/* Real-time upload progress bar */}
        {uploading && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{stageLabel}</span>
              <span className="text-xs font-semibold" style={{ color: "#5B8FC4" }}>{progress}%</span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: "8px", background: "rgba(91,143,196,0.12)" }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #5B8FC4, #3D6FA0)",
                  transition: "width 0.4s ease",
                  borderRadius: "999px",
                }}
              />
            </div>
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