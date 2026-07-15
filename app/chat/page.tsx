"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [reportContext, setReportContext] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchContext = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("reports")
        .select("summary")
        .eq("user_id", user.id)
        .not("summary", "is", null);

      if (data) {
        setReportContext(data.map((r) => r.summary as string));
      }
    };

    fetchContext();
  }, []);

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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: reportContext }),
      });

      const data = await res.json();
      const answer = data.answer ?? "Sorry, I couldn't process that. Please try again.";

      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 sm:py-12 max-w-2xl mx-auto flex flex-col">
      {/* Local animation styles */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .msg-in {
          animation: fadeInUp 0.35s ease-out;
        }
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        .dot {
          animation: dotPulse 1.2s infinite ease-in-out;
        }
        @keyframes floatSparkle {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(8deg); }
        }
        .sparkle {
          animation: floatSparkle 2.5s ease-in-out infinite;
          display: inline-block;
        }
      `}</style>

      <div className="mb-8">
        <p
          className="text-sky-400 text-xs font-medium tracking-widest uppercase mb-2"
          style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.1em" }}
        >
          AI Assistant
        </p>
        <h1
          className="text-3xl font-bold text-white flex items-center gap-2"
          style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}
        >
          Health Chat <span className="sparkle">✨</span>
        </h1>
        <p className="text-slate-400 mt-1 text-sm font-light">
          Ask about your reports, or any general health question.
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-4 mb-6 min-h-[300px]">
        {messages.length === 0 ? (
          <div
            className="rounded-2xl px-6 py-8 text-center flex flex-col items-center gap-3"
            style={{
              background: "rgba(56,189,248,0.05)",
              border: "1px solid rgba(56,189,248,0.15)",
            }}
          >
            <span className="text-4xl">🩺💬</span>
            <p className="text-slate-300 text-sm font-medium">
              Hey! I'm here to help you understand your health.
            </p>
            <p className="text-slate-500 text-xs">
              Try: "What did my last report show?" or "What does HbA1c mean?"
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`msg-in flex items-end gap-2 max-w-[85%] ${
                msg.role === "user" ? "self-end flex-row-reverse" : "self-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)" }}
                >
                  🩺
                </div>
              )}
              <div
                className="rounded-2xl px-5 py-4 text-sm leading-relaxed whitespace-pre-line"
                style={
                  msg.role === "user"
                    ? { background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)" }
                    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }
                }
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="msg-in flex items-end gap-2 self-start">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
              style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)" }}
            >
              🩺
            </div>
            <div
              className="rounded-2xl px-5 py-4 flex items-center gap-1.5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <span className="dot w-1.5 h-1.5 rounded-full bg-sky-400" style={{ animationDelay: "0s" }} />
              <span className="dot w-1.5 h-1.5 rounded-full bg-sky-400" style={{ animationDelay: "0.15s" }} />
              <span className="dot w-1.5 h-1.5 rounded-full bg-sky-400" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 sticky bottom-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a question..."
          className="flex-1 rounded-xl px-4 py-3 text-sm text-white bg-zinc-900 border border-zinc-700 focus:outline-none transition-all duration-200"
          style={{ boxShadow: "0 0 0 0 rgba(56,189,248,0)" }}
          onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(56,189,248,0.15)")}
          onBlur={(e) => (e.currentTarget.style.boxShadow = "0 0 0 0 rgba(56,189,248,0)")}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="bg-sky-500 hover:bg-sky-600 active:scale-95 px-5 py-3 rounded-xl font-medium text-sm disabled:opacity-40 transition-all duration-150 hover:scale-105"
        >
          Send
        </button>
      </div>
    </main>
  );
}