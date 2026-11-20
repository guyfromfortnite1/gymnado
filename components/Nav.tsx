"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/schedule", label: "Schedule" },
  { href: "/food", label: "Food" },
  { href: "/progress", label: "Progress" },
  { href: "/coach", label: "Coach" },
  { href: "/profile", label: "Profile" },
  { href: "/premium", label: "Premium" },
];
// Pages without the tab bar: signed-out pages, the plan choice, and building the first plan.
const NO_NAV = ["/login", "/signup", "/forgot-password", "/reset-password", "/choose-plan", "/onboarding", "/terms", "/privacy", "/refund"];

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  if (NO_NAV.includes(path) || path.startsWith("/workout/")) return null;

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="bg-twilight text-white">
      <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-3">
        <Logo size={28} dark className="mr-3 text-lg" />
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
