"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Light / dark switch for Settings. The choice is saved in this browser (see THEME_SCRIPT in lib/theme.ts). */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
     
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    // Also save it to the account, so it comes back after logging in again or on another device.
    createClient().auth.updateUser({ data: { theme: next ? "dark" : "light" } });
  }

  return (
    <button
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      className="flex w-full items-center gap-3 text-left"
    >
      <span className="text-xl" aria-hidden>{dark ? "🌙" : "☀️"}</span>
      <span className="flex-1 font-medium">Dark mode</span>
      <span className={`relative h-7 w-12 rounded-full transition ${dark ? "bg-teal" : "bg-frost"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${dark ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}
