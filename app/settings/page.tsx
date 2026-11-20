"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import InstallCard from "@/components/InstallCard";
import PremiumSurface, { PremiumBadge } from "@/components/PremiumSurface";
import { PageSkeleton } from "@/components/Skeleton";
import ThemeToggle from "@/components/ThemeToggle";
import { useScanStatus } from "@/lib/hooks";
import { PREMIUM_PRICE_LABEL } from "@/lib/premium";
import { CONTACT_EMAIL } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";

function Row({ href, icon, label, detail }: { href: string; icon: string; label: string; detail?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-1 py-2 transition hover:bg-cyan">
      <span className="text-xl" aria-hidden>{icon}</span>
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {detail && <span className="block text-sm text-twilight/60">{detail}</span>}
      </span>
      <span className="text-twilight/40" aria-hidden>›</span>
    </Link>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { status } = useScanStatus();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (!status || email === null) return <PageSkeleton cards={3} />;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="card space-y-1">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-twilight/50">Account</h2>
        <p className="px-1 pb-1 text-sm text-twilight/70">Signed in as <span className="font-medium text-twilight">{email}</span></p>
        <Row href="/profile" icon="👤" label="Edit profile & plan answers" detail="Body stats, goal, training days, equipment" />
      </section>

      <section className="card space-y-1">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-twilight/50">Appearance</h2>
        <ThemeToggle />
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-twilight/50">Premium</h2>
        <Link href="/premium" className="block rounded-2xl transition duration-200 hover:scale-[1.02]">
          <PremiumSurface className="flex items-center gap-3">
            <PremiumBadge />
            <span className="flex-1 font-semibold">{status.premium ? "You're Premium" : `Go Premium · ${PREMIUM_PRICE_LABEL}`}</span>
            <span className="text-sm text-ice/90">{status.premium ? "Manage subscription ›" : "See benefits ›"}</span>
          </PremiumSurface>
        </Link>
      </section>

      <section className="card space-y-1">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-twilight/50">App</h2>
        <InstallCard className="mb-1 rounded-xl bg-cyan/60 p-3" />
        <Row href="/terms" icon="📄" label="Terms of Service" />
        <Row href="/privacy" icon="🔒" label="Privacy Policy" />
        <Row href="/refund" icon="↩️" label="Refund Policy" />
        <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-3 rounded-xl px-1 py-2 transition hover:bg-cyan">
          <span className="text-xl" aria-hidden>✉️</span>
          <span className="flex-1 font-medium">Contact support</span>
        </a>
      </section>

      <button onClick={signOut} className="btn-secondary w-full py-3">Sign out</button>
    </div>
  );
}
