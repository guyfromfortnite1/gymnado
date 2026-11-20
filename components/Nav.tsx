"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { useScanStatus } from "@/lib/hooks";
import { createClient } from "@/lib/supabase/client";

const FREE_TABS = [
  { href: "/", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/schedule", label: "Schedule" },
  { href: "/food", label: "Food" },
  { href: "/profile", label: "Profile" },
];
// Premium-only tabs; free users who tap one go to the Premium tab instead.
const PREMIUM_TABS = [
  { href: "/progress", label: "Progress" },
  { href: "/coach", label: "Coach" },
];

// Pages without the tab bar: signed-out and legal pages, the plan choice, building or editing the plan, and workout mode.
const NO_NAV = ["/login", "/signup", "/forgot-password", "/reset-password", "/choose-plan", "/onboarding", "/profile", "/terms", "/privacy", "/refund"];

export default function Nav() {
  const path = usePathname();
  if (NO_NAV.includes(path) || path.startsWith("/workout/")) return null;
  return <NavBar path={path} />;
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap px-3 py-1.5 text-sm transition ${active ? "bg-teal font-semibold text-white" : "text-ice/85 hover:bg-white/10 hover:text-white"}`}
    >
      {children}
    </Link>
  );
}

/** A row of tabs with a divider line between each one. */
function TabGroup({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex divide-x divide-white/15 overflow-hidden rounded-xl border border-white/15 ${className}`}>{children}</div>;
}

function NavBar({ path }: { path: string }) {
  const router = useRouter();
  const { status } = useScanStatus();
  const premium = !!status?.premium;

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="bg-navy text-white">
      <div className="mx-auto max-w-3xl space-y-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="GymNado home"><Logo size={22} dark /></Link>
          <span className="flex-1" />
          <ThemeToggle />
          <button onClick={signOut} className="shrink-0 whitespace-nowrap rounded-lg px-3 py-1 text-sm text-ice/80 hover:bg-white/10">Sign out</button>
        </div>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Main">
          <TabGroup>
            {FREE_TABS.map((t) => <Tab key={t.href} href={t.href} active={path === t.href}>{t.label}</Tab>)}
          </TabGroup>
          <span className="flex-1" />
          <TabGroup className="border-surf/40">
            {PREMIUM_TABS.map((t) => (
              <Tab key={t.href} href={premium ? t.href : "/premium"} active={path === t.href}>
                <span aria-hidden>💎 </span>{t.label}
              </Tab>
            ))}
            <Tab href="/premium" active={path === "/premium"}>{premium ? "Premium" : "Go Premium"}</Tab>
          </TabGroup>
        </nav>
      </div>
    </header>
  );
}
