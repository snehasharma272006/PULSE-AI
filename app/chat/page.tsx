"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Instrument_Serif } from "next/font/google";

const playfair = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ question }),
      });

      if (!res.ok || !res.body) throw new Error("Chat request failed");

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const event = JSON.parse(part.slice(6));
          if (event.type === "content") {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: updated[updated.length - 1].content + event.text };
              return updated;
            });
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(160deg, #EAF1FB 0%, #F7FAFF 50%, #FFFFFF 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .msg-in { animation: fadeInUp 0.35s ease-out; }
        @keyframes dotPulse { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        .dot { animation: dotPulse 1.2s infinite ease-in-out; }
        @keyframes floatSparkle { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-4px) rotate(8deg); } }
        .sparkle { animation: floatSparkle 2.5s ease-in-out infinite; display: inline-block; }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          borderRadius: "24px",
          background: "#ffffff",
          border: "1px solid rgba(30,40,70,0.06)",
          boxShadow: "0 12px 40px rgba(30,40,70,0.10)",
          padding: "40px",
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "32px" }}>
          <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#5B8DEF" }}>
            AI Assistant
          </p>
          <h1 className={playfair.className} style={{ fontSize: "30px", fontWeight: 700, color: "#1B2333", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            Health Chat 
          </h1>
          <p style={{ color: "#8A93A6", marginTop: "4px", fontSize: "14px", fontWeight: 300 }}>
            Ask about your reports, or any general health question.
          </p>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
          {messages.length === 0 ? (
            <div style={{ borderRadius: "16px", padding: "32px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", background: "#F5F9FF", border: "1px solid #E2E9F7" }}>
              <span style={{ fontSize: "36px" }}>🩺💬</span>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#4B5468", margin: 0 }}>Hey! I'm here to help you understand your health.</p>
              <p style={{ fontSize: "12px", color: "#9AA3B5", margin: 0 }}>Try: "What did my last report show?" or "What does HbA1c mean?"</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className="msg-in"
                style={{ display: "flex", alignItems: "flex-end", gap: "8px", maxWidth: "85%", alignSelf: msg.role === "user" ? "flex-end" : "flex-start", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}
              >
                {msg.role === "assistant" && (
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "14px", background: "#EAF1FB", border: "1px solid #C9DAF5" }}>
                    🩺
                  </div>
                )}
                <div
                  style={{
                    borderRadius: "16px",
                    padding: "14px 18px",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    whiteSpace: "pre-line",
                    ...(msg.role === "user"
                      ? { background: "#5B8DEF", color: "#ffffff" }
                      : { background: "#F5F9FF", color: "#1B2333", border: "1px solid #E2E9F7" }),
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="msg-in" style={{ display: "flex", alignItems: "flex-end", gap: "8px", alignSelf: "flex-start" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "14px", background: "#EAF1FB", border: "1px solid #C9DAF5" }}>
                🩺
              </div>
              <div style={{ borderRadius: "16px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "6px", background: "#F5F9FF", border: "1px solid #E2E9F7" }}>
                <span className="dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#5B8DEF", animationDelay: "0s" }} />
                <span className="dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#5B8DEF", animationDelay: "0.15s" }} />
                <span className="dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#5B8DEF", animationDelay: "0.3s" }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question..."
            style={{ flex: 1, borderRadius: "12px", padding: "12px 16px", fontSize: "14px", color: "#1B2333", background: "#FAFBFD", border: "1.5px solid #E2E6ED", outline: "none" }}
            onFocus={(e) => (e.target.style.border = "1.5px solid #5B8DEF")}
            onBlur={(e) => (e.target.style.border = "1.5px solid #E2E6ED")}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{ padding: "12px 20px", borderRadius: "12px", fontWeight: 500, fontSize: "14px", color: "#fff", background: "#5B8DEF", border: "none", cursor: sending || !input.trim() ? "default" : "pointer", opacity: sending || !input.trim() ? 0.4 : 1, transition: "background 0.15s" }}
            onMouseEnter={(e) => { if (!sending && input.trim()) e.currentTarget.style.background = "#4A78D6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#5B8DEF"; }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}