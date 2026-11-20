"use client";

import { useEffect, useRef, useState } from "react";
import { coachAction } from "@/app/actions";
import PremiumLock from "@/components/PremiumLock";
import { PageSkeleton } from "@/components/Skeleton";
import type { ChatTurn } from "@/lib/ai";
import { useScanStatus, useToday } from "@/lib/hooks";

const STORAGE_KEY = "gymnado-coach-chat";
const STARTERS = [
  "I only have 30 minutes today. What should I do?",
  "My lower back feels tight. What should I change?",
  "How do I know when to add more weight?",
  "What should I eat before a workout?",
];

/** AI coach chat (Premium). The conversation is kept in this browser. */
export default function CoachPage() {
  const today = useToday();
  const { status } = useScanStatus();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
       
      if (Array.isArray(saved)) setTurns(saved);
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-40)));
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy || !today) return;
    const next: ChatTurn[] = [...turns, { role: "user", content: msg }];
    setTurns(next);
    setInput("");
    setBusy(true);
    setError(null);
    const res = await coachAction(next, today);
    setBusy(false);
    if (res.ok) setTurns([...next, { role: "assistant", content: res.reply }]);
    else setError(res.error);
  }

  if (!status || !today) return <PageSkeleton cards={1} />;
  if (!status.premium) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">AI Coach</h1>
        <PremiumLock title="Your personal AI coach">
          Ask anything about your training: what to do when you&apos;re short on time, how to work around a sore knee, when to add weight. Your coach knows your plan and your progress.
        </PremiumLock>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-3">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-bold">AI Coach</h1>
        {turns.length > 0 && <button className="text-sm text-twilight/60 hover:underline" onClick={() => setTurns([])}>Clear chat</button>}
      </div>

      <div className="card flex-1 space-y-3 overflow-y-auto">
        {turns.length === 0 && (
          <div className="fade-in space-y-3 py-4 text-center">
            <div className="text-4xl">💬</div>
            <p className="text-twilight/70">Hi! I know your plan and your progress. Ask me anything.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}
            </div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`fade-in flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${t.role === "user" ? "rounded-br-sm bg-teal text-white" : "rounded-bl-sm bg-cyan text-twilight"}`}>
              {t.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start" role="status" aria-label="Coach is typing">
            <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-cyan px-3 py-3">
              {[0, 150, 300].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-teal" style={{ animationDelay: `${d}ms` }} />)}
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      {error && <p className="rounded-lg bg-cyan p-2 text-sm font-medium">{error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
        <input className="input" placeholder="Ask your coach…" value={input} maxLength={2000} onChange={(e) => setInput(e.target.value)} disabled={busy} />
        <button className="btn" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
