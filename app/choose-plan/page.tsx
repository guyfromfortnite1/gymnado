"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { startCheckoutAction } from "@/app/actions";
import PremiumSurface, { PremiumBadge } from "@/components/PremiumSurface";
import { fadeOutMs, wait } from "@/lib/motion";
import { FREE_SCANS, PREMIUM_PRICE_LABEL } from "@/lib/premium";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

// Shown once after sign-up (or on the next login) until the user picks Free or Premium.
export default function ChoosePlanPage() {
  const router = useRouter();
  const [busy, setBusy] = useState<"free" | "premium" | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function chooseFree() {
    setBusy("free");
    setError(null);
    const { error: err } = await createClient().auth.updateUser({ data: { plan_chosen: "free" } });
    if (err) {
      setBusy(null);
      return setError(err.message);
    }
    setLeaving(true);
    await wait(fadeOutMs());
    router.replace("/"); // home sends new users on to the plan questions
  }

  async function choosePremium() {
    setBusy("premium");
    setError(null);
    const res = await startCheckoutAction("choose-plan");
    if (res.ok) return window.location.assign(res.url);
    setBusy(null);
    setError(res.error);
  }

  return (
    <div className={`mx-auto mt-6 max-w-2xl space-y-5 ${leaving ? "fade-out" : ""}`}>
      <div className="text-center">
        <p className="flex justify-center text-4xl tracking-tight"><Logo size={44} /></p>
        <h1 className="mt-1 text-2xl font-bold">Choose your plan</h1>
        <p className="text-twilight/70">You can upgrade anytime from the Premium tab.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card flex flex-col gap-3">
          <div>
            <p className="text-lg font-semibold">Free</p>
            <p className="text-3xl font-bold">$0</p>
          </div>
          <ul className="flex-1 space-y-1 text-sm">
            <li>✓ Personal training plan and split</li>
            <li>✓ Weekly workout schedule</li>
            <li>✓ AI exercise swaps</li>
            <li>✓ Workout mode with rest timer</li>
            <li>✓ {FREE_SCANS} food photo scans</li>
            <li className="text-twilight/40">✕ Sport-specific training</li>
            <li className="text-twilight/40">✕ AI coach, progress tracking, meal ideas</li>
          </ul>
          <button className="btn-secondary w-full py-3" onClick={chooseFree} disabled={!!busy}>
            {busy === "free" ? "…" : "Continue with Free"}
          </button>
        </section>

        <PremiumSurface className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold">
                Gym<span className="text-surf">Nado</span> Premium
              </p>
              <p className="text-3xl font-bold">
                {PREMIUM_PRICE_LABEL.replace("/month", "")}
                <span className="text-base font-normal text-ice/80"> / month</span>
              </p>
            </div>
            <PremiumBadge />
          </div>
          <ul className="flex-1 space-y-1 text-sm">
            <li>✓ Everything in Free</li>
            <li>✓ Unlimited food photo scans</li>
            <li>✓ Sport-specific training for your sports</li>
            <li>✓ AI coach that knows your plan</li>
            <li>✓ Progress tracking, charts and records</li>
            <li>✓ Meal ideas that fit your macros</li>
            <li>✓ Cancel anytime</li>
          </ul>
          <button className="w-full rounded-xl bg-white py-3 font-semibold text-navy transition hover:bg-cyan disabled:opacity-60" onClick={choosePremium} disabled={!!busy}>
            {busy === "premium" ? "Opening checkout…" : "Go Premium"}
          </button>
        </PremiumSurface>
      </div>

      {error && <p className="rounded-lg bg-cyan p-3 text-sm font-medium">{error}</p>}
      <p className="text-center text-xs text-twilight/50">Premium renews monthly until you cancel. <Link href="/terms" className="underline">Terms</Link> · <Link href="/refund" className="underline">Refunds</Link> · <Link href="/privacy" className="underline">Privacy</Link></p>
    </div>
  );
}
