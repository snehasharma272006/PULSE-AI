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

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isForgot && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const redirectBase = typeof window !== "undefined" ? window.location.origin : "";

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${redirectBase}/auth/reset`,
      });
      setError(error ? "If that email is registered, you'll receive a reset link." : "✅ Recovery email sent! Check your inbox.");
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email: trimmedEmail, password });
      if (error) {
        setError(error.message.toLowerCase().includes("already registered") ? "Unable to create account with these details." : error.message);
      } else {
        router.push("/upload");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      setError(error ? "Incorrect email or password." : "");
      if (!error) router.push("/upload");
    }
    setLoading(false);
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(160deg, #EAF1FB 0%, #F7FAFF 50%, #FFFFFF 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "440px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 12px 40px rgba(30, 40, 70, 0.10)",
          border: "1px solid rgba(30, 40, 70, 0.06)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "32px 32px 24px" }}>
          <h1 className="text-2xl font-bold text-center" style={{ color: "#1B2333", marginBottom: "24px" }}>
            {isForgot ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label className="text-sm font-medium" style={{ color: "#4B5468" }}>Email address</label>
              <input
                className="rounded-xl outline-none transition-all text-[15px]"
                style={{ padding: "12px 16px", background: "#FAFBFD", border: "1.5px solid #E2E6ED", color: "#1B2333" }}
                onFocus={(e) => (e.target.style.border = "1.5px solid #5B8DEF")}
                onBlur={(e) => (e.target.style.border = "1.5px solid #E2E6ED")}
                placeholder="Enter your email address"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {!isForgot && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="text-sm font-medium" style={{ color: "#4B5468" }}>Password</label>
                <input
                  className="rounded-xl outline-none transition-all text-[15px]"
                  style={{ padding: "12px 16px", background: "#FAFBFD", border: "1.5px solid #E2E6ED", color: "#1B2333" }}
                  onFocus={(e) => (e.target.style.border = "1.5px solid #5B8DEF")}
                  onBlur={(e) => (e.target.style.border = "1.5px solid #E2E6ED")}
                  placeholder="Enter your password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {error && (
              <p
                className="text-sm text-center"
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  color: error.startsWith("✅") ? "#3D8361" : "#C0392B",
                  background: error.startsWith("✅") ? "#E9F7EF" : "#FDECEA",
                }}
              >
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-xl font-medium disabled:opacity-50 transition-all text-[15px]"
              style={{ padding: "12px", background: "#5B8DEF", color: "#fff" }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#4A78D6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#5B8DEF"; }}
            >
              {loading ? "Please wait..." : isForgot ? "Send Recovery Email" : isSignUp ? "Sign Up" : "Login"}
            </button>

            {!isForgot && (
              <p
                className="text-xs text-center cursor-pointer"
                style={{ color: "#B0B7C6" }}
                onClick={() => { setIsForgot(true); setError(""); }}
              >
                Forgot password?
              </p>
            )}
          </div>
        </div>

        <div style={{ padding: "16px 32px", textAlign: "center", background: "#FAFBFD", borderTop: "1px solid #EEF1F6" }}>
          {isForgot ? (
            <p className="text-sm cursor-pointer" style={{ color: "#4B5468" }} onClick={() => { setIsForgot(false); setError(""); }}>
              ← Back to login
            </p>
          ) : (
            <p className="text-sm" style={{ color: "#8A93A6" }}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <span className="font-medium cursor-pointer" style={{ color: "#5B8DEF" }} onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? "Sign in" : "Sign up"}
              </span>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}