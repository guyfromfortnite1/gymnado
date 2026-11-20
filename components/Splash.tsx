"use client";

import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

// Opening intro, once per browser session: a tornado swirls in to the middle, the GymNado logo
// appears, "Loading…" fills, then it fades away to the page underneath (login when signed out).
// SPLASH_SCRIPT (lib/theme.ts) hides it before paint if it already played this session.
const TOTAL_MS = 4200;
const FADE_MS = 500;

const RINGS = [
  { cy: 10, rx: 74, ry: 7.5 },
  { cy: 29, rx: 60, ry: 6.5 },
  { cy: 48, rx: 47, ry: 5.8 },
  { cy: 67, rx: 36, ry: 5 },
  { cy: 86, rx: 26, ry: 4.3 },
  { cy: 104, rx: 17, ry: 3.6 },
  { cy: 120, rx: 10, ry: 2.9 },
];

export default function Splash() {
  const [phase, setPhase] = useState<"show" | "fading" | "done">("show");

  useEffect(() => {
    if (document.documentElement.classList.contains("splash-seen")) {
      setPhase("done");
      return;
    }
    sessionStorage.setItem("gn-splash", "1");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduced ? 1200 : TOTAL_MS;
    const t1 = setTimeout(() => setPhase("fading"), total - FADE_MS);
    const t2 = setTimeout(() => setPhase("done"), total);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div className={`splash fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${phase === "fading" ? "splash-out" : ""}`} role="status" aria-label="Loading GymNado">
      {/* The tornado swirls in from the corner and settles in the middle, then hands over to the logo. */}
      <div className="splash-tornado absolute">
        <svg viewBox="0 0 160 150" className="h-48 w-52" aria-hidden>
          <defs>
            <linearGradient id="splash-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#48cae4" />
              <stop offset="1" stopColor="#0077b6" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#splash-g)" strokeLinecap="round" strokeWidth="4">
            {RINGS.map((r, i) => (
              <ellipse key={i} className="splash-ring" cx="80" cy={r.cy} rx={r.rx} ry={r.ry} style={{ animationDelay: `${i * -90}ms` }} />
            ))}
            <path className="splash-ring" d="M80 129 Q75 137 80 145" />
          </g>
        </svg>
      </div>

      <div className="splash-brand flex flex-col items-center gap-6">
        <Logo size={52} dark />
        <div className="w-48 space-y-2 text-center">
          <p className="text-sm font-medium tracking-wide text-ice/80">Loading…</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="splash-bar h-full rounded-full bg-surf" />
          </div>
        </div>
      </div>
    </div>
  );
}
