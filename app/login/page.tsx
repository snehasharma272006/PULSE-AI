"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "http://localhost:3000/auth/reset",
      });
      if (error) {
        setError(error.message);
      } else {
        setError("✅ Recovery email sent! Check your inbox.");
      }
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
  router.push("/upload");
}
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/upload");
      }
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">
        {isForgot ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
      </h1>

      <input
        className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 w-72 text-white"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {!isForgot && (
        <input
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 w-72 text-white"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      )}

      {error && (
        <p className="text-red-400 text-sm w-72 text-center">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-sky-500 hover:bg-sky-600 px-6 py-2 rounded-lg font-medium disabled:opacity-50"
      >
        {loading ? "Please wait..." : isForgot ? "Send Recovery Email" : isSignUp ? "Sign Up" : "Login"}
      </button>

      {!isForgot && (
        <p
          className="text-zinc-400 text-sm cursor-pointer hover:text-white"
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? "Already have an account? Login" : "No account? Sign up"}
        </p>
      )}

      <p
        className="text-zinc-500 text-xs cursor-pointer hover:text-zinc-300"
        onClick={() => { setIsForgot(!isForgot); setError(""); }}
      >
        {isForgot ? "← Back to login" : "Forgot password?"}
      </p>
    </main>
  );
}