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

    const trimmedEmail = email.trim();

    // Basic client-side sanity checks before hitting the network
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isForgot && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    // Use whatever domain the app is actually running on —
    // works correctly on localhost AND after deployment, automatically
    const redirectBase =
      typeof window !== "undefined" ? window.location.origin : "";

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${redirectBase}/auth/reset`,
      });
      if (error) {
        // Deliberately generic — never confirm whether this email exists
        setError("If that email is registered, you'll receive a reset link.");
      } else {
        setError("✅ Recovery email sent! Check your inbox.");
      }
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });
      if (error) {
        // Generalize the error so it never confirms "this email already exists"
        if (error.message.toLowerCase().includes("already registered")) {
          setError("Unable to create account with these details.");
        } else {
          setError(error.message);
        }
      } else {
        router.push("/upload");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) {
        // Supabase already returns a generic message here by default,
        // but we normalize it explicitly to be safe either way
        setError("Incorrect email or password.");
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
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {!isForgot && (
        <input
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 w-72 text-white"
          placeholder="Password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
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