"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const ICON: Record<Theme, string> = { system: "🖥️", light: "☀️", dark: "🌙" };
const LABEL: Record<Theme, string> = { system: "Theme: match device", light: "Theme: light", dark: "Theme: dark" };

/** Same rule as THEME_SCRIPT in lib/theme.ts. */
function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Cycles device → light → dark. The choice is saved in this browser. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
     
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  // While following the device, react when the device switches between light and dark.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function cycle() {
    const next = NEXT[theme];
    setTheme(next);
    if (next === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", next);
    apply(next);
  }

  return (
    <button onClick={cycle} className="rounded-lg px-2 py-1 text-sm transition hover:scale-110 hover:bg-white/10" title={LABEL[theme]} aria-label={LABEL[theme]}>
      {ICON[theme]}
    </button>
  );
}
