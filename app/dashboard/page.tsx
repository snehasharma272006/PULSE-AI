"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  async function uploadFile() {
    if (!file) return

    setUploading(true)

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `${Date.now()}-${safeName}`

    const { error } = await supabase.storage
      .from("reports")
      .upload(fileName, file)

    setUploading(false)

    if (error) {
  console.log(error)
  alert(error.message)
} else {
      alert("Upload successful ✅")
      setFile(null)
    }
  }

  return (
    <main style={{ padding: "40px" }}>
      <h1>Upload Medical Report</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <br />

      <button
        onClick={uploadFile}
        disabled={!file || uploading}
        style={{
          marginTop: "20px",
          padding: "10px 15px",
          background: "black",
          color: "white",
          borderRadius: "8px",
          cursor: "pointer",
          opacity: !file || uploading ? 0.5 : 1,
        }}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </main>
  )
}