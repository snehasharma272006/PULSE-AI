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
  }, [messages]);

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
      <div className="mb-8">
        <p
          className="text-sky-400 text-xs font-medium tracking-widest uppercase mb-2"
          style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.1em" }}
        >
          AI Assistant
        </p>
        <h1
          className="text-3xl font-bold text-white"
          style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}
        >
          Health Chat
        </h1>
        <p className="text-slate-400 mt-1 text-sm font-light">
          Ask about your reports, or any general health question.
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-4 mb-6 min-h-[300px]">
        {messages.length === 0 ? (
          <div
            className="rounded-2xl px-5 py-4 text-sm text-slate-500"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            Try asking something like "What did my last report show?" or "What does HbA1c mean?"
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`rounded-2xl px-5 py-4 text-sm leading-relaxed whitespace-pre-line max-w-[85%] ${
                msg.role === "user" ? "self-end" : "self-start"
              }`}
              style={
                msg.role === "user"
                  ? { background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)" }
                  : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }
              }
            >
              {msg.content}
            </div>
          ))
        )}

        {sending && (
          <div
            className="rounded-2xl px-5 py-4 text-sm text-slate-500 self-start"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            Thinking...
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
          className="flex-1 rounded-xl px-4 py-3 text-sm text-white bg-zinc-900 border border-zinc-700 focus:outline-none focus:border-sky-400"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="bg-sky-500 hover:bg-sky-600 px-5 py-3 rounded-xl font-medium text-sm disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </div>
    </main>
  );
}