"use client";

import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

// Opening intro, once per browser session: a tornado (spinning rings, smoke at its base, rocks whirling
// around it) swirls in to the middle, flings its debris out as the GymNado logo appears, "Loading…" fills,
// then it fades away to the page underneath (login when signed out).
// THEME_SCRIPT (lib/theme.ts) hides it before paint if it already played this session.
const TOTAL_MS = 4400;
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

// Smoke puffs at the base: horizontal offset (px), size (px), delay (ms).
const SMOKE = [
  { x: -46, size: 70, delay: 0 },
  { x: 30, size: 84, delay: 260 },
  { x: -8, size: 96, delay: 520 },
  { x: 52, size: 64, delay: 780 },
  { x: -60, size: 58, delay: 1040 },
  { x: 12, size: 76, delay: 1300 },
];

// Rocks orbiting the funnel: orbit radius (px), height on the funnel (px from top), size (px), speed (ms), start angle (deg), shape.
const ROCKS = [
  { r: 96, y: 30, size: 22, speed: 1000, start: 0, shape: 0 },
  { r: 80, y: 66, size: 16, speed: 820, start: 130, shape: 1 },
  { r: 110, y: 18, size: 13, speed: 1200, start: 230, shape: 2 },
  { r: 66, y: 96, size: 18, speed: 720, start: 300, shape: 1 },
  { r: 90, y: 50, size: 11, speed: 900, start: 60, shape: 2 },
  { r: 54, y: 122, size: 12, speed: 620, start: 190, shape: 0 },
  { r: 118, y: 44, size: 9, speed: 1350, start: 270, shape: 2 },
  { r: 72, y: 82, size: 8, speed: 760, start: 20, shape: 1 },
];
const ROCK_SHAPES = ["M2 6 L6 1 L13 3 L15 10 L9 15 L3 13 Z", "M1 8 L5 2 L12 1 L15 7 L11 14 L4 13 Z", "M3 3 L10 1 L15 8 L10 15 L2 11 Z"];

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
      {/* The whole storm travels together: swirls in from the corner and settles in the middle. */}
      <div className="splash-storm absolute" aria-hidden>
        <div className="splash-handover relative h-52 w-56">
          {/* Smoke billowing at the base */}
          {SMOKE.map((s, i) => (
            <span
              key={i}
              className="splash-smoke absolute rounded-full"
              style={{ width: s.size, height: s.size * 0.7, left: `calc(50% + ${s.x}px - ${s.size / 2}px)`, bottom: -s.size * 0.25, animationDelay: `${s.delay}ms` }}
            />
          ))}

          {/* The funnel: the whole thing sways while each ring swings side to side */}
          <svg viewBox="0 0 160 150" className="splash-funnel absolute inset-0 h-full w-full">
            <defs>
              <linearGradient id="splash-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7fdbf0" />
                <stop offset="0.5" stopColor="#48cae4" />
                <stop offset="1" stopColor="#0077b6" />
              </linearGradient>
            </defs>
            <g fill="none" stroke="url(#splash-g)" strokeLinecap="round" strokeWidth="4">
              {RINGS.map((r, i) => (
                <ellipse key={i} className="splash-ring" cx="80" cy={r.cy} rx={r.rx} ry={r.ry} style={{ animationDelay: `${i * -70}ms`, animationDuration: `${360 + i * 25}ms` }} />
              ))}
              <path className="splash-ring" d="M80 129 Q75 137 80 145" style={{ animationDuration: "300ms" }} />
            </g>
          </svg>

          {/* Rocks whirling around the funnel on a tilted orbit, tumbling as they go */}
          {ROCKS.map((k, i) => (
            <div key={i} className="splash-orbit-plane absolute left-1/2" style={{ top: k.y }}>
              <div
                className="splash-orbit"
                style={{ "--r": `${k.r}px`, animationDuration: `${k.speed}ms`, animationDelay: `${-(k.start / 360) * k.speed}ms` } as React.CSSProperties}
              >
                <svg viewBox="0 0 16 16" className="splash-rock" style={{ width: k.size, height: k.size, marginLeft: -k.size / 2, marginTop: -k.size / 2 }}>
                  <path d={ROCK_SHAPES[k.shape]} fill={i % 2 ? "#b8a68f" : "#c9d2de"} stroke="#5b6475" strokeWidth="1.2" />
                  <path d="M5 5 L9 4" stroke="#ffffff" strokeOpacity=".55" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          ))}
        </div>
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
