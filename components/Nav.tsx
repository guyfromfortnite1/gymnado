"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { useScanStatus } from "@/lib/hooks";

const FREE_TABS = [
  { href: "/", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/schedule", label: "Schedule" },
  { href: "/food", label: "Food" },
];
// Premium-only tabs; free users who tap one go to the Premium page instead.
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

function IconLink({ href, label, active, children }: { href: string; label: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:scale-110 ${active ? "bg-teal text-white" : "text-ice/85 hover:bg-white/10 hover:text-white"}`}
    >
      {children}
    </Link>
  );
}

function NavBar({ path }: { path: string }) {
  const { status } = useScanStatus();
  const premium = !!status?.premium;

  return (
    <header className="bg-navy text-white">
      <div className="mx-auto max-w-3xl space-y-2 px-4 py-3">
        <div className="flex items-center gap-1">
          <Link href="/" aria-label="GymNado home"><Logo size={22} dark /></Link>
          <span className="flex-1" />
          <Link
            href="/workout/next"
            className="mr-1 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surf px-3 py-1.5 text-sm font-semibold text-navy transition hover:scale-105 hover:bg-ice"
          >
            <span aria-hidden>▶</span> Workout
          </Link>
          <IconLink href="/profile" label="Profile" active={path === "/profile"}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </IconLink>
          <IconLink href="/settings" label="Settings" active={path === "/settings"}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </IconLink>
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
          </TabGroup>
        </nav>
      </div>
    </header>
  );
}
