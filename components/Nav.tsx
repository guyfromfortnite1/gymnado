"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/schedule", label: "Schedule" },
  { href: "/food", label: "Food" },
  { href: "/profile", label: "Profile" },
];

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  if (path === "/login" || path === "/signup") return null;

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="bg-twilight text-white">
      <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-3">
        <span className="mr-3 text-lg font-bold">
          Gym<span className="text-surf">Nado</span>
        </span>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-1 text-sm ${path === l.href ? "bg-teal" : "hover:bg-white/10"}`}
          >
            {l.label}
          </Link>
        ))}
        <button onClick={signOut} className="ml-auto rounded-lg px-3 py-1 text-sm text-frost hover:bg-white/10">
          Sign out
        </button>
      </nav>
    </header>
  );
}
