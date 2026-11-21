"use client";

/** A labelled on/off switch row for Settings. */
export default function Switch({ on, onChange, icon, label, detail }: { on: boolean; onChange: (on: boolean) => void; icon: string; label: string; detail?: string }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-cyan">
      <span className="text-xl" aria-hidden>{icon}</span>
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {detail && <span className="block text-sm text-twilight/60">{detail}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-teal" : "bg-frost"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}
