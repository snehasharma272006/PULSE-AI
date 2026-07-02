"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase puts the token in the URL hash (#)
    // This listener catches it and creates a valid session automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true); // token is valid, show the form
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (password !== confirm) {
      setError("Passwords don't match!");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      {success ? (
        <p className="text-green-400 text-lg font-medium">
          ✅ Password updated! Redirecting to login...
        </p>
      ) : !ready ? (
        <p className="text-zinc-400">Verifying your reset link...</p>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Set New Password</h1>

          <input
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 w-72 text-white"
            placeholder="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 w-72 text-white"
            placeholder="Confirm new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {error && (
            <p className="text-red-400 text-sm w-72 text-center">{error}</p>
          )}

          <button
            onClick={handleReset}
            disabled={loading}
            className="bg-sky-500 hover:bg-sky-600 px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? "Saving..." : "Update Password"}
          </button>
        </>
      )}
    </main>
  );
}